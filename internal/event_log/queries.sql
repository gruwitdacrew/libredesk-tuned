-- name: get-all-events
SELECT
    COUNT(*) OVER() as total,
    id,
    session_id,
    variant,
    event,
    timestamp,
    code,
    channel,
    metadata
FROM event_logs
WHERE 1=1

-- name: insert-event
INSERT INTO event_logs (
    session_id,
    variant,
    event,
    code,
    channel,
    metadata
) VALUES (
    $1, $2, $3, $4, $5, $6
);