package models

import (
	"encoding/json"
	"time"

	"github.com/volatiletech/null/v9"
)

type EventType string

const (
	EventEscalation1                    EventType = "msg_escalation_1"
	EventAssociatedChannelDialogCreated EventType = "associated_channel_dialog_created"

	EventEscalation2     EventType = "msg_escalation_2"
	EventChannelSelected EventType = "channel_selected"
	EventContactsInvalid EventType = "сontacts_invalid"
	EventContactsValid   EventType = "сontacts_valid"
)

type EscalationVariant int

const (
	Variant1 EscalationVariant = 1
	Variant2 EscalationVariant = 2
)

type EventLog struct {
	ID        int64             `db:"id" json:"id"`
	SessionID null.String       `db:"session_id" json:"session_id,omitempty"`
	Variant   EscalationVariant `db:"variant" json:"variant"`
	Event     EventType         `db:"event" json:"event"`
	Timestamp time.Time         `db:"timestamp" json:"timestamp"`
	Code      null.String       `db:"code" json:"code,omitempty"`
	Channel   null.String       `db:"channel" json:"channel,omitempty"`
	Metadata  json.RawMessage   `db:"metadata" json:"metadata,omitempty"`
}

// EventLogFilter фильтры для запросов
type EventLogFilter struct {
	SessionID *string
	Variant   *EscalationVariant
	Event     *EventType
	FromDate  *time.Time
	ToDate    *time.Time
	Channel   *string
}
