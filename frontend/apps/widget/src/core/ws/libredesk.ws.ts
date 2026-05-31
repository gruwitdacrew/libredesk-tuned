import type { LibredeskConfig } from '@types';
import type { LibredeskMessage } from '../api/libredesk';

export interface WsHandlers {
	onNewMessage: (message: LibredeskMessage) => void;
	onTyping: (conversationUuid: string, isTyping: boolean) => void;
	onThinking: (conversationUuid: string, isThinking: boolean) => void;
	onLongThinking: (conversationUuid: string, isThinking: boolean) => void;
	onError: (conversationUuid: string, isError: boolean) => void;
	onEscalated: (conversationUuid: string) => void;
	onClosed: (conversationUuid: string) => void;
}

const WS_EVENT = {
	JOIN: 'join',
	NEW_MESSAGE: 'new_message',
	TYPING: 'typing',
	ERROR: 'error',
	PONG: 'pong',
	THINKING: 'thinking',
	THINKING_LONG: 'thinking_long',
	CONVERSATION_UPDATE: 'conversation_update',
} as const;

const MAX_RECONNECT_ATTEMPTS = 50;
const MAX_RECONNECT_INTERVAL = 30_000;
const PING_INTERVAL_MS = 10_000;
const PONG_TIMEOUT_MS = 30_000;

export const createLibredeskWs = (config: LibredeskConfig, handlers: WsHandlers): LibredeskWs => {
	let socket: WebSocket | null = null;
	let sessionToken: string | null = null;
	let pingInterval: number | null = null;
	let reconnectTimer: number | null = null;
	let reconnectInterval = 1000;
	let reconnectAttempts = 0;
	let isReconnecting = false;
	let manualClose = false;
	let lastPong = Date.now();

	const wsBase = config.baseUrl
		? config.baseUrl.replace(/^http(s?)/, (_, s: string) => (s ? 'wss' : 'ws'))
		: `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;

	const wsUrl = `${wsBase}/widget/ws`;

	const send = (data: object): void => {
		if (socket?.readyState === WebSocket.OPEN) {
			socket.send(JSON.stringify(data));
		}
	};

	const joinInbox = (): void => {
		if (sessionToken === null || !sessionToken) {
			return;
		}
		send({ type: WS_EVENT.JOIN, token: sessionToken, data: { inbox_id: config.inboxId } });
	};

	const clearPing = (): void => {
		if (pingInterval !== null) {
			window.clearInterval(pingInterval);
			pingInterval = null;
		}
	};

	const setupPing = (): void => {
		clearPing();
		pingInterval = window.setInterval(() => {
			if (socket?.readyState === WebSocket.OPEN) {
				send({ type: 'ping' });
				if (Date.now() - lastPong > PONG_TIMEOUT_MS) {
					socket.close();
				}
			}
		}, PING_INTERVAL_MS);
	};

	const reconnect = (): void => {
		if (isReconnecting || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
			return;
		}
		isReconnecting = true;
		reconnectAttempts++;
		reconnectTimer = window.setTimeout(() => {
			isReconnecting = false;
			reconnectTimer = null;
			reconnectInterval = Math.min(reconnectInterval * 1.5, MAX_RECONNECT_INTERVAL);
			connect();
		}, reconnectInterval);
	};

	const handleOpen = (): void => {
		reconnectInterval = 1000;
		reconnectAttempts = 0;
		isReconnecting = false;
		lastPong = Date.now();
		setupPing();
		joinInbox();
	};

	const handleMessage = (event: MessageEvent): void => {
		try {
			const data = JSON.parse(String(event.data)) as { type: string; data?: unknown };
			switch (data.type) {
				case WS_EVENT.PONG:
					lastPong = Date.now();
					break;
				case WS_EVENT.NEW_MESSAGE:
					if (data.data !== undefined) {
						handlers.onNewMessage(data.data as LibredeskMessage);
					}
					break;
				case WS_EVENT.TYPING: {
					const td = data.data as { conversation_uuid: string; is_typing: boolean } | undefined;
					if (td !== undefined) {
						handlers.onTyping(td.conversation_uuid, td.is_typing);
					}
					break;
				}
				case WS_EVENT.THINKING: {
					const td = data.data as { conversation_uuid: string; is_thinking: boolean } | undefined;
					if (td !== undefined) {
						handlers.onThinking(td.conversation_uuid, td.is_thinking);
					}
					break;
				}
				case WS_EVENT.THINKING_LONG: {
					const td = data.data as
						| { conversation_uuid: string; is_thinking_long: boolean }
						| undefined;
					if (td !== undefined) {
						handlers.onLongThinking(td.conversation_uuid, td.is_thinking_long);
					}
					break;
				}
				case WS_EVENT.ERROR: {
					console.error('[LibreDesk WS]', data.data);
					const td = data.data as { conversation_uuid: string; is_error: boolean } | undefined;
					if (td !== undefined) {
						handlers.onError(td.conversation_uuid, td.is_error);
					}
					break;
				}
				case WS_EVENT.CONVERSATION_UPDATE: {
					const td = data.data as { uuid: string; status: string } | undefined;
					if (td?.status === 'Escalation') {
						handlers.onEscalated(td.uuid);
					} else if (td?.status === 'Closed') {
						handlers.onClosed(td.uuid);
					}
					break;
				}
			}
		} catch (err) {
			console.error('[LibreDesk WS] parse error:', err);
		}
	};

	const handleClose = (): void => {
		clearPing();
		if (!manualClose) {
			reconnect();
		}
	};

	const connect = (): void => {
		if (isReconnecting || manualClose) {
			return;
		}
		try {
			socket = new WebSocket(wsUrl);
			socket.addEventListener('open', handleOpen);
			socket.addEventListener('message', handleMessage);
			socket.addEventListener('close', handleClose);
			socket.addEventListener('error', handleClose);
		} catch {
			reconnect();
		}
	};

	const init = (token: string): void => {
		sessionToken = token;
		if (socket?.readyState === WebSocket.OPEN) {
			joinInbox();
			return;
		}
		manualClose = false;
		connect();
	};

	const close = (): void => {
		manualClose = true;
		clearPing();
		if (reconnectTimer !== null) {
			window.clearTimeout(reconnectTimer);
			reconnectTimer = null;
		}
		socket?.close();
		socket = null;
	};

	return { init, close };
};

export interface LibredeskWs {
	init: (token: string) => void;
	close: () => void;
}
