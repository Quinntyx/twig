/** IPC channel names and payload contracts for the Electron file layer. */

import type { TwigConfig } from './config'

export const IPC = {
  open: 'flow:open',
  save: 'flow:save',
  setDirty: 'app:set-dirty',
  menuAction: 'app:menu-action',
  config: 'app:config'
} as const

export type MenuAction = 'new' | 'open' | 'save' | 'save-as'

export interface OpenFlowResult {
  canceled: boolean
  filePath?: string
  content?: string
  error?: string
}

export interface SaveFlowResult {
  canceled: boolean
  filePath?: string
  error?: string
}

export interface ConfigResult {
  config: TwigConfig
  path: string
  error?: string
}

export interface TwigBridge {
  isElectron: true
  openFlow(): Promise<OpenFlowResult>
  saveFlow(content: string, filePath: string | null, forceDialog: boolean): Promise<SaveFlowResult>
  getConfig(): Promise<ConfigResult>
  setDirty(dirty: boolean): void
  onMenuAction(listener: (action: MenuAction) => void): () => void
}
