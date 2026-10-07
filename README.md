# Guest List (Lista de Convidados) — A'Guilda

Plataforma para recepção e apresentação de visitantes em igrejas: um
aparelho ("Recepção") captura nomes na porta, outro ("Apresentação")
exibe a lista já organizada em tempo real, agrupando automaticamente
em caravanas quando aplicável.

## Estrutura do projeto

```
src/
  core/
    cargos.js        → tabela de precedência (autoridades + hierarquia eclesiástica)
    grupos.js         → lógica de agrupamento em caravana (testada)
    grupos.test.mjs   → testes manuais (node src/core/grupos.test.mjs)
    expiracao.js      → regra das 10h e resumo agregado
    apiClient.js      → cliente HTTP/WebSocket usado pelas duas telas
  components/
    Layout.jsx        → cabeçalho verde com abas (padrão Acordes de Davi)
    QrTelaCheia.jsx   → QR code do endereço da Recepção (tela cheia)
    LeitorQr.jsx      → leitura do QR pela câmera (Apresentação)
  pages/
    Inicio.jsx        → escolha do modo (Recepção ou Apresentação)
    Recepcao.jsx       → captura + fila de correção + confirmação
    Apresentacao.jsx   → exibição somente-leitura, tempo real
server/
  index.js            → servidor de referência (Node/Express/WebSocket)
  vercel-handler.js    → esqueleto do fallback online (ver aviso abaixo)
```

## Rodando localmente (desenvolvimento)

```bash
npm install
npm run build      # gera dist/ (front-end)
npm run server     # sobe o servidor em http://localhost:8080
```

Abra `http://localhost:8080` em duas abas do navegador — uma como
"Recepção", outra como "Apresentação" — e configure ambas apontando
para `http://localhost:8080`. Você verá a lista se atualizar em tempo
real conforme confirma visitantes.

## Testando a lógica isoladamente

```bash
node src/core/grupos.test.mjs
```

Cobre: grupos pequenos não viram caravana, promoção automática ao
atingir 4 pessoas, escolha de representante por precedência
(autoridade > eclesiástico > sem cargo), e que igrejas diferentes na
mesma cidade NÃO se misturam.

## Empacotando com Capacitor (Android)

```bash
npm run build
npx cap add android      # primeira vez apenas
npx cap sync
npx cap open android     # abre no Android Studio
```

O build do APK também pode ser feito pelo terminal (ver "Gerar o APK"
abaixo). O app já foi compilado, instalado e testado em celulares reais.

## ⚠️ O ponto crítico: servidor embutido em produção

O `server/index.js` roda em **Node.js**. Isso funciona perfeitamente
para desenvolvimento e para testar a lógica no computador — mas **um
app Android empacotado com Capacitor não roda um processo Node.js
dentro dele**. Capacitor empacota o front-end web (HTML/JS/CSS); ele
não inclui um runtime Node.

Para o modo offline funcionar de verdade num celular Android, o
"servidor local" do App Recepção precisa ser implementado como
**plugin nativo Android** (Kotlin, usando NanoHTTPD para expor a mesma
API HTTP/WebSocket de `server/index.js`), que o Capacitor expõe ao
JavaScript via um plugin customizado.

**Esse plugin está pronto e em uso** — fica em `android-plugin/` (código
Kotlin: servidor NanoHTTPD+WebSocket, lógica de cargos/grupos/expiração
portada de `src/core/*.js`, e a classe que o Capacitor expõe ao JS). O
front-end (`Recepcao.jsx`) detecta quando está dentro do app e sobe esse
servidor sozinho, mostrando o endereço (e o QR code) para o outro aparelho.
O roteiro de integração está em `android-plugin/INTEGRACAO_ANDROID.md`.

## Fallback online (Vercel)

O `vercel.json` publica **somente o front-end** (build Vite, pasta `dist`).
Isso serve como cópia hospedada da interface, mas **não substitui o modo
offline**: a página da Vercel é `https`, e o navegador bloqueia chamadas a
um servidor local `http://IP:8080` (conteúdo misto). O fluxo real do culto
(hotspot + servidor embutido no celular da Recepção) só funciona dentro do
app Android.

`server/vercel-handler.js` é apenas um esqueleto e **não é publicado**.
Funções serverless não mantêm estado em memória nem WebSocket. Um fallback
online de verdade exigiria banco de baixa latência (Vercel KV, Upstash,
Supabase) e polling curto ou serviço de real-time (Pusher, Ably, Supabase
Realtime). Isso não está implementado.

## Publicar no Git e na Vercel

1. Rode `.\preparar-git.ps1` na raiz: ele faz `git init`, o commit e, se você
   colar a URL do repositório, o `git push`.
2. Crie um repositório vazio no GitHub e rode:
   `git remote add origin https://github.com/SEU-USUARIO/guest-list.git`
   `git branch -M main` e `git push -u origin main`.
3. Na Vercel: Add New → Project → importe o repositório. O preset Vite é
   detectado sozinho (build `npm run build`, saída `dist`).

## Gerar o APK

Na raiz do projeto:

    npm install
    npm run build
    npx cap sync android
    cd android
    .\gradlew assembleDebug

O APK sai em `android/app/build/outputs/apk/debug/app-debug.apk`.

## Estado atual

Testado em dois celulares Android reais, via hotspot:

- Servidor embutido (NanoHTTPD + WebSocket) no celular da Recepção.
- Agrupamento em caravana, precedência de cargos e rótulo com acentos.
- Fila de correção (corrigir, confirmar, descartar).
- Lista salva em arquivo privado do celular da Recepção: volta ao reabrir o
  app. Passadas 10h, os nomes são apagados na próxima abertura e fica só o
  resumo anônimo (LGPD). "Reiniciar sessão" também apaga os nomes.
- QR code: a Recepção mostra, a Apresentação lê pela câmera.
- Sugestões de igrejas (denominações evangélicas) no cadastro.
- Visual no padrão do projeto Acordes de Davi (verde-esmeralda).

## O que ainda falta

1. Testar o app com a tela apagada por 30 min (o Android pode congelá-lo).
2. Observar a expiração de 10h em tempo real.
3. Ensaio completo com vários celulares e pessoas reais na porta.
4. Fallback online real, se for prioridade.
5. Apagar os nomes exatamente às 10h mesmo com o app fechado (hoje apaga
   na próxima abertura).
