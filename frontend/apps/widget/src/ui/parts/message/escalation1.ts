import type { Channel } from '@types';
import { el, iconLabelButton } from '@utils';
import { CHANNELS, CHANNEL_ORDER } from '../../../core/static/channels';

/**
 * Значения каналов из build-time env. Доступ должен быть прямым (`import.meta.env.VITE_*`),
 * иначе Vite не подставит их при сборке. Пустая строка → кнопка остаётся неактивной.
 */
const ENV_HREF: Record<Channel, string> = {
	telegram: import.meta.env.VITE_ESCALATION_TELEGRAM ?? '',
	max: import.meta.env.VITE_ESCALATION_MAX ?? '',
	email: import.meta.env.VITE_ESCALATION_EMAIL ?? '',
};

export const buildEscalation1Btns = (): HTMLElement => {
	const btns = el('div', { className: 'escalation-btns' });

	for (const channel of CHANNEL_ORDER) {
		const meta = CHANNELS[channel];
		btns.append(
			iconLabelButton({
				className: `escalation-btns__btn escalation-btns__btn--${meta.mod}`,
				icon: meta.icon,
				label: meta.label,
				href: meta.toHref(ENV_HREF[channel]),
			}),
		);
	}

	return btns;
};
