export interface ColorPair {
  color: string;
  bgColor: string;
}

export interface ThemeInfo {
  name: string;
  description: string;
  period: string;
  colors: ColorPair[];
}

// ================== 1. TEMAS DE ESTAÇÕES TRADICIONAIS ==================

export const SEASONAL_THEMES: Record<string, ThemeInfo> = {
  spring: {
    name: 'Primavera',
    description: 'Cores frescas e renovação',
    period: 'Setembro - Novembro (Brasil)',
    colors: [
      { color: '#7FB069', bgColor: '#E8F6E1' }, // verde primaveral
      { color: '#D4A574', bgColor: '#F8F2E7' }, // amarelo floral
      { color: '#E85A4F', bgColor: '#FDEAE9' }, // coral vibrante
      { color: '#C8A2C8', bgColor: '#F6F0F6' }, // lilás suave
      { color: '#81C784', bgColor: '#E8F5E8' }, // verde claro
      { color: '#FFB74D', bgColor: '#FFF3E0' }, // laranja suave
    ],
  },
  
  summer: {
    name: 'Verão',
    description: 'Cores vibrantes e tropicais',
    period: 'Dezembro - Fevereiro (Brasil)',
    colors: [
      { color: '#42A5F5', bgColor: '#E3F2FD' }, // azul oceano
      { color: '#FFA726', bgColor: '#FFF3E0' }, // laranja sol
      { color: '#26C6DA', bgColor: '#E0F7FA' }, // ciano tropical
      { color: '#FFEE58', bgColor: '#FFFDE7' }, // amarelo solar
      { color: '#AB47BC', bgColor: '#F3E5F5' }, // roxo tropical
      { color: '#66BB6A', bgColor: '#E8F5E8' }, // verde tropical
    ],
  },
  
  autumn: {
    name: 'Outono',
    description: 'Tons terrosos e acolhedores',
    period: 'Março - Maio (Brasil)',
    colors: [
      { color: '#D84315', bgColor: '#FBE9E7' }, // vermelho outonal
      { color: '#F57C00', bgColor: '#FFF3E0' }, // laranja folhas
      { color: '#8D6E63', bgColor: '#EFEBE9' }, // marrom terra
      { color: '#FFB300', bgColor: '#FFFDE7' }, // dourado outono
      { color: '#7B1FA2', bgColor: '#F3E5F5' }, // roxo profundo
      { color: '#558B2F', bgColor: '#F1F8E9' }, // verde musgo
    ],
  },
  
  winter: {
    name: 'Inverno',
    description: 'Cores suaves e aconchegantes',
    period: 'Junho - Agosto (Brasil)',
    colors: [
      { color: '#1565C0', bgColor: '#E3F2FD' }, // azul invernal
      { color: '#37474F', bgColor: '#ECEFF1' }, // cinza gelo
      { color: '#455A64', bgColor: '#ECEFF1' }, // azul acinzentado
      { color: '#607D8B', bgColor: '#ECEFF1' }, // azul aço
      { color: '#673AB7', bgColor: '#EDE7F6' }, // roxo frio
      { color: '#795548', bgColor: '#EFEBE9' }, // marrom invernal
    ],
  },
};

// ================== 2. TEMAS DE EVENTOS E FERIADOS ESPECIAIS ==================

