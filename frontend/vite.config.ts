import fs from 'fs';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

const readBackendPort = () => {
  const backendEnvPath = path.resolve(__dirname, '../backend/.env');

  if (!fs.existsSync(backendEnvPath)) {
    return '5000';
  }

  const backendEnv = fs.readFileSync(backendEnvPath, 'utf8');
  const matchedPort = backendEnv.match(/^(?:PORT|BACKEND_PORT)=(.+)$/m)?.[1]?.trim();

  return matchedPort || '5000';
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiUrl = env.VITE_API_URL || '/api';
  const fallbackApiUrl = `http://localhost:${readBackendPort()}/api`;
  const resolvedApiUrl = apiUrl.startsWith('http') ? apiUrl : fallbackApiUrl;
  const proxyTarget = resolvedApiUrl.replace(/\/api\/?$/, '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
