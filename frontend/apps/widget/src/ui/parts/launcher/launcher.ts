import { el, iconLabelButton } from '@utils';

export const createLauncher = (onClick: () => void): HTMLDivElement => {
	const launcherButton = iconLabelButton({
		className: 'chat-launcher__button',
		icon: 'chat',
		ariaLabel: 'Открыть чат',
		onClick,
	});

	const chatLabel = el('div', {
		className: 'chat-launcher__label',
		text: 'ИИ-консультант',
		attrs: { 'aria-hidden': 'true' },
	});

	return el('div', { className: 'chat-launcher' }, [launcherButton, chatLabel]);
};