export const HOLIDAY_THEMES: Record<string, ThemeInfo> = {
  // 🎄 DEZEMBRO - TEMPORADA NATALINA
  christmas: {
    name: 'Natal',
    description: 'Cores festivas natalinas',
    period: '1-25 Dezembro',
    colors: [
      { color: '#C62828', bgColor: '#FFEBEE' }, // vermelho natalino
      { color: '#2E7D32', bgColor: '#E8F5E8' }, // verde natalino
      { color: '#F57F17', bgColor: '#FFFDE7' }, // dourado festivo
      { color: '#1565C0', bgColor: '#E3F2FD' }, // azul neve
      { color: '#6A1B9A', bgColor: '#F3E5F5' }, // roxo real
      { color: '#BF360C', bgColor: '#FBE9E7' }, // laranja quente
    ],
  },
  
  newYear: {
    name: 'Ano Novo',
    description: 'Cores de celebração e renovação',
    period: '26 Dezembro - 6 Janeiro',
    colors: [
      { color: '#FFD700', bgColor: '#FFFEF7' }, // dourado celebração
      { color: '#C0392B', bgColor: '#FADBD8' }, // vermelho festa
      { color: '#8E44AD', bgColor: '#F4ECF7' }, // roxo elegante
      { color: '#2980B9', bgColor: '#EBF5FB' }, // azul esperança
      { color: '#E67E22', bgColor: '#FDF2E9' }, // laranja energia
      { color: '#27AE60', bgColor: '#D5F4E6' }, // verde renovação
    ],
  },
  
  // 🎭 FEVEREIRO-MARÇO - CARNAVAL
  carnival: {
    name: 'Carnaval',
    description: 'Cores vibrantes e festivas',
    period: 'Fevereiro-Março (móvel)',
    colors: [
      { color: '#FF6B35', bgColor: '#FFF0ED' }, // laranja vibrante
      { color: '#F7931E', bgColor: '#FEF7F0' }, // amarelo festa
      { color: '#C41E3A', bgColor: '#FAE5EA' }, // vermelho carnaval
      { color: '#9B59B6', bgColor: '#F5EEF8' }, // roxo festa
      { color: '#3498DB', bgColor: '#EBF5FB' }, // azul alegria
      { color: '#2ECC71', bgColor: '#D5F4E6' }, // verde diversão
    ],
  },
  
  // 🐰 MARÇO-ABRIL - PÁSCOA
  easter: {
    name: 'Páscoa',
    description: 'Cores suaves e esperançosas',
    period: 'Março-Abril (móvel)',
    colors: [
      { color: '#F8C471', bgColor: '#FEF9E7' }, // amarelo pascal
      { color: '#85C1E9', bgColor: '#EBF5FB' }, // azul céu
      { color: '#F1948A', bgColor: '#FDEDEC' }, // rosa suave
      { color: '#82E0AA', bgColor: '#D5F4E6' }, // verde esperança
      { color: '#D7DBDD', bgColor: '#F8F9FA' }, // branco pureza
      { color: '#BB8FCE', bgColor: '#F5EEF8' }, // lilás pascal
    ],
  },
  
  // 💐 MAIO - DIA DAS MÃES
  mothersDay: {
    name: 'Dia das Mães',
    description: 'Cores carinhosas e acolhedoras',
    period: '2º Domingo de Maio',
    colors: [
      { color: '#E91E63', bgColor: '#FCE4EC' }, // rosa amor
      { color: '#FF69B4', bgColor: '#FFF0F5' }, // rosa maternal
      { color: '#DDA0DD', bgColor: '#F8F0F8' }, // roxo carinho
      { color: '#FFB6C1', bgColor: '#FFF5F7' }, // rosa claro
      { color: '#FF1493', bgColor: '#FFF0F5' }, // rosa intenso
      { color: '#C71585', bgColor: '#FAE5F0' }, // magenta amor
    ],
  },
  
  // 🔥 JUNHO - FESTA JUNINA
  winterFest: {
    name: 'Festa Junina',
    description: 'Cores rústicas e acolhedoras',
    period: 'Junho',
    colors: [
      { color: '#D2691E', bgColor: '#F7F1E8' }, // marrom rústico
      { color: '#FF4500', bgColor: '#FFF2ED' }, // laranja fogueira
      { color: '#FFD700', bgColor: '#FFFEF7' }, // amarelo milho
      { color: '#228B22', bgColor: '#E8F5E8' }, // verde bandeirinha
      { color: '#8B4513', bgColor: '#F2EDE6' }, // marrom terra
      { color: '#DC143C', bgColor: '#FAE5E8' }, // vermelho festivo
    ],
  },
  
  // 👨 AGOSTO - DIA DOS PAIS
  fathersDay: {
    name: 'Dia dos Pais',
    description: 'Cores sóbrias e elegantes',
    period: '2º Domingo de Agosto',
    colors: [
      { color: '#2C3E50', bgColor: '#E8EAED' }, // azul marinho
      { color: '#34495E', bgColor: '#EAECEE' }, // cinza elegante
      { color: '#7F8C8D', bgColor: '#F2F3F4' }, // cinza claro
      { color: '#3498DB', bgColor: '#EBF5FB' }, // azul confiança
      { color: '#1ABC9C', bgColor: '#D1F2EB' }, // verde sábio
      { color: '#9B59B6', bgColor: '#F5EEF8' }, // roxo nobre
    ],
  },
  
  // 🇧🇷 SETEMBRO - INDEPENDÊNCIA DO BRASIL
  independence: {
    name: 'Independência',
    description: 'Cores patrióticas brasileiras',
    period: '7 Setembro',
    colors: [
      { color: '#009739', bgColor: '#E8F5E8' }, // verde bandeira
      { color: '#FEDD00', bgColor: '#FFFEF0' }, // amarelo bandeira
      { color: '#012169', bgColor: '#E3E8F5' }, // azul bandeira
      { color: '#FFFFFF', bgColor: '#FFFFFF' }, // branco paz
      { color: '#228B22', bgColor: '#E8F5E8' }, // verde pátria
      { color: '#FFD700', bgColor: '#FFFEF7' }, // dourado nobre
    ],
  },
  
  // 🎃 OUTUBRO - HALLOWEEN
  halloween: {
    name: 'Halloween',
    description: 'Cores misteriosas e divertidas',
    period: '31 Outubro',
    colors: [
      { color: '#FF4500', bgColor: '#FFF2ED' }, // laranja abóbora
      { color: '#4B0082', bgColor: '#F0E6FF' }, // roxo misterioso
      { color: '#000000', bgColor: '#F5F5F5' }, // preto noite
      { color: '#8B4513', bgColor: '#F2EDE6' }, // marrom terra
      { color: '#DC143C', bgColor: '#FAE5E8' }, // vermelho sangue
      { color: '#32CD32', bgColor: '#F0FFF0' }, // verde fantasma
    ],
  },
  
  // 🛍️ NOVEMBRO - BLACK FRIDAY
  blackFriday: {
    name: 'Black Friday',
    description: 'Cores elegantes e promocionais',
    period: 'Última sexta de Novembro',
    colors: [
      { color: '#000000', bgColor: '#F5F5F5' }, // preto elegante
      { color: '#FFD700', bgColor: '#FFFEF7' }, // dourado promoção
      { color: '#C0392B', bgColor: '#FADBD8' }, // vermelho oferta
      { color: '#2C3E50', bgColor: '#E8EAED' }, // azul escuro
      { color: '#E74C3C', bgColor: '#FADBD8' }, // vermelho desconto
      { color: '#F39C12', bgColor: '#FEF9E7' }, // laranja promoção
    ],
  },
};

