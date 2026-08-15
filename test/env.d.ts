/// <reference types="@cloudflare/vitest-pool-workers/types" />

import type { Env } from '../src/index';

declare module 'cloudflare:test' {
  interface ProvidedEnv extends Env {}
}
