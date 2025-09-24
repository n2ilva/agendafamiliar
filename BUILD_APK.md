Guia rápido para gerar APK do projeto `agenda-familiar`

Opções:

1) Usar EAS Build (recomendado para Managed Expo)

Requisitos:
- Conta Expo (crie em https://expo.dev se ainda não tiver)
- `npm install -g eas-cli` ou `yarn global add eas-cli`

Passos:

```bash
# 1. instalar dependências
npm install

# 2. login expo (web) ou CLI
eas login

# 3. inicializar EAS (se necessário)
eas build:configure

# 4. rodar build para APK
# perfil 'preview' usa apk
eas build --platform android --profile preview

# 5. após terminar, pegue o link fornecido pelo EAS e baixe APK para instalar no celular
```

Observações:
- O EAS Build roda na nuvem e gerará o APK sem precisar configurar Android SDK/JDK localmente.
- Para publicar um `app-bundle` para Play Store use o perfil `production`.

2) Gerar APK localmente (requere `expo prebuild` e ambiente Android configurado)

Requisitos locais:
- Node.js + yarn/npm
- Java JDK 11+
- Android SDK e ANDROID_HOME configurado
- Android Studio instalado (recomendado)

Passos:

```bash
# 1. instalar dependências
npm install

# 2. criar projetos nativos (expo prebuild)
expo prebuild

# 3. abrir pasta android no terminal
cd android

# 4. rodar gradle assembleDebug (ou assembleRelease com assinatura configurada)
./gradlew assembleDebug

# 5. o APK será gerado em:
# android/app/build/outputs/apk/debug/app-debug.apk
```

Observações:
- Se o projeto usar apenas recursos managed do Expo, `expo prebuild` criará a pasta `android`.
- Para `assembleRelease` você precisa configurar `signingConfig` com keystore.

Se quiser, posso:
- iniciar a build no EAS (preciso que você faça `eas login` no seu computador) ou
- orientar passo a passo a configurar o ambiente local (JDK/SDK) e rodar `expo prebuild` e `./gradlew assembleDebug`.
