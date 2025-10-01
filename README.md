# 📱 Agenda Familiar

Um sistema completo de gerenciamento de tarefas familiares com aplicações web e mobile, desenvolvido com tecnologias modernas e sincronização em tempo real via Firebase.

## 🌟 Visão Geral

O **Agenda Familiar** é uma solução completa para organização familiar que permite:
- ✅ **Gerenciamento colaborativo** de tarefas entre membros da família
- 🔄 **Sincronização em tempo real** entre dispositivos e usuários
- 👨‍👩‍👧‍👦 **Sistema de famílias** com controle de acesso e permissões
- 📱 **Aplicações multiplataforma** (Web, iOS, Android)
- ☁️ **Backup na nuvem** com Firebase Firestore
- 🔐 **Autenticação segura** via Google OAuth

## 🏗️ Arquitetura do Projeto

Este é um **monorepo** que contém:

```
agendafamiliar/
├── 📁 agenda-familiar-web/        # Aplicação Web (Next.js)
├── 📁 agenda-familiar-mobile/     # Aplicação Mobile (React Native + Expo)
├── 📁 shared/                     # Código compartilhado
├── 📁 functions/                  # Firebase Cloud Functions
├── 📁 assets/                     # Recursos compartilhados
├── 📁 mobile-configs/             # Configurações específicas do mobile
└── 📄 Configurações raiz          # Firebase, EAS, etc.
```

### 🎯 Funcionalidades Principais

#### 👨‍👩‍👧‍👦 Sistema de Família
- **Chaves únicas de família** (8 caracteres) para conectar membros
- **Controle de permissões** por tipo de usuário
- **Sincronização automática** entre todos os membros
- **Gerenciamento de membros** (adicionar/remover)

#### 👤 Tipos de Usuário
- 👑 **Administrador**: Controle total do sistema e família
- 👤 **Usuário Comum**: Criar e gerenciar tarefas pessoais
- 🧒 **Dependente**: Tarefas com sistema de aprovação parental
- 👤 **Convidado**: Acesso limitado (apenas dados locais)

#### ✅ Sistema de Tarefas Avançado
- **CRUD completo** de tarefas
- **Categorização** com cores personalizadas
- **Sistema de repetição** (única, diária, semanal)
- **Datas e horários** com modal customizado
- **Status de conclusão** e histórico detalhado

#### 👶 Controle Parental
- **Sistema de aprovações** para tarefas de dependentes
- **Revisão de atividades** por adultos da família
- **Supervisão completa** das atividades das crianças

#### ☁️ Sincronização na Nuvem
- **Firebase Firestore** para armazenamento
- **Sincronização bidirecional** (local ↔ nuvem)
- **Backup automático** após login
- **Merge inteligente** de dados conflitantes

#### 📅 Interface Avançada
- **Modal de data/hora customizado** com calendário visual
- **Formatação inteligente** de datas ("Hoje às 14:30")
- **Interface responsiva** para web e mobile
- **Design moderno** e acessível

## 🛠️ Tecnologias Utilizadas

### 📱 Aplicação Web
- **Next.js 15.5.4** - Framework React para produção
- **React 19.1.0** - Biblioteca UI
- **TypeScript 5** - Tipagem estática
- **Tailwind CSS 4** - Framework CSS utilitário
- **Firebase 12.3.0** - Backend e autenticação

### 📱 Aplicação Mobile
- **React Native 0.81.4** - Framework mobile cross-platform
- **Expo SDK 54** - Plataforma de desenvolvimento
- **TypeScript 5.9** - Tipagem estática
- **React Navigation 7** - Navegação e roteamento
- **React Native Firebase** - Integração nativa com Firebase

### ☁️ Backend & Infraestrutura
- **Firebase**:
  - **Authentication** - Autenticação Google OAuth
  - **Firestore** - Banco de dados NoSQL
  - **Cloud Functions** - Lógica serverless
  - **Hosting** - Deploy da aplicação web
- **EAS Build** - Build e deploy mobile automatizado

