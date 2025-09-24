# 📱 Agenda Fa### 🔐 Autenticação e Usuários
- **Login Google**: Integração completa com Google OAuth 2.0 + Firebase Authentication
- **Sincronização na Nuvem**: Backup automático e recuperação de dados
- **Tipos de Usuário**:
  - 👑 **Administrador**: Controle total do sistema + gerenciamento familiar
  - 👤 **Usuário Comum**: Criar e gerenciar tarefas + sincronização
  - 🧒 **Dependente**: Tarefas com sistema de aprovação + dados na nuvem
  - 👤 **Convidado**: Apenas dados locais (sem sincronização)
- **Persistência de Sessão**: Login mantido entre sessões
Um aplicativo de gerenciamento de tarefas familiares desenvolvido em React Native com Expo, permitindo que famílias organizem e compartilhem tarefas de forma colaborativa com sincronização na nuvem via Firebase. Agenda Familiar

Um aplicativo de gerenciamento de tarefas familiares desenvolvido em React Native com Expo, permitindo que famílias organizem e compartilhem tarefas de forma colaborativa.

## 🎯 Funcionalidades Principais

### 👨‍👩‍👧‍👦 Sistema de Família
- **Chave de Família Única**: Sistema de chaves de 8 caracteres para conectar membros
- **Administrador de Família**: Controle total sobre membros e permissões
- **Compartilhamento Automático**: Todas as tarefas são sincronizadas entre membros da família
- **Gerenciamento de Membros**: Adicionar/remover membros da família

### � Autenticação e Usuários
- **Login Google**: Integração completa com Google OAuth
- **Tipos de Usuário**: 
  - 👑 **Administrador**: Controle total do sistema
  - 👤 **Usuário Comum**: Criar e gerenciar tarefas
  - 🧒 **Criança**: Tarefas com sistema de aprovação
- **Persistência de Sessão**: Login mantido entre sessões

### ✅ Sistema de Tarefas Completo
- **CRUD Completo**: Criar, editar, visualizar e deletar tarefas
- **Categorização**: Sistema de categorias com cores personalizadas
- **Sistema de Repetição**:
  - Tarefa única
  - Repetição diária  
  - Repetição semanal (dias específicos)
- **Datas e Horários**: Sistema inteligente de agendamento
- **Status de Conclusão**: Marcar tarefas como concluídas

### 👶 Sistema de Aprovação para Crianças
- **Aprovação de Tarefas**: Tarefas de crianças precisam ser aprovadas por adultos
- **Tela de Aprovações**: Interface dedicada para revisar tarefas concluídas
- **Controle Parental**: Supervisão total das atividades das crianças

### ☁️ Sincronização na Nuvem (Firebase)
- **Upload Automático**: Dados sincronizados após login
- **Download Manual**: Recuperação de dados da nuvem
- **Sincronização Bidirecional**: Merge inteligente de dados locais e remotos
- **Backup Familiar**: Dados compartilhados entre membros da família
- **Armazenamento Híbrido**: AsyncStorage local + Firestore na nuvem

### 📅 Modal de Data/Hora Customizado
- **Calendário Visual**: Interface de calendário completa e navegável
- **Seleção de Horário**: Lista de horários em intervalos de 15 minutos
- **Navegação por Tabs**: Alternância fácil entre seleção de data e hora
- **Formato Brasileiro**: Datas DD/MM/AAAA e horários HH:MM
- **Responsivo**: Funciona perfeitamente em mobile e web

### 📊 Histórico e Relatórios
- **Histórico Completo**: Registro detalhado de todas as tarefas concluídas
- **Informações Detalhadas**:
  - Quem completou a tarefa
  - Data e hora exata da conclusão
  - Status de aprovação
- **Formatação Inteligente**: Datas contextuais ("Hoje às 14:30", "Ontem às 09:15")

### 🎨 Interface e Experiência do Usuário
- **Design Moderno**: Interface limpa e intuitiva
- **Compatibilidade Multiplataforma**: iOS, Android e Web
- **Navegação Fluida**: React Navigation com transições suaves
- **Ícones Expressivos**: Expo Vector Icons para melhor UX
- **Temas Visuais**: Cores consistentes e acessibilidade

## 🛠 Tecnologias Utilizadas

### Core
- **React Native** 0.81.4
- **Expo SDK** 54
- **React** 19.1.0

### Navegação
- **React Navigation** 7.0.12
- **React Navigation Stack** 7.1.1

### Autenticação
- **Expo Auth Session** 7.0.8
- **Expo Web Browser** 15.0.7
- **Expo Crypto** 15.0.0

### UI/UX
- **Expo Vector Icons** 15.0.2
- **React Native Gesture Handler** 2.28.0
- **React Native Safe Area Context** 5.6.0
- **React Native Screens** 4.16.0

### Armazenamento
- **AsyncStorage** 2.2.0
- **Firebase Firestore** 10.12.2

### Data/Hora
- **React Native Community DateTimePicker** 8.4.4

### Web Support
- **React Native Web** 0.21.0
- **React DOM** 19.1.0

## � Estrutura do Projeto

