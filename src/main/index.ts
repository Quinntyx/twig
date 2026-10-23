import { join } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { app, BrowserWindow, dialog, ipcMain, Menu, shell, type MenuItemConstructorOptions } from 'electron'
import { IPC, type MenuAction, type OpenFlowResult, type SaveFlowResult } from '../shared/ipc'
import { loadConfig } from './config'

const dirtyByWindow = new Map<number, boolean>()
const allowClose = new Set<number>()

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function parentWindow(event: Electron.IpcMainInvokeEvent): BrowserWindow | undefined {
  return BrowserWindow.fromWebContents(event.sender) ?? BrowserWindow.getFocusedWindow() ?? undefined
}

async function handleOpen(event: Electron.IpcMainInvokeEvent): Promise<OpenFlowResult> {
  const win = parentWindow(event)
  const options: Electron.OpenDialogOptions = {
    title: 'Open mind map',
    properties: ['openFile'],
    filters: [
      { name: 'Twig mind map', extensions: ['json'] },
      { name: 'All files', extensions: ['*'] }
    ]
  }
  const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
  const filePath = result.filePaths[0]
  if (result.canceled || !filePath) return { canceled: true }

  try {
    const content = await readFile(filePath, 'utf8')
    return { canceled: false, filePath, content }
  } catch (error) {
    return { canceled: false, error: `Could not read the file: ${message(error)}` }
  }
}

function withExtension(filePath: string): string {
  return /\.json$/i.test(filePath) ? filePath : `${filePath}.twig.json`
}

async function handleSave(
  event: Electron.IpcMainInvokeEvent,
  content: string,
  filePath: string | null,
  forceDialog: boolean
): Promise<SaveFlowResult> {
  let target = forceDialog ? null : filePath

  if (!target) {
    const win = parentWindow(event)
    const options: Electron.SaveDialogOptions = {
      title: 'Save mind map',
      defaultPath: filePath ?? join(app.getPath('documents'), 'Untitled.twig.json'),
      filters: [{ name: 'Twig mind map', extensions: ['json'] }]
    }
    const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return { canceled: true }
    target = withExtension(result.filePath)
  }

  try {
    await writeFile(target, content, 'utf8')
    return { canceled: false, filePath: target }
  } catch (error) {
    return { canceled: false, error: `Could not save the file: ${message(error)}` }
  }
}

function sendMenuAction(action: MenuAction): void {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  win?.webContents.send(IPC.menuAction, action)
}

function buildMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New', accelerator: 'CmdOrCtrl+N', registerAccelerator: false, click: () => sendMenuAction('new') },
        { label: 'Open…', accelerator: 'CmdOrCtrl+O', registerAccelerator: false, click: () => sendMenuAction('open') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', registerAccelerator: false, click: () => sendMenuAction('save') },
        { label: 'Save As…', accelerator: 'CmdOrCtrl+Shift+S', registerAccelerator: false, click: () => sendMenuAction('save-as') },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Keyboard shortcuts',
          accelerator: 'CmdOrCtrl+/',
          click: () => {
            const win = BrowserWindow.getFocusedWindow()
            win?.webContents.executeJavaScript(
              "window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))"
            )
          }
        },
        { type: 'separator' },
        {
          label: 'Electron documentation',
          click: () => {
            void shell.openExternal('https://www.electronjs.org/docs/latest')
          }
        }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 560,
    minHeight: 380,
    show: false,
    backgroundColor: '#0e1116',
    title: 'Twig',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  win.once('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  win.on('close', (event) => {
    if (allowClose.has(win.id)) return
    if (!dirtyByWindow.get(win.webContents.id)) return

    const choice = dialog.showMessageBoxSync(win, {
      type: 'warning',
      buttons: ['Close without saving', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      title: 'Unsaved changes',
      message: 'This mind map has unsaved changes.',
      detail: 'Closing now will discard them.'
    })
    if (choice === 0) {
      allowClose.add(win.id)
      win.close()
    } else {
      event.preventDefault()
    }
  })

  win.on('closed', () => {
    dirtyByWindow.delete(win.webContents.id)
    allowClose.delete(win.id)
  })

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) void win.loadURL(devUrl)
  else void win.loadFile(join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(async () => {
  app.setName('Twig')
  app.setAppUserModelId('dev.quinntyx.twig')
  const loadedConfig = await loadConfig()
  if (loadedConfig.error) console.error(`[twig] ${loadedConfig.error}`)
  buildMenu()

  ipcMain.handle(IPC.open, (event) => handleOpen(event))
  ipcMain.handle(IPC.save, (event, content: string, filePath: string | null, forceDialog: boolean) =>
    handleSave(event, content, filePath, forceDialog)
  )
  ipcMain.handle(IPC.config, () => loadedConfig)
  ipcMain.on(IPC.setDirty, (event, dirty: boolean) => {
    dirtyByWindow.set(event.sender.id, Boolean(dirty))
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
