const { app, BrowserWindow, session } = require('electron');
const net = require('node:net');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const isDev = process.env.NODE_ENV !== 'production' && process.env.PAJOY_DESKTOP_DEV === 'true';
function portAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(port, '::', () => server.close(() => resolve(true)));
  });
}
async function chooseApiPort() {
  for (let port = 3001; port < 3011; port += 1) {
    if (await portAvailable(port)) return port;
  }
  return 3001;
}
function waitForApi(apiUrl, timeoutMs = 15000) {
  const target = new URL(apiUrl);
  const port = Number(target.port || (target.protocol === 'https:' ? 443 : 80));
  const host = target.hostname;
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const check = () => {
      const socket = net.createConnection({ host, port });
      socket.once('connect', () => { socket.destroy(); resolve(); });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - startedAt > timeoutMs) reject(new Error(`API did not become ready at ${apiUrl}.`));
        else setTimeout(check, 250);
      });
    };
    check();
  });
}
async function startBundledApi() {
  if (isDev) return Promise.resolve();
  const configuredApi = process.env.API_BASE_URL || process.env.PAJOY_API_URL;
  if (configuredApi) return waitForApi(configuredApi);
  const apiPath = path.join(process.resourcesPath, 'api-server', 'index.mjs');
  process.env.DATABASE_URL ||= process.env.PAJOY_DATABASE_URL;
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must be configured for production.');
  process.env.PORT ||= '3001';
  process.env.NODE_ENV = 'production';
  try {
    await import(pathToFileURL(apiPath).href);
    await waitForApi(`http://127.0.0.1:${process.env.PORT}`, 10000);
  } catch (error) {
    console.error('[Desktop] Bundled API failed to start', error);
    throw error;
  }
}

function createWindow() {
  const window = new BrowserWindow({
    title: 'Pajoy Uniforms - School Uniform POS',
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  console.info('[Desktop] Electron window created');
  window.webContents.on('did-finish-load', () => console.info('[Desktop] Frontend loaded'));
  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => console.error('[Desktop] Frontend failed to load', { errorCode, errorDescription, validatedURL }));
  window.webContents.on('render-process-gone', (_event, details) => console.error('[Desktop] Renderer process gone', details));
  window.webContents.on('console-message', (_event, details) => {
    const level = details.level === 2 ? 'warn' : details.level >= 3 ? 'error' : 'info';
    console[level](`[Renderer] ${details.message}`);
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  if (isDev) return window.loadURL(process.env.PAJOY_RENDERER_URL || 'http://localhost:5173');
  return window.loadFile(path.join(__dirname, '..', 'dist', 'public', 'index.html'));
}

app.whenReady().then(async () => {
  console.info('[Desktop] Electron ready');
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  if (!isDev) {
    if (process.env.API_BASE_URL || process.env.PAJOY_API_URL) {
      console.info(`[Desktop] Using configured API ${process.env.API_BASE_URL || process.env.PAJOY_API_URL}`);
    } else {
      const apiPort = await chooseApiPort();
      process.env.PORT = String(apiPort);
      process.env.PAJOY_API_URL = `http://127.0.0.1:${apiPort}`;
      console.info(`[Desktop] Bundled API assigned port ${apiPort}`);
    }
  }
  try {
    await startBundledApi();
  } catch (error) {
    console.error('[Desktop] Production API is unavailable', error);
    app.quit();
    return;
  }
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
