# 📅 Agenda Familiar

Aplicativo de gerenciamento de tarefas colaborativo para famílias, desenvolvido com React Native e Expo.

## ✨ Funcionalidades

- 👥 **Família** - Crie ou entre em uma família com código de convite
- 📋 **Tarefas** - Crie, edite, atribua e organize tarefas por categoria
- 🔄 **Recorrência** - Tarefas diárias, semanais, mensais ou personalizadas
- 📅 **Calendário** - Visualize tarefas e feriados brasileiros
- 🌙 **Tema Escuro** - Claro, escuro ou automático
- 📴 **Offline** - Funciona sem internet com sincronização automática
- 🔔 **Notificações** - Alertas de vencimento e aprovações

## 🛠️ Tecnologias

| Categoria | Tecnologia |
|-----------|------------|
| Framework | React Native + Expo SDK 54 |
| Linguagem | TypeScript |
| Backend | Firebase (Auth, Firestore, Storage) |
| Storage | AsyncStorage |

## 📱 Plataformas

✅ Android &nbsp;•&nbsp; ✅ iOS &nbsp;•&nbsp; ✅ Web

## 🚀 Início Rápido

```bash
# Instalar dependências
npm install

# Executar
npm start
```

### Configurar Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com)
2. Ative Authentication (Email/Password) e Firestore
3. Adicione as credenciais em `src/config/firebase.config.ts`

## 📂 Estrutura

```
src/
├── components/          # Componentes reutilizáveis
│   ├── common/          # EmptyState, LoadingScreen
│   ├── header/          # Header, Avatar, Menu
│   └── modals/          # Todos os modais
│
├── screens/             # Telas do app
│   ├── login/           # Autenticação
│   ├── family-setup/    # Configuração de família
│   └── tasks/           # Tela principal + componentes
│
├── services/            # Lógica de negócio
│   ├── auth/            # Autenticação
│   ├── family/          # Família
│   ├── tasks/           # Tarefas (Firestore)
│   ├── sync/            # Sincronização
│   ├── storage/         # Persistência local
│   └── notifications/   # Notificações
│
├── contexts/            # React Contexts
├── hooks/               # Custom hooks
├── types/               # Tipos TypeScript
├── constants/           # Cores, categorias
└── utils/               # Helpers (data, validação)
```

### Convenções

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Pastas | `kebab-case` | `family-setup/` |
| Componentes | `PascalCase` | `TaskScreen.tsx` |
| Serviços | `.service.ts` | `firebase-auth.service.ts` |
| Hooks | `use-*.ts` | `use-tasks.ts` |
| Tipos | `.types.ts` | `family.types.ts` |

## 🔒 Segurança

- Isolamento de dados por família
- Permissões configuráveis (Admin/Dependente)
- Tarefas privadas
- Autenticação Firebase

## 👤 Autor

**Natanael Silva** - [@n2ilva](https://github.com/n2ilva)

---

Desenvolvido com ❤️ para facilitar a organização familiar
