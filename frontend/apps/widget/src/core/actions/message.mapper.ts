import type { Message, MessageType } from '@types';
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
	return {
		id: msg.uuid,
		content: msg.content,
		type,
		author: msg.author.type === 'agent' ? 'bot' : 'user',
		timestamp: new Date(msg.created_at).getTime(),
		...(type === 'csat' && msg.meta?.csat_uuid !== undefined
			? { meta: { csatUuid: msg.meta.csat_uuid } }
			: {}),
	};
};
