import type { WidgetContext } from '@types';

const PHRASES_1 = [
	'Обрабатываю запрос',
	'Анализирую данные',
	'Проверяю источники',
	'Ищу информацию',
	'Формирую ответ',
	'Думаю',
] as const;

const PHRASES_2 = [
	'Ещё немного времени...',
	'Уже скоро...',
	'Ещё минутку...',
	'Осталось чуть-чуть',
] as const;

const INTERVAL_1 = 2_000;
const INTERVAL_2 = 3_000;
const LONG_THRESHOLD = 60_000;
const HAPPY_PATH_DELAY = 400;

export const createLoader = (ctx: WidgetContext): HTMLElement => {
	const loader = document.createElement('div');
	loader.className = 'loader';
	loader.setAttribute('aria-live', 'polite');
	loader.setAttribute('aria-label', 'Бот обрабатывает запрос');

	const text = document.createElement('span');
	text.className = 'loader__text';
	loader.append(text);

	let happyTimer: number | null = null;
	let phase1Timer: number | null = null;
	let phase2Timer: number | null = null;
	let longTimer: number | null = null;
	let p2Index = 0;

	const stopAll = (): void => {
		if (happyTimer !== null) { window.clearTimeout(happyTimer); happyTimer = null; }
		if (phase1Timer !== null) { window.clearTimeout(phase1Timer); phase1Timer = null; }
		if (phase2Timer !== null) { window.clearTimeout(phase2Timer); phase2Timer = null; }
		if (longTimer !== null) { window.clearTimeout(longTimer); longTimer = null; }
	};

	const startPhase2 = (): void => {
		if (phase1Timer !== null) { window.clearTimeout(phase1Timer); phase1Timer = null; }
		p2Index = 0;
		text.textContent = PHRASES_2[0];

		const cycle = (): void => {
			p2Index = (p2Index + 1) % PHRASES_2.length;
			text.textContent = PHRASES_2[p2Index] ?? '';
			phase2Timer = window.setTimeout(cycle, INTERVAL_2);
		};
		phase2Timer = window.setTimeout(cycle, INTERVAL_2);
	};

	const startPhase1 = (): void => {
		let idx = 0;
		text.textContent = PHRASES_1[0];

		const cycle = (): void => {
			idx += 1;
			text.textContent = PHRASES_1[idx] ?? '';

			if (idx < PHRASES_1.length - 1) {
				phase1Timer = window.setTimeout(cycle, INTERVAL_1);
			} else {
				phase1Timer = null;
			}
		};

		phase1Timer = window.setTimeout(cycle, INTERVAL_1);
		longTimer = window.setTimeout(startPhase2, LONG_THRESHOLD);
	};

	const show = (): void => {
		stopAll();
		happyTimer = window.setTimeout(() => {
			happyTimer = null;
			loader.classList.add('loader--visible');
			startPhase1();
		}, HAPPY_PATH_DELAY);
	};

	const hide = (): void => {
		stopAll();
		loader.classList.remove('loader--visible');
	};

	const initial = ctx.store.getStore();
	if (initial.isAwaitingReply) { show(); }

	ctx.onDestroy(ctx.store.subscribe(
		(s) => s.isAwaitingReply,
		(isAwaiting) => { if (isAwaiting.valueOf()) { show(); } else { hide(); } },
	));

	ctx.onDestroy(hide);

	return loader;
};
