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

	// "Диалог завершен" text — shown in place of the input once the dialog is finished.
	const doneText = document.createElement('p');
	doneText.className = 'composer__done-text is-hidden';
	doneText.textContent = 'Диалог завершен';

	// Restart button — shown both in the finished view (with the text above) and during
	// the escalation_2 channel-picker step, where it sits below the still-visible (locked) input.
	const restartBtn = document.createElement('button');
	restartBtn.type = 'button';
	restartBtn.className = 'composer__restart is-hidden';
	restartBtn.append(createIcon('addNew'));
	const restartLabel = document.createElement('span');
	restartLabel.textContent = 'Начать новый диалог';
	restartBtn.append(restartLabel);
	restartBtn.addEventListener('click', onReset);

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
		// escalation_2 channel-picker step: keep the (locked) input, but offer a restart.
		const selectingChannel = s.escalation2State === 'select_channel';

		composer.classList.toggle('is-hidden', completed);
		counter.classList.toggle('is-hidden', completed);
		doneText.classList.toggle('is-hidden', !completed);
		restartBtn.classList.toggle('is-hidden', !(completed || selectingChannel));
		// On the channel-picker step the button sits above the (locked) input; in the
		// finished view it stays below the "Диалог завершен" text (default order).
		restartBtn.classList.toggle('composer__restart--top', selectingChannel);

		const ch = s.escalation2State;
		textarea.placeholder = ch === 'telegram' || ch === 'max' || ch === 'email'
			? CHANNEL_PLACEHOLDERS[ch]
			: DEFAULT_PLACEHOLDER;

		setLocked(s.escalation2State === 'select_channel');
	};

	sync();
	ctx.onDestroy(ctx.store.subscribe((s) => s, () => { sync(); }));

	composer.append(textarea, buttonSend);
	wrapper.append(composer, counter, doneText, restartBtn);

	return wrapper;
};
