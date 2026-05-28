const showElement = (el: HTMLElement): void => {
	el.style.removeProperty('display');
	el.getBoundingClientRect();
	el.classList.remove('is-hidden');
};

const hideElement = (el: HTMLElement): void => {
	el.classList.add('is-hidden');
	el.addEventListener(
		'transitionend',
		() => {
			el.style.setProperty('display', 'none');
		},
		{ once: true },
	);
};

export { showElement, hideElement };
