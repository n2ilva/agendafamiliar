# Sistema Offline - Documentação Completa

## Visão Geral

O sistema offline foi implementado para garantir que a aplicação funcione perfeitamente mesmo sem conexão com a internet. Quando o usuário fica offline, todas as operações são salvas localmente e sincronizadas automaticamente quando a conexão retorna.

## Arquitetura do Sistema

### Componentes Principais

1. **LocalStorageService** - Gerenciamento de cache local
2. **ConnectivityService** - Detecção de conectividade
3. **SyncService** - Sincronização automática
4. **FirebaseAuthService** - Autenticação com suporte offline

## Funcionalidades Implementadas

### ✅ Armazenamento Local
- **AsyncStorage** para persistência de dados
- Cache de tarefas, usuários, famílias e aprovações
- Sistema de fila para operações pendentes
- Controle de versão e timestamp

### ✅ Detecção de Conectividade
- Monitoramento em tempo real do status da internet
- Suporte para web e mobile
- Listeners para mudanças de conectividade
- Diferenciação entre WiFi e dados móveis

### ✅ Sincronização Automática
- Sincronização quando a conexão retorna
- Fila de operações pendentes (criar/editar/deletar)
- Sistema de retry com limite de tentativas
- Listeners do Firebase para atualizações em tempo real

### ✅ Interface de Usuário
- Indicador visual de status offline/online
- Contador de operações pendentes
- Indicador de sincronização em progresso
- Feedback visual para o usuário

## Como Funciona

### Fluxo Offline

1. **Usuário fica offline**
   ```
   ConnectivityService detecta perda de conexão
   → TaskScreen atualiza estado visual
   → Operações são salvas no cache local
   → Adicionadas à fila de sincronização
   ```

2. **Operações no modo offline**
   ```
   Criar tarefa → LocalStorageService.saveTask()
   → SyncService.addOfflineOperation('create', 'tasks', data)
   → Tarefa aparece imediatamente na UI
   ```

3. **Conexão retorna**
   ```
   ConnectivityService detecta conexão
   → SyncService.syncWithFirebase()
   → Processa fila de operações pendentes
   → Baixa dados atualizados do Firebase
   → Configura listeners em tempo real
   ```

### Estrutura de Dados Offline

```typescript
interface OfflineData {
  users: Record<string, FamilyUser>;
  families: Record<string, Family>;
  tasks: Record<string, Task>;
  approvals: Record<string, TaskApproval>;
  pendingOperations: PendingOperation[];
  lastSync: number;
}
```

### Operações Pendentes

```typescript
interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: 'users' | 'families' | 'tasks' | 'approvals';
  data: any;
  timestamp: number;
  retry: number;
}
```

## APIs e Métodos

### LocalStorageService

```typescript
// Salvar dados
LocalStorageService.saveTask(task)
LocalStorageService.saveUser(user)
LocalStorageService.saveFamily(family)

// Carregar dados
LocalStorageService.getTasks()
LocalStorageService.getUser(userId)
LocalStorageService.getFamily(familyId)

// Operações pendentes
LocalStorageService.addPendingOperation(operation)
LocalStorageService.getPendingOperations()
LocalStorageService.removePendingOperation(operationId)
```

### ConnectivityService

```typescript
// Estado atual
ConnectivityService.isConnected()
ConnectivityService.hasInternetAccess()
ConnectivityService.getConnectionType()

// Listeners
ConnectivityService.addConnectivityListener(callback)

// Verificação manual
ConnectivityService.checkConnectivity()
```

### SyncService

```typescript
// Inicialização
SyncService.initialize()

// Sincronização
SyncService.syncWithFirebase()
SyncService.forcSync()

// Operações offline
SyncService.addOfflineOperation(type, collection, data)

// Status
SyncService.getSyncStatus()
SyncService.addSyncListener(callback)
```

## Indicadores Visuais

### Status de Conectividade

```tsx
{(isOffline || syncStatus.pendingOperations > 0) && (
  <View style={styles.connectivityIndicator}>
    <Ionicons 
      name={isOffline ? "cloud-offline" : "sync"} 
      size={16} 
      color={isOffline ? "#ff6b6b" : "#4CAF50"} 
    />
    <Text>
      {isOffline 
        ? `Modo Offline • ${syncStatus.pendingOperations} pendentes` 
        : "Sincronizando..."
      }
    </Text>
  </View>
)}
```

### Estados Visuais

- 🔴 **Offline**: "Modo Offline • X operações pendentes"
- 🔄 **Sincronizando**: "Sincronizando..."
- 🟢 **Online**: Indicador oculto (funcionamento normal)
- ⚠️ **Erro**: "Erro na sincronização"

