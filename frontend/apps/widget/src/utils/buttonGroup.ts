/**
 * Помощники для групп кнопок-выбора (каналы эскалации, оценка CSAT).
 *
 * Список сообщений только дополняется и при ре-рендере не пересоздаёт уже
 * вставленные узлы, поэтому состояние выбора/блокировки сохраняется «на месте».
 */

/** Подсвечивает выбранную кнопку (`is-selected`), не блокируя группу. */
export const selectChoice = (all: readonly HTMLButtonElement[], picked: HTMLButtonElement): void => {
	for (const button of all) {
		button.classList.toggle('is-selected', button === picked);
	}
};

/** Блокирует всю группу: невыбранные гасит (`is-disabled`), выбор остаётся виден. */
export const lockChoice = (all: readonly HTMLButtonElement[]): void => {
	for (const button of all) {
		button.classList.toggle('is-disabled', !button.classList.contains('is-selected'));
		button.disabled = true;
	}
};

/** Снимает выбор и блокировку — например, чтобы дать повторить неудавшийся запрос. */
export const unlockChoice = (all: readonly HTMLButtonElement[]): void => {
	for (const button of all) {
		button.classList.remove('is-selected', 'is-disabled');
		button.disabled = false;
	}
};
