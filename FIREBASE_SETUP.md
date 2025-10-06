# Configuração do Firebase

## 1. Criar Projeto Firebase

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Digite o nome: `agenda-familiar`
4. Desabilite Google Analytics (opcional)
5. Clique em "Criar projeto"

## 2. Configurar Authentication

1. No painel lateral, clique em "Authentication"
2. Clique em "Começar"
3. Na aba "Sign-in method", habilite:
   - **Email/Password**
   - **Google** (configure com suas chaves OAuth)

## 3. Configurar Firestore

1. No painel lateral, clique em "Firestore Database"
2. Clique em "Criar banco de dados"
3. Escolha "Iniciar no modo de teste" (por enquanto)
4. Selecione uma localização (ex: `southamerica-east1`)

## 4. Configurar App Android

1. No painel lateral, clique em "Configurações do projeto" (ícone de engrenagem)
2. Clique em "Adicionar app" → "Android"
3. Preencha:
   - **Nome do pacote Android**: `com.n2ilva.taskapp`
   - **Apelido do app**: `Task App`
   - **Certificado SHA-1**: `44:8E:1A:F1:A3:A4:09:12:12:2E:2E:52:06:AE:58:70:73:10:DE:18`
4. Baixe o arquivo `google-services.json`
5. Coloque o arquivo na pasta raiz do projeto

## 5. Configurar App Web

1. Clique em "Adicionar app" → "Web"
2. Digite o nome: `Task App Web`
3. Habilite "Firebase Hosting" (opcional)
4. Copie a configuração que aparece

## 6. Atualizar Configuração

Abra o arquivo `config/firebase.ts` e substitua pela configuração do seu projeto:

```typescript
const firebaseConfig = {
  apiKey: "sua-api-key-aqui",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "seu-app-id"
};
```

## 7. Configurar Regras de Segurança

No Firestore, vá para "Regras" e configure:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuários podem ler/escrever seus próprios dados
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Famílias podem ser acessadas pelos membros
    match /families/{familyId} {
      allow read, write: if request.auth != null;
    }
    
    // Tarefas podem ser acessadas por usuários autenticados
    match /tasks/{taskId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 8. Configurar Google OAuth

1. No [Google Cloud Console](https://console.cloud.google.com/)
2. Selecione seu projeto Firebase ou crie um novo
3. Vá para "APIs e serviços" → "Credenciais"
4. Configure o cliente OAuth 2.0 com:
   - **Package name**: `com.n2ilva.taskapp`
   - **SHA-1**: `44:8E:1A:F1:A3:A4:09:12:12:2E:2E:52:06:AE:58:70:73:10:DE:18`

## 9. Testar Configuração

1. Execute o app: `npm start`
2. Teste o registro com email/senha
3. Teste o login com Google
4. Verifique se os dados aparecem no Firestore

## Funcionalidades Implementadas

✅ **Autenticação Firebase**
- Login com email/senha
- Registro de novos usuários
- Login com Google OAuth
- Logout seguro
- Persistência de sessão

✅ **Integração com Sistema de Família**
- Criação automática de usuários no Firestore
- Suporte a códigos de convite
- Papéis de admin/dependente
- Dados sincronizados entre dispositivos

✅ **Interface Atualizada**
- Toggle entre login/registro
- Campos de email/senha
- Loading states
- Validação de campos
- Mensagens de erro/sucesso