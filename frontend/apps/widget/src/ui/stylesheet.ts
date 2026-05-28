import css from './index.css?inline';

export const stylesheet = new CSSStyleSheet();

stylesheet.replaceSync(css);
