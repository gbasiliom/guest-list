import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config - serve o front-end tanto localmente (dev) quanto
// empacotado dentro do Capacitor (build estatico em /dist).
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // permite acesso via IP local (necessario para testar via hotspot na rede)
    port: 5173
  },
  build: {
    outDir: 'dist',
    // Compatibilidade: celulares com Android System WebView antigo nao entendem
    // sintaxe recente (?? , ?. etc). es2015 faz o esbuild reescrever isso.
    target: ['es2015']
  }
});