// Utilitários para formatação de data e hora

// Formatar data e hora para exibição nas tarefas
export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  // Verifica se é uma data válida
  if (isNaN(date.getTime())) return dateString;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Formatação do horário
  const timeOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  
  const timeString = date.toLocaleTimeString('pt-BR', timeOptions);
  
  // Se for hoje, mostrar "Hoje às HH:MM"
  if (taskDate.getTime() === today.getTime()) {
    return `Hoje às ${timeString}`;
  }
  
  // Se for amanhã, mostrar "Amanhã às HH:MM"
  if (taskDate.getTime() === tomorrow.getTime()) {
    return `Amanhã às ${timeString}`;
  }
  
  // Para outras datas, mostrar "DD/MM às HH:MM"
  const dateOptions = {
    day: '2-digit',
    month: '2-digit'
  };
  
  const formattedDate = date.toLocaleDateString('pt-BR', dateOptions);
  return `${formattedDate} às ${timeString}`;
};

// Formatar data e hora completa para histórico
export const formatHistoryDateTime = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  // Verifica se é uma data válida
  if (isNaN(date.getTime())) return dateString;
  
  const dateOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  };
  
  const timeOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  
  const formattedDate = date.toLocaleDateString('pt-BR', dateOptions);
  const timeString = date.toLocaleTimeString('pt-BR', timeOptions);
  
  return `${formattedDate} às ${timeString}`;
};

// Formatar apenas data (sem horário) para casos específicos
export const formatDateOnly = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) return dateString;
  
  const options = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  };
  
  return date.toLocaleDateString('pt-BR', options);
};

// Verificar se uma data é hoje
export const isToday = (dateString) => {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  const today = new Date();
  
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};

// Verificar se uma data é amanhã
export const isTomorrow = (dateString) => {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return date.getDate() === tomorrow.getDate() &&
         date.getMonth() === tomorrow.getMonth() &&
         date.getFullYear() === tomorrow.getFullYear();
};