### 🔧 Ferramentas de Desenvolvimento
- **ESLint** - Linting e qualidade de código
- **TypeScript** - Type checking
- **Git** - Controle de versão
- **npm/yarn** - Gerenciamento de dependências

## 🚀 Como Executar

### 📋 Pré-requisitos
- **Node.js 18+**
- **Expo CLI** (`npm install -g @expo/cli`)
- **Conta Google** (para autenticação OAuth)
- **Projeto Firebase** configurado

### 🛠️ Configuração Inicial

1. **Clone o repositório**:
   ```bash
   git clone <seu-repositorio>
   cd agendafamiliar
   ```

2. **Instale dependências da raiz**:
   ```bash
   npm install
   ```

3. **Configure variáveis de ambiente**:
   ```bash
   cp .env.example .env
   # Edite o .env com suas configurações do Firebase
   ```

### 🌐 Executando a Aplicação Web

```bash
cd agenda-familiar-web
npm install
npm run dev
```

Acesse: `http://localhost:3000`

### 📱 Executando a Aplicação Mobile

```bash
cd agenda-familiar-mobile
npm install
npm start
```

#### Plataformas suportadas:
```bash
# iOS Simulator
npm run ios

# Android Emulator/Device
npm run android

# Web (para desenvolvimento)
npm run web
```

### ☁️ Configuração do Firebase

1. **Crie um projeto no Firebase Console**
2. **Ative os serviços**:
   - Authentication (Google provider)
   - Firestore Database
   - Hosting (opcional para web)
   - Functions (opcional)

3. **Configure as credenciais**:
   - Baixe o `google-services.json` para mobile
   - Configure as variáveis de ambiente para web

4. **Deploy das Functions** (opcional):
   ```bash
   cd functions
   npm install
   firebase deploy --only functions
   ```

## 📖 Como Usar

### 🔐 Primeiro Acesso
1. **Login** com conta Google
2. **Selecione seu tipo** de usuário
3. **Crie ou entre** em uma família usando a chave

### 👨‍👩‍👧‍👦 Gerenciando Família
- **Administradores** podem gerenciar membros
- **Chave da família** é única e compartilhável
- **Sincronização** automática entre membros

### ✅ Trabalhando com Tarefas
1. **Crie tarefas** com título, descrição e categoria
2. **Defina datas/horários** usando o modal customizado
3. **Configure repetição** se necessário
4. **Aprove tarefas** (para dependentes)

### 📊 Visualizando Histórico
- **Histórico completo** de tarefas concluídas
- **Informações detalhadas** (quem, quando, status)
- **Formatação inteligente** de datas

## 📁 Estrutura Detalhada

```
agendafamiliar/
├── agenda-familiar-web/           # 🖥️ Aplicação Web
│   ├── src/
│   │   ├── app/                   # Next.js App Router
│   │   ├── components/            # Componentes React
│   │   ├── contexts/              # Context Providers
│   │   ├── hooks/                 # Custom Hooks
│   │   ├── services/              # Firebase Services
│   │   └── utils/                 # Utilitários
│   ├── public/                    # Assets estáticos
│   └── tailwind.config.js         # Config Tailwind
├── agenda-familiar-mobile/        # 📱 Aplicação Mobile
│   ├── src/
│   │   ├── components/            # Componentes React Native
│   │   ├── contexts/              # Context Providers
│   │   ├── navigation/            # Config React Navigation
│   │   ├── screens/               # Telas do App
│   │   ├── services/              # Firebase Services
│   │   └── utils/                 # Utilitários
│   └── app.json                   # Config Expo
├── shared/                        # 🔄 Código Compartilhado
│   ├── config/                    # Configurações Firebase
│   ├── constants/                 # Constantes do app
│   ├── contexts/                  # Contexts compartilhados
│   ├── hooks/                     # Hooks compartilhados
│   ├── services/                  # Serviços compartilhados
│   └── utils/                     # Utilitários compartilhados
├── functions/                     # ☁️ Firebase Functions
│   ├── src/                       # Código das functions
│   └── package.json               # Dependências
├── assets/                        # 🎨 Recursos Compartilhados
├── mobile-configs/                # 📱 Configs Mobile
└── Configurações raiz             # ⚙️ Configs do Monorepo
    ├── firebase.json              # Config Firebase
    ├── firestore.rules            # Regras Firestore
    ├── firestore.indexes.json     # Índices Firestore
    ├── eas.json                   # Config EAS Build
    └── .env                       # Variáveis ambiente
```

