import type { CsatRating } from '@types';
import { el, iconLabelButton, lockChoice, selectChoice, unlockChoice } from '@utils';
import { csatReasons } from '../../../core/static/csatMessages';

/** Шаг 1: кнопки оценки ответа (👍 Полезно = 2, 👎 Бесполезно = 1). */
export const buildCsatRatingBtns = (
	csatUuid: string,
	onCsatRate: (csatUuid: string, rating: CsatRating) => void,
): HTMLElement => {
	const btns = el('div', { className: 'csat-rating-btns' });
	const all: HTMLButtonElement[] = [];

	const configs: { label: string; rating: CsatRating; mod: 'up' | 'down' }[] = [
		{ label: 'Полезно', rating: 2, mod: 'up' },
		{ label: 'Бесполезно', rating: 1, mod: 'down' },
	];

	for (const { label, rating, mod } of configs) {
		const button = iconLabelButton({
			className: `csat-rating-btns__btn csat-rating-btns__btn--${mod}`,
			icon: 'thumb',
			label,
			onClick: () => {
				selectChoice(all, button);
				lockChoice(all);
				onCsatRate(csatUuid, rating);
			},
		}) as HTMLButtonElement;
		all.push(button);
		btns.append(button);
	}

	return btns;
};

/** Шаг 2: кнопки причины — набор зависит от оценки (позитивный/негативный). */
export const buildCsatReasonBtns = (
	csatUuid: string,
	rating: CsatRating,
	onCsatReason: (csatUuid: string, rating: CsatRating, reason: string) => Promise<void>,
): HTMLElement => {
	const btns = el('div', { className: 'csat-reason-btns' });
	const all: HTMLButtonElement[] = [];

	for (const reason of csatReasons(rating)) {
		const button = iconLabelButton({
			className: 'csat-reason-btns__btn',
			label: reason,
			onClick: () => {
				selectChoice(all, button);
				lockChoice(all);
				void onCsatReason(csatUuid, rating, reason).catch(() => {
					unlockChoice(all);
				});
			},
		}) as HTMLButtonElement;
		all.push(button);
		btns.append(button);
	}

	return btns;
};
