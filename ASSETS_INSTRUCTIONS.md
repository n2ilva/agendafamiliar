Instruções rápidas para atualizar os assets visuais do app

Arquivos adicionados (placeholders):
- `assets/fivecon.ico` - ícone `.ico` (placeholder). Substitua por um `.ico` binário real contendo múltiplas resoluções (16x16, 32x32, 48x48, 64x64).
- `assets/tasks-shared.png` - ícone PNG para representar "tarefas compartilhadas".

Recomendações:
1. Crie ícones em um tamanho alto (ex.: 1024x1024 ou 512x512) e gere variações menores.
2. Use um gerador/conversor para criar o `.ico` a partir de PNGs (ex.: https://icoconvert.com/ , https://realfavicongenerator.net/).
3. Substitua os placeholders acima pelos arquivos binários gerados e comite as mudanças:
   ```bash
   git add assets/fivecon.ico assets/tasks-shared.png
   git commit -m "chore(assets): add placeholders for fivecon.ico and tasks-shared.png"
   git push origin main
   ```

Atualizar referências no projeto:
- `app.json` já referencia `icon` e `splash` (use `assets/icon.png` e `assets/splash-icon.png`).
- Para usar `fivecon.ico` em web, edite `web.favicon` em `app.json` para `./assets/fivecon.ico`.
- Para exibir o ícone de tarefas compartilhadas em telas, importe o asset em componentes:
  ```js
  import TasksSharedIcon from '../assets/tasks-shared.png';
  <Image source={TasksSharedIcon} style={{ width: 48, height: 48 }} />
  ```

Observação:
- Placeholders não são imagens reais — substitua antes de publicar em produção.
