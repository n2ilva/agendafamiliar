// Mock do arquivo de configuração do Firebase para testes
module.exports = {
  // fornecer factories para compatibilidade com a implementação lazy
  firebaseFirestore: () => ({}),
  firebaseAuth: () => ({}),
  firebaseStorage: () => ({})
};
