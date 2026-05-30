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

type IconName = keyof typeof ICONS_SOURCE;

const parsedIcons: Partial<Record<IconName, SVGSVGElement>> = {};

/**
 * использовать только для статических иконок!
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
