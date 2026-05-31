import type { Message } from '@types';

export default {
	id: 'greet-message',
	content: `Здравствуйте!\n\nНапишите, что вас интересует – я постараюсь помочь.`,
	type: 'plain',
	author: 'bot',
	timestamp: 0,
} as Message;
