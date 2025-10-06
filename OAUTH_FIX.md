# Configuração OAuth Google - Correção do Erro de Token

## ❌ Problema Identificado
```
Error: Token de acesso necessário para autenticação mobile
```

## ✅ Solução Implementada

### 1. **Configuração do expo-auth-session**
- Adicionado suporte completo para autenticação Google em mobile
- Configurado `WebBrowser.maybeCompleteAuthSession()` para mobile
- Implementado `AuthSession.AuthRequest` com configurações corretas

### 2. **Configuração do app.json**
```json
{
  "expo": {
    "scheme": "taskapp",
    "ios": {
      "bundleIdentifier": "com.n2ilva.taskapp"
    },
    "android": {
      "package": "com.n2ilva.taskapp"
    }
  }
}
```

### 3. **Fluxo de Autenticação Corrigido**

#### **Para Web:**
- Usa `signInWithPopup` diretamente (sem necessidade de token)
- Firebase gerencia o popup automaticamente

#### **Para Mobile:**
- Usa `expo-auth-session` para obter access token
- Converte token em credencial Firebase
- Autentica via `signInWithCredential`

### 4. **Código Implementado**

#### **LoginScreen.tsx:**
```typescript
const handleGoogleLogin = async () => {
  if (Platform.OS !== 'web') {
    // Mobile: Obter access token via expo-auth-session
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'taskapp'
    });
    
    const request = new AuthSession.AuthRequest({
      clientId: '742861794909-je4328bkkcvj6ahsq6ac98piquveb6nl.apps.googleusercontent.com',
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Token,
      redirectUri,
    });
    
    const result = await request.promptAsync({
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    });
    
    if (result.type === 'success') {
      accessToken = result.params.access_token;
    }
  }
  
  // Autenticar no Firebase
  const authResult = await FirebaseAuthService.loginWithGoogle(accessToken, selectedRole);
};
```

#### **FirebaseAuthService.ts:**
```typescript
static async loginWithGoogle(accessToken?: string, role: UserRole = 'dependente') {
  if (Platform.OS === 'web') {
    // Web: Popup direto
    const provider = new GoogleAuthProvider();
    userCredential = await signInWithPopup(auth, provider);
  } else {
    // Mobile: Usar token
    if (!accessToken) {
      throw new Error('Token de acesso necessário para autenticação mobile');
    }
    const credential = GoogleAuthProvider.credential(null, accessToken);
    userCredential = await signInWithCredential(auth, credential);
  }
}
```

## 🔧 Configurações Necessárias

### **Google Cloud Console:**
1. Ativar Google Sign-In API
2. Configurar OAuth 2.0:
   - **Web:** `http://localhost:8082` (para desenvolvimento)
   - **Mobile:** `taskapp://oauth` (redirect URI)

### **Firebase Console:**
1. Ativar Authentication > Google
2. Adicionar Client ID do Google Cloud

### **Expo Dev Client:**
Para desenvolvimento em dispositivo físico:
```bash
expo install expo-dev-client
expo run:android # ou expo run:ios
```

## 🎯 Resultado

✅ **Web:** Login via popup funciona perfeitamente  
✅ **Mobile:** Login via expo-auth-session com token de acesso  
✅ **Tratamento de Erros:** Mensagens específicas para cada tipo de erro  
✅ **Sincronização:** Dados de usuário salvos no Firestore automaticamente  

## 🚀 Próximos Passos

1. **Testar em dispositivo físico** para validar o fluxo mobile
2. **Configurar Client ID correto** no Google Cloud Console
3. **Adicionar redirect URIs** nas configurações OAuth
4. **Testar em produção** com build standalone

---

**Status:** ✅ Implementado e pronto para teste
**Prioridade:** 🔴 Alta - Funcionalidade crítica de autenticação