package migrations

import (
	"github.com/jmoiron/sqlx"
	"github.com/knadh/koanf/v2"
	"github.com/knadh/stuffbin"
)

func V2_3_1(db *sqlx.DB, fs stuffbin.FileSystem, ko *koanf.Koanf) error {
	// Добавляем поле escalation_variant в таблицу users
	_, err := db.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM information_schema.columns 
				WHERE table_name = 'users' AND column_name = 'escalation_variant'
			) THEN
				ALTER TABLE users ADD COLUMN escalation_variant INTEGER DEFAULT NULL;
			END IF;
		END $$;
	`)
	if err != nil {
		return err
	}

	return nil
}
