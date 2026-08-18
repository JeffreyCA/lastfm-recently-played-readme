/// <reference types="@cloudflare/vitest-pool-workers/types" />

import type { Env } from '../src/index';

declare global {
  namespace Cloudflare {
    interface GlobalProps {
      mainModule: typeof import('../src/index');
    }
  }
}

declare module 'cloudflare:test' {
  interface ProvidedEnv extends Env {}
}
