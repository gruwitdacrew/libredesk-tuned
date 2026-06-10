import type { Message } from '@types';

export default {
	id: 'greet-message',
	content: `Здравствуйте!\n\nКакой вопрос вас интересует?`,
	type: 'plain',
	author: 'bot',
	timestamp: 0,
} as Message;
