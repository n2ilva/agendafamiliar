// Sistema de categorias com cores, ícones e configurações
export const DEFAULT_CATEGORIES = [
  {
    id: 'trabalho',
    name: 'Trabalho',
    icon: 'briefcase',
    color: '#007AFF',
    textColor: '#fff'
  },
  {
    id: 'pessoal',
    name: 'Pessoal',
    icon: 'person',
    color: '#34C759',
    textColor: '#fff'
  },
  {
    id: 'saude',
    name: 'Saúde',
    icon: 'fitness',
    color: '#FF3B30',
    textColor: '#fff'
  },
  {
    id: 'estudos',
    name: 'Estudos',
    icon: 'school',
    color: '#AF52DE',
    textColor: '#fff'
  },
  {
    id: 'familia',
    name: 'Família',
    icon: 'home',
    color: '#FF9500',
    textColor: '#fff'
  },
  {
    id: 'compras',
    name: 'Compras',
    icon: 'bag',
    color: '#FF2D92',
    textColor: '#fff'
  },
  {
    id: 'lazer',
    name: 'Lazer',
    icon: 'game-controller',
    color: '#32D74B',
    textColor: '#fff'
  },
  {
    id: 'casa',
    name: 'Casa',
    icon: 'construct',
    color: '#8E8E93',
    textColor: '#fff'
  }
];

// Função para obter categoria por nome (backward compatibility)
export const getCategoryByName = (categoryName) => {
  // Primeiro tenta encontrar pelo nome exato
  let category = DEFAULT_CATEGORIES.find(cat => cat.name === categoryName);
  
  // Se não encontrar, tenta buscar por correspondência parcial (case insensitive)
  if (!category) {
    category = DEFAULT_CATEGORIES.find(cat => 
      cat.name.toLowerCase() === categoryName.toLowerCase()
    );
  }
  
  // Se ainda não encontrar, retorna uma categoria padrão
  if (!category) {
    return {
      id: categoryName.toLowerCase().replace(/\s+/g, '-'),
      name: categoryName,
      icon: 'document',
      color: '#8E8E93',
      textColor: '#fff'
    };
  }
  
  return category;
};

// Função para obter categoria por ID
export const getCategoryById = (categoryId) => {
  return DEFAULT_CATEGORIES.find(cat => cat.id === categoryId) || DEFAULT_CATEGORIES[0];
};

// Função para criar categoria personalizada
export const createCustomCategory = (name, icon = 'document', color = '#8E8E93') => {
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    icon,
    color,
    textColor: '#fff',
    isCustom: true
  };
};

// Lista de ícones disponíveis para categorias personalizadas
export const AVAILABLE_ICONS = [
  'document', 'folder', 'star', 'heart', 'bookmark', 'flag',
  'car', 'airplane', 'bicycle', 'boat', 'train', 'bus',
  'camera', 'musical-notes', 'mic', 'headset', 'tv', 'desktop',
  'phone-portrait', 'tablet-portrait', 'watch', 'glasses',
  'shirt', 'diamond', 'flower', 'leaf', 'sunny', 'moon',
  'cloud', 'umbrella', 'snow', 'thermometer', 'water',
  'restaurant', 'cafe', 'wine', 'pizza', 'ice-cream',
  'gift', 'balloon', 'trophy', 'medal', 'ribbon',
  'hammer', 'build', 'settings', 'code', 'calculator',
  'library', 'newspaper', 'journal', 'clipboard', 'archive'
];

// Lista de cores disponíveis para categorias personalizadas
export const AVAILABLE_COLORS = [
  '#007AFF', '#34C759', '#FF3B30', '#AF52DE', '#FF9500',
  '#FF2D92', '#32D74B', '#8E8E93', '#00C7BE', '#5856D6',
  '#FF6B35', '#FF9F0A', '#30D158', '#64D2FF', '#BF5AF2',
  '#FF375F', '#FFCC02', '#48484A', '#8E4EC6', '#00D4AA'
];