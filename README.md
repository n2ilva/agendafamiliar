# Agenda Familiar

Aplicativo (Expo React Native + Web) para gerenciamento colaborativo de tarefas familiares com autenticação Firebase, categorias dinâmicas e fluxo de aprovação.

## Principais Features
- Autenticação Firebase (Google) com distinção de papel (admin primeiro usuário)
- Criação, edição, aprovação, rejeição e conclusão de tarefas
- Datas e horários (due date) com filtragem: Hoje, Próximas, Histórico (group por ano-mês)
- Categorias dinâmicas (nome, cor, ícone) com criação inline, exclusão (confirmação) e multi-seleção
- `categoryId` persistente nas tarefas (remoção de campo legado `category`)
- Contador por categoria (badge) e persistência de preferências (ordem / filtros) via AsyncStorage
- Destaque visual para tarefas recém-aprovadas
- Migração automática anterior para mapear nomes -> `categoryId` (já removida após limpeza)

## Estrutura de Pastas (resumido)
```
app/               # Rotas (Expo Router) e telas
components/        # Componentes reutilizáveis (Task, CategoryBar, etc.)
context/           # AuthContext, TaskContext, CategoryContext
config/firebase.ts # Inicialização única Firebase (web / nativo)
assets/            # Fontes e imagens
```

## Requisitos
- Node.js LTS
- Expo CLI / npx expo
- Conta Firebase (Auth + Firestore ativados)

## Configuração Firebase
1. Criar projeto no Firebase.
2. Ativar Authentication (Google) e Firestore.
3. Substituir credenciais dentro de `config/firebase.ts` se necessário.
4. Adicionar `google-services.json` (Android) / configuração web.
5. (Opcional) Ajustar regras do Firestore para segurança por `familyId`.

## Scripts
```
npm install
npx expo start          # Dev (web/native)
npx expo start --clear  # Limpar cache
```

## Fluxo de Aprovação
- Usuário comum cria tarefa -> status `pending`.
- Admin aprova/rejeita -> status `approved` ou `rejected`.
- Completar tarefa altera para `completed`; desmarcar volta para `approved`.

## Categorias
- Criadas no topo das telas via barra horizontal.
- Multi-seleção: selecionar vários chips filtra tarefas correspondentes.
- Badge mostra quantidade de tarefas vinculadas por `categoryId`.
- Modal de criação inclui paleta de cores e seleção de ícone (Material Icons).

## Persistência Local
- Cada tela salva preferências: categorias selecionadas e ordenação (AsyncStorage).

## Avisos Comuns em Dev (Web)
| Aviso | Motivo | Ação |
|-------|--------|------|
| shadow* deprecated | Estilos RN Web convergindo para `boxShadow` | Opcional: migrar gradualmente |
| pointerEvents prop | Uso legado fora de `style` | Ajustar quando refatorar containers |
| RNGoogleSignIn not implemented | Biblioteca nativa não disponível no web | Já existe fallback Firebase web (garantir) |
| Reduced motion | Preferência de acessibilidade | Ignorar em dev |

## Próximos Passos Possíveis
- Exibir nome/ícone da categoria dentro do card da tarefa
- Busca textual opcional
- Notificações push (Expo Notifications) para aprovações
- Regras Firestore mais restritivas (segurança)
- Testes unitários e E2E

## Convenções de Commit
`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `style:`, `perf:`, `test:`

## Licença
Definir posteriormente (ex: MIT).
