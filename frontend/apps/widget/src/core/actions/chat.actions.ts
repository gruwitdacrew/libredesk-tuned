import type { Store } from '@store';
import type { BotStatus, CsatRating, Channel, MessageHandlers, Message, WidgetStore } from '@types';
import type { LibredeskApi, LibredeskMessage } from '../api/libredesk';
import { getCsatReasonMessage } from '../static/csatMessages';
import { CHANNELS, isChannel } from '../static/channels';
import greetMessage from '../static/greetMessage';
import { mapMessage, resolveType, sortByTime } from './message.mapper';

export interface ChatActions {
	sendMessage: (text: string) => Promise<void>;
	receiveMessage: (msg: LibredeskMessage) => void;
	setBotTyping: (isTyping: boolean) => void;
	setBotThinking: (isThinking: boolean) => void;
	setBotLongThinking: (isThinking: boolean) => void;
	setBotError: (isError: boolean) => void;
	setBotEscalated: (isEscalated: boolean) => void;
	selectEscalation2Channel: (channel: Channel) => void;
	rateCsat: (csatUuid: string, rating: CsatRating) => void;
	submitCsatReason: (csatUuid: string, rating: CsatRating, reason: string) => Promise<void>;
	resetSession: () => void;
	initOnLoad: () => Promise<void>;
}