// ================== 3. TEMAS FAMILIARES ESPECIAIS ==================

export const FAMILY_THEMES: Record<string, ThemeInfo> = {
  happyKids: {
    name: 'Crianças Felizes',
    description: 'Cores alegres e vibrantes para crianças',
    period: 'Tema permanente',
    colors: [
      { color: '#489FB2', bgColor: '#E3F7FB' }, // azul suave e amigável
      { color: '#76B0C2', bgColor: '#EAF5F9' }, // azul claro complementar
      { color: '#A3659E', bgColor: '#F6EAF5' }, // roxo familiar
      { color: '#73B96E', bgColor: '#E8F6E7' }, // verde alegre
      { color: '#FFBB00', bgColor: '#FFF7D9' }, // amarelo brilhante
      { color: '#559E2C', bgColor: '#E8F2E0' }, // verde vibrante
    ],
  },
  
  nurturingMom: {
    name: 'Mãe Acolhedora',
    description: 'Tons suaves e maternais',
    period: 'Tema permanente',
    colors: [
      { color: '#B4869F', bgColor: '#F7F0F4' }, // rosa suave maternal
      { color: '#8FA8A3', bgColor: '#F0F5F4' }, // verde menta suave
      { color: '#A69B87', bgColor: '#F4F2EE' }, // bege acolhedor
      { color: '#9B8DB4', bgColor: '#F2F0F7' }, // lavanda maternal
      { color: '#B09E73', bgColor: '#F6F4E8' }, // dourado suave
      { color: '#7DA3B0', bgColor: '#EDF4F6' }, // azul maternal
    ],
  },
  
  activeFamily: {
    name: 'Família Ativa',
    description: 'Cores energéticas para família dinâmica',
    period: 'Tema permanente',
    colors: [
      { color: '#6BAED6', bgColor: '#E8F4FD' }, // azul mais vibrante
      { color: '#9ECAE1', bgColor: '#F2F8FE' }, // azul claro variante
      { color: '#C994C7', bgColor: '#F8F0F7' }, // rosa vibrante
      { color: '#A1D99B', bgColor: '#F0F8ED' }, // verde fresco
      { color: '#FDBB84', bgColor: '#FEF7F0' }, // laranja suave
      { color: '#FC8D62', bgColor: '#FEF2EE' }, // laranja vibrante
    ],
  },
  
  teenSpirit: {
    name: 'Espírito Adolescente',
    description: 'Cores modernas e descoladas',
    period: 'Tema permanente',
    colors: [
      { color: '#FF5722', bgColor: '#FFF3F0' }, // laranja moderno
      { color: '#673AB7', bgColor: '#F3E5F5' }, // roxo teen
      { color: '#009688', bgColor: '#E0F2F1' }, // verde água
      { color: '#795548', bgColor: '#EFEBE9' }, // marrom moderno
      { color: '#607D8B', bgColor: '#ECEFF1' }, // azul aço
      { color: '#FF9800', bgColor: '#FFF3E0' }, // laranja vibrante
    ],
  },
};

