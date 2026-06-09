const HIDE_FALLBACK_MS = 400;

const showElement = (el: HTMLElement): void => {
	el.removeAttribute('inert');
	el.style.removeProperty('display');
	el.getBoundingClientRect();
	el.classList.remove('is-hidden');
};

const hideElement = (el: HTMLElement): void => {
	el.classList.add('is-hidden');
	// inert убирает скрытый элемент из tab-порядка на время перехода.
	el.setAttribute('inert', '');

	// display:none выставляем по завершении перехода. Запасной таймаут — на случай,
	// если transitionend не сработает (узел удалён / переход прерван). Проверка
	// is-hidden защищает от гонки show→hide (не прячем уже показанный заново элемент).
	const finish = (): void => {
		if (el.classList.contains('is-hidden')) {
			el.style.setProperty('display', 'none');
		}
	};
	el.addEventListener('transitionend', finish, { once: true });
	window.setTimeout(finish, HIDE_FALLBACK_MS);
};

export { showElement, hideElement };
