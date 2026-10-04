const { app, BrowserWindow, dialog, net, protocol, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const APP_SCHEME = 'kakeibo';
const APP_HOST = 'app';
let devServer;
let closingDevServer = false;

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

function registerAppProtocol() {
  const distDirectory = path.join(__dirname, '..', 'dist');
  protocol.handle(APP_SCHEME, (request) => {
    const requestUrl = new URL(request.url);
    if (requestUrl.hostname !== APP_HOST) {
      return new Response('Not found', { status: 404 });
    }

    let relativePath;
    try {
      relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '') || 'index.html';
    } catch {
      return new Response('Bad request', { status: 400 });
    }

    const filePath = path.resolve(distDirectory, relativePath);
    const pathFromDist = path.relative(distDirectory, filePath);
    if (pathFromDist.startsWith('..') || path.isAbsolute(pathFromDist)) {
      return new Response('Forbidden', { status: 403 });
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

function createWindow(url = app.isPackaged ? `${APP_SCHEME}://${APP_HOST}/` : 'http://127.0.0.1:4173/') {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#f6f5f0',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });

  window.loadURL(url);
}

app.whenReady().then(async () => {
  app.setAppUserModelId('com.kakeibo.app');
  if (app.isPackaged) {
    registerAppProtocol();
    createWindow(`${APP_SCHEME}://${APP_HOST}/`);
  } else {
    const { createServer } = await import('vite');
    devServer = await createServer({
      configFile: path.join(__dirname, '..', 'vite.config.ts'),
      server: {
        host: '127.0.0.1',
        port: 4173,
        strictPort: true,
      },
    });
    await devServer.listen();
    createWindow('http://127.0.0.1:4173/');
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch((error) => {
  dialog.showErrorBox('Не удалось запустить Kakeibo', error instanceof Error ? error.message : String(error));
  app.quit();
});

app.on('before-quit', (event) => {
  if (!devServer || closingDevServer) return;
  event.preventDefault();
  closingDevServer = true;
  devServer.close().finally(() => {
    devServer = undefined;
    app.quit();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
