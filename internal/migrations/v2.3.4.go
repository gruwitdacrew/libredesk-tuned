// internal/migrations/v2.5.0.go
package migrations

import (
	"github.com/jmoiron/sqlx"
	"github.com/knadh/koanf/v2"
	"github.com/knadh/stuffbin"
)

func V2_3_4(db *sqlx.DB, fs stuffbin.FileSystem, ko *koanf.Koanf) error {
	// Создаём таблицу для событий A/B тестирования
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS event_logs (
			id BIGSERIAL PRIMARY KEY,
			session_id VARCHAR(255),
			variant INT NOT NULL CHECK (variant IN (1, 2)),
			event VARCHAR(50) NOT NULL,
			timestamp TIMESTAMPTZ DEFAULT NOW(),
			code VARCHAR(20),
			channel VARCHAR(50),
			metadata JSONB DEFAULT '{}'::jsonb
		);
	`)
	if err != nil {
		return err
	}

	return nil
}
