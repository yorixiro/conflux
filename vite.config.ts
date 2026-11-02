import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { confluxPwaPlugin } from './tools/confluxPwaPlugin';

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

function gitValue(...args: string[]) {
  try {
    return execFileSync('git', args, {
      cwd: __dirname, encoding: 'utf8', timeout: 2000, stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return '';
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiOrigin = env.VITE_POLARIS_API_ORIGIN?.trim();
  const acpToken = env.DEVIN_ACP_BRIDGE_TOKEN?.trim();
  const acpPort = Number(env.DEVIN_ACP_BRIDGE_PORT || 47831);

  return {
    plugins: [react(), confluxPwaPlugin()],
    // Stamp the actual frontend bundle, not the latest branch seen by the server.
    // A cached PWA keeps its original stamp even when Git is later updated.
    define: {
      'import.meta.env.VITE_CONFLUX_BUNDLE_SHA': JSON.stringify(gitValue('rev-parse', 'HEAD')),
      'import.meta.env.VITE_CONFLUX_BUNDLE_BRANCH': JSON.stringify(gitValue('branch', '--show-current'))
    },
    server: {
      proxy: {
        ...(apiOrigin ? { '/api': { target: apiOrigin, changeOrigin: true } } : {}),
        ...((!acpToken || acpToken.length >= 24) && Number.isInteger(acpPort) && acpPort >= 1024 && acpPort <= 65535 ? {
          '/devin-acp': {
            target: `http://127.0.0.1:${acpPort}`,
            changeOrigin: true,
            rewrite: (path: string) => path.replace(/^\/devin-acp/, ''),
            configure: (proxy) => {
              proxy.on('proxyReq', (request) => {
                if (acpToken) request.setHeader('x-acp-bridge-token', acpToken);
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
