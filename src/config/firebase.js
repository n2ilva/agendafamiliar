// Firebase configuration
// Para configurar o Firebase:
// 1. Acesse https://console.firebase.google.com/
// 2. Crie um novo projeto ou selecione um existente
// 3. Vá em "Configurações do projeto" (ícone de engrenagem)
// 4. Na aba "Geral", role para baixo até "Seus apps"
// 5. Clique em "Adicionar app" e selecione Web
// 6. Copie as configurações abaixo

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: "G-ML4R00LK6G"
};

// Instruções para configurar variáveis de ambiente:
// 1. Crie um arquivo .env na raiz do projeto
// 2. Adicione as seguintes variáveis:
//
// EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
// EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
// EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
// EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
// EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
// EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
//
// 3. Reinicie o servidor Expo após adicionar as variáveis