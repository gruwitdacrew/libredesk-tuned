import DOMPurify from 'dompurify';
import { marked } from 'marked';

let hookRegistered = false;

/** Регистрирует хук один раз (ссылки открываются в новой вкладке): защита от повторной регистрации при ре-эвалюации/повторной вставке бандла. */
const ensureLinkHook = (): void => {
	if (hookRegistered) {
		return;
	}
	hookRegistered = true;
	DOMPurify.addHook('afterSanitizeAttributes', (node) => {
		if (node.nodeName === 'A') {
			node.setAttribute('target', '_blank');
			node.setAttribute('rel', 'noopener noreferrer');
		}
	});
};

/** Парсит markdown бота в HTML и санитизирует перед вставкой через innerHTML: разрешён только безопасный набор тегов, ссылки открываются в новой вкладке. */
export const renderContent = (text: string): string => {
	ensureLinkHook();
	const html = marked.parse(text, { async: false });
	return DOMPurify.sanitize(html, {
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
};