// ================== 4. TEMAS DE CORES ESPECIAIS ==================

export const SPECIAL_THEMES: Record<string, ThemeInfo> = {
  pastel: {
    name: 'Pastel Suave',
    description: 'Cores suaves e delicadas',
    period: 'Tema especial',
    colors: [
      { color: '#FFB3BA', bgColor: '#FFF5F6' }, // rosa pastel
      { color: '#FFDFBA', bgColor: '#FFFAF5' }, // pêssego pastel
      { color: '#FFFFBA', bgColor: '#FFFFFA' }, // amarelo pastel
      { color: '#BAFFC9', bgColor: '#F5FFFA' }, // verde pastel
      { color: '#BAE1FF', bgColor: '#F5FAFF' }, // azul pastel
      { color: '#E1BAFF', bgColor: '#FAF5FF' }, // roxo pastel
    ],
  },
  
  vibrant: {
    name: 'Cores Vibrantes',
    description: 'Cores intensas e energéticas',
    period: 'Tema especial',
    colors: [
      { color: '#FF1744', bgColor: '#FFE8EC' }, // vermelho vibrante
      { color: '#FF9100', bgColor: '#FFF3E0' }, // laranja vibrante
      { color: '#FFEA00', bgColor: '#FFFDE7' }, // amarelo vibrante
      { color: '#00E676', bgColor: '#E8F5E8' }, // verde vibrante
      { color: '#00B0FF', bgColor: '#E3F2FD' }, // azul vibrante
      { color: '#D500F9', bgColor: '#F8E5FF' }, // roxo vibrante
    ],
  },
  
  monochrome: {
    name: 'Monocromático',
    description: 'Elegância em tons de cinza',
    period: 'Tema especial',
    colors: [
      { color: '#212121', bgColor: '#F5F5F5' }, // cinza muito escuro
      { color: '#424242', bgColor: '#F5F5F5' }, // cinza escuro
      { color: '#616161', bgColor: '#FAFAFA' }, // cinza médio
      { color: '#757575', bgColor: '#FAFAFA' }, // cinza claro
      { color: '#9E9E9E', bgColor: '#FAFAFA' }, // cinza muito claro
      { color: '#BDBDBD', bgColor: '#FFFFFF' }, // cinza suave
    ],
  },
  
  ocean: {
    name: 'Oceano Profundo',
    description: 'Tons azuis do mar',
    period: 'Tema especial',
    colors: [
      { color: '#0277BD', bgColor: '#E1F5FE' }, // azul oceano
      { color: '#0288D1', bgColor: '#E1F5FE' }, // azul profundo
      { color: '#039BE5', bgColor: '#E0F7FA' }, // azul claro
      { color: '#00ACC1', bgColor: '#E0F7FA' }, // ciano
      { color: '#00BCD4', bgColor: '#E0F7FA' }, // turquesa
      { color: '#26C6DA', bgColor: '#E0F7FA' }, // aguarela
    ],
  },
  
  sunset: {
    name: 'Pôr do Sol',
    description: 'Tons quentes do entardecer',
    period: 'Tema especial',
    colors: [
      { color: '#FF5722', bgColor: '#FFF3F0' }, // laranja queimado
      { color: '#FF7043', bgColor: '#FFF3F0' }, // laranja suave
      { color: '#FF8A65', bgColor: '#FFF3F0' }, // coral
      { color: '#FFAB91', bgColor: '#FFF8F5' }, // pêssego
      { color: '#FFCC02', bgColor: '#FFFEF0' }, // dourado
      { color: '#FFF176', bgColor: '#FFFEF7' }, // amarelo suave
    ],
  },
  
  forest: {
    name: 'Floresta Encantada',
    description: 'Tons verdes da natureza',
    period: 'Tema especial',
    colors: [
      { color: '#2E7D32', bgColor: '#E8F5E8' }, // verde escuro
      { color: '#388E3C', bgColor: '#E8F5E8' }, // verde médio
      { color: '#43A047', bgColor: '#E8F5E8' }, // verde
      { color: '#4CAF50', bgColor: '#E8F5E8' }, // verde claro
      { color: '#66BB6A', bgColor: '#F1F8E9' }, // verde suave
      { color: '#81C784', bgColor: '#F1F8E9' }, // verde muito claro
    ],
  },
};

