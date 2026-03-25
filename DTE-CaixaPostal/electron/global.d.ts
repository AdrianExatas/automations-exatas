import type { DesktopApi } from '../src/shared/ipc';

declare global {
  interface Window {
    caixaPostalApp: DesktopApi;
  }
}

export {};
