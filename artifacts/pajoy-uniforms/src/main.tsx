import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { setAuthTokenGetter, setBaseUrl } from '@workspace/api-client-react';

import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('[React] Root element #root was not found');

console.info('[React] App mounting');
setBaseUrl((globalThis as typeof globalThis & { pajoyDesktop?: { apiUrl?: string } }).pajoyDesktop?.apiUrl ?? null);
setAuthTokenGetter(() => sessionStorage.getItem('pajoy-auth-token'));

createRoot(root, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
console.info('[React] App mounted');
