package models

import (
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

// IsSuccessful возвращает true, если модель успешно ответила
func (r *AIResponse) IsSuccessful() bool {
	return r.RefusalReason == nil && r.Confidence != "low"
}

// IsRefusal возвращает true, если модель отказалась отвечать
func (r *AIResponse) IsRefusal() bool {
	return r.RefusalReason != nil
}

// ShouldEscalate возвращает true, если нужна эскалация оператору
func (r *AIResponse) ShouldEscalate() bool {
	return r.RefusalReason != nil || r.Confidence == "low"
}