```
agenda-familiar/
├── src/
│   ├── components/           # Componentes reutilizáveis
│   │   ├── AddCategoryModal.js
│   │   ├── DateTimePickerModal.js    # 🆕 Modal customizado
│   │   ├── JoinFamilyModal.js
│   │   ├── TaskItem.js
│   │   └── TaskModal.js
│   ├── config/              # Configurações
│   │   ├── firebase.js      # 🆕 Configuração Firebase
│   │   └── googleAuth.js
│   ├── constants/           # Constantes do app
│   │   ├── categories.js
│   │   ├── family.js        # 🆕 Sistema de família
│   │   └── userTypes.js
│   ├── contexts/            # Contexts React
│   │   └── AuthContext.js
│   ├── navigation/          # Configuração de navegação
│   │   └── AppNavigator.js
│   ├── screens/             # Telas do aplicativo
│   │   ├── ApprovalsScreen.js
│   │   ├── ConfiguracoesScreen.js
│   │   ├── HistoryScreen.js
│   │   ├── HomeScreen.js
│   │   ├── LoginScreen.js
│   │   └── UserTypeSelectionScreen.js
│   ├── services/            # Serviços e APIs
│   │   ├── firebase.js      # 🆕 Serviço Firebase
│   │   ├── storage.js
│   │   └── sync.js          # 🆕 Serviço de sincronização
│   └── utils/               # Utilitários
│       └── dateUtils.js     # 🆕 Formatação de datas
├── .env                     # Variáveis de ambiente
├── App.js                   # Componente principal
├── metro.config.js          # Configuração do Metro
└── package.json            # Dependências e scripts
```

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+
- Expo CLI
- Conta Google (para autenticação)

### Instalação
```bash
# Clone o repositório
git clone [seu-repo]

# Entre na pasta do projeto
cd agenda-familiar

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm start

# Para forçar porta 8081 (configurado)
npm run start
```

### Executar em Diferentes Plataformas
```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Navegador Web
npm run web
```

## ⚙️ Configuração

### Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0
RCT_METRO_PORT=8081
```

### Configuração do Google Auth
Configure as credenciais do Google no arquivo `src/config/googleAuth.js`

### Configuração do Firebase
Para habilitar a sincronização na nuvem:

1. **Criar projeto no Firebase**:
   - Acesse [Firebase Console](https://console.firebase.google.com/)
   - Crie um novo projeto ou selecione um existente

2. **Configurar Authentication**:
   - Ative o provedor **Google** em Authentication → Sign-in method
   - Configure o OAuth consent screen

3. **Configurar Firestore Database**:
   - Crie um banco de dados Firestore
   - Escolha "Iniciar no modo de teste" para desenvolvimento

4. **Obter configurações**:
   - Vá para Configurações do projeto → Geral → Seus apps
   - Adicione um app Web e copie as configurações

5. **Variáveis de ambiente**:
   ```env
   # Firebase Configuration
   EXPO_PUBLIC_FIREBASE_API_KEY=sua-api-key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=seu-project-id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   EXPO_PUBLIC_FIREBASE_APP_ID=seu-app-id
   ```

## 📱 Como Usar

### 1. Login e Configuração Inicial
1. Abra o app e faça login com sua conta Google
2. Selecione seu tipo de usuário (Administrador/Usuário/Dependente)
3. Crie uma família nova ou entre em uma existente com a chave
4. **Seus dados serão automaticamente sincronizados na nuvem**

### 2. Gerenciar Família
1. Acesse **Configurações** → **Família**
2. Administradores podem:
   - Ver chave da família
   - Adicionar/remover membros
   - Gerenciar permissões

### 3. Sincronização na Nuvem
1. Acesse **Configurações** → **Sincronização na Nuvem**
2. **Enviar para Nuvem**: Upload dos dados locais
3. **Baixar da Nuvem**: Download e mesclagem com dados locais
4. **Status**: Visualize o status da última sincronização

### 3. Criar Tarefas
1. Toque no botão **+** na tela principal
2. Preencha título e descrição
3. Selecione categoria
4. **Configure data/hora** com o calendário visual
5. Defina repetição se necessário
6. Salve a tarefa

### 4. Gerenciar Tarefas
- **Marcar como concluída**: Toque no checkbox
- **Editar**: Toque no ícone de edição
- **Excluir**: Toque no ícone da lixeira
- **Aprovar** (para tarefas de crianças): Acesse a tela de Aprovações

### 5. Visualizar Histórico
- Acesse a aba **Histórico** para ver todas as tarefas concluídas
- Visualize data/hora de conclusão e status de aprovação

## 🎯 Recursos Especiais

### Sistema de Família Inteligente
- **Chaves Únicas**: Cada família tem uma chave de 8 caracteres
- **Sincronização Automática**: Mudanças aparecem para todos os membros
- **Controle de Acesso**: Apenas administradores controlam membros

### Modal DateTime Avançado
- **Calendário Interativo**: Navegação visual por meses
- **Horários Precisos**: Seleção em intervalos de 15 minutos
- **Interface Intuitiva**: Tabs para alternar entre data e hora

### Formatação Inteligente de Datas
- **Contextuais**: "Hoje às 14:30", "Amanhã às 09:15"
- **Histórico Detalhado**: "Concluído ontem às 15:45"
- **Padrão Brasileiro**: DD/MM/AAAA

## 🔄 Funcionalidades Futuras Planejadas

- [ ] Notificações push para lembretes
- [x] ~~Sincronização online (Firebase/Supabase)~~ ✅ **Implementado**
- [ ] Temas escuro/claro
- [ ] Estatísticas e relatórios avançados
- [ ] Sistema de recompensas para crianças
- [ ] Sincronização em tempo real
- [ ] Chat familiar
- [ ] Localização geográfica para tarefas

## 🤝 Como Contribuir

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a [MIT License](LICENSE).

## 👥 Equipe

Desenvolvido com ❤️ para facilitar a organização familiar.

---

**Status**: ✅ Funcional e pronto para uso  
**Plataformas**: iOS, Android, Web  
**Última atualização**: Setembro 2025