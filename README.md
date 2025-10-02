# Agenda Familiar (Base JavaScript)

Aplicativo colaborativo simples para gerenciamento de tarefas familiares.

## Objetivo Atual
Base funcional mínima: autenticação email/senha, definição de papéis (primeiro usuário = admin, demais = kids) e fluxo básico de aprovação/conclusão de tarefas.

## Estrutura
```
App.js              # UI principal (login + lista de tarefas)
src/firebase.js     # Inicialização Firebase (substituir REPLACE_ME)
src/AuthContext.js  # Autenticação + roles
src/TaskContext.js  # Lógica de tarefas e workflow
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

## Próximos Passos Planejados
1. Categorias e ícones
2. Ordenação avançada / busca
3. Estatísticas agregadas
4. Regras Firestore de segurança
5. Notificações
6. Paginação de histórico

## Observação
O estado anterior em TypeScript com recursos avançados foi removido neste reset e listado em `backup_manifest_2025-10-02.txt` (se existente em seu histórico).

---
*Última atualização: Base JS com auth e tarefas.*
