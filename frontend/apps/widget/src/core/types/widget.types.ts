import type { Store } from '@store';

export type BotStatus =
	| 'online'
	| 'offline'
	| 'typing'
	| 'thinking'
	| 'long_thinking'
	| 'error'
	| 'escalated';

export type MessageType = 'plain' | 'escalation_1' | 'escalation_2' | 'csat' | 'csat_reason';

export type Escalation2State = null | 'select_channel' | 'telegram' | 'max' | 'email';

export type CsatRating = 1 | 2;

export interface WidgetStore {
	botStatus: BotStatus;
	messages: Message[];
	isOpen: boolean;
	sessionToken: string | null;
	conversationUuid: string | null;
	isInitializing: boolean;
	isAwaitingReply: boolean;
	escalation2State: Escalation2State;
	// True once the user has sent their contacts for the chosen channel — locks the
	// escalation_2 channel buttons until "Начать новый диалог". Persisted across reloads.
	escalationContactsSent: boolean;
}

export interface Message {
	id: string;
	content: string;
	type: MessageType;
	author: 'user' | 'bot';
	timestamp: number;
	meta?: {
		csatUuid?: string;
		rating?: CsatRating;
	};
}

export interface MessageHandlers {
	onChannelSelect: (ch: 'telegram' | 'max' | 'email') => void;
	onCsatRate: (csatUuid: string, rating: CsatRating) => void;
	onCsatReason: (csatUuid: string, rating: CsatRating, reason: string) => Promise<void>;
	onContactManager: () => void;
}

export interface WidgetContext {
	store: Store<WidgetStore>;
	onDestroy: (fn: () => void) => void;
}

export interface LibredeskConfig {
	baseUrl: string;
	inboxId: string;
}