## Fluxo de Autenticação Offline

### Login com Cache

```typescript
// 1. Tentar login online
const result = await FirebaseAuthService.loginUserWithCache(email, password)

// 2. Se falhar, buscar no cache
if (!result.success) {
  const cachedUser = await LocalStorageService.getUser(email)
  return { success: true, user: cachedUser, isOffline: true }
}
```

### Registro Offline

```typescript
// 1. Tentar registro online
const result = await FirebaseAuthService.registerUserWithCache(email, password, name, role)

// 2. Se falhar, salvar localmente
const tempUser = { id: `temp_${Date.now()}`, email, name, role }
await LocalStorageService.saveUser(tempUser)
await SyncService.addOfflineOperation('create', 'users', tempUser)
```

## Tratamento de Conflitos

### Resolução Automática
- **Last-Write-Wins**: Última operação sobrescreve
- **Timestamp Comparison**: Operação mais recente prevalece
- **Retry Logic**: Até 3 tentativas por operação

### Casos Especiais
- **Duplicação**: IDs temporários são substituídos pelos do Firebase
- **Dependências**: Usuários são criados antes de famílias
- **Validação**: Dados são validados antes da sincronização

## Performance e Otimização

### Cache Inteligente
- **Lazy Loading**: Dados carregados conforme necessário
- **Compression**: Dados comprimidos no AsyncStorage
- **TTL**: Time-to-live para dados em cache
- **Cleanup**: Limpeza automática de dados antigos

### Batch Operations
```typescript
// Operações em lote para melhor performance
const operations = [op1, op2, op3]
await Promise.all(operations.map(op => executeOperation(op)))
```

## Debugging e Logs

### Logs Estruturados
```
📱 Carregando dados do cache local...
✅ 5 tarefas carregadas do cache
🔄 Iniciando sincronização com Firebase
📤 Processando 3 operações pendentes
✅ Sincronização concluída com sucesso
```

### Console Commands
```typescript
// Simular offline
ConnectivityService.simulateOffline()

// Simular online
ConnectivityService.simulateOnline()

// Verificar cache
LocalStorageService.getCacheSize()

// Limpar cache
LocalStorageService.clearCache()
```

## Configuração e Instalação

### Dependências

```json
{
  "@react-native-async-storage/async-storage": "^1.x",
  "@react-native-community/netinfo": "^11.x"
}
```

### Inicialização

```typescript
// App.tsx
useEffect(() => {
  const unsubscribe = FirebaseAuthService.onAuthStateChange(async (user) => {
    if (user) {
      await FirebaseAuthService.initializeOfflineSupport()
    }
  })
  return unsubscribe
}, [])
```

## Limitações Conhecidas

### Capacidade
- **AsyncStorage**: ~6MB por app (Android/iOS)
- **Operações**: Máximo 1000 operações pendentes
- **Cache TTL**: 7 dias por padrão

### Funcionalidades
- **Anexos**: Imagens/arquivos não são cacheados
- **Real-time**: Updates em tempo real só funcionam online
- **Push Notifications**: Apenas online

## Roadmap Futuro

### Melhorias Planejadas
- [ ] **Encryption**: Criptografia dos dados locais
- [ ] **Compression**: Compressão avançada do cache
- [ ] **Background Sync**: Sincronização em background
- [ ] **Conflict Resolution**: Interface para resolver conflitos manuais
- [ ] **Analytics**: Métricas de uso offline
- [ ] **Offline Images**: Cache de imagens de perfil

### Performance
- [ ] **Virtual Lists**: Virtualização para listas grandes
- [ ] **Memory Management**: Otimização de memória
- [ ] **IndexedDB**: Uso de IndexedDB no web
- [ ] **SQLite**: Migração para SQLite no mobile

## Troubleshooting

### Problemas Comuns

1. **Cache Corrompido**
   ```typescript
   await LocalStorageService.clearCache()
   ```

2. **Sincronização Travada**
   ```typescript
   await SyncService.reset()
   ```

3. **Dados Duplicados**
   ```typescript
   // Verificar operações pendentes
   const pending = await LocalStorageService.getPendingOperations()
   ```

### Debug Steps
1. Verificar conectividade
2. Analisar logs do console
3. Inspecionar cache local
4. Validar operações pendentes
5. Testar sincronização manual

---

## Conclusão

O sistema offline fornece uma experiência robusta e confiável para os usuários, garantindo que a aplicação funcione perfeitamente independente da conectividade. Com sincronização automática, cache inteligente e indicadores visuais claros, os usuários podem trabalhar com confiança sabendo que seus dados estão seguros e serão sincronizados quando possível.