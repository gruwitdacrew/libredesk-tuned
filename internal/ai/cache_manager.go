package ai

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/abhinavxd/libredesk/internal/ai/models"
	"github.com/redis/go-redis/v9"
	"github.com/zerodha/logf"
)

// ReplyManager управляет очередью для ответов модели
type CacheManager struct {
	lo *logf.Logger
	rd *redis.Client

	ttl    time.Duration // время жизни кэша
	prefix string        // префикс для ключей
}

func NewCacheManager(rd *redis.Client, lo *logf.Logger, ttl time.Duration, prefix string) *CacheManager {
	q := &CacheManager{
		lo:     lo,
		rd:     rd,
		ttl:    ttl,
		prefix: prefix,
	}

	return q
}

// GenerateHash создаёт хэш от вопроса
func (c *CacheManager) GenerateHash(question string) string {
	hash := sha256.Sum256([]byte(question))
	return hex.EncodeToString(hash[:])
}

// Get возвращает закэшированный ответ
func (c *CacheManager) Get(question string) (*models.AIResponse, bool) {
	key := c.prefix + c.GenerateHash(question)

	data, err := c.rd.Get(context.Background(), key).Result()
	if err != nil {
		if err != redis.Nil {
			c.lo.Error("failed to get from cache", "error", err)
		}
		return nil, false
	}

	var resp models.AIResponse
	if err := json.Unmarshal([]byte(data), &resp); err != nil {
		c.lo.Error("failed to unmarshal cached response", "error", err)
		return nil, false
	}

	questionPreview := truncate(question, 50)
	c.lo.Debug("cache hit", "question", questionPreview)

	return &resp, true
}

// Set сохраняет ответ в кэш
func (c *CacheManager) Set(question string, resp *models.AIResponse) error {
	key := c.prefix + c.GenerateHash(question)

	data, err := json.Marshal(resp)
	if err != nil {
		return fmt.Errorf("failed to marshal response: %w", err)
	}

	if err := c.rd.Set(context.Background(), key, data, c.ttl).Err(); err != nil {
		return fmt.Errorf("failed to set cache: %w", err)
	}

	questionPreview := truncate(question, 50)
	c.lo.Debug("cache set", "question", questionPreview, "ttl", c.ttl)

	return nil
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}

// Invalidate удаляет кэш для конкретного вопроса
func (c *CacheManager) Invalidate(question string) error {
	key := c.prefix + c.GenerateHash(question)
	return c.rd.Del(context.Background(), key).Err()
}

// Clear очищает весь кэш (для тестирования)
func (c *CacheManager) Clear() error {
	iter := c.rd.Scan(context.Background(), 0, c.prefix+"*", 0).Iterator()
	for iter.Next(context.Background()) {
		if err := c.rd.Del(context.Background(), iter.Val()).Err(); err != nil {
			return err
		}
	}
	return iter.Err()
}
