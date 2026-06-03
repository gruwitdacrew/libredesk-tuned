import createIcon from '@icons';
import type { WidgetContext } from '@types';

const MAX_LENGTH = 4000;
const WARN_THRESHOLD = MAX_LENGTH * 0.95;
const VISIBLE_THRESHOLD = MAX_LENGTH * 0.8;

const DEFAULT_PLACEHOLDER = 'Напишите сообщение...';
const CHANNEL_PLACEHOLDERS: Record<'telegram' | 'max' | 'email', string> = {
	telegram: 'Введите ваш никнейм в Telegram',
	max: 'Введите ваш никнейм в MAX',
	email: 'Введите вашу почту',
};

export const createComposer = (
	ctx: WidgetContext,
	onSend: (text: string) => void,
	onReset: () => void,
): HTMLElement => {
	const wrapper = document.createElement('div');
	wrapper.className = 'composer__wrapper';

	const composer = document.createElement('form');
	composer.className = 'composer';

	const textarea = document.createElement('textarea');
	textarea.className = 'composer__input';
	textarea.placeholder = DEFAULT_PLACEHOLDER;
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

	// "Диалог завершен" view — replaces the input once the conversation is finished.
	const done = document.createElement('div');
	done.className = 'composer__done';

	const doneText = document.createElement('p');
	doneText.className = 'composer__done-text';
	doneText.textContent = 'Диалог завершен';

	const restartBtn = document.createElement('button');
	restartBtn.type = 'button';
	restartBtn.className = 'composer__restart';
	restartBtn.append(createIcon('addNew'));
	const restartLabel = document.createElement('span');
	restartLabel.textContent = 'Начать новый диалог';
	restartBtn.append(restartLabel);
	restartBtn.addEventListener('click', onReset);

	done.append(doneText, restartBtn);

	const setLocked = (locked: boolean): void => {
		textarea.disabled = locked;
		if (locked) {
			buttonSend.disabled = true;
		} else {
			updateCounter();
		}
	};

	const sync = (): void => {
		const s = ctx.store.getStore();
		// Dialog finished (escalation_1 closed, or escalation_2 closed after contacts).
		const completed = s.botStatus === 'escalated' && s.escalation2State === null;

		composer.classList.toggle('is-hidden', completed);
		counter.classList.toggle('is-hidden', completed);
		done.classList.toggle('composer__done--visible', completed);

		const ch = s.escalation2State;
		textarea.placeholder = ch === 'telegram' || ch === 'max' || ch === 'email'
			? CHANNEL_PLACEHOLDERS[ch]
			: DEFAULT_PLACEHOLDER;

		setLocked(s.escalation2State === 'select_channel');
	};

	sync();
	ctx.onDestroy(ctx.store.subscribe((s) => s, () => { sync(); }));

	composer.append(textarea, buttonSend);
	wrapper.append(composer, counter, done);

	return wrapper;
};
