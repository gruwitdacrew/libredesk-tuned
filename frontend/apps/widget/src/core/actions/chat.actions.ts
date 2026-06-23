import type { Store } from '@store';
import type { BotStatus, CsatRating, Channel, MessageHandlers, Message, WidgetStore } from '@types';
import type { LibredeskApi, LibredeskMessage } from '../api/libredesk';
import { getCsatReasonMessage } from '../static/csatMessages';
import { CHANNELS, isChannel } from '../static/channels';
import { isEscalatedStatus, isClosedStatus } from '../static/conversationStatus';
import greetMessage from '../static/greetMessage';
import { mapMessage, resolveType, sortByTime } from './message.mapper';

export interface ChatActions {
	sendMessage: (text: string) => Promise<void>;
	receiveMessage: (msg: LibredeskMessage) => void;
	resyncActiveConversation: () => Promise<void>;
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
				// Токен приходит только для нового визитёра; у вернувшегося устройства сохраняем прежний.
				if (data.session_token !== undefined && data.session_token !== '') {
					api.storeSession(data.session_token);
				}
				api.storeActiveConversation(data.conversation.uuid);

				patch((s) => ({
					sessionToken: data.session_token ?? s.sessionToken,
					conversationUuid: data.conversation.uuid,
					isInitializing: false,
				}));

				for (const msg of data.messages) {
					receiveMessage(msg);
				}

				if (isEscalatedStatus(data.conversation.status)) {
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
		patch((s) => {
			if (s.messages.some((m) => m.id === msg.uuid)) {
				return {};
			}
			return {
				botStatus: s.botStatus === 'escalated' ? 'escalated' : 'online',
				isAwaitingReply: false,
				// Повторный escalation_2 не должен затирать уже выбранный канал.
				escalation2State:
					type === 'escalation_2' && !isChannel(s.escalation2State)
						? 'select_channel'
						: s.escalation2State,
				messages: [...s.messages, mapMessage(msg)],
			};
		});
	};

	/** Досинхронизирует активный диалог после join: добирает из БД сообщения, потерянные до подключения WS. */
	const resyncActiveConversation = async (): Promise<void> => {
		const { conversationUuid } = store.getStore();
		if (conversationUuid === null) {
			return;
		}
		try {
			const { conversation, messages } = await api.getConversation(conversationUuid);
			const ordered = [...messages].sort(
				(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
			);
			for (const msg of ordered) {
				receiveMessage(msg);
			}
			if (isEscalatedStatus(conversation.status) || isClosedStatus(conversation.status)) {
				setBotEscalated(true);
			}
		} catch (err) {
			console.error('[Chat] resync failed:', err);
		}
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

	/** При ошибке также снимаем флаг ожидания ответа — иначе лоадер крутится бесконечно. */
	const setBotError = (isError: boolean): void => {
		patch((s) => ({
			botStatus: isError ? 'error' : 'online',
			isAwaitingReply: isError ? false : s.isAwaitingReply,
		}));
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

	/**
	 * Восстанавливает активный диалог устройства (его UUID хранится отдельно), а не «последний из списка»:
	 * после «нового чата» пользователь видит чистый чат, а прежние диалоги остаются только для администратора.
	 * Сентинел '' — свежий старт (показываем только приветствие); отсутствие ключа — миграция со старого токена.
	 */
	const restoreSession = async (): Promise<void> => {
		const token = api.getSessionToken();
		if (token === null) {
			return;
		}

		// Токен поднимает WS (подписка в chatRuntime) независимо от того, есть ли что показывать.
		patch(() => ({ sessionToken: token }));

		const activeUuid = api.getActiveConversation();
		if (activeUuid === '') {
			return;
		}

		try {
			let uuid = activeUuid;
			if (uuid === null) {
				// Миграция: у старого токена ровно один диалог — берём его и фиксируем как активный.
				const conversations = await api.getConversations();
				const latest = conversations[0];
				if (latest === undefined) {
					return;
				}
				uuid = latest.uuid;
				api.storeActiveConversation(uuid);
			}

			const { conversation, messages } = await api.getConversation(uuid);
			const escalation = api.loadEscalation();
			const status = conversation.status;

			patch((s) => ({
				conversationUuid: conversation.uuid,
				botStatus: isEscalatedStatus(status) || isClosedStatus(status) ? 'escalated' : 'online',
				escalation2State: escalation?.state ?? s.escalation2State,
				escalationContactsSent: escalation?.sent ?? s.escalationContactsSent,
				messages: [greetMessage, ...sortByTime(messages.map(mapMessage))],
			}));
		} catch (err) {
			if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
				// Токен невалиден (401): request() уже удалил его из хранилища — синхронизируем стор и гасим WS.
				patch(() => ({ sessionToken: null }));
				return;
			}
			// Активный диалог не загрузился (например, удалён): помечаем чат свежим, токен устройства сохраняем.
			api.clearActiveConversation();
		}
	};

	/**
	 * «Новый чат»: сбрасывает только вид, но СОХРАНЯЕТ session token — устройство остаётся тем же
	 * контактом, поэтому прежние диалоги видны администратору, а пользователю — нет. Токен в сторе
	 * не обнуляем (иначе WS переподключится), isOpen не трогаем — панель остаётся открытой.
	 */
	const resetSession = (): void => {
		api.clearActiveConversation();
		api.clearEscalation();
		patch(() => ({
			botStatus: 'online',
			messages: [greetMessage],
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
		resyncActiveConversation,
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
