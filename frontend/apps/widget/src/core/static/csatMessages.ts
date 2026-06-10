import type { CsatRating, Message } from '@types';

/** Варианты причин после оценки ответа: позитивные для «Полезно» (2), негативные для «Бесполезно» (1). */
export const POSITIVE_REASONS: readonly string[] = [
	'Точно отвечает на вопрос',
	'Понятно и доступно',
	'Быстрый ответ',
];

export const NEGATIVE_REASONS: readonly string[] = [
	'Ответ неточный или не по теме',
	'Не хватает информации',
	'Слишком долгий ответ',
];

export const csatReasons = (rating: CsatRating): readonly string[] =>
	rating === 2 ? POSITIVE_REASONS : NEGATIVE_REASONS;

/** Клиентское follow-up-сообщение с запросом причины: бэкенд его не присылает, т.к. не знает оценку до отправки причины. */
export const getCsatReasonMessage = (csatUuid: string, rating: CsatRating): Message => ({
	id: `csat-reason-${csatUuid}`,
	content:
		rating === 2
			? 'Спасибо, что оценили ответ!\n\nЧто понравилось?'
			: 'Спасибо, что оценили ответ!\n\nЧто не так?',
	type: 'csat_reason',
	author: 'bot',
	timestamp: Date.now(),
	meta: { csatUuid, rating },
});
