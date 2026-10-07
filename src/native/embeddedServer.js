// src/native/embeddedServer.js
//
// Wrapper fino sobre o plugin nativo EmbeddedServer (Kotlin). Só
// funciona dentro do app empacotado com Capacitor rodando em Android —
// em navegador comum (npm run dev) o plugin não existe, então as
// funções abaixo detectam isso e retornam null/erro tratável.

function pluginDisponivel() {
  return typeof window !== 'undefined' &&
    window.Capacitor &&
    window.Capacitor.Plugins &&
    window.Capacitor.Plugins.EmbeddedServer;
}

export function rodandoDentroDoApp() {
  return pluginDisponivel();
}

export async function iniciarServidorEmbutido(porta = 8080) {
  if (!pluginDisponivel()) {
    throw new Error('Plugin EmbeddedServer não disponível (rodando fora do app Android empacotado).');
  }
  return window.Capacitor.Plugins.EmbeddedServer.iniciar({ porta });
}

export async function pararServidorEmbutido() {
  if (!pluginDisponivel()) return;
  return window.Capacitor.Plugins.EmbeddedServer.parar();
}

export async function statusServidorEmbutido() {
  if (!pluginDisponivel()) return { rodando: false, ip: null };
  return window.Capacitor.Plugins.EmbeddedServer.status();
}
