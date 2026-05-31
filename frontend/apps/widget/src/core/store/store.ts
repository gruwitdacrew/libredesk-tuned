type EventHandler<S = unknown> = (state: Readonly<S>) => void;
type Unsubscribe = () => boolean;
type StoreSelector<S, T> = (state: Readonly<S>) => T;

interface Subscribe<S extends object> {
	(eventHandler: EventHandler<S>): Unsubscribe;
	<R>(selector: StoreSelector<S, R>, eventHandler: EventHandler<R>): Unsubscribe;
}

export interface Store<T extends object> {
	getStore: () => Readonly<T>;
	setStore: (setter: (state: Readonly<T>) => Readonly<T>) => void;
	subscribe: Subscribe<T>;
}

export const createStore = <T extends object>(initialState: T): Store<T> => {
	let store: T = initialState;
	const listeners = new Set<EventHandler<T>>();

	const subscribe: Subscribe<T> = <R>(
		selectorOrHandler: EventHandler<T> | StoreSelector<T, R>,
		eventHandler?: EventHandler<R>,
	): Unsubscribe => {
		if (eventHandler) {
			let prevSelected = selectorOrHandler(store) as R;

			const wrapper: EventHandler<T> = (newState: Readonly<T>) => {
				const next = selectorOrHandler(newState) as R;
				if (next !== prevSelected) {
					prevSelected = next;
					eventHandler(next);
				}
			};

			listeners.add(wrapper);

			return () => listeners.delete(wrapper);
		}

		listeners.add(selectorOrHandler);

		return () => listeners.delete(selectorOrHandler);
	};

	function getStore(): Readonly<T> {
		return store;
	}

	function setStore(setter: (state: Readonly<T>) => T): void {
		store = setter(store);

		for (const handler of listeners) {
			handler(store);
		}
	}

	return {
		getStore,
		setStore,
		subscribe,
	};
};
