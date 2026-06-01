declare module '*.css?inline' {
	const content: string;
	export default content;
}

interface ImportMetaEnv {
	readonly VITE_WS_URL: string;
	readonly VITE_ESCALATION_TELEGRAM: string;
	readonly VITE_ESCALATION_MAX: string;
	readonly VITE_ESCALATION_EMAIL: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
