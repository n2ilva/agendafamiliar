# Assets gerados

Este diretório contém os ícones e imagens gerados automaticamente a partir de `logo.jpeg` (convertido para `assets/logo.png`). Os arquivos foram colocados sob `assets/` e `assets/icons/` para uso em builds e envio às lojas.

Localização dos assets gerados

- `assets/logo.png` — PNG 1024×1024 convertido do `logo.jpeg` original.
- `assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash-icon.png` — 1024×1024, usados pelo bundler do Expo.
- `assets/favicon.png` — 48×48 para web.
- `assets/icons/android/` — ícones por densidade:
  - `icon-mdpi.png` (48x48)
  - `icon-hdpi.png` (72x72)
  - `icon-xhdpi.png` (96x96)
  - `icon-xxhdpi.png` (144x144)
  - `icon-xxxhdpi.png` (192x192)
- `assets/icons/ios/` — ícones iOS comuns:
  - `icon-120.png`, `icon-152.png`, `icon-167.png`, `icon-180.png`
- `assets/store/` — imagens para as lojas:
  - `play_store_icon.png` — 512x512 (Google Play)
  - `feature_graphic.png` — 1024x500 (Google Play feature graphic)
  - `appstore_icon.png` — 1024x1024 (App Store)

Como usar

- Expo bundler: `app.json` já foi atualizado para apontar para `./assets/icons/android/icon-xxxhdpi.png` como `icon` e para `./assets/icons/android/icon-xxxhdpi.png` como `adaptiveIcon.foregroundImage`.
- Google Play Console: use `assets/store/play_store_icon.png` (512x512) e `assets/store/feature_graphic.png` (1024x500).
- App Store Connect: use `assets/store/appstore_icon.png` (1024x1024).

Notas

- Se preferir que eu gere variantes com fundo transparente (removendo o fundo atual) informe e eu tento automatizar, mas a remoção automática pode não ser perfeita.
- Posso também gerar imagens adicionais (screenshots, store banners) sob demanda.
