# Agenda Familiar (Base JavaScript)

Aplicativo colaborativo simples para gerenciamento de tarefas familiares.

## Objetivo Atual
Base funcional mínima + incrementos: autenticação email/senha, papéis (primeiro usuário = admin), categorias básicas, due date opcional, paginação inicial (lazy load), notificações scaffold e rascunho de regras Firestore.

## Estrutura
```
App.js               # UI principal
src/firebase.js      # Inicialização Firebase
src/AuthContext.js   # Autenticação + roles
src/TaskContext.js   # Tarefas + workflow + paginação
src/CategoryContext.js # Categorias e criação
src/notifications.js # Scaffold de notificações (placeholder)
firestore.rules      # Regras (draft)
```

## Scripts
```
npm start        # iniciar Metro bundler
npm run android  # abrir em dispositivo/emulador Android
npm run web      # abrir no navegador
```

## Configurar Firebase
Edite `src/firebase.js` e preencha as chaves. Você pode usar variáveis `EXPO_PUBLIC_...` em um arquivo `.env` (não versionado) se desejar.

## Papéis e Permissões
| Papel | Pode criar | Pode marcar concluída direto | Precisa aprovação | Pode aprovar | Pode reverter |
|-------|------------|------------------------------|-------------------|--------------|---------------|
| admin | sim        | sim                          | não               | sim          | sim           |
| kid   | sim        | não (vira pending_approval)  | sim               | não          | pode voltar para pending |

## Workflow de Status
Estados utilizados:
```
pending -> (kid tenta concluir) -> pending_approval -> (admin aprova) -> completed
pending -> (admin conclui) -> completed
pending_approval -> (kid retorna) -> pending
completed -> (admin reabre) -> pending
```

## Funcionalidades Atuais
- Login / Registro (e-mail & senha)
- Definição automática de papel (primeiro admin)
- Criação e fluxo de aprovação/conclusão (admin vs kids)
- Categorias (criação, filtro, badge de cor)
- Due date simples (entrada YYYY-MM-DD)
- Paginação incremental (15 por lote + "Carregar mais")
- Regras Firestore rascunho (`firestore.rules`)
- Scaffold de notificações (registro permissões e stub de agendamento)

## Próximos Passos Planejados
1. Ordenação avançada / busca
2. Estatísticas agregadas (contadores por status)
3. Melhorar UI de due date (date picker) e validações
4. Notificações reais para tarefas próximas do vencimento
5. Histórico separado e paginação refinada
6. Hardening das regras Firestore (validações de schema)

## Observação
O estado anterior em TypeScript com recursos avançados foi removido neste reset e listado em `backup_manifest_2025-10-02.txt` (se existente em seu histórico).

---
*Última atualização: adicionadas categorias, dueAt, paginação, regras draft e scaffold de notificações.*
