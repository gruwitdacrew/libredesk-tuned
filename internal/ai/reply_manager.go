package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/abhinavxd/libredesk/internal/ai/models"
	"github.com/redis/go-redis/v9"
	"github.com/zerodha/logf"
)

// ReplyManager управляет очередью для ответов модели
type ReplyManager struct {
	lo *logf.Logger
	rd *redis.Client

	workersCount int
	timeout      time.Duration

	aiEndpoint string
	httpClient *http.Client
}

func NewReplyManager(rd *redis.Client, workersCount int, aiEndpoint string, timeout time.Duration, lo *logf.Logger) *ReplyManager {
	q := &ReplyManager{
		lo: lo,
		rd: rd,

		workersCount: workersCount,
		timeout:      3 * timeout,

		httpClient: &http.Client{Timeout: timeout},
		aiEndpoint: aiEndpoint,
	}

	// Запускаем воркеров
	for i := 0; i < workersCount; i++ {
		go q.worker()
	}

	return q
}

func (rm *ReplyManager) Process(req models.AIRequest) (*models.AIResponse, error) {
	ctx := context.Background()
	sessionKey := fmt.Sprintf("ai:session:%s", req.SessionID)
	questionsKey := sessionKey + ":questions"
	responseChannel := fmt.Sprintf("ai:response:%s", req.SessionID)

	// Добавляем вопрос в список вопросов сессии и получаем количество вопросов в буфере
	questionsCount, err := rm.rd.RPush(ctx, questionsKey, req.Question).Result()
	if err != nil {
		return nil, err
	}

	// Пытаемся стать основным обрабатывающим потоком для беседы
	locked, err := rm.rd.SetNX(ctx, sessionKey+":owner", "1", rm.timeout).Result()
	if err != nil {
		return nil, err
	}

	if !locked {
		// Кто-то уже стал таковым - он выполнит остальную работу
		return nil, fmt.Errorf("request cancelled by extra flow")
	}

	// Проверяем, есть ли уже активная обработка запроса ядром
	isProcessing, err := rm.rd.Get(ctx, sessionKey+":processing").Bool()
	if err != nil && err != redis.Nil {
		return nil, err
	}

	if isProcessing {
		// Ждём ответ, чтобы он вернулся в другом потоке (в котором уже началась обработка ядром, так потоков максимум 2 на беседу)
		rm.waitForResponse(ctx, responseChannel)
	}

	if questionsCount > 1 {
		// Отменяем подписку в других потоках, если были вопросы в буфере, но не обработаны
		rm.rd.Publish(ctx, responseChannel, "cancel")

		// Удаляем старую задачу этой сессии из очереди
		rm.rd.LRem(ctx, "ai:queue", 0, req.SessionID)
	}

	// Пушим задачу в начало и ждём ответ для возврата
	rm.rd.LPush(ctx, "ai:queue", req.SessionID)

	// Удаляем owner (чтобы следующая сессия могла начать)
	rm.rd.Del(ctx, sessionKey+":owner")

	return rm.waitForResponse(ctx, responseChannel)
}

func (rm *ReplyManager) waitForResponse(ctx context.Context, responseChannel string) (*models.AIResponse, error) {

	sub := rm.rd.Subscribe(ctx, responseChannel)
	defer sub.Close()

	timer := time.NewTimer(rm.timeout)
	defer timer.Stop()

	for {
		select {
		case msg := <-sub.Channel():

			rm.lo.Info("new message", "payload", msg)

			if msg.Payload == "cancel" {
				return nil, fmt.Errorf("request cancelled by newer request")
			}

			var resp models.AIResponse
			if err := json.Unmarshal([]byte(msg.Payload), &resp); err != nil {
				continue
			}
			return &resp, nil

		case <-timer.C:
			return nil, fmt.Errorf("request cancelled by timeout")
		}
	}
}

func (rm *ReplyManager) worker() {
	for {
		// Забираем sessionID из очереди
		result, err := rm.rd.BRPop(context.Background(), 0, "ai:queue").Result()
		if err != nil {
			rm.lo.Error("failed to pop from queue", "error", err)
			continue
		}

		sessionID := result[1]
		sessionKey := fmt.Sprintf("ai:session:%s", sessionID)
		questionsKey := sessionKey + ":questions"
		responseChannel := fmt.Sprintf("ai:response:%s", sessionID)

		// Устанавливаем флаг processing
		if err := rm.rd.SetNX(context.Background(), sessionKey+":processing", "1", rm.timeout).Err(); err != nil {
			rm.lo.Error("failed to set processing", "error", err)
			continue
		}

		// Достаём все вопросы из буфера
		questions, err := rm.rd.LRange(context.Background(), questionsKey, 0, -1).Result()
		if err != nil {
			rm.lo.Error("failed to get questions", "error", err)
			rm.rd.Del(context.Background(), sessionKey+":processing")
			continue
		}

		// Удаляем буфер
		rm.rd.Del(context.Background(), questionsKey)

		// Агрегируем вопросы
		aggregatedQuestion := strings.Join(questions, " | ")

		// Формируем запрос к ML
		req := models.AIRequest{
			Question:  aggregatedQuestion,
			SessionID: sessionID,
		}

		// Отправляем запрос к ML
		resp, err := rm.processRequest(req)
		if err != nil {
			rm.lo.Error("failed to process request", "error", err)
			continue
		}

		// Публикуем ответ
		data, err := json.Marshal(resp)
		if err != nil {
			rm.lo.Error("failed to marshal response", "error", err)
			rm.rd.Del(context.Background(), sessionKey+":processing")
			continue
		}
		rm.rd.Publish(context.Background(), responseChannel, data)

		// Снимаем флаг processing
		rm.rd.Del(context.Background(), sessionKey+":processing")
	}
}

// processRequest вызывает ML API
func (rm *ReplyManager) processRequest(req models.AIRequest) (*models.AIResponse, error) {
	payload, err := json.Marshal(map[string]string{
		"question":   req.Question,
		"session_id": req.SessionID,
	})
	if err != nil {
		return &models.AIResponse{}, nil
	}

	resp, err := rm.httpClient.Post(rm.aiEndpoint, "application/json", bytes.NewReader(payload))
	if err != nil {
		return &models.AIResponse{}, nil
	}
	defer resp.Body.Close()

	var mlResp models.AIResponse
	if err := json.NewDecoder(resp.Body).Decode(&mlResp); err != nil {
		return &models.AIResponse{}, nil
	}

	return &mlResp, nil
}
