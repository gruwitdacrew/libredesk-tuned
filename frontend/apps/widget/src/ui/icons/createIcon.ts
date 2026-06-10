import { addNew, chat, avatar, email, max, send, telegram, thumb, user } from './source';

const ICONS_SOURCE = {
	chat,
	send,
	user,
	thumb,
	email,
	addNew,
	telegram,
	max,
	avatar,
} as const;

export type IconName = keyof typeof ICONS_SOURCE;

const parsedIcons: Partial<Record<IconName, SVGSVGElement>> = {};

/**
 * Создаёт SVG-иконку из инлайнового шаблона.
 *
 * Шаблон парсится один раз и кешируется, а наружу отдаётся клон. Использовать
 * только для статических иконок: мутация результата не затрагивает кеш, но и не
 * сохраняется между вызовами.
 */
export default function createIcon(name: IconName): SVGSVGElement {
	let icon = parsedIcons[name];

	if (icon === undefined) {
		const template = document.createElement('template');
		// eslint-disable-next-line no-restricted-syntax
		template.innerHTML = ICONS_SOURCE[name];
		icon = template.content.firstElementChild as SVGSVGElement;
		parsedIcons[name] = icon;
	}

	return icon.cloneNode(true) as SVGSVGElement;
}
