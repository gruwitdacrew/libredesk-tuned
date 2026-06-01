import type { Store } from '@store';
import type { WidgetStore, Message, MessageType, CsatRating } from '@types';
import type { LibredeskApi, LibredeskMessage } from '../api/libredesk';
import { getEscalation2Message } from '../static/escalation2Messages';
import { getCsatReasonMessage } from '../static/csatMessages';
import greetMessage from '../static/greetMessage';

export interface ChatActions {
	sendMessage: (text: string) => Promise<void>;
	receiveMessage: (msg: LibredeskMessage) => void;
	setBotTyping: (isTyping: boolean) => void;
	setBotThinking: (isThinking: boolean) => void;
	setBotLongThinking: (isThinking: boolean) => void;
	setBotError: (isError: boolean) => void;
	setBotEscalated: (isEscalated: boolean) => void;
	selectEscalation2Channel: (channel: 'telegram' | 'max' | 'email') => void;
	rateCsat: (csatUuid: string, rating: CsatRating) => void;
	submitCsatReason: (csatUuid: string, rating: CsatRating, reason: string) => Promise<void>;
	resetSession: () => void;
	initOnLoad: () => Promise<void>;
}

const sortByTime = (msgs: Message[]): Message[] =>
	msgs.slice().sort((a, b) => a.timestamp - b.timestamp);

const resolveType = (msg: LibredeskMessage): MessageType => {
	if (msg.meta?.is_csat === true) { return 'csat'; }
	if (msg.meta?.msg_type === 'msg_escalation_1') { return 'escalation_1'; }
	if (msg.meta?.msg_type === 'msg_escalation_2') { return 'escalation_2'; }
	return 'plain';
};

const mapMessage = (msg: LibredeskMessage): Message => {
	const type = resolveType(msg);
	return {
		id: msg.uuid,
		content: msg.author.type === 'agent' ? (msg.text_content ?? msg.content) : msg.content,
		type,
		author: msg.author.type === 'agent' ? 'bot' : 'user',
		timestamp: new Date(msg.created_at).getTime(),
		...(type === 'csat' && msg.meta?.csat_uuid !== undefined
			? { meta: { csatUuid: msg.meta.csat_uuid } }
			: {}),
	};
};

const CHANNEL_PREFIXES: Record<'telegram' | 'max' | 'email', string> = {
	telegram: 'Телеграм: ',
	max: 'МАХ: ',
	email: 'Почта: ',
};

