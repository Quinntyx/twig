import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import {
  IPC,
  type ConfigResult,
  type MenuAction,
  type OpenFlowResult,
  type SaveFlowResult,
  type TwigBridge
} from '../shared/ipc'

const bridge: TwigBridge = {
  isElectron: true,
  platform: process.platform,
  openFlow: () => ipcRenderer.invoke(IPC.open) as Promise<OpenFlowResult>,
  saveFlow: (content, filePath, forceDialog) =>
    ipcRenderer.invoke(IPC.save, content, filePath, forceDialog) as Promise<SaveFlowResult>,
  getConfig: () => ipcRenderer.invoke(IPC.config) as Promise<ConfigResult>,
  setDirty: (dirty) => ipcRenderer.send(IPC.setDirty, dirty),
  onMenuAction: (listener) => {
    const handler = (_event: IpcRendererEvent, action: MenuAction): void => listener(action)
    ipcRenderer.on(IPC.menuAction, handler)
    return () => ipcRenderer.removeListener(IPC.menuAction, handler)
  }
}

contextBridge.exposeInMainWorld('twig', bridge)
