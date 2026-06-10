/**
 * Обёртка над localStorage, безопасная к недоступному хранилищу
 * (приватный режим, превышение квоты): все операции глушат исключения,
 * чтение при ошибке возвращает null.
 */
export const safeStorage = {
	get(key: string): string | null {
		try {
			return localStorage.getItem(key);
		} catch {
			return null;
		}
	},
	set(key: string, value: string): void {
		try {
			localStorage.setItem(key, value);
		} catch {
			return;
		}
	},
	remove(key: string): void {
		try {
			localStorage.removeItem(key);
		} catch {
			return;
		}
	},
};
