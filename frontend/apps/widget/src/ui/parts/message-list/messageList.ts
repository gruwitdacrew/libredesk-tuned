import createIcon from '@icons';
import type { Message, WidgetContext } from '@types';
import { formatTime } from '@utils';
import { createMessage } from '../message/message';

export const createChat = (ctx: WidgetContext, onChannelSelect: (ch: 'telegram' | 'max' | 'email') => void): HTMLElement => {
	const chat = document.createElement('div');
	chat.className = 'chat';

	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'chat__contact';

	const span = document.createElement('span');
	span.textContent = 'Связаться с руководителем направления';

	button.append(createIcon('user'), span);

	chat.append(button);

	const messagesEl = document.createElement('div');
	messagesEl.className = 'chat__messages';
	messagesEl.setAttribute('role', 'log');
	messagesEl.setAttribute('aria-live', 'polite');
	messagesEl.setAttribute('aria-label', 'История чата');

	const rendered = { count: 0 };

	const renderNewMessages = (messages: readonly Message[]): void => {
		if (messages.length < rendered.count) {
			messagesEl.innerHTML = '';
			rendered.count = 0;
		}
		for (const msg of messages.slice(rendered.count)) {
			messagesEl.append(createMessage(msg.content, formatTime(msg.timestamp), msg.type, msg.author, onChannelSelect));
		}
		rendered.count = messages.length;
		messagesEl.scrollTop = messagesEl.scrollHeight;
	};

	renderNewMessages(ctx.store.getStore().messages);

	ctx.onDestroy(ctx.store.subscribe(
		(state) => state.messages,
		renderNewMessages,
	));

	chat.append(messagesEl);

	return chat;
};