export const createChatActions = (store: Store<WidgetStore>, api: LibredeskApi): ChatActions => {
	const sendMessage = async (text: string): Promise<void> => {
		const trimmed = text.trim();
		if (trimmed.length === 0) {
			return;
		}

		const { escalation2State } = store.getStore();
		const prefix =
			escalation2State !== null && escalation2State !== 'select_channel'
				? CHANNEL_PREFIXES[escalation2State]
				: '';
		const content = prefix.length > 0 ? `${prefix}${trimmed}` : trimmed;

		// Optimistic: render user message immediately
		const optimistic: Message = {
			id: `pending-${String(Date.now())}`,
			content,
			type: 'plain',
			author: 'user',
			timestamp: Date.now(),
		};

		store.setStore((s) => ({
			...s,
			messages: [...s.messages, optimistic],
			isInitializing: s.conversationUuid === null,
			isAwaitingReply: true,
		}));

		try {
			const { conversationUuid } = store.getStore();

			if (conversationUuid === null) {
				const data = await api.initConversation(content);

				api.storeSession(data.session_token);

				store.setStore((s) => ({
					...s,
					sessionToken: data.session_token,
					conversationUuid: data.conversation.uuid,
					isInitializing: false,
				}));

				for (const msg of data.messages) {
					receiveMessage(msg);
				}

				if (data.conversation.status === 'Escalation') {
					setBotEscalated(true);
				}
			} else {
				await api.sendMessage(conversationUuid, content);
			}
		} catch (err) {
			console.error('[Chat] send failed:', err);
			store.setStore((s) => ({ ...s, isInitializing: false, isAwaitingReply: false }));
		}
	};

	const receiveMessage = (msg: LibredeskMessage): void => {
		// Only render agent messages — visitor echo is already shown optimistically
		if (msg.author.type !== 'agent') {
			return;
		}

		const { conversationUuid } = store.getStore();
		if (msg.conversation_uuid !== undefined && msg.conversation_uuid !== conversationUuid) {
			return;
		}

		const type = resolveType(msg);
		store.setStore((s) => ({
			...s,
			botStatus: s.botStatus === 'escalated' ? 'escalated' : 'online',
			isAwaitingReply: false,
			escalation2State: type === 'escalation_2' ? 'select_channel' : s.escalation2State,
			messages: [...s.messages, mapMessage(msg)],
		}));
	};

	const selectEscalation2Channel = (channel: 'telegram' | 'max' | 'email'): void => {
		store.setStore((s) => ({
			...s,
			escalation2State: channel,
			messages: [...s.messages, getEscalation2Message(channel)],
		}));
	};

	// Step 1: user picked a rating. Append the follow-up reason prompt. No request
	// yet — the single POST happens once a reason is chosen (see submitCsatReason).
	const rateCsat = (csatUuid: string, rating: CsatRating): void => {
		store.setStore((s) => ({
			...s,
			messages: [...s.messages, getCsatReasonMessage(csatUuid, rating)],
		}));
	};

	// Step 2: user picked a reason. Submit rating + reason in a single request.
	const submitCsatReason = async (
		csatUuid: string,
		rating: CsatRating,
		reason: string,
	): Promise<void> => {
		try {
			await api.submitCsatFeedback(csatUuid, rating, reason);
		} catch (err) {
			console.error('[CSAT] submit failed:', err);
			throw err;
		}
	};

	const setBotTyping = (isTyping: boolean): void => {
		store.setStore((s) => ({
			...s,
			botStatus: isTyping ? 'typing' : 'online',
		}));
	};

	const setBotEscalated = (isEscalated: boolean): void => {
		store.setStore((s) => {
			if (!isEscalated) {
				return { ...s, botStatus: 'online' };
			}
			// contacts step: escalation2State is a selected channel — Closed event finalises it
			const inContactStep = s.escalation2State !== null && s.escalation2State !== 'select_channel';
			return {
				...s,
				botStatus: s.escalation2State === 'select_channel' ? s.botStatus : 'escalated',
				escalation2State: inContactStep ? null : s.escalation2State,
				isAwaitingReply: false,
			};
		});
	};

	const setBotThinking = (isThinking: boolean): void => {
		store.setStore((s) => ({
			...s,
			botStatus: isThinking ? 'long_thinking' : 'online',
		}));
	};

	const setBotLongThinking = (isThinking: boolean): void => {
		store.setStore((s) => ({
			...s,
			botStatus: isThinking ? 'long_thinking' : 'online',
		}));
	};

	const setBotError = (isError: boolean): void => {
		store.setStore((s) => ({
			...s,
			botStatus: isError ? 'error' : 'online',
		}));
	};

	const restoreSession = async (): Promise<void> => {
		const token = api.getSessionToken();
		if (token === null) {
			return;
		}

		store.setStore((s) => ({ ...s, sessionToken: token }));

		try {
			const conversations = await api.getConversations();
			const latest = conversations[0];
			if (latest === undefined) {
				return;
			}

			const { conversation, messages } = await api.getConversation(latest.uuid);

			store.setStore((s) => ({
				...s,
				conversationUuid: conversation.uuid,
				botStatus: conversation.status === "Escalation" || conversation.status === "Closed" ? 'escalated' : 'online' ,
				messages: [greetMessage, ...sortByTime(messages.map(mapMessage))],
			}));
		} catch {
			api.clearSession();
			store.setStore((s) => ({ ...s, sessionToken: null }));
		}
	};

const resetSession = (): void => {
		api.clearSession();
		store.setStore((s) => ({
			botStatus: 'online',
			messages: [greetMessage],
			isOpen: s.isOpen,
			sessionToken: null,
			conversationUuid: null,
			isInitializing: false,
			isAwaitingReply: false,
			escalation2State: null,
		}));
	};

	const initOnLoad = async (): Promise<void> => {
		if (api.getSessionToken() !== null) {
			await restoreSession();
		}
	};

	return {
		sendMessage,
		receiveMessage,
		setBotTyping,
		setBotEscalated,
		selectEscalation2Channel,
		rateCsat,
		submitCsatReason,
		resetSession,
		initOnLoad,
		setBotThinking,
		setBotLongThinking,
		setBotError,
	};
};
