/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// window.Kerskol expose par app-version.js (charge via <script> dans index.html).
interface KerskolVersionApi {
  current: string;
  setBusy: (v: boolean) => void;
  isBusy: () => boolean;
  onBeforeUpdate: (fn: () => unknown) => void;
  check: () => void;
}
interface Window {
  Kerskol?: { version?: KerskolVersionApi };
}
