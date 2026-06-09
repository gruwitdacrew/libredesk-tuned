import type { Message, MessageHandlers, WidgetContext } from '@types';
import { el, renderContent } from '@utils';
import { buildEscalation1Btns } from './escalation1';
import { buildEscalation2Btns } from './escalation2';
import { buildCsatRatingBtns, buildCsatReasonBtns } from './csat';

export const createMessage = (
	ctx: WidgetContext,
	msg: Message,
	messageTime: string,
	handlers: MessageHandlers,
): HTMLElement => {
	const messageText = el('p', { className: 'message__text' });
	if (msg.author === 'bot') {
		messageText.innerHTML = renderContent(msg.content);
	} else {
		messageText.textContent = msg.content;
	}

	const message = el(
		'div',
		{ className: msg.author === 'bot' ? 'message' : 'message message--user' },
		[messageText],
	);

	if (messageTime.length > 0) {
		message.append(el('span', { className: 'message__time', text: messageTime }));
	}

	const wrapper = el('div', { className: 'message-wrapper' }, [message]);

	if (msg.type === 'escalation_1') {
		wrapper.classList.add('message-wrapper--escalation');
		wrapper.append(buildEscalation1Btns());
	} else if (msg.type === 'escalation_2') {
		wrapper.classList.add('message-wrapper--escalation');
		wrapper.append(buildEscalation2Btns(ctx, handlers.onChannelSelect));
	} else if (msg.type === 'csat' && msg.meta?.csatUuid !== undefined) {
		wrapper.classList.add('message-wrapper--csat');
		wrapper.append(buildCsatRatingBtns(msg.meta.csatUuid, handlers.onCsatRate, msg.meta.rating));
	} else if (
		msg.type === 'csat_reason' &&
		msg.meta?.csatUuid !== undefined &&
		msg.meta.rating !== undefined
	) {
		wrapper.classList.add('message-wrapper--csat');
		wrapper.append(buildCsatReasonBtns(msg.meta.csatUuid, msg.meta.rating, handlers.onCsatReason));
	}

	return wrapper;
};
