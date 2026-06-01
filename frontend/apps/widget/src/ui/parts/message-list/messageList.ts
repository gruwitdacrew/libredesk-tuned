import createIcon from '@icons';
import type { Message, MessageHandlers, WidgetContext } from '@types';
import { formatTime } from '@utils';
import { createMessage } from '../message/message';

export const createChat = (ctx: WidgetContext, handlers: MessageHandlers): HTMLElement => {
	const chat = document.createElement('div');
	chat.className = 'chat';

	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'chat__contact';

	const span = document.createElement('span');
	span.textContent = 'Связаться с руководителем направления';

	button.append(createIcon('user'), span);

	button.addEventListener('click', () => { handlers.onContactManager(); });

	const setButtonState = (state: WidgetContext['store'])=>{
		if(state.botStatus === 'escalated' || state.escalation2State !== null) {
		button.style.opacity = '0.6';
		button.disabled = true;
		button.style.pointerEvents = 'none';
	} else {
		button.disabled = false;
		button.style.opacity = '1';
		button.style.pointerEvents = 'all';
	}
	return;
	}

	const button_remover = ctx.store.subscribe(setButtonState);

	ctx.onDestroy(button_remover);
	
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
			messagesEl.append(createMessage(msg, formatTime(msg.timestamp), handlers));
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
