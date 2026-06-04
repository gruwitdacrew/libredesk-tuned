import createIcon from '@icons';
import type { Message, MessageHandlers, WidgetContext, WidgetStore } from '@types';
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

	const setButtonState = (state: Readonly<WidgetStore>): void => {
		const locked = state.botStatus === 'escalated' || state.escalation2State !== null;
		button.disabled = locked;
		button.style.opacity = locked ? '0.6' : '1';
		button.style.pointerEvents = locked ? 'none' : 'auto';
	};

	setButtonState(ctx.store.getStore());
	ctx.onDestroy(ctx.store.subscribe(setButtonState));

	chat.append(button);

	const messagesEl = document.createElement('div');
	messagesEl.className = 'chat__messages';
	messagesEl.setAttribute('role', 'log');
	messagesEl.setAttribute('aria-live', 'polite');
	messagesEl.setAttribute('aria-label', 'История чата');

	const rendered = { count: 0 };

	const scrollToBottom = (): void => {
		messagesEl.scrollTop = messagesEl.scrollHeight;
	};

	const renderNewMessages = (messages: readonly Message[]): void => {
		if (messages.length < rendered.count) {
			messagesEl.innerHTML = '';
			rendered.count = 0;
		}
		for (const msg of messages.slice(rendered.count)) {
			messagesEl.append(createMessage(ctx, msg, formatTime(msg.timestamp), handlers));
		}
		rendered.count = messages.length;
		scrollToBottom();
	};

	renderNewMessages(ctx.store.getStore().messages);

	ctx.onDestroy(ctx.store.subscribe(
		(state) => state.messages,
		renderNewMessages,
	));

	ctx.onDestroy(ctx.store.subscribe(
		(state) => state.isOpen,
		(isOpen) => {
			if (isOpen) requestAnimationFrame(scrollToBottom);
		},
	));

	ctx.onDestroy(ctx.store.subscribe(
		(state) => state.escalation2State,
		() => { requestAnimationFrame(scrollToBottom); },
	));

	chat.append(messagesEl);

	return chat;
};
