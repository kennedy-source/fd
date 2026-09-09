const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('pajoyDesktop', Object.freeze({
  isDesktop: true,
  apiUrl: process.env.API_BASE_URL || process.env.PAJOY_API_URL || '',
}));
