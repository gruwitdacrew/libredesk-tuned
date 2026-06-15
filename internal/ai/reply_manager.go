package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/abhinavxd/libredesk/internal/ai/models"
	"github.com/google/uuid"
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

// Process отправляет запрос и ждёт ответа в своём канале
func (rm *ReplyManager) Process(req models.AIRequest) (*models.AIResponse, error) {
	req.ID = uuid.New()
	responseChannel := fmt.Sprintf("ai:response:%s", req.ID.String())

	// Подписываемся на канал ответа
	sub := rm.rd.Subscribe(context.Background(), responseChannel)
	defer sub.Close()

	// Отправляем задачу в ОЧЕРЕДЬ (не PubSub)
	data, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// LPush + RPop = очередь FIFO
	if err := rm.rd.LPush(context.Background(), "ai:queue", data).Err(); err != nil {
		return nil, fmt.Errorf("failed to push request: %w", err)
	}

	// Ждём ответа
	timer := time.NewTimer(rm.timeout)
	defer timer.Stop()

	for {
		select {
		case msg := <-sub.Channel():
			var resp models.AIResponse
			if err := json.Unmarshal([]byte(msg.Payload), &resp); err != nil {
				rm.lo.Error("failed to unmarshal response", "error", err)
				continue
			}
			return &resp, nil

		case <-timer.C:
			return nil, fmt.Errorf("AI request timeout after %v", rm.timeout)
		}
	}
}

// worker забирает задачи из очереди (каждый worker получает уникальную задачу)
func (rm *ReplyManager) worker() {
	for {
		// BRPop — блокирующая операция, ждёт задачи в очереди
		result, err := rm.rd.BRPop(context.Background(), 0, "ai:queue").Result()
		if err != nil {
			rm.lo.Error("failed to pop from queue", "error", err)
			continue
		}

		// result[0] — имя ключа, result[1] — данные
		var req models.AIRequest
		if err := json.Unmarshal([]byte(result[1]), &req); err != nil {
			rm.lo.Error("failed to unmarshal request", "error", err)
			continue
		}

		rm.lo.Debug("worker processing request", "request_id", req.ID, "question", truncate(req.Question, 50))

		// Обрабатываем запрос
		resp, err := rm.processRequest(req)
		if resp == nil {
			resp = &models.AIResponse{}
		}

		// Отправляем ответ в канал запроса
		responseChannel := fmt.Sprintf("ai:response:%s", req.ID.String())
		data, err := json.Marshal(resp)
		if err != nil {
			rm.lo.Error("failed to marshal response", "error", err)
			continue
		}

		if err := rm.rd.Publish(context.Background(), responseChannel, data).Err(); err != nil {
			rm.lo.Error("failed to publish response", "error", err)
		}
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
