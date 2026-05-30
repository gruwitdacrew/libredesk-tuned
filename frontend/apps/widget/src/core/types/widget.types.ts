import type { Store } from '@store';

export type BotStatus =
	| 'online'
	| 'offline'
	| 'typing'
	| 'thinking'
	| 'long_thinking'
	| 'error'
	| 'escalated';

export type MessageType = 'plain' | 'escalation_1' | 'escalation_2';

export type Escalation2State = null | 'select_channel' | 'telegram' | 'max' | 'email';

export interface WidgetStore {
	botStatus: BotStatus;
	messages: Message[];
	isOpen: boolean;
	sessionToken: string | null;
	conversationUuid: string | null;
	isInitializing: boolean;
	isAwaitingReply: boolean;
	escalation2State: Escalation2State;
}

export interface Message {
	id: string;
	content: string;
	type: MessageType;
	author: 'user' | 'bot';
	timestamp: number;
}

export interface WidgetContext {
	store: Store<WidgetStore>;
	onDestroy: (fn: () => void) => void;
}

export interface LibredeskConfig {
	baseUrl: string;
	inboxId: string;
}
