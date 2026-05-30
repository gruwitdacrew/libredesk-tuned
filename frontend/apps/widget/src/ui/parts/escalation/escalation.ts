import createIcon from '@icons';
import type { WidgetContext } from '@types';

export const createEscalationBanner = (ctx: WidgetContext, onReset: () => void): HTMLElement => {
	const banner = document.createElement('div');
	banner.className = 'escalation';

	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'escalation__btn';

	button.append(createIcon('addNew'));

	const label = document.createElement('span');
	label.textContent = 'Начать новый диалог';
	button.append(label);

	button.addEventListener('click', onReset);

	banner.append(button);

	const setVisible = (visible: boolean): void => {
		banner.classList.toggle('escalation--visible', visible);
	};

	const isBannerVisible = (s: ReturnType<typeof ctx.store.getStore>): boolean =>
		s.botStatus === 'escalated' && s.escalation2State === null;

	setVisible(isBannerVisible(ctx.store.getStore()));

	ctx.onDestroy(ctx.store.subscribe(
		(s) => s,
		(state) => { setVisible(isBannerVisible(state)); },
	));

	return banner;
};