// ================== 5. UTILITÁRIOS DE GERENCIAMENTO DE TEMAS ==================

// Combina todos os temas em um objeto único para fácil acesso
export const ALL_THEMES = {
  ...SEASONAL_THEMES,
  ...HOLIDAY_THEMES,
  ...FAMILY_THEMES,
  ...SPECIAL_THEMES,
};

// Lista de temas organizados por categoria para interface de seleção
export const THEME_CATEGORIES = {
  seasonal: {
    name: 'Estações do Ano',
    themes: Object.keys(SEASONAL_THEMES),
  },
  holidays: {
    name: 'Feriados e Eventos',
    themes: Object.keys(HOLIDAY_THEMES),
  },
  family: {
    name: 'Temas Familiares',
    themes: Object.keys(FAMILY_THEMES),
  },
  special: {
    name: 'Temas Especiais',
    themes: Object.keys(SPECIAL_THEMES),
  },
};

// Função para detectar automaticamente o tema baseado na data atual
export const getCurrentSeason = (): string => {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();

  // Verifica eventos específicos primeiro
  
  // Dezembro: Natal
  if (month === 12 && day >= 1 && day <= 25) {
    return 'christmas';
  }
  
  // Final de dezembro e início de janeiro: Ano Novo
  if ((month === 12 && day >= 26) || (month === 1 && day <= 6)) {
    return 'newYear';
  }
  
  // Carnaval (aproximado - segunda-feira antes da Quaresma)
  // Simplificado: final de fevereiro/início de março
  if ((month === 2 && day >= 20) || (month === 3 && day <= 10)) {
    return 'carnival';
  }
  
  // Páscoa (aproximado - março/abril)
  if ((month === 3 && day >= 15) || (month === 4 && day <= 20)) {
    return 'easter';
  }
  
  // Dia das Mães (segundo domingo de maio - aproximado)
  if (month === 5 && day >= 8 && day <= 14) {
    return 'mothersDay';
  }
  
  // Festa Junina
  if (month === 6) {
    return 'winterFest';
  }
  
  // Dia dos Pais (segundo domingo de agosto - aproximado)
  if (month === 8 && day >= 8 && day <= 14) {
    return 'fathersDay';
  }
  
  // Independência do Brasil
  if (month === 9 && day === 7) {
    return 'independence';
  }
  
  // Halloween
  if (month === 10 && day === 31) {
    return 'halloween';
  }
  
  // Black Friday (última sexta-feira de novembro - aproximado)
  if (month === 11 && day >= 22 && day <= 29) {
    return 'blackFriday';
  }

  // Se não há evento especial, usa estações tradicionais (Hemisfério Sul)
  
  // Verão: Dezembro, Janeiro, Fevereiro
  if (month === 12 || month <= 2) {
    return 'summer';
  }
  
  // Outono: Março, Abril, Maio
  if (month >= 3 && month <= 5) {
    return 'autumn';
  }
  
  // Inverno: Junho, Julho, Agosto
  if (month >= 6 && month <= 8) {
    return 'winter';
  }
  
  // Primavera: Setembro, Outubro, Novembro
  if (month >= 9 && month <= 11) {
    return 'spring';
  }

  // Fallback para primavera
  return 'spring';
};

