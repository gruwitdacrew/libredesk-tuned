import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Bot/agent messages arrive as Markdown (LLM output). We render them with
// `marked` (GFM: bold/italic, ordered & unordered lists, code, headings,
// autolinked URLs) and then sanitize the result with DOMPurify — `marked`
// produces HTML but does NOT sanitize it.
marked.setOptions({
	gfm: true, // GitHub-flavored Markdown: autolinks bare URLs, ~~strikethrough~~, etc.
	breaks: true, // a single "\n" becomes <br>, which matches chat expectations
});

// Make every link open safely in a new, isolated tab.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
	if (node.nodeName === 'A') {
		node.setAttribute('target', '_blank');
		node.setAttribute('rel', 'noopener noreferrer');
	}
});

export const renderContent = (text: string): string =>
	DOMPurify.sanitize(marked.parse(text) as string, {
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
