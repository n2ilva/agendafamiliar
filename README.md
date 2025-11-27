# 📅 Agenda Familiar

Aplicativo de gerenciamento de tarefas colaborativo desenvolvido com React Native e Expo, focado em facilitar a organização e comunicação entre membros de uma família.

## 🎯 Visão Geral

O **Agenda Familiar** permite que famílias criem e gerenciem tarefas compartilhadas, com suporte para diferentes níveis de permissão, sincronização em tempo real via Firebase, e modo offline inteligente.

## ✨ Principais Funcionalidades

### 👥 Gerenciamento de Família
- **Criação de Família**: Crie uma nova família e receba um código de convite único
- **Entrada via Código**: Use o código de 6 caracteres para entrar em uma família existente
- **Papéis de Usuário**:
  - **Admin**: Controle total sobre tarefas e membros
  - **Dependente**: Permissões configuráveis pelo admin (criar, editar, deletar tarefas)
  - **Convidado**: Acesso temporário limitado

### 📋 Gestão de Tarefas

#### Criação e Organização
- **Categorias Personalizadas**: 
  - 7 categorias padrão (Trabalho, Casa, Saúde, Estudos, Finanças, Compras, Todas)
  - Crie categorias customizadas com ícones e cores personalizadas
  - Filtre tarefas por categoria
- **Tarefas Privadas**: Marque tarefas como privadas (visíveis apenas para você)
- **Recorrência Flexível**:
  - Diária, Semanal (dias específicos), Mensal
  - Intervalo personalizado (a cada X dias)
  - Duração configurável em meses

#### Atribuição e Aprovação
- **Atribuir Membros**: Delegue tarefas para membros específicos da família
- **Sistema de Aprovação**: 
  - Dependentes podem solicitar aprovação para completar tarefas
  - Admins aprovam ou rejeitam com feedback
  - Notificações em tempo real

#### Organização Temporal
- **Abas de Visualização**:
  - **Hoje**: Tarefas com vencimento hoje
  - **Futuras**: Tarefas programadas para os próximos dias
- **Calendário Integrado**: 
  - Visualize tarefas no calendário mensal
  - Feriados brasileiros destacados
  - Cores indicam status (verde: ativa, vermelho: vencida, laranja: completada com atraso)
  - Criação rápida de tarefas ao clicar em uma data

#### Recursos Avançados
- **Adiar Tarefas**: Reagende com seletor de data/hora nativo
- **Histórico**: Acompanhe as últimas 7 dias de ações (criação, conclusão, edição, exclusão)
- **Desfazer**: Botão flutuante para reverter última ação (5 segundos)
- **Pesquisa e Filtros**: Encontre tarefas rapidamente

### 🎨 Experiência do Usuário

#### Modo Escuro
- **Três Modos de Tema**:
  - **Claro**: Interface tradicional com fundo branco
  - **Escuro**: Tema dark confortável para ambientes com pouca luz
  - **Auto**: Segue automaticamente as preferências do sistema
- **Persistência**: Preferência salva localmente
- **StatusBar Sincronizada**: Barra de status do sistema se adapta ao tema

#### Interface
- **Cabeçalho Personalizável**:
  - Avatar do usuário (foto ou emoji)
  - Menu com opções de gerenciamento
  - Seletor de tema integrado
  - Indicadores de sincronização e conectividade
- **Feedback Háptico**: Vibrações sutis em ações importantes (Android)
- **Animações Suaves**: Transições entre abas e modais

### 🔄 Sincronização e Offline

#### Modo Híbrido Inteligente
- **Online**: Sincronização automática com Firebase Firestore
- **Offline**: 
  - Todas as operações continuam funcionando
  - Dados salvos localmente (AsyncStorage)
  - Fila de sincronização automática quando voltar online
- **Indicadores Visuais**: Status de conectividade e sincronização no cabeçalho

#### Sincronização de Dados
- **Tempo Real**: Mudanças de outros membros aparecem instantaneamente
- **Reconciliação**: Conflitos resolvidos automaticamente com base em timestamps
- **Cache Local**: Acesso rápido mesmo com conexão lenta

### 🔔 Notificações
- **Aprovações Pendentes**: Notificações quando tarefas precisam de aprovação
- **Respostas de Admin**: Feedback sobre aprovações/rejeições
- **Tarefas Vencidas**: Alertas para deadlines próximos

## 🛠️ Tecnologias

### Core
- **React Native** 0.81.5
- **Expo** ~54.0.21
- **TypeScript** ~5.9.2

### Backend e Sincronização
- **Firebase** 12.4.0
  - Authentication (Email/Password)
  - Firestore (Banco de dados em tempo real)
  - Storage (Upload de fotos)
- **AsyncStorage** (Persistência local)

