#  CORREÇÃO DO ERRO GOOGLE OAUTH - Agenda Familiar

##  Probl## 📋 Client IDs Atuais (Verificação)

**Web Client ID:** 742861794909-tahq3a9dtqro4ls1g9jb92a3flok45nq.apps.googleusercontent.com
**Android Client ID:** 742861794909-je4328bkkcvj6ahsq6ac98piquveb6nl.apps.googleusercontent.com
**iOS Client ID:** 742861794909-2bmiu7tgo0tngbjfhtj31dudssjtkgpe.apps.googleusercontent.comdentificado
Erro **400: invalid_request** ao tentar fazer login com Google OAuth.

##  Causa do Problema
Os **Redirect URIs** configurados no Google Cloud Console não correspondem aos utilizados pelo app.

##  Solução - Configurar Redirect URIs

### 1. Acesse o Google Cloud Console
- Vá para: https://console.cloud.google.com/
- Selecione seu projeto: **agenda-familiar-472905**

### 2. Configure OAuth Consent Screen
- No menu lateral, vá para **APIs e Serviços** > **OAuth consent screen**
- Certifique-se de que está configurado como **External**
- Preencha os campos obrigatórios se necessário

### 3. Configure as Credenciais
- Vá para **APIs e Serviços** > **Credenciais**
- Clique no seu **OAuth 2.0 Client ID** (Web application)

### 4. Configure CORRETAMENTE os URIs

**IMPORTANTE:** Existem DUAS seções diferentes no Google Cloud Console:

#### **A) Authorized JavaScript origins** (para web apps que rodam no navegador)
- **NÃO** adicione nada aqui para apps Expo/React Native
- Esta seção é para aplicações web que rodam diretamente no navegador

#### **B) Authorized redirect URIs** (para OAuth redirects)
Adicione estes URIs na seção **Authorized redirect URIs**:

**Para Android/iOS (Expo):**
```
com.n2ilva.agendafamiliar:/oauth2redirect
```

**Para Web (Expo):**
```
https://auth.expo.io/@n2ilva/agenda-familiar
```

**Para Desenvolvimento Local (opcional):**
```
http://localhost:8081
exp://localhost:8081
```

### 5. Verifique as Configurações
Certifique-se de que:
-  O **package name** do Android está correto: com.n2ilva.agendafamiliar
-  O **scheme** no app.json está correto: com.n2ilva.agendafamiliar
-  Os Client IDs estão corretos no arquivo src/config/googleAuth.js

### 6. Teste o Login
Após configurar os URIs:
1. Reinicie o app
2. Tente fazer login com Google novamente

##  Client IDs Atuais (Verificação)

**Web Client ID:** 742861794909-je4328bkkcvj6ahsq6ac98piquveb6nl.apps.googleusercontent.com
**Android Client ID:** 742861794909-tahq3a9dtqro4ls1g9jb92a3flok45nq.apps.googleusercontent.com
**iOS Client ID:** 742861794909-2bmiu7tgo0tngbjfhtj31dudssjtkgpe.apps.googleusercontent.com

##  Importante
- Os Client IDs devem estar **autorizados** no Firebase Console
- Vá para **Firebase Console** > **Authentication** > **Sign-in method** > **Google** > **Web SDK configuration**
- Adicione os Client IDs se necessário

---
**Após seguir estes passos, o erro de OAuth deve ser resolvido!**

## 🚨 TROUBLESHOOTING - Problemas Comuns

### **Erro: "Origem inválida: não é permitido que URIs de origem contenham um caminho"**
- **Causa:** Você está tentando adicionar o URI na seção **"Authorized JavaScript origins"**
- **Solução:** Adicione na seção **"Authorized redirect URIs"**, não em "origins"

### **Erro: "redirect_uri_mismatch"**
- **Causa:** O redirect URI não está autorizado
- **Solução:** Verifique se adicionou exatamente: `com.n2ilva.agendafamiliar:/oauth2redirect`

### **Erro: "invalid_client"**
- **Causa:** Client ID incorreto ou não autorizado
- **Solução:** Verifique se os Client IDs estão corretos no `src/config/googleAuth.js`

### **App fecha imediatamente após login**
- **Causa:** Problema com o scheme no app.json
- **Solução:** Certifique-se de que o scheme é `com.n2ilva.agendafamiliar`