import type { TwigBridge } from '../../shared/ipc'

declare global {
  interface Window {
    twig?: TwigBridge
  }
}

export {}
