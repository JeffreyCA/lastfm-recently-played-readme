import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

/**
 * Tests run inside workerd rather than Node, so `caches`, `btoa`,
 * `AbortSignal.timeout` and the assets binding behave exactly as they do in
 * production. Note this package moved from `defineWorkersConfig` (exported from
 * `/config`) to the `cloudflareTest` Vite plugin in v0.21 / Vitest 4.
 */
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
    }),
  ],
});
