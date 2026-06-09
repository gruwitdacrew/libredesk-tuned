import createIcon from '@icons';
import { el } from '@utils';

export const createHeader = (onClick: (event: Event) => void): HTMLElement => {
	const botAvatar = el('div', { className: 'bot-info__avatar' }, [createIcon('avatar')]);

	const botCredentials = el('div', { className: 'bot-info__credentials' }, [
		el('p', { id: 'panel-title', className: 'bot-info__title', text: 'ИИ-консультант' }),
		el('p', { className: 'bot-info__status', text: 'Онлайн' }),
	]);

	const botInfo = el('div', { className: 'bot-info' }, [botAvatar, botCredentials]);

	const closeButton = el(
		'button',
		{ className: 'panel__close', attrs: { type: 'button', 'aria-label': 'Закрыть чат' }, onClick },
		[el('span', { className: 'panel__close-line' })],
	);

	return el('header', { className: 'panel__header' }, [botInfo, closeButton]);
};
