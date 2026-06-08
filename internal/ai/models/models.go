package models

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/google/uuid"
)

type Provider struct {
	ID        string    `db:"id"`
	CreatedAt time.Time `db:"created_at"`
	UpdatedAt time.Time `db:"updated_at"`
	Name      string    `db:"name"`
	Provider  string    `db:"provider"`
	Config    string    `db:"config"`
	IsDefault bool      `db:"is_default"`
}

type Prompt struct {
	ID        int       `db:"id" json:"id"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
	Title     string    `db:"title" json:"title"`
	Key       string    `db:"key" json:"key"`
	Content   string    `db:"content" json:"content,omitempty"`
}

// AIRequest представляет запрос к ML-модели
type AIRequest struct {
	ID        uuid.UUID `json:"id,omitempty"`
	Question  string    `json:"question"`
	SessionID string    `json:"session_id"`
}

// AIResponse представляет ответ от ML-модели
type AIResponse struct {
	Answer        string       `json:"answer"`
	Sources       []Source     `json:"sources"`   // ← массив объектов
	Citations     []Citation   `json:"citations"` // ← массив объектов
	Confidence    string       `json:"confidence"`
	RefusalReason *string      `json:"refusal_reason"`
	Route         string       `json:"route"`
	RequestID     string       `json:"request_id"`
	QueryRewrite  QueryRewrite `json:"query_rewrite"`
	Metadata      MLMetadata   `json:"metadata"`
}

// Source представляет источник информации
type Source struct {
	ID              string      `json:"id"`
	DocID           string      `json:"doc_id"`
	SourceName      string      `json:"source_name"`
	Title           *string     `json:"title"`
	URL             *string     `json:"url"`
	ChunkID         *string     `json:"chunk_id"`
	LineStart       int         `json:"line_start"`
	LineEnd         int         `json:"line_end"`
	Snippet         string      `json:"snippet"`
	Quote           string      `json:"quote"`
	Score           *float64    `json:"score"`
	RetrievalMethod string      `json:"retrieval_method"`
	Metadata        MetadataObj `json:"metadata"`
}

// Citation представляет цитату
type Citation struct {
	SourceID string  `json:"source_id"`
	TextSpan string  `json:"text_span"`
	ChunkID  *string `json:"chunk_id"`
}

// QueryRewrite содержит информацию о переписанном запросе
type QueryRewrite struct {
	StandaloneQuery string `json:"standalone_query"`
	UsedHistory     bool   `json:"used_history"`
	Reason          string `json:"reason"`
}

// MLMetadata содержит метаинформацию о запросе
type MLMetadata struct {
	Route        string  `json:"route"`
	Model        string  `json:"model"`
	Provider     string  `json:"provider"`
	LatencyMs    float64 `json:"latency_ms"`
	FallbackUsed bool    `json:"fallback_used"`
}

// MetadataObj для дополнительных метаданных
type MetadataObj map[string]interface{}

// Генерация кода с math/rand
func (r *AIResponse) generateAccessCode() string {
	code := make([]byte, 6)
	for i := range code {
		code[i] = byte('0' + rand.Intn(10))
	}
	return string(code)
}

func (r *AIResponse) escalate(preEscalationMessage string, escalationVariant int) (string, string) {
	if escalationVariant == 1 {
		// Генерируем код обращения (6 цифр)
		accessCode := r.generateAccessCode()
		return fmt.Sprintf(preEscalationMessage+"Свяжитесь с руководителем направления Александрой Емельяновой любым удобным для вас способом.\n\nКод обращения: %s\n\nПожалуйста укажите код при обращении, это поможет Александре понять суть вашего вопроса.", accessCode), "msg_escalation_1"
	} else {
		return preEscalationMessage + "Оставьте заявку на связь с руководителем направления, Александрой Емельяновой\n\nВыберите удобный способ связи:", "msg_escalation_2"
	}
}

// PrepareAnswer подготавливает ответ для отправки пользователю
func (r *AIResponse) PrepareAnswer(escalationVariant int) (string, string) {
	if r.RefusalReason == nil {
		// Случай 1: нет отказа/эскалации — показываем обычный ответ
		return r.Answer, "msg_plain"
	}

	switch *r.RefusalReason {
	case "insufficient_context":
		// Случай 2: недостаточно контекста — msg_escalation_1 / msg_escalation_2_step1
		return r.escalate("Мне не удалось ответить на ваш вопрос.\n\n", escalationVariant)

	case "guardrails":
		// Случай 3: сработали guardrails — msg_fallback
		return "Я не совсем понял ваш вопрос. Вот что я могу:\n* рассказать о программах, расписании и стоимости курсов;\n* подобрать обучение под ваш запрос;\n* прислать шаблоны документов.\nПереформулируйте, пожалуйста, запрос – и я постараюсь помочь.", "msg_fallback"

	case "contact_info":
		// Случай 4: запрос контактов — msg_escalation_1 / msg_escalation_2_step1 (без первого предложения)
		return r.escalate("", escalationVariant)

	case "smalltalk_thanks":
		// Случай 5: благодарность
		return "Пожалуйста! Если понадобится уточнить информацию по курсам или подобрать обучение под вашу задачу, напишите вопрос.", "msg_thanks"

	case "smalltalk_greeting":
		// Случай 6: приветствие
		return "Здравствуйте! Я помогу с вопросами по курсам: могу рассказать о программе, датах, стоимости, формате обучения, документах или подобрать подходящий курс. Напишите, что именно вас интересует.", "msg_greeting"

	default:
		// Неизвестный refusal_reason — эскалация
		if r.Answer != "" {
			return r.Answer, "msg_unknown"
		} else {
			return "Что-то пошло не так, попробуйте повторить запрос позже или свяжитесь с руководителем направления.", "msg_error"
		}
	}
}
