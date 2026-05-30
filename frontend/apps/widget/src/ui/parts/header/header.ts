import createIcon from '@icons';

export const createHeader = (onClick: (e: Event) => void): HTMLElement => {
	const header = document.createElement('header');
	header.className = 'panel__header';

	const botAvatar = document.createElement('div');
	botAvatar.className = 'bot-info__avatar';
	const profileIcon = createIcon('avatar');

	botAvatar.append(profileIcon);

	const botCredentials = document.createElement('div');
	botCredentials.className = 'bot-info__credentials';

	const title = document.createElement('p');
	title.id = 'panel-title';
	title.className = 'bot-info__title';
	title.textContent = 'ИИ-консультант';

	const status = document.createElement('p');
	status.className = 'bot-info__status';
	status.textContent = 'Онлайн';

	botCredentials.append(title, status);

	const botInfo = document.createElement('div');
	botInfo.className = 'bot-info';

	botInfo.append(botAvatar, botCredentials);

	const closeButton = document.createElement('button');

	closeButton.type = 'button';
	closeButton.className = 'panel__close';
	closeButton.setAttribute('aria-label', 'Закрыть чат');
	closeButton.addEventListener('click', onClick);

	const line = document.createElement('span');

	line.className = 'panel__close-line';

	closeButton.append(line);

	header.append(botInfo, closeButton);

	return header;
};
