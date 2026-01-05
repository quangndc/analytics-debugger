/// <reference types="vite/client" />

interface Window {
    ipcRenderer: {
        on(channel: string, listener: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void): void
        off(channel: string, listener: (...args: unknown[]) => void): void
        send(channel: string, ...args: unknown[]): void
        invoke(channel: string, ...args: unknown[]): Promise<unknown>
    }
    proxyAPI: {
        getToken: () => Promise<string>
        regenerateToken: () => Promise<string>
    }
}
