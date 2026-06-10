import { createChatActions, type ChatActions } from '@actions';
import type { LibredeskConfig, WidgetContext } from '@types';
import { createLibredeskApi, type LibredeskApi } from '../core/api/libredesk';
import { createLibredeskWs } from '../core/ws/libredesk.ws';

export interface ChatRuntime {
	api: LibredeskApi;
	chatActions: ChatActions;
}

/**
 * Поднимает сетевой слой: REST-клиент, WebSocket и действия чата. Связывает
 * события WS с действиями и синхронизирует жизненный цикл сокета с токеном
 * сессии в сторе (есть токен — подключаемся, нет — закрываемся).
 */
export const createChatRuntime = (ctx: WidgetContext, config: LibredeskConfig): ChatRuntime => {
	const api = createLibredeskApi(config);
	const chatActions = createChatActions(ctx.store, api);

	const ws = createLibredeskWs(config, {
		onNewMessage: chatActions.receiveMessage,
		onTyping: (_uuid, isTyping) => {
			chatActions.setBotTyping(isTyping);
		},
		onThinking: (_uuid, isThinking) => {
			chatActions.setBotThinking(isThinking);
		},
		onLongThinking: (_uuid, isThinking) => {
			chatActions.setBotLongThinking(isThinking);
		},
		onError: (_uuid, isError) => {
			chatActions.setBotError(isError);
		},
		onEscalated: () => {
			chatActions.setBotEscalated(true);
		},
		onClosed: () => {
			chatActions.setBotEscalated(true);
		},
	});

	ctx.onDestroy(
		ctx.store.subscribe(
			(s) => s.sessionToken,
			(token) => {
				if (token !== null) {
					ws.init(token);
				} else {
					ws.close();
				}
			},
		),
	);
	ctx.onDestroy(() => {
		ws.close();
	});

	return { api, chatActions };
};
