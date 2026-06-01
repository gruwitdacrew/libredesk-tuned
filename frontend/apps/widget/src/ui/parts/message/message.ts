import createIcon from '@icons';
import type { CsatRating, Message, MessageHandlers } from '@types';
import { renderContent } from '@utils';
import { csatReasons } from '../../../core/static/csatMessages';

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

	// These come from build-time env and may be undefined when not set in .env.
	const tg = import.meta.env.VITE_ESCALATION_TELEGRAM ?? '';
	const email = import.meta.env.VITE_ESCALATION_EMAIL ?? '';

	const configs: BtnConfig[] = [
		{ icon: 'telegram', label: 'Telegram', mod: 'tg',    href: tg.length > 0 ? `https://t.me/${tg}` : null },
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

// Lock a button group after a choice: highlight the picked button, fade the rest,
// and disable all so the answer can't be changed. Re-rendering never touches these
// nodes (message list is append-only), so the in-place state persists.
const lockChoice = (all: HTMLButtonElement[], picked: HTMLButtonElement): void => {
	for (const b of all) {
		b.classList.toggle('is-selected', b === picked);
		b.classList.toggle('is-disabled', b !== picked);
		b.disabled = true;
	}
};

const unlockChoice = (all: HTMLButtonElement[]): void => {
	for (const b of all) {
		b.classList.remove('is-selected', 'is-disabled');
		b.disabled = false;
	}
};

// Step 1: rating buttons (👍 Полезно = 2, 👎 Бесполезно = 1).
const buildCsatRatingBtns = (
	csatUuid: string,
	onCsatRate: (csatUuid: string, rating: CsatRating) => void,
): HTMLElement => {
	const btns = document.createElement('div');
	btns.className = 'csat-rating-btns';

	const configs: { label: string; rating: CsatRating; mod: 'up' | 'down' }[] = [
		{ label: 'Полезно',    rating: 2, mod: 'up' },
		{ label: 'Бесполезно', rating: 1, mod: 'down' },
	];

	const all: HTMLButtonElement[] = [];

	for (const { label, rating, mod } of configs) {
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = `csat-rating-btns__btn csat-rating-btns__btn--${mod}`;
		btn.append(createIcon('thumb'));
		const span = document.createElement('span');
		span.textContent = label;
		btn.append(span);
		btn.addEventListener('click', () => {
			lockChoice(all, btn);
			onCsatRate(csatUuid, rating);
		});
		all.push(btn);
		btns.append(btn);
	}

	return btns;
};

// Step 2: reason buttons — the set depends on the rating (positive vs negative).
const buildCsatReasonBtns = (
	csatUuid: string,
	rating: CsatRating,
	onCsatReason: (csatUuid: string, rating: CsatRating, reason: string) => Promise<void>,
): HTMLElement => {
	const btns = document.createElement('div');
	btns.className = 'csat-reason-btns';

	const all: HTMLButtonElement[] = [];

	for (const reason of csatReasons(rating)) {
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'csat-reason-btns__btn';
		btn.textContent = reason;
		btn.addEventListener('click', () => {
			lockChoice(all, btn);
			void onCsatReason(csatUuid, rating, reason).catch(() => {
				// submit failed — re-enable so the user can retry
				unlockChoice(all);
			});
		});
		all.push(btn);
		btns.append(btn);
	}

	return btns;
};

export const createMessage = (
	msg: Message,
	messageTime: string,
	handlers: MessageHandlers,
): HTMLElement => {
	const wrapper = document.createElement('div');
	wrapper.className = 'message-wrapper';

	const message = document.createElement('div');
	message.className = msg.author === 'bot' ? 'message' : 'message message--user';

	const messageText = document.createElement('p');
	messageText.className = 'message__text';
	if (msg.author === 'bot') {
		messageText.innerHTML = renderContent(msg.content);
	} else {
		messageText.textContent = msg.content;
	}

	message.append(messageText);

	if (messageTime.length > 0) {
		const time = document.createElement('span');
		time.className = 'message__time';
		time.textContent = messageTime;
		message.append(time);
	}
	wrapper.append(message);

	if (msg.type === 'escalation_1') {
		wrapper.classList.add('message-wrapper--escalation');
		wrapper.append(buildEscalation1Btns());
	} else if (msg.type === 'escalation_2') {
		wrapper.classList.add('message-wrapper--escalation');
		wrapper.append(buildEscalation2Btns(handlers.onChannelSelect));
	} else if (msg.type === 'csat' && msg.meta?.csatUuid !== undefined) {
		wrapper.classList.add('message-wrapper--csat');
		wrapper.append(buildCsatRatingBtns(msg.meta.csatUuid, handlers.onCsatRate));
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