## 🔧 Scripts Disponíveis

### Raiz do Projeto
```bash
npm start          # Inicia Expo (mobile)
npm run android    # Executa no Android
npm run ios        # Executa no iOS
npm run web        # Executa na web (mobile)
```

### Aplicação Web
```bash
cd agenda-familiar-web
npm run dev        # Desenvolvimento
npm run build      # Build de produção
npm run start      # Servidor de produção
npm run lint       # Executa ESLint
```

### Aplicação Mobile
```bash
cd agenda-familiar-mobile
npm start          # Inicia Expo
npm run android    # Android
npm run ios        # iOS
npm run web        # Web
```

## 🚀 Deploy

### 📱 Aplicação Mobile
```bash
# Build com EAS
eas build --platform android
eas build --platform ios

# Submit para stores
eas submit --platform android
eas submit --platform ios
```

### 🌐 Aplicação Web
```bash
cd agenda-familiar-web
npm run build
firebase deploy --only hosting
```

### ☁️ Firebase Functions
```bash
cd functions
firebase deploy --only functions
```

## 🔒 Segurança e Privacidade

- **Autenticação OAuth 2.0** via Google
- **Dados criptografados** em trânsito e repouso
- **Controle de acesso** granular por família
- **Isolamento de dados** entre famílias
- **Backup automático** e recuperação

## 🎯 Roadmap

### ✅ Implementado
- [x] Sistema de famílias com chaves únicas
- [x] Autenticação Google OAuth
- [x] Sincronização Firebase Firestore
- [x] Aplicações web e mobile
- [x] Sistema de aprovações para dependentes
- [x] Modal customizado de data/hora
- [x] Histórico detalhado de tarefas

### 🚧 Em Desenvolvimento
- [ ] Notificações push
- [ ] Temas escuro/claro
- [ ] Estatísticas e relatórios avançados
- [ ] Chat familiar integrado

### 📋 Planejado
- [ ] Sistema de recompensas
- [ ] Sincronização em tempo real (WebSocket)
- [ ] Localização geográfica para tarefas
- [ ] Integração com calendários externos
- [ ] Backup e restauração de dados

## 🤝 Como Contribuir

1. **Fork** o projeto
2. **Clone** sua fork: `git clone https://github.com/seu-usuario/agendafamiliar.git`
3. **Crie uma branch**: `git checkout -b feature/nova-funcionalidade`
4. **Instale dependências**: `npm install` (raiz e subprojetos)
5. **Desenvolva** sua feature
6. **Teste** em ambas as plataformas (web/mobile)
7. **Commit**: `git commit -m 'Adiciona nova funcionalidade'`
8. **Push**: `git push origin feature/nova-funcionalidade`
9. **Abra um Pull Request**

### 📋 Padrões de Código
- **TypeScript** obrigatório em novos códigos
- **ESLint** configurado - execute `npm run lint`
- **Commits** semânticos
- **Testes** para funcionalidades críticas

## 📄 Licença

Este projeto está licenciado sob a **MIT License**. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👥 Equipe

Desenvolvido com ❤️ para facilitar a organização e colaboração familiar.

---

## 📊 Status do Projeto

- **📱 Mobile**: ✅ Funcional (iOS, Android)
- **🌐 Web**: ✅ Funcional (PWA)
- **☁️ Backend**: ✅ Firebase (Auth, Firestore, Functions)
- **📦 Build**: ✅ EAS Build configurado
- **🔄 CI/CD**: 🚧 Em configuração

**Última atualização**: Outubro 2025
**Versão**: 1.0.0