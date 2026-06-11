package migrations

import (
	"github.com/jmoiron/sqlx"
	"github.com/knadh/koanf/v2"
	"github.com/knadh/stuffbin"
)

func V2_3_2(db *sqlx.DB, fs stuffbin.FileSystem, ko *koanf.Koanf) error {
	// 1. Удаляем беседы с удаляемыми статусами (не Open, Resolved, Closed, Snoozed)
	_, err := db.Exec(`
		DELETE FROM conversations 
		WHERE status_id IN (
			SELECT id FROM conversation_statuses 
			WHERE name NOT IN ('Open', 'Resolved', 'Closed', 'Snoozed')
		);
	`)
	if err != nil {
		return err
	}

	// 2. Удаляем статусы, которые не нужны (не Open, Resolved, Closed, Snoozed)
	_, err = db.Exec(`
		DELETE FROM conversation_statuses 
		WHERE name NOT IN ('Open', 'Resolved', 'Closed', 'Snoozed');
	`)
	if err != nil {
		return err
	}

	// 3. Переименовываем существующие статусы
	_, err = db.Exec(`
		UPDATE conversation_statuses 
		SET name = CASE 
			WHEN name = 'Open' THEN 'Открыт'
			WHEN name = 'Resolved' THEN 'Обработан'
			WHEN name = 'Closed' THEN 'Закрыт'
			WHEN name = 'Snoozed' THEN 'Отложен'
			ELSE name
		END;
	`)
	if err != nil {
		return err
	}

	// 4. Добавляем новые статусы
	_, err = db.Exec(`
		INSERT INTO conversation_statuses (name, category) 
		VALUES 
			('Эскалация', 'resolved'::conversation_status_category),
			('ЗапросКонтактов', 'waiting'::conversation_status_category)
		ON CONFLICT (name) DO NOTHING;
	`)
	if err != nil {
		return err
	}

	return nil
}
