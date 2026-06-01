import type { LibredeskConfig } from '@types';

export interface LibredeskMessage {
	uuid: string;
	content: string;
	text_content?: string;
	conversation_uuid?: string;
	author: {
		type: 'agent' | 'visitor' | 'contact';
		id: number | null;
	};
	meta?: {
		msg_type?: string;
		is_automated?: boolean;
		is_csat?: boolean;
		csat_uuid?: string;
	};
	status: string;
	created_at: string;
}

export interface LibredeskConversation {
	uuid: string;
	status: string;
}

interface InitResponse {
	conversation: LibredeskConversation;
	session_token: string;
	messages: LibredeskMessage[];
}

interface ConversationDetailResponse {
	conversation: LibredeskConversation;
	messages: LibredeskMessage[];
}

const SESSION_KEY_PREFIX = 'libredesk-session-';

export const createLibredeskApi = (config: LibredeskConfig): LibredeskApi => {
	let sessionToken: string | null = null;

	const getSessionToken = (): string | null => sessionToken;

	const loadStoredSession = (): string | null => {
		try {
			return localStorage.getItem(`${SESSION_KEY_PREFIX}${config.inboxId}`);
		} catch {
			return null;
		}
	};

	const storeSession = (token: string): void => {
		sessionToken = token;
		try {
			localStorage.setItem(`${SESSION_KEY_PREFIX}${config.inboxId}`, token);
		} catch {
			// storage unavailable
		}
	};

	const clearSession = (): void => {
		sessionToken = null;
		try {
			localStorage.removeItem(`${SESSION_KEY_PREFIX}${config.inboxId}`);
		} catch {
			// storage unavailable
		}
	};

	const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
		const headers: Record<string, string> = {
			'X-Libredesk-Inbox-ID': config.inboxId,
		};

		if (options.body !== undefined) {
			headers['Content-Type'] = 'application/json';
		}

		if (sessionToken !== null) {
			headers['Authorization'] = `Bearer ${sessionToken}`;
		}

		const res = await fetch(`${config.baseUrl}${path}`, { ...options, headers });

		if (res.status === 401) {
			clearSession();
			throw new Error('SESSION_EXPIRED');
		}

		if (!res.ok) {
			throw new Error(`HTTP_${String(res.status)}`);
		}

		const json = (await res.json()) as { data: T };
		return json.data;
	};

	const initConversation = (message?: string): Promise<InitResponse> => {
		const payload = message !== undefined ? { message } : {};
		return request<InitResponse>('/api/v1/widget/chat/conversations/init', {
			method: 'POST',
			body: JSON.stringify(payload),
		});
	};

	const sendMessage = (conversationUuid: string, message: string): Promise<LibredeskMessage> =>
		request<LibredeskMessage>(`/api/v1/widget/chat/conversations/${conversationUuid}/message`, {
			method: 'POST',
			body: JSON.stringify({ message }),
		});

	const getConversations = (): Promise<LibredeskConversation[]> =>
		request<LibredeskConversation[]>('/api/v1/widget/chat/conversations');

	const getConversation = (uuid: string): Promise<ConversationDetailResponse> =>
		request<ConversationDetailResponse>(`/api/v1/widget/chat/conversations/${uuid}`);

	const submitCsatFeedback = (csatUuid: string, rating: number, feedback: string): Promise<boolean> =>
		request<boolean>(`/api/v1/csat/${csatUuid}/response`, {
			method: 'POST',
			body: JSON.stringify({ rating, feedback }),
		});

	// Restore session from storage on creation
	const stored = loadStoredSession();
	if (stored !== null) {
		sessionToken = stored;
	}

	return {
		getSessionToken,
		storeSession,
		clearSession,
		initConversation,
		sendMessage,
		getConversations,
		getConversation,
		submitCsatFeedback,
	};
};

export interface LibredeskApi {
	getSessionToken: () => string | null;
	storeSession: (token: string) => void;
	clearSession: () => void;
	initConversation: (message?: string) => Promise<InitResponse>;
	sendMessage: (conversationUuid: string, message: string) => Promise<LibredeskMessage>;
	getConversations: () => Promise<LibredeskConversation[]>;
	getConversation: (uuid: string) => Promise<ConversationDetailResponse>;
	submitCsatFeedback: (csatUuid: string, rating: number, feedback: string) => Promise<boolean>;
}
