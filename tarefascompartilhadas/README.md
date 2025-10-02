# Task Management App - React Native Expo

Um aplicativo de gerenciamento de tarefas desenvolvido com React Native e Expo.

## Características Principais

- **Header do usuário** com:
  - Avatar/ícone do usuário (editável/alterável)
  - Exibição do nome do usuário
  - Botão de configurações
  - Botão de logout

- **Gerenciamento de tarefas com categorias customizáveis**:
  - Adicionar novas tarefas com categorias
  - Criar categorias personalizadas com ícones e cores
  - Excluir categorias personalizadas com longPress
  - Filtros por categoria (Todas, Trabalho, Pessoal, Saúde + personalizadas)
  - Categorias com ícones e cores distintivas
  - Marcar tarefas como completas/incompletas
  - Excluir tarefas
  - Lista de tarefas responsiva

## Categorias Disponíveis

### Categorias Padrão:
- 🏢 **Trabalho** (Azul) - Para tarefas profissionais
- 🏠 **Pessoal** (Vermelho) - Para tarefas pessoais
- 💪 **Saúde** (Verde) - Para tarefas relacionadas à saúde
- 📱 **Todas** - Visualizar todas as categorias

### Categorias Personalizadas:
- ➕ **Criar Nova** - Adicione suas próprias categorias
- 🎨 **16 Ícones disponíveis** - Escolha o ícone perfeito
- 🌈 **8 Cores diferentes** - Personalize as cores
- 🗑️ **Exclusão com longPress** - Mantenha pressionado para excluir

## Tecnologias Utilizadas

- React Native
- Expo
- TypeScript
- Expo Vector Icons
- React Native Safe Area Context
- Expo Image Picker

## Como Executar

1. Instale as dependências:
```bash
npm install
```

2. Inicie o servidor de desenvolvimento:
```bash
npm start
```

3. Use o Expo Go no seu dispositivo móvel para escanear o QR code, ou:
   - Pressione 'i' para iOS simulator
   - Pressione 'a' para Android emulator
   - Pressione 'w' para abrir no navegador

## Estrutura do Projeto

```
├── App.tsx                 # Componente principal
├── components/
│   └── Header.tsx          # Componente do cabeçalho
├── screens/
│   └── TaskScreen.tsx      # Tela de gerenciamento de tarefas
└── assets/                 # Recursos estáticos
```

## Funcionalidades

### Header
- **Avatar do usuário**: Toque para alterar a foto através da galeria
- **Nome do usuário**: Exibição personalizada
- **Botão de configurações**: Placeholder para futuras configurações
- **Botão de logout**: Com confirmação de segurança

### Gerenciamento de Tarefas
- **Adicionar tarefa**: Modal com título, descrição e seleção de categoria
- **Filtros por categoria**: Navegação rápida entre categorias
- **Lista de tarefas**: Visualização organizada com indicadores visuais de categoria
- **Marcar como concluída**: Toggle de status
- **Excluir tarefa**: Com confirmação

### Categorias
- **Indicador visual**: Barra colorida lateral em cada tarefa
- **Badge de categoria**: Ícone e nome da categoria em cada tarefa
- **Filtros interativos**: Botões de filtro com cores distintivas
- **Scroll horizontal**: Deslize para ver todas as categorias quando há muitas
- **Seleção de categoria**: Interface intuitiva no modal de criação
- **Criação personalizada**: Modal dedicado para criar novas categorias
- **Customização visual**: Escolha de ícones e cores
- **Exclusão inteligente**: LongPress para excluir (move tarefas automaticamente)
- **Pré-visualização**: Veja como a categoria ficará antes de criar

## Próximos Passos

- Implementar persistência de dados (AsyncStorage) para categorias e tarefas
- Adicionar autenticação de usuário
- Implementar ordenação e reordenamento de categorias
- Adicionar notificações por categoria
- Implementar backup e sincronização com backend
- Adicionar estatisticas por categoria
- Implementar modo escuro