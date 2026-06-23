// internal/migrations/v2.4.1.go
package migrations

import (
	"github.com/jmoiron/sqlx"
	"github.com/knadh/koanf/v2"
	"github.com/knadh/stuffbin"
)

func V2_3_3(db *sqlx.DB, fs stuffbin.FileSystem, ko *koanf.Koanf) error {
	// Добавляем поле should_send_csat в таблицу conversations
	_, err := db.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM information_schema.columns 
				WHERE table_name = 'conversations' AND column_name = 'should_send_csat'
			) THEN
				ALTER TABLE conversations ADD COLUMN should_send_csat BOOLEAN DEFAULT FALSE;
			END IF;
		END $$;
	`)
	if err != nil {
		return err
	}

	return nil
}