export const createChatActions = (store: Store<WidgetStore>, api: LibredeskApi): ChatActions => {
	const patch = (mutate: (state: WidgetStore) => Partial<WidgetStore>): void => {
		store.setStore((state) => ({ ...state, ...mutate(state) }));
	};

	/**
	 * Отправляет сообщение: сразу показывает его оптимистично, затем создаёт диалог
	 * (первая отправка) или дослает в существующий. Отправка при выбранном канале —
	 * это сдача контактов: добавляется префикс канала, после чего кнопки блокируются.
	 */
	const sendMessage = async (text: string): Promise<void> => {
		const trimmed = text.trim();
		if (trimmed.length === 0) {
			return;
		}

		const { escalation2State } = store.getStore();
		const isContactsSubmit = isChannel(escalation2State);
		const prefix = isChannel(escalation2State) ? CHANNELS[escalation2State].prefix : '';
		const content = prefix.length > 0 ? `${prefix}${trimmed}` : trimmed;

		const optimistic: Message = {
			id: `pending-${String(Date.now())}`,
			content,
			type: 'plain',
			author: 'user',
			timestamp: Date.now(),
		};

		patch((s) => ({
			messages: [...s.messages, optimistic],
			isInitializing: s.conversationUuid === null,
			isAwaitingReply: true,
			escalationContactsSent: isContactsSubmit ? true : s.escalationContactsSent,
		}));

		try {
			const { conversationUuid } = store.getStore();

			if (conversationUuid === null) {
				const data = await api.initConversation(content);
				api.storeSession(data.session_token);

				patch(() => ({
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
			patch((s) => ({
				isInitializing: false,
				isAwaitingReply: false,
				escalationContactsSent: isContactsSubmit ? false : s.escalationContactsSent,
			}));
		}
	};

	/** Обрабатывает входящее сообщение. Визитёрское эхо уже показано оптимистично, поэтому рендерим только сообщения агента. */
	const receiveMessage = (msg: LibredeskMessage): void => {
		if (msg.author.type !== 'agent') {
			return;
		}

		const { conversationUuid } = store.getStore();
		if (msg.conversation_uuid !== undefined && msg.conversation_uuid !== conversationUuid) {
			return;
		}

		const type = resolveType(msg);
		patch((s) => ({
			botStatus: s.botStatus === 'escalated' ? 'escalated' : 'online',
			isAwaitingReply: false,
			escalation2State: type === 'escalation_2' ? 'select_channel' : s.escalation2State,
			messages: [...s.messages, mapMessage(msg)],
		}));
	};

	/** Выбор/смена канала только меняет состояние: подсказка обновляется в пузыре escalation_2 на месте, новое сообщение не добавляется. */
	const selectEscalation2Channel = (channel: Channel): void => {
		patch(() => ({ escalation2State: channel }));
	};

	/** Шаг 1 CSAT: пользователь выбрал оценку — добавляем подсказку о причине. Запрос пока не уходит (см. submitCsatReason). */
	const rateCsat = (csatUuid: string, rating: CsatRating): void => {
		patch((s) => ({ messages: [...s.messages, getCsatReasonMessage(csatUuid, rating)] }));
	};

	/** Шаг 2 CSAT: причина выбрана — оценка и причина уходят одним запросом. */
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

	const setBotStatus = (isActive: boolean, status: BotStatus): void => {
		patch(() => ({ botStatus: isActive ? status : 'online' }));
	};

	const setBotTyping = (isTyping: boolean): void => {
		setBotStatus(isTyping, 'typing');
	};

	/** Примечание: setBotThinking и setBotLongThinking сейчас ведут себя одинаково (оба ставят 'long_thinking') — поведение сохранено как было. */
	const setBotThinking = (isThinking: boolean): void => {
		setBotStatus(isThinking, 'long_thinking');
	};

	const setBotLongThinking = (isThinking: boolean): void => {
		setBotStatus(isThinking, 'long_thinking');
	};

	const setBotError = (isError: boolean): void => {
		setBotStatus(isError, 'error');
	};

	/** Финализирует эскалацию. На шаге контактов (escalation2State — выбранный канал) событие Closed завершает его и сбрасывает состояние. */
	const setBotEscalated = (isEscalated: boolean): void => {
		patch((s) => {
			if (!isEscalated) {
				return { botStatus: 'online' };
			}
			const inContactStep = s.escalation2State !== null && s.escalation2State !== 'select_channel';
			return {
				botStatus: s.escalation2State === 'select_channel' ? s.botStatus : 'escalated',
				escalation2State: inContactStep ? null : s.escalation2State,
				isAwaitingReply: false,
			};
		});
	};

	/** Восстанавливает последнюю сессию из хранилища вместе с сохранённым выбором канала эскалации (чтобы пузырь и префикс отправки совпали). */
	const restoreSession = async (): Promise<void> => {
		const token = api.getSessionToken();
		if (token === null) {
			return;
		}

		patch(() => ({ sessionToken: token }));

		try {
			const conversations = await api.getConversations();
			const latest = conversations[0];
			if (latest === undefined) {
				return;
			}

			const { conversation, messages } = await api.getConversation(latest.uuid);
			const escalation = api.loadEscalation();

			patch((s) => ({
				conversationUuid: conversation.uuid,
				botStatus:
					conversation.status === 'Escalation' || conversation.status === 'Closed'
						? 'escalated'
						: 'online',
				escalation2State: escalation?.state ?? s.escalation2State,
				escalationContactsSent: escalation?.sent ?? s.escalationContactsSent,
				messages: [greetMessage, ...sortByTime(messages.map(mapMessage))],
			}));
		} catch {
			api.clearSession();
			patch(() => ({ sessionToken: null }));
		}
	};

	/** Полный сброс сессии (хранилище + стор). isOpen намеренно не сбрасываем — панель остаётся открытой. */
	const resetSession = (): void => {
		api.clearSession();
		api.clearEscalation();
		patch(() => ({
			botStatus: 'online',
			messages: [greetMessage],
			sessionToken: null,
			conversationUuid: null,
			isInitializing: false,
			isAwaitingReply: false,
			escalation2State: null,
			escalationContactsSent: false,
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
		setBotThinking,
		setBotLongThinking,
		setBotError,
		setBotEscalated,
		selectEscalation2Channel,
		rateCsat,
		submitCsatReason,
		resetSession,
		initOnLoad,
	};
};

/** Сопоставляет обработчики UI-сообщений с действиями чата (используется панелью). */
export const createMessageHandlers = (actions: ChatActions): MessageHandlers => ({
	onChannelSelect: actions.selectEscalation2Channel,
	onCsatRate: actions.rateCsat,
	onCsatReason: actions.submitCsatReason,
	onContactManager: () => {
		void actions.sendMessage('Переведите на руководителя');
	},
});
