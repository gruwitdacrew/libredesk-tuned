import { createChat, createComposer, createEscalationBanner, createHeader, createLoader } from '@parts';
import type { MessageHandlers, WidgetContext } from '@types';

export const createPanel = (
	ctx: WidgetContext,
	onClose: () => void,
	onSend: (text: string) => void,
	onReset: () => void,
	handlers: MessageHandlers,
): HTMLElement => {
	const panel = document.createElement('section');

	panel.className = 'panel';
	panel.setAttribute('role', 'dialog');
	panel.setAttribute('aria-modal', 'true');
	panel.setAttribute('aria-labelledby', 'panel-title');

	const header = createHeader(onClose);
	const chat = createChat(ctx, handlers);
	const loader = createLoader(ctx);
	const escalation = createEscalationBanner(ctx, onReset);
	const composer = createComposer(ctx, onSend);

	panel.append(header, chat, loader, escalation, composer);

	return panel;
};
