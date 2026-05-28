import type { Store } from '@store';
import type { WidgetStore } from '../types/widget.types';

interface UIActions {
	toggleChat: (isOpen: boolean) => void;
}

export const createUIActions = (store: Store<WidgetStore>): UIActions => ({
	toggleChat: (isOpen: boolean) => {
		store.setStore((state) => ({
			...state,
			isOpen,
		}));
	},
});
