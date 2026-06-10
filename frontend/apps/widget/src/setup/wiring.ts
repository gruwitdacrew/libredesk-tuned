import type { WidgetContext } from '@types';
import { hideElement, showElement } from '@utils';
import type { LibredeskApi } from '../core/api/libredesk';

/**
 * Сохраняет выбор эскалации (канал + флаг отправленных контактов) между
 * перезагрузками. Селекторные подписки срабатывают только при реальном
 * изменении, поэтому localStorage не засоряется.
 */
export const wireEscalationPersistence = (ctx: WidgetContext, api: LibredeskApi): void => {
	const persist = (): void => {
		const s = ctx.store.getStore();
		api.storeEscalation({ state: s.escalation2State, sent: s.escalationContactsSent });
	};
	ctx.onDestroy(ctx.store.subscribe((s) => s.escalation2State, persist));
	ctx.onDestroy(ctx.store.subscribe((s) => s.escalationContactsSent, persist));
};

/** Переключает видимость лаунчера и панели по флагу isOpen; начальное состояние выставляется жёстко, без анимации. */
export const wirePanelVisibility = (
	ctx: WidgetContext,
	launcher: HTMLElement,
	panel: HTMLElement,
): void => {
	if (ctx.store.getStore().isOpen) {
		launcher.classList.add('is-hidden');
		launcher.style.display = 'none';
	} else {
		panel.classList.add('is-hidden');
		panel.style.display = 'none';
	}

	ctx.onDestroy(
		ctx.store.subscribe(
			(s) => s.isOpen,
			(isOpen) => {
				if (isOpen) {
					hideElement(launcher);
					showElement(panel);
				} else {
					hideElement(panel);
					showElement(launcher);
				}
			},
		),
	);
};

/**
 * Переключает классы раскладки эскалации на панели. Делается здесь, где доступен
 * panel, чтобы класс применился и при первом рендере — включая перезагрузку
 * сразу в состоянии эскалации. `panel--channel-select` резервирует место под
 * кнопку перезапуска над композером (см. .panel--channel-select в messageList.css).
 */
export const wireEscalationLayout = (ctx: WidgetContext, panel: HTMLElement): void => {
	const sync = (): void => {
		const s = ctx.store.getStore();
		const escalating = s.botStatus === 'escalated' || s.escalation2State !== null;
		panel.classList.toggle('panel--escalation', escalating);
		panel.classList.toggle('panel--channel-select', s.escalation2State === 'select_channel');
	};
	sync();
	ctx.onDestroy(ctx.store.subscribe((s) => s.botStatus, sync));
	ctx.onDestroy(ctx.store.subscribe((s) => s.escalation2State, sync));
};
