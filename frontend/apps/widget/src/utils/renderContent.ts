import LinkifyIt from 'linkify-it';
import DOMPurify from 'dompurify';

const linkify = new LinkifyIt();

const esc = (s: string): string =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const bold = (html: string): string =>
	html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

const processInline = (text: string): string => {
	const matches = linkify.match(text);
	if (!matches) return bold(esc(text));

	let result = '';
	let cursor = 0;
	for (const m of matches) {
		result += bold(esc(text.slice(cursor, m.index)));
		result += `<a href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">${esc(m.text)}</a>`;
		cursor = m.lastIndex;
	}
	return result + bold(esc(text.slice(cursor)));
};

export const renderContent = (text: string): string => {
	const lines = text.split('\n');
	const parts: string[] = [];
	const items: string[] = [];

	const flushList = (): void => {
		if (items.length > 0) {
			parts.push(`<ul>${items.join('')}</ul>`);
			items.length = 0;
		}
	};

	for (const line of lines) {
		if (line.startsWith('- ')) {
			items.push(`<li>${processInline(line.slice(2))}</li>`);
		} else {
			flushList();
			parts.push(processInline(line));
		}
	}
	flushList();

	return DOMPurify.sanitize(parts.join('<br>'), {
		ALLOWED_TAGS: ['strong', 'ul', 'li', 'a', 'br'],
		ALLOWED_ATTR: ['href', 'target', 'rel'],
	});
};
