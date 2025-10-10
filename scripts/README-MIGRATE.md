Migração: normalizar campo `private` em `family_tasks`

Passos:

1. Coloque a chave da conta de serviço do Firebase em `scripts/serviceAccountKey.json` (arquivo JSON). NÃO comite esse arquivo no repositório.

2. Instale dependências de desenvolvimento:

   npm install --save-dev ts-node firebase-admin

3. Rode o script:

   npm run migrate:normalize-private

O script percorre todos os documentos em `family_tasks` e define `private: false` quando o campo estiver ausente.

Observação: execute este script em ambiente seguro e com conta de serviço que tenha permissões de escrita no Firestore.
