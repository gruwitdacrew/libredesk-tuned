// Package activity manages activity logs for all users.
package eventlog

import (
	"context"
	"database/sql"
	"embed"

	"github.com/abhinavxd/libredesk/internal/dbutil"
	"github.com/abhinavxd/libredesk/internal/envelope"
	"github.com/abhinavxd/libredesk/internal/event_log/models"
	"github.com/jmoiron/sqlx"
	"github.com/knadh/go-i18n"
	"github.com/volatiletech/null/v9"
	"github.com/zerodha/logf"
)

var (
	//go:embed queries.sql
	efs embed.FS
)

type Manager struct {
	q    queries
	lo   *logf.Logger
	i18n *i18n.I18n
	db   *sqlx.DB
}

// Opts contains options for initializing the Manager.
type Opts struct {
	DB   *sqlx.DB
	Lo   *logf.Logger
	I18n *i18n.I18n
}

// queries contains prepared SQL queries.
type queries struct {
	GetAllEvents string     `query:"get-all-events"`
	InsertEvent  *sqlx.Stmt `query:"insert-event"`
}

// New creates and returns a new instance of the Manager.
func New(opts Opts) (*Manager, error) {
	var q queries
	if err := dbutil.ScanSQLFile("queries.sql", &q, opts.DB, efs); err != nil {
		return nil, err
	}
	return &Manager{
		q:    q,
		lo:   opts.Lo,
		i18n: opts.I18n,
		db:   opts.DB,
	}, nil
}

// GetAll retrieves all event logs.
func (el *Manager) GetAll(order, orderBy, filtersJSON string, page, pageSize int) ([]models.EventLog, error) {
	query, qArgs, err := el.makeQuery(page, pageSize, order, orderBy, filtersJSON)
	if err != nil {
		el.lo.Error("error creating event log list query", "error", err)
		return nil, envelope.NewError(envelope.GeneralError, el.i18n.T("globals.messages.somethingWentWrong"), nil)
	}

	// Start a read-only txn.
	tx, err := el.db.BeginTxx(context.Background(), &sql.TxOptions{
		ReadOnly: true,
	})
	if err != nil {
		el.lo.Error("error starting read-only transaction", "error", err)
		return nil, envelope.NewError(envelope.GeneralError, el.i18n.T("globals.messages.somethingWentWrong"), nil)
	}
	defer tx.Rollback()

	// Execute query
	var eventLogs = make([]models.EventLog, 0)
	if err := tx.Select(&eventLogs, query, qArgs...); err != nil {
		el.lo.Error("error fetching event logs", "error", err)
		return nil, envelope.NewError(envelope.GeneralError, el.i18n.T("globals.messages.somethingWentWrong"), nil)
	}
	return eventLogs, nil
}

// Escalation1 records an escalation event by variant one.
func (el *Manager) Escalation1(userID int, code string) error {
	return el.create(
		null.IntFrom(userID),
		models.Variant1,
		models.EventEscalation1,
		null.StringFrom(code),
		null.String{},
	)
}

// ChannelDialogCreated records that a dialog was created in an external channel.
func (el *Manager) AssociatedChannelDialogCreated(userID int, code string, channel string) error {
	return el.create(
		null.IntFrom(userID),
		models.Variant1,
		models.EventAssociatedChannelDialogCreated,
		null.StringFrom(code),
		null.StringFrom(channel),
	)
}

// Escalation2 records an escalation event by variant two.
func (el *Manager) Escalation2(userID int) error {
	return el.create(
		null.IntFrom(userID),
		models.Variant2,
		models.EventEscalation2,
		null.String{},
		null.String{},
	)
}

// ChannelSelected records that user selected a channel.
func (el *Manager) ChannelSelected(userID int, channel string) error {
	return el.create(
		null.IntFrom(userID),
		models.Variant2,
		models.EventChannelSelected,
		null.String{},
		null.StringFrom(channel),
	)
}

// ContactsInvalid records that user sent invalid contacts.
func (el *Manager) ContactsInvalid(userID int) error {
	return el.create(
		null.IntFrom(userID),
		models.Variant2,
		models.EventContactsInvalid,
		null.String{},
		null.String{},
	)
}

// ContactsValid records escalation confirmation by variant two.
func (el *Manager) ContactsValid(userID int) error {
	return el.create(
		null.IntFrom(userID),
		models.Variant2,
		models.EventContactsValid,
		null.String{},
		null.String{},
	)
}

// create creates a new activity log in DB.
func (el *Manager) create(sessionID null.Int, variant models.EscalationVariant, event models.EventType, code null.String, channel null.String) error {
	if _, err := el.q.InsertEvent.Exec(sessionID, variant, event, code, channel, nil); err != nil {
		el.lo.Error("error inserting event log", "error", err)
		return envelope.NewError(envelope.GeneralError, el.i18n.T("globals.messages.somethingWentWrong"), nil)
	}
	return nil
}

// makeQuery constructs the SQL query for fetching activity logs with filters and pagination.
func (el *Manager) makeQuery(page, pageSize int, order, orderBy, filtersJSON string) (string, []any, error) {
	var (
		baseQuery = el.q.GetAllEvents
		qArgs     []any
	)
	return dbutil.BuildPaginatedQuery(baseQuery, qArgs, dbutil.PaginationOptions{
		Order:    order,
		OrderBy:  orderBy,
		Page:     page,
		PageSize: pageSize,
	}, filtersJSON, dbutil.AllowedFields{
		"event_logs": {"event_type", "session_id", "channel", "timestamp"},
	})
}
