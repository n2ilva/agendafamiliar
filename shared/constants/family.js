// Constantes e funções para o sistema de família

// Função para gerar uma chave única de família
export const generateFamilyKey = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Função para validar formato de chave de família
export const isValidFamilyKey = (key) => {
  return /^[A-Z0-9]{8}$/.test(key);
};

// Função para criar uma nova família
export const createFamily = (adminUser) => {
  return {
    id: Date.now().toString(),
    key: generateFamilyKey(),
    name: `Família ${adminUser.name}`,
    adminId: adminUser.id,
    members: [{
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      photo: adminUser.photo,
      userType: adminUser.userType,
      joinedAt: new Date().toISOString(),
      isAdmin: true,
    }],
    createdAt: new Date().toISOString(),
  };
};

// Função para adicionar membro à família
export const addMemberToFamily = (family, newMember) => {
  const updatedFamily = { ...family };
  
  // Verifica se o membro já está na família
  if (updatedFamily.members.some(member => member.id === newMember.id)) {
    throw new Error('Este usuário já é membro da família');
  }
  
  // Adiciona o novo membro
  updatedFamily.members.push({
    id: newMember.id,
    name: newMember.name,
    email: newMember.email,
    photo: newMember.photo,
    userType: newMember.userType,
    joinedAt: new Date().toISOString(),
    isAdmin: false,
  });
  
  return updatedFamily;
};

// Função para remover membro da família (apenas admin pode fazer)
export const removeMemberFromFamily = (family, memberId, adminId) => {
  if (family.adminId !== adminId) {
    throw new Error('Apenas o administrador pode remover membros');
  }
  
  if (memberId === adminId) {
    throw new Error('O administrador não pode se remover da família');
  }
  
  const updatedFamily = { ...family };
  updatedFamily.members = updatedFamily.members.filter(member => member.id !== memberId);
  
  return updatedFamily;
};

// Função para atualizar nome da família
export const updateFamilyName = (family, newName, adminId) => {
  if (family.adminId !== adminId) {
    throw new Error('Apenas o administrador pode alterar o nome da família');
  }
  
  return {
    ...family,
    name: newName,
  };
};

// Função para verificar se usuário é membro da família
export const isFamilyMember = (family, userId) => {
  return family.members.some(member => member.id === userId);
};

// Função para verificar se usuário é admin da família
export const isFamilyAdmin = (family, userId) => {
  return family.adminId === userId;
};

// Função para obter membro específico da família
export const getFamilyMember = (family, userId) => {
  return family.members.find(member => member.id === userId);
};