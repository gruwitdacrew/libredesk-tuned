import createIcon from '@icons';
import type { WidgetContext } from '@types';

const MAX_LENGTH = 4000;
const WARN_THRESHOLD = MAX_LENGTH * 0.95;
const VISIBLE_THRESHOLD = MAX_LENGTH * 0.8;

export const createComposer = (ctx: WidgetContext, onSend: (text: string) => void): HTMLElement => {
	const wrapper = document.createElement('div');
	wrapper.className = 'composer__wrapper';

	const composer = document.createElement('form');
	composer.className = 'composer';

	const textarea = document.createElement('textarea');
	textarea.className = 'composer__input';
	textarea.placeholder = 'Напишите сообщение...';
	textarea.setAttribute('aria-label', 'Введите сообщение');
	textarea.maxLength = MAX_LENGTH;

	const buttonSend = document.createElement('button');
	buttonSend.type = 'button';
	buttonSend.className = 'composer__send';
	buttonSend.setAttribute('aria-label', 'Отправить сообщение');

	buttonSend.append(createIcon('send'));

	const counter = document.createElement('span');
	counter.className = 'composer__counter';
	counter.setAttribute('aria-live', 'polite');

	const handleSend = (): void => {
		const text = textarea.value.trim();
		if (text.length === 0) {
			return;
		}
		onSend(text);
		textarea.value = '';
		textarea.focus();
		updateCounter();
	};

	const updateCounter = (): void => {
		const len = textarea.value.length;
		counter.textContent = `${String(len)} / ${String(MAX_LENGTH)}`;
		counter.classList.toggle('composer__counter--visible', len >= VISIBLE_THRESHOLD);
		counter.classList.toggle('composer__counter--warn', len >= WARN_THRESHOLD);
		buttonSend.disabled = len === 0;
	};

	buttonSend.addEventListener('click', handleSend);

	textarea.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	});

	textarea.addEventListener('input', updateCounter);

	buttonSend.disabled = true;

	const setLocked = (locked: boolean): void => {
		textarea.disabled = locked;
		if (locked) {
			buttonSend.disabled = true;
		} else {
			updateCounter();
		}
	};

	const syncLocked = (): void => {
		const s = ctx.store.getStore();
		const escalatedNoChannel = s.botStatus === 'escalated' && s.escalation2State === null;
		setLocked(s.isAwaitingReply || s.escalation2State === 'select_channel' || escalatedNoChannel);
	};

	syncLocked();
	ctx.onDestroy(ctx.store.subscribe((s) => s, () => { syncLocked(); }));

	composer.append(textarea, buttonSend);
	wrapper.append(composer, counter);

	return wrapper;
};
