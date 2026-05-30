import type { Message } from '@types';

type Channel = 'telegram' | 'max' | 'email';

const CONTENT: Record<Channel, string> = {
	telegram:
		'Укажите ваш никнейм в Telegram (например, @nickname) или номер телефона в формате +7 999 123-45-67\n\nАлександра свяжется с вами в Telegram',
	email:
		'Укажите ваш адрес электронной почты (например, example@mail.ru)\n\nАлександра свяжется с вами по почте',
	max:
		'Укажите ваш никнейм в MAX\n\nАлександра свяжется с вами в MAX',
};

export const getEscalation2Message = (channel: Channel): Message => ({
	id: `esc2-contact-${String(Date.now())}`,
	content: CONTENT[channel],
	type: 'plain',
	author: 'bot',
	timestamp: Date.now(),
});
