import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

function resolveManualChunk(id: string) {
  if (!id.includes('node_modules')) return undefined;
  if (
    id.includes('/react/')
    || id.includes('/react-dom/')
    || id.includes('/scheduler/')
    || id.includes('/zustand/')
  ) {
    return 'react-core';
  }
  if (id.includes('/@capacitor/')) {
    return 'capacitor';
  }
  if (id.includes('/jszip/')) {
    return 'zip';
  }
  if (
    id.includes('/qrcode/')
    || id.includes('/jsqr/')
  ) {
    return 'capture';
  }
  return undefined;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiOrigin = env.VITE_POLARIS_API_ORIGIN?.trim();
  const acpToken = env.DEVIN_ACP_BRIDGE_TOKEN?.trim();
  const acpPort = Number(env.DEVIN_ACP_BRIDGE_PORT || 47831);

  return {
    plugins: [react()],
    server: {
      proxy: {
        ...(apiOrigin ? { '/api': { target: apiOrigin, changeOrigin: true } } : {}),
        ...(acpToken && acpToken.length >= 24 && Number.isInteger(acpPort) && acpPort >= 1024 && acpPort <= 65535 ? {
          '/devin-acp': {
            target: `http://127.0.0.1:${acpPort}`,
            changeOrigin: true,
            rewrite: (path: string) => path.replace(/^\\/devin-acp/, ''),
            configure: (proxy) => {
              proxy.on('proxyReq', (request) => {
                request.setHeader('x-acp-bridge-token', acpToken);
                request.removeHeader('origin');
              });
            }
          }
        } : {})
      }
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          chatboxConverter: resolve(__dirname, 'chatbox-converter.html')
        },
        output: {
          manualChunks: resolveManualChunk
        }
      }
    }
  };
});
