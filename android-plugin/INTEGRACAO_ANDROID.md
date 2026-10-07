# Integração do plugin nativo (EmbeddedServer) no projeto Android

Este documento assume que você já rodou `npx cap add android` uma vez
(gera a pasta `android/` na raiz do projeto) e tem o Android Studio
instalado. **Nada aqui foi executado/compilado nesta sessão** — não
há SDK Android disponível no ambiente onde este código foi escrito.
Trate os passos abaixo como o roteiro a seguir, e os arquivos `.kt`
como ponto de partida que você vai compilar e corrigir no Android
Studio.

## 1. Incluir o módulo no projeto Android

Depois de `npx cap add android`, dentro de `android/settings.gradle`,
adicione:

```groovy
include ':android-plugin'
project(':android-plugin').projectDir = new File('../android-plugin')
```

(ajuste o caminho relativo se a estrutura de pastas do seu checkout for
diferente — `android-plugin/` está na raiz do projeto, ao lado de
`src/` e `server/`).

## 2. Adicionar a dependência no app

Em `android/app/build.gradle`, na seção `dependencies`:

```groovy
implementation project(':android-plugin')
```

## 3. Registrar o plugin no MainActivity

Em `android/app/src/main/java/.../MainActivity.java` (ou `.kt`, se você
converter o projeto):

```java
import br.com.aguilda.embeddedserver.EmbeddedServerPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(EmbeddedServerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

## 4. Sincronizar e compilar

```bash
npx cap sync android
```

Depois abra `npx cap open android` e mande compilar pelo Android
Studio. **É aqui que erros vão aparecer** — versões de Gradle,
versões do Kotlin plugin, versão do `compileSdk`/`targetSdk`
compatível com o que seu Capacitor gerou, etc. Eu não consigo prever
esses erros sem compilar de verdade; o caminho é você rodar, colar o
erro de volta pra mim, e eu ajusto o código.

Pontos prováveis de atrito, para adiantar:

- **Versão do Kotlin**: o projeto gerado pelo `cap add android` pode
  vir com uma versão do plugin Kotlin diferente da que
  `android-plugin/build.gradle` assume. Se der erro de "Kotlin
  version mismatch", ajuste a versão no `build.gradle` raiz do projeto
  Android (não no do plugin).
- **NanoHTTPD e Java 17**: dependendo da versão do Android Gradle
  Plugin (AGP) do seu ambiente, pode ser necessário trocar
  `JavaVersion.VERSION_17` por `VERSION_11` em
  `android-plugin/build.gradle` — depende do AGP instalado no seu
  Android Studio.
- **minSdk**: defini 22 como piso; se o `android/variables.gradle`
  gerado pelo Capacitor exigir um mínimo diferente, alinhe os dois.

## 5. Testando o modo offline de verdade

1. Instale o APK em dois celulares Android.
2. Num deles, ative "Ponto de acesso Wi-Fi" (hotspot) nas configurações
   do Android.
3. Conecte o segundo celular a esse hotspot.
4. Abra o app no primeiro celular, escolha "Recepção" — ele deve subir
   o servidor sozinho e mostrar o endereço (ex: `http://192.168.43.1:8080`).
5. Abra o app no segundo celular, escolha "Apresentação", digite esse
   mesmo endereço.
6. Adicione visitantes no primeiro e confirme — o segundo deve atualizar
   sozinho, em tempo real, via WebSocket.

## O que ainda não existe (fora do escopo desta entrega)

- Descoberta automática do IP (hoje é manual — dá pra evoluir com
  mDNS/NSD do Android, mas é passo separado).
- QR code para facilitar a digitação do endereço no segundo aparelho.
- Persistência em disco no lado nativo (hoje tudo é em memória, como no
  servidor Node — a lista se perde se o app for fechado à força; isso
  é *intencional* dado o requisito de expiração em 10h e LGPD, mas
  vale confirmar se um fechamento acidental do app durante o culto é
  um risco aceitável ou se precisa de persistência mínima em disco).
