# Agenda Familiar - Sincronização Firebase

## 🚀 Funcionalidades Implementadas

### ✅ Autenticação Google Integrada
- Login com Google OAuth 2.0
- Integração com Firebase Authentication
- Sincronização automática de dados

### ✅ Sincronização na Nuvem
- Upload automático de dados após login
- Download manual de dados da nuvem
- Sincronização bidirecional de tarefas e histórico
- Suporte a dados familiares compartilhados

### ✅ Armazenamento Híbrido
- AsyncStorage para dados locais offline
- Firebase Firestore para sincronização na nuvem
- Backup automático e recuperação de dados

## 🔧 Configuração do Firebase

### 1. Criar Projeto no Firebase
1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Criar um projeto" ou selecione um existente
3. Ative o Firestore Database e Authentication

### 2. Configurar Authentication
1. Vá para **Authentication** → **Sign-in method**
2. Ative o provedor **Google**
3. Configure o OAuth consent screen

### 3. Configurar Firestore Database
1. Vá para **Firestore Database** → **Criar banco de dados**
2. Escolha **Iniciar no modo de teste** (para desenvolvimento)
3. Selecione uma localização para o banco

### 4. Obter Configurações do Firebase
1. Vá para **Configurações do projeto** (ícone de engrenagem)
2. Na aba **Geral**, role até "Seus apps"
3. Clique em **Adicionar app** → **Web**
4. Copie as configurações mostradas

### 5. Configurar Variáveis de Ambiente
Edite o arquivo `.env` na raiz do projeto:

```env
# Configuração do Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=sua-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=seu-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=seu-app-id
```

## 📱 Como Usar

### Login e Sincronização Automática
1. Faça login com Google
2. Selecione seu tipo de usuário
3. Os dados são automaticamente sincronizados na nuvem

### Sincronização Manual
1. Vá para **Configurações**
2. Na seção **Sincronização na Nuvem**:
   - **Enviar para Nuvem**: Upload dos dados locais
   - **Baixar da Nuvem**: Download e mesclagem com dados locais

### Funcionalidades por Tipo de Usuário
- **Administrador**: Acesso completo + gerenciamento familiar
- **Dependente**: Tarefas próprias + aprovação necessária
- **Convidado**: Apenas dados locais (sem sincronização)

## 🏗️ Arquitetura

### Serviços Implementados
- `firebase.js`: Configuração e métodos Firebase
- `sync.js`: Serviço de sincronização híbrida
- `storage.js`: Armazenamento local AsyncStorage

### Contextos Atualizados
- `AuthContext`: Integração com Firebase Auth
- Login automático e logout sincronizado

### Estrutura do Firestore
```
users/{userId}/
├── user: {name, email, picture, ...}
├── tasks: [{id, title, description, ...}]
└── history: [{id, taskId, action, ...}]

families/{familyId}/
├── info: {name, adminId, members: [...]}
├── tasks: [{id, title, assignedTo, ...}]
└── history: [{id, taskId, action, ...}]
```

## 🔒 Segurança
- Autenticação obrigatória para sincronização
- Dados criptografados em trânsito
- Regras de segurança do Firestore configuráveis

## 🚨 Próximos Passos
1. Configurar regras de segurança no Firestore
2. Implementar backup offline avançado
3. Adicionar sincronização em tempo real
4. Otimizar performance para grandes volumes de dados

## 🐛 Troubleshooting
- **Erro de configuração**: Verifique variáveis de ambiente
- **Sincronização falha**: Verifique conexão e permissões
- **Dados não aparecem**: Force sincronização manual

---
*Desenvolvido com React Native + Expo + Firebase*