import createIcon, { type IconName } from '@icons';

interface ElProps {
	className?: string;
	id?: string;
	text?: string;
	attrs?: Record<string, string>;
	onClick?: (event: Event) => void;
}

/**
 * Создаёт DOM-элемент с типичным набором свойств (класс, id, текст, атрибуты,
 * обработчик клика) и добавляет переданных потомков. Заменяет повторяющуюся
 * цепочку createElement → className → setAttribute → append по всем компонентам.
 */
export const el = <K extends keyof HTMLElementTagNameMap>(
	tag: K,
	props: ElProps = {},
	children: readonly (Node | string)[] = [],
): HTMLElementTagNameMap[K] => {
	const node = document.createElement(tag);
	if (props.className !== undefined) {
		node.className = props.className;
	}
	if (props.id !== undefined) {
		node.id = props.id;
	}
	if (props.text !== undefined) {
		node.textContent = props.text;
	}
	if (props.attrs !== undefined) {
		for (const [name, value] of Object.entries(props.attrs)) {
			node.setAttribute(name, value);
		}
	}
	if (props.onClick !== undefined) {
		node.addEventListener('click', props.onClick);
	}
	for (const child of children) {
		node.append(child);
	}
	return node;
};

interface IconLabelButtonOptions {
	className: string;
	icon?: IconName;
	label?: string;
	ariaLabel?: string;
	/** Непустая строка делает кнопку ссылкой (`<a target="_blank">`); иначе — `<button type="button">`. */
	href?: string | null;
	onClick?: (event: Event) => void;
}

/**
 * Кнопка/ссылка с иконкой и текстовой подписью — единый билдер для launcher,
 * композера, шапки, кнопок эскалации и CSAT.
 */
export const iconLabelButton = (
	options: IconLabelButtonOptions,
): HTMLAnchorElement | HTMLButtonElement => {
	const isLink = typeof options.href === 'string' && options.href.length > 0;
	const node: HTMLAnchorElement | HTMLButtonElement = isLink
		? document.createElement('a')
		: document.createElement('button');

	node.className = options.className;

	if (node instanceof HTMLAnchorElement) {
		node.href = options.href as string;
		node.target = '_blank';
		node.rel = 'noopener noreferrer';
	} else {
		node.type = 'button';
	}

	if (options.ariaLabel !== undefined) {
		node.setAttribute('aria-label', options.ariaLabel);
	}
	if (options.icon !== undefined) {
		node.append(createIcon(options.icon));
	}
	if (options.label !== undefined) {
		const span = document.createElement('span');
		span.textContent = options.label;
		node.append(span);
	}
	if (options.onClick !== undefined) {
		node.addEventListener('click', options.onClick);
	}

	return node;
};