### UI e Navegação
- **React Native Gesture Handler** (Gestos e swipes)
- **React Native Calendars** (Visualização de calendário)
- **Expo Vector Icons** (Ícones Ionicons)
- **Safe Area Context** (Suporte a notch/bordas)

### Utilitários
- **date-fns** (Manipulação de datas)
- **uuid** (Geração de IDs únicos)
- **Expo Notifications** (Notificações push)
- **Expo Clipboard** (Copiar código de convite)

## 📱 Plataformas Suportadas

- ✅ **Android** (Nativo)
- ✅ **iOS** (Nativo)
- ✅ **Web** (Navegador)

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- Expo CLI (`npm install -g expo-cli`)
- Conta Firebase configurada

### Instalação

```bash
# Clone o repositório
git clone https://github.com/n2ilva/agendafamiliar.git
cd agendafamiliar

# Instale as dependências
npm install
```

### Configuração do Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com)
2. Ative Authentication (Email/Password)
3. Crie um banco Firestore
4. Configure as regras de segurança (`firestore.rules`)
5. Adicione suas credenciais em `src/config/firebase.config.ts`

### Executar o App

```bash
# Servidor de desenvolvimento
npm start

# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

## 📂 Estrutura do Projeto

```
agendafamiliar/
├── index.ts                          # Entry point da aplicação
├── src/
│   ├── App.tsx                       # Componente raiz
│   │
│   ├── components/                   # Componentes reutilizáveis
│   │   ├── common/                   # Componentes comuns
│   │   │   ├── EmptyState.tsx        # Estado vazio de listas
│   │   │   ├── LoadingScreen.tsx     # Tela de carregamento
│   │   │   └── SyncSystemBars.tsx    # Sincronização de barras do sistema
│   │   │
│   │   ├── header/                   # Componentes do cabeçalho
│   │   │   ├── Header.tsx            # Cabeçalho principal
│   │   │   ├── HeaderAvatar.tsx      # Avatar do usuário
│   │   │   ├── HeaderMenu.tsx        # Menu dropdown
│   │   │   ├── HeaderUserInfo.tsx    # Informações do usuário
│   │   │   └── header.styles.ts      # Estilos do cabeçalho
│   │   │
│   │   └── modals/                   # Todos os modais do app
│   │       ├── AddCategoryModal.tsx  # Adicionar categoria
│   │       ├── ApprovalModal.tsx     # Aprovação de tarefas
│   │       ├── AvatarActionsModal.tsx
│   │       ├── AvatarPickerModal.tsx
│   │       ├── CalendarModal.tsx     # Calendário
│   │       ├── EditNameModal.tsx
│   │       ├── JoinFamilyModal.tsx
│   │       ├── PostponeModal.tsx     # Adiar tarefas
│   │       ├── ProfileSettingsModal.tsx
│   │       └── RepeatConfigModal.tsx # Configurar recorrência
│   │
│   ├── config/                       # Configurações
│   │   └── firebase.config.ts        # Configuração do Firebase
│   │
│   ├── constants/                    # Constantes da aplicação
│   │   ├── colors.ts                 # Paletas e temas de cores
│   │   └── task.constants.ts         # Constantes de tarefas/categorias
│   │
│   ├── contexts/                     # Contexts do React
│   │   ├── auth.context.tsx          # Contexto de autenticação
│   │   └── theme.context.tsx         # Contexto de tema (claro/escuro)
│   │
│   ├── hooks/                        # Custom hooks
│   │   ├── use-calendar.ts           # Lógica do calendário
│   │   ├── use-family.ts             # Gerenciamento de família
│   │   ├── use-header.ts             # Lógica do cabeçalho
│   │   └── use-tasks.ts              # Gerenciamento de tarefas
│   │
│   ├── screens/                      # Telas da aplicação
│   │   ├── login/
│   │   │   └── LoginScreen.tsx       # Tela de autenticação
│   │   │
│   │   ├── family-setup/
│   │   │   ├── FamilySetupScreen.tsx # Criação/entrada em família
│   │   │   ├── styles.ts
│   │   │   └── types.ts
│   │   │
│   │   └── tasks/
│   │       ├── TaskScreen.tsx        # Tela principal de tarefas
│   │       ├── styles.ts
│   │       ├── types.ts
│   │       └── components/           # Componentes específicos da tela
│   │           ├── CategorySelector.tsx
│   │           ├── TaskFilter.tsx
│   │           ├── TaskItem.tsx
│   │           └── TaskModal.tsx
│   │
│   ├── services/                     # Serviços (organizados por domínio)
│   │   ├── auth/                     # Serviços de autenticação
│   │   │   ├── firebase-auth.service.ts
│   │   │   └── local-auth.service.ts
│   │   │
│   │   ├── family/                   # Serviços de família
│   │   │   ├── firebase-family.service.ts
│   │   │   ├── local-family.service.ts
│   │   │   └── family-sync.helper.ts
│   │   │
│   │   ├── tasks/                    # Serviços de tarefas
│   │   │   └── firestore.service.ts
│   │   │
│   │   ├── sync/                     # Serviços de sincronização
│   │   │   ├── sync.service.ts
│   │   │   ├── background-sync.service.ts
│   │   │   └── connectivity.service.ts
│   │   │
│   │   ├── storage/                  # Serviços de armazenamento
│   │   │   └── local-storage.service.ts
│   │   │
│   │   └── notifications/            # Serviços de notificações
│   │       └── notification.service.ts
│   │
│   ├── types/                        # Definições de tipos TypeScript
│   │   ├── family.types.ts           # Tipos de família, usuários, tarefas
│   │   └── react-native-calendars.d.ts
│   │
│   └── utils/                        # Utilitários (organizados por função)
│       ├── date/                     # Utilitários de data
│       │   ├── date.utils.ts         # Helpers de manipulação de datas
│       │   └── holidays.ts           # Feriados brasileiros
│       │
│       ├── helpers/                  # Helpers genéricos
│       │   ├── alert.ts              # Wrapper de alertas cross-platform
│       │   └── logger.ts             # Logger com níveis de log
│       │
│       └── validators/               # Validadores
│           ├── family.utils.ts       # Validação de família/códigos
│           └── task.utils.ts         # Validação de tarefas
│
├── assets/                           # Recursos estáticos
│   ├── icons/                        # Ícones do app
│   └── *.png                         # Imagens e logos
│
├── functions/                        # Firebase Cloud Functions
│   └── index.js
│
├── firestore.rules                   # Regras de segurança Firestore
├── storage.rules                     # Regras de segurança Storage
├── firebase.json                     # Configuração Firebase
├── app.json                          # Configuração Expo
├── eas.json                          # Configuração EAS Build
├── tsconfig.json                     # Configuração TypeScript
└── package.json
```

### Convenções de Nomenclatura

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| **Pastas** | kebab-case | `family-setup/`, `local-storage/` |
| **Componentes** | PascalCase | `TaskScreen.tsx`, `Header.tsx` |
| **Serviços** | kebab-case + `.service.ts` | `firebase-auth.service.ts` |
| **Contextos** | kebab-case + `.context.tsx` | `auth.context.tsx` |
| **Hooks** | `use-` + kebab-case | `use-calendar.ts` |
| **Estilos** | kebab-case + `.styles.ts` | `header.styles.ts` |
| **Tipos** | kebab-case + `.types.ts` | `family.types.ts` |
| **Utils** | kebab-case + `.utils.ts` | `date.utils.ts` |

### Barrel Exports

Cada diretório possui um arquivo `index.ts` para exports centralizados:

```typescript
// Exemplo de uso com barrel exports
import { AuthProvider, useAuth } from './contexts';
import { TaskScreen, LoginScreen } from './screens';
import { Header, LoadingScreen } from './components';
```

## 🔒 Segurança

### Firestore Rules
- **Isolamento de Famílias**: Usuários só acessam dados da própria família
- **Validação de Permissões**: Dependentes respeitam permissões configuradas
- **Tarefas Privadas**: Apenas o criador pode visualizar
- **Rate Limiting**: Proteção contra abuso

### Autenticação
- Senhas com mínimo de 6 caracteres
- Hash automático via Firebase Auth
- Validação de email no formato correto
- Reset de senha via email

## 🎨 Temas e Cores

### Categorias Padrão
- **Trabalho**: Azul (#3B82F6)
- **Casa**: Laranja (#F59E0B)
- **Saúde**: Verde (#10B981)
- **Estudos**: Roxo (#8B5CF6)
- **Finanças**: Verde escuro (#3f9605)
- **Compras**: Rosa (#EC4899)

### Modo Escuro
- Background: #121212
- Surface: #1E1E1E
- Textos adaptados para contraste ideal

## 🐛 Solução de Problemas

### Sincronização não funciona
- Verifique a conexão com a internet
- Confirme se as credenciais do Firebase estão corretas
- Veja o console para erros de permissão

### Tarefas não aparecem
- Certifique-se de estar na aba correta (Hoje/Futuras)
- Verifique o filtro de categoria selecionado
- Se for tarefa privada, confirme que você é o criador

### Notificações não chegam
- Permita notificações nas configurações do dispositivo
- Verifique se o serviço de notificações está ativo
- No iOS, confirme permissões no primeiro uso

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:
1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'feat: Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é privado e proprietário.

## 👤 Autor

**Natanael Silva**
- GitHub: [@n2ilva](https://github.com/n2ilva)

## 📞 Suporte

Para dúvidas ou problemas:
- Abra uma [issue](https://github.com/n2ilva/agendafamiliar/issues)
- Entre em contato via email

---

Desenvolvido com ❤️ para facilitar a organização familiar