// Função para obter o tema atual baseado na estação
export const getCurrentTheme = (): ThemeInfo => {
  // FIXO: Sempre retorna tema de Natal
  return HOLIDAY_THEMES.christmas;
  
  // Código original comentado para futura restauração:
  // const currentSeason = getCurrentSeason();
  // return ALL_THEMES[currentSeason] || SEASONAL_THEMES.spring;
};

// Função para obter um tema específico
export const getTheme = (themeKey: string): ThemeInfo => {
  return ALL_THEMES[themeKey] || getCurrentTheme();
};

// ================== 6. SISTEMA DE TEMA ADAPTATIVO ==================

// Função para criar tema adaptativo baseado na estação/evento
export const createAdaptiveTheme = (themeKey?: string) => {
  const theme = themeKey ? getTheme(themeKey) : getCurrentTheme();
  const colors = theme.colors;
  
  // Usa as cores do tema para elementos principais
  return {
    // Cores primárias do tema
    primary: colors[0]?.color || '#489FB2',
    primaryBg: colors[0]?.bgColor || '#E3F7FB',
    
    // Cores secundárias (botões, títulos)
    secondary: colors[1]?.color || '#76B0C2',
    secondaryBg: colors[1]?.bgColor || '#EAF5F9',
    
    // Cores de destaque
    accent: colors[2]?.color || '#A3659E',
    accentBg: colors[2]?.bgColor || '#F6EAF5',
    
    // Cores de sucesso
    success: colors[3]?.color || '#73B96E',
    successBg: colors[3]?.bgColor || '#E8F6E7',
    
    // Cores de destaque especiais
    highlight: colors[4]?.color || '#FFBB00',
    highlightBg: colors[4]?.bgColor || '#FFF7D9',
    
    // Cores extras do tema
    extra: colors[5]?.color || colors[0]?.color || '#559E2C',
    extraBg: colors[5]?.bgColor || colors[0]?.bgColor || '#E8F2E0',
    
    // Cores fixas (não mudam com o tema)
    warning: '#E76F00',
    warningBg: '#FFF0E3',
    danger: '#ED5A55',
    dangerBg: '#FFE9E8',
    
    // Cores neutras
    background: '#F5F5F5',
    surface: '#FFFFFF',
    border: '#E0E0E0',
    textPrimary: '#333333',
    textSecondary: '#666666',
    
    // Informações do tema
    themeName: theme.name,
    themeDescription: theme.description,
    themePeriod: theme.period,
    currentThemeKey: themeKey || getCurrentSeason(),
  };
};

// ================== 7. RETROCOMPATIBILIDADE ==================

// Temas antigos mantidos para compatibilidade
export const THEME_COPY_OF_HAPPY_KID: ColorPair[] = FAMILY_THEMES.activeFamily.colors;
export const THEME_HAPPY_KIDS: ColorPair[] = FAMILY_THEMES.happyKids.colors;
export const THEME_HAPPY_MOM: ColorPair[] = FAMILY_THEMES.nurturingMom.colors;

// Mapeamento de cores padrão para categorias
export const DEFAULT_CATEGORY_COLOR_MAP: Record<string, ColorPair> = {
  work: { color: '#489FB2', bgColor: '#E3F7FB' },
  home: { color: '#A3659E', bgColor: '#F6EAF5' },
  health: { color: '#73B96E', bgColor: '#E8F6E7' },
  study: { color: '#FFBB00', bgColor: '#FFF7D9' },
};

// ================== 8. TEMA ATUAL APLICADO ==================

// Tema atual aplicado automaticamente baseado na estação/evento
export const THEME = createAdaptiveTheme();

// Cores atuais do tema sazonal/evento
export const CURRENT_THEME_COLORS = getCurrentTheme().colors;

// Paleta unificada disponível para categorias personalizadas
export const AVAILABLE_COLORS: ColorPair[] = [
  ...THEME_COPY_OF_HAPPY_KID,
  ...THEME_HAPPY_KIDS,
  ...THEME_HAPPY_MOM,
  ...CURRENT_THEME_COLORS,
];

// ================== 9. UTILITÁRIOS PARA COMPONENTES ==================

