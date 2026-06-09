import DOMPurify from 'dompurify';

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
	if (node.nodeName === 'A') {
		node.setAttribute('target', '_blank');
		node.setAttribute('rel', 'noopener noreferrer');
	}
});

/** Санитизирует HTML бота перед вставкой через innerHTML: разрешён только безопасный набор тегов, ссылки открываются в новой вкладке. */
export const renderContent = (text: string): string =>
	DOMPurify.sanitize(text as string, {
		ALLOWED_TAGS: [
			'p', 'br', 'hr',
			'strong', 'em', 'b', 'i', 's', 'del',
			'ul', 'ol', 'li',
			'a', 'code', 'pre', 'blockquote',
			'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
			'table', 'thead', 'tbody', 'tr', 'th', 'td',
		],
		ALLOWED_ATTR: ['href', 'target', 'rel'],
	});
