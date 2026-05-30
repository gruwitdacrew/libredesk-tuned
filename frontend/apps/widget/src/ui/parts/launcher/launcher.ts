import createIcon from '@icons';

export const createLauncher = (onClick: () => void): HTMLDivElement => {
	const element = document.createElement('div');
	element.className = 'chat-launcher';

	const launcherButton = document.createElement('button');
	launcherButton.className = 'chat-launcher__button';
	launcherButton.setAttribute('aria-label', 'Открыть чат');
	launcherButton.append(createIcon('chat'));

	launcherButton.addEventListener('click', onClick);

	const chatLabel = document.createElement('div');
	chatLabel.textContent = 'ИИ-консультант';
	chatLabel.className = 'chat-launcher__label';
	chatLabel.setAttribute('aria-hidden', 'true');

	element.append(launcherButton, chatLabel);

	return element;
};
