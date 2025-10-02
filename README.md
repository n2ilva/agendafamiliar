# Agenda Familiar (JS Reset)## Agenda Familiar (Reset JavaScript)



Base mínima criada após limpeza do projeto anterior. Preencha Firebase e evolua iterativamente.O projeto foi reiniciado em uma base mínima JavaScript para simplificar build Android e remover complexidade de TypeScript + múltiplos contexts. O estado anterior completo (TS + contexts + filtros avançados) permanece salvo no Git (tag ou commit de backup) e listado em `backup_manifest_2025-10-02.txt`.



## Scripts### Estrutura Atual

- `npm start` – iniciar```

- `npm run android` – abrir em dispositivo/emulador Androidindex.js          # Entrada registra App

- `npm run web` – abrir no navegadorsrc/App.js        # Lista simples de tarefas

src/firebase.js   # Inicialização Firebase (substituir REPLACE_ME)

## Próximos passossrc/tasks.js      # Funções utilitárias p/ tarefas

Ver roadmap interno a ser reintroduzido.backup_manifest_2025-10-02.txt  # Inventário da versão anterior

```

### Como Rodar
```
npm install
npx expo start
```
Para Android (dev client ou Expo Go simplificado):
```
npx expo start --android
```

### Configurar Firebase
Edite `src/firebase.js` e substitua todos os campos `REPLACE_ME` pelos valores do seu projeto Firebase (Web). Se quiser reintroduzir pacotes nativos Firebase, será necessário gerar um development build novamente.

### Próximos Passos Planejados (Roadmap Rebuild)
1. Reintroduzir Auth (Google) em JS.
2. Recriar categorias + cores + ícones.
3. Fluxo de status (pending/approved/completed/rejected).
4. Filtros e ordenação avançada.
5. Paginação / otimizações.
6. Regras de segurança Firestore.
7. Notificações (Expo Notifications).

### Observação
Este reset visa destravar build nativo e permitir evolução incremental limpa. Recursos avançados serão reintegrados em etapas.

---
*Última atualização: Reset para scaffold JavaScript mínimo.*
