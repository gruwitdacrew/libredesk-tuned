import createIcon from '@icons';
import type { MessageType } from '@types';
import { renderContent } from '@utils';

type Channel = 'telegram' | 'max' | 'email';
type IconName = 'telegram' | 'max' | 'email';

interface BtnConfig {
	icon: IconName;
	label: string;
	mod: string;
	href: string | null;
}

const buildContactBtn = ({ icon, label, mod, href }: BtnConfig): HTMLElement => {
	const el: HTMLAnchorElement | HTMLButtonElement = href !== null
		? document.createElement('a')
		: document.createElement('button');

	if (el instanceof HTMLAnchorElement && href !== null) {
		el.href = href;
		el.target = '_blank';
		el.rel = 'noopener noreferrer';
	} else if (el instanceof HTMLButtonElement) {
		el.type = 'button';
	}

	el.className = `escalation-btns__btn escalation-btns__btn--${mod}`;
	el.append(createIcon(icon));
	const span = document.createElement('span');
	span.textContent = label;
	el.append(span);
	return el;
};

const buildEscalation1Btns = (): HTMLElement => {
	const btns = document.createElement('div');
	btns.className = 'escalation-btns';

	const tg = import.meta.env.VITE_ESCALATION_TELEGRAM;
	const email = import.meta.env.VITE_ESCALATION_EMAIL;

	const configs: BtnConfig[] = [
		{ icon: 'telegram', label: 'Telegram', mod: 'tg',    href: `https://t.me/${tg}` },
		{ icon: 'max',      label: 'MAX',       mod: '1984',  href: null },
		{ icon: 'email',    label: 'Почта',     mod: 'email', href: email.length > 0 ? `mailto:${email}` : null },
	];

	for (const cfg of configs) {
		btns.append(buildContactBtn(cfg));
	}

	return btns;
};

const buildEscalation2Btns = (onChannelSelect?: (ch: Channel) => void): HTMLElement => {
	const btns = document.createElement('div');
	btns.className = 'escalation-btns';

	const configs = [
		{ icon: 'telegram' as IconName, label: 'Telegram', mod: 'tg',   ch: 'telegram' as Channel },
		{ icon: 'max'      as IconName, label: 'MAX',       mod: '1984', ch: 'max'      as Channel },
		{ icon: 'email'    as IconName, label: 'Почта',     mod: 'email', ch: 'email'   as Channel },
	];

	for (const { icon, label, mod, ch } of configs) {
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = `escalation-btns__btn escalation-btns__btn--${mod}`;
		btn.append(createIcon(icon));
		const span = document.createElement('span');
		span.textContent = label;
		btn.append(span);
		btn.addEventListener('click', () => { onChannelSelect?.(ch); });
		btns.append(btn);
	}

	return btns;
};

export const createMessage = (
	messageContent: string,
	messageTime: string,
	type: MessageType,
	author: 'user' | 'bot',
	onChannelSelect?: (ch: Channel) => void,
): HTMLElement => {
	const wrapper = document.createElement('div');
	wrapper.className = 'message-wrapper';

	const message = document.createElement('div');
	message.className = author === 'bot' ? 'message' : 'message message--user';

	const messageText = document.createElement('p');
	messageText.className = 'message__text';
	if (author === 'bot') {
		messageText.innerHTML = renderContent(messageContent);
	} else {
		messageText.textContent = messageContent;
	}

	message.append(messageText);

	if (messageTime.length > 0) {
		const time = document.createElement('span');
		time.className = 'message__time';
		time.textContent = messageTime;
		message.append(time);
	}
	wrapper.append(message);

	if (type === 'escalation_1') {
		wrapper.classList.add('message-wrapper--escalation');
		wrapper.append(buildEscalation1Btns());
	} else if (type === 'escalation_2') {
		wrapper.classList.add('message-wrapper--escalation');
		wrapper.append(buildEscalation2Btns(onChannelSelect));
	}

	return wrapper;
};
