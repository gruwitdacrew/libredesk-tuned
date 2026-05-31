import { WebChat } from './widget';

const TAG = 'web-chat';

if (customElements.get(TAG) === undefined) {
	customElements.define(TAG, WebChat);
}

const mount = (): void => {
	if (document.querySelector(TAG) !== null) {
		return;
	}

	const widget = document.createElement(TAG);
	document.body.append(widget);
};

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', mount);
} else {
	mount();
}
