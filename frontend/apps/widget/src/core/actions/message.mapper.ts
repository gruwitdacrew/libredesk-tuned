import type { CsatRating, Message, MessageType } from '@types';
import type { LibredeskMessage } from '../api/libredesk';

export const sortByTime = (msgs: Message[]): Message[] =>
	msgs.slice().sort((a, b) => a.timestamp - b.timestamp);

export const resolveType = (msg: LibredeskMessage): MessageType => {
	if (msg.meta?.is_csat === true) {
		return 'csat';
	}
	if (msg.meta?.msg_type === 'msg_escalation_1') {
		return 'escalation_1';
	}
	if (msg.meta?.msg_type === 'msg_escalation_2') {
		return 'escalation_2';
	}
	return 'plain';
};

/** Приводит сообщение бэкенда LibreDesk к внутренней модели Message. */
export const mapMessage = (msg: LibredeskMessage): Message => {
	const type = resolveType(msg);

	const parsed = new Date(msg.created_at).getTime();
	const timestamp = Number.isNaN(parsed) ? Date.now() : parsed;

	// Для уже оценённого CSAT бэкенд присылает submitted_rating — переносим его,
	// чтобы кнопки отрисовались в состоянии «оценено», а не предлагали оценить заново.
	const ratingRaw = msg.meta?.submitted_rating;
	const rating: CsatRating | undefined = ratingRaw === 1 || ratingRaw === 2 ? ratingRaw : undefined;

	const meta: Message['meta'] =
		type === 'csat' && msg.meta?.csat_uuid !== undefined
			? { csatUuid: msg.meta.csat_uuid, ...(rating !== undefined ? { rating } : {}) }
			: undefined;

	return {
		id: msg.uuid,
		content: msg.content,
		type,
		author: msg.author.type === 'agent' ? 'bot' : 'user',
		timestamp,
		...(meta !== undefined ? { meta } : {}),
	};
};