// Estilos de botão baseados no tema atual
export const THEME_BUTTON_STYLES = {
  primary: {
    backgroundColor: THEME.primary,
    color: '#FFFFFF',
    borderColor: THEME.primary,
  },
  secondary: {
    backgroundColor: THEME.secondary,
    color: '#FFFFFF',
    borderColor: THEME.secondary,
  },
  accent: {
    backgroundColor: THEME.accent,
    color: '#FFFFFF',
    borderColor: THEME.accent,
  },
  outline: {
    backgroundColor: 'transparent',
    color: THEME.primary,
    borderColor: THEME.primary,
  },
  soft: {
    backgroundColor: THEME.primaryBg,
    color: THEME.primary,
    borderColor: THEME.primaryBg,
  },
};

// Estilos de texto baseados no tema atual
export const THEME_TEXT_STYLES = {
  title: {
    color: THEME.primary,
    fontWeight: 'bold' as const,
  },
  subtitle: {
    color: THEME.secondary,
    fontWeight: '600' as const,
  },
  accent: {
    color: THEME.accent,
    fontWeight: '500' as const,
  },
  success: {
    color: THEME.success,
    fontWeight: '500' as const,
  },
  highlight: {
    color: THEME.highlight,
    fontWeight: '600' as const,
  },
};

// Função para obter cores de botão baseadas no tipo e tema
export const getThemeButtonStyle = (
  type: 'primary' | 'secondary' | 'accent' | 'outline' | 'soft' = 'primary',
  themeKey?: string
) => {
  const theme = createAdaptiveTheme(themeKey);
  
  switch (type) {
    case 'primary':
      return {
        backgroundColor: theme.primary,
        color: '#FFFFFF',
        borderColor: theme.primary,
      };
    case 'secondary':
      return {
        backgroundColor: theme.secondary,
        color: '#FFFFFF',
        borderColor: theme.secondary,
      };
    case 'accent':
      return {
        backgroundColor: theme.accent,
        color: '#FFFFFF',
        borderColor: theme.accent,
      };
    case 'outline':
      return {
        backgroundColor: 'transparent',
        color: theme.primary,
        borderColor: theme.primary,
      };
    case 'soft':
      return {
        backgroundColor: theme.primaryBg,
        color: theme.primary,
        borderColor: theme.primaryBg,
      };
    default:
      return THEME_BUTTON_STYLES.primary;
  }
};

// Função para obter cores de texto baseadas no tipo e tema
export const getThemeTextStyle = (
  type: 'title' | 'subtitle' | 'accent' | 'success' | 'highlight' = 'title',
  themeKey?: string
) => {
  const theme = createAdaptiveTheme(themeKey);
  
  switch (type) {
    case 'title':
      return { color: theme.primary, fontWeight: 'bold' as const };
    case 'subtitle':
      return { color: theme.secondary, fontWeight: '600' as const };
    case 'accent':
      return { color: theme.accent, fontWeight: '500' as const };
    case 'success':
      return { color: theme.success, fontWeight: '500' as const };
    case 'highlight':
      return { color: theme.highlight, fontWeight: '600' as const };
    default:
      return THEME_TEXT_STYLES.title;
  }
};

// ================== 10. FUNÇÕES AUXILIARES PARA FUTURA UI DE SELEÇÃO ==================

// Função para listar todos os temas disponíveis
export const getAllAvailableThemes = () => {
  return Object.keys(ALL_THEMES).map(key => ({
    key,
    theme: ALL_THEMES[key],
  }));
};

// Função para obter temas por categoria
export const getThemesByCategory = (category: keyof typeof THEME_CATEGORIES) => {
  return THEME_CATEGORIES[category].themes.map(themeKey => ({
    key: themeKey,
    theme: ALL_THEMES[themeKey],
  }));
};

// Função para buscar temas por nome ou descrição
export const searchThemes = (query: string) => {
  const lowerQuery = query.toLowerCase();
  return Object.keys(ALL_THEMES)
    .filter(key => {
      const theme = ALL_THEMES[key];
      return theme.name.toLowerCase().includes(lowerQuery) ||
             theme.description.toLowerCase().includes(lowerQuery);
    })
    .map(key => ({
      key,
      theme: ALL_THEMES[key],
    }));
};

// ===================================================================
// FIM DO SISTEMA DE TEMAS ORGANIZADOS
// ===================================================================