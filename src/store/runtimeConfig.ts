/** Settings injected at container start by `docker/40-runtime-config.sh` (see `public/config.js`). */
export interface RuntimeConfig {
  /** When set, error log entries are also POSTed to this webhook URL. */
  errorLogWebhookUrl: string;
}

declare global {
  interface Window {
    __DEMO_CONFIG__?: Partial<RuntimeConfig>;
  }
}

export function getRuntimeConfig(): RuntimeConfig {
  const injected: Partial<RuntimeConfig> =
    typeof window === 'undefined' ? {} : (window.__DEMO_CONFIG__ ?? {});
  return { errorLogWebhookUrl: injected.errorLogWebhookUrl?.trim() ?? '' };
}
