import { CategoryConfig } from '../types/family.types';

// Default categories
export const DEFAULT_CATEGORIES: CategoryConfig[] = [
  {
    id: 'all',
    name: 'Todas',
    icon: 'apps',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    isDefault: true
  },
  {
    id: 'work',
    name: 'Trabalho',
    icon: 'briefcase',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    isDefault: true
  },
  {
    id: 'home',
    name: 'Casa',
    icon: 'home',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    isDefault: true
  },
  {
    id: 'health',
    name: 'Saúde',
    icon: 'fitness',
    color: '#10B981',
    bgColor: '#ECFDF5',
    isDefault: true
  },
  {
    id: 'study',
    name: 'Estudos',
    icon: 'book',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    isDefault: true
  },
  {
    id: 'finance',
    name: 'Finanças',
    icon: 'card',
    color: '#3f9605ff',
    bgColor: '#ebffdeff',
    isDefault: true
  },
  {
    id: 'shopping',
    name: 'Compras',
    icon: 'bag',
    color: '#EC4899',
    bgColor: '#FDF2F8',
    isDefault: true
  }
];

export const AVAILABLE_ICONS = [
  'briefcase', 'home', 'fitness', 'book', 'car', 'restaurant',
  'airplane', 'camera', 'musical-notes', 'game-controller',
  'heart', 'star', 'gift', 'trophy', 'school', 'desktop',
  'card', 'bag', 'pizza', 'beer', 'cafe', 'cart',
  'paw', 'build', 'brush', 'bulb', 'calculator', 'calendar',
  'chatbubbles', 'code', 'compass', 'flask', 'flower', 'football',
  'hammer', 'headset', 'key', 'leaf', 'magnet', 'medal',
  'megaphone', 'moon', 'newspaper', 'nutrition', 'pencil', 'planet',
  'pulse', 'rocket', 'rose', 'shield', 'shirt', 'tennisball',
  'umbrella', 'wallet', 'watch', 'wifi', 'wine', 'basketball'
];

export const AVAILABLE_COLORS = [
  { color: '#E74C3C', bgColor: '#FADBD8' }, // Vermelho
  { color: '#E67E22', bgColor: '#FDEBD0' }, // Laranja
  { color: '#F39C12', bgColor: '#FEF5E7' }, // Amarelo Ouro
  { color: '#F1C40F', bgColor: '#FCF3CF' }, // Amarelo
  { color: '#2ECC71', bgColor: '#D5F4E6' }, // Verde
  { color: '#27AE60', bgColor: '#D4EFDF' }, // Verde Escuro
  { color: '#1ABC9C', bgColor: '#D1F2EB' }, // Turquesa
  { color: '#16A085', bgColor: '#D0ECE7' }, // Verde Água
  { color: '#3498DB', bgColor: '#D6EAF8' }, // Azul
  { color: '#2980B9', bgColor: '#D4E6F1' }, // Azul Escuro
  { color: '#9B59B6', bgColor: '#EBDEF0' }, // Roxo
  { color: '#8E44AD', bgColor: '#E8DAEF' }, // Roxo Escuro
  { color: '#E91E63', bgColor: '#F8BBD0' }, // Rosa
  { color: '#FF1744', bgColor: '#FFCDD2' }, // Rosa Forte
  { color: '#795548', bgColor: '#EFEBE9' }, // Marrom
  { color: '#607D8B', bgColor: '#ECEFF1' }, // Cinza Azulado
  { color: '#FF5722', bgColor: '#FFCCBC' }, // Laranja Profundo
  { color: '#009688', bgColor: '#B2DFDB' }, // Verde Azulado
  { color: '#4CAF50', bgColor: '#C8E6C9' }, // Verde Claro
  { color: '#CDDC39', bgColor: '#F0F4C3' }, // Lima
];

// Lista de emojis disponíveis
export const AVAILABLE_EMOJIS = [
  { emoji: '😊', name: 'happy' },
  { emoji: '😎', name: 'cool' },
  { emoji: '🤩', name: 'starstruck' },
  { emoji: '🥳', name: 'partying' },
  { emoji: '😇', name: 'angel' },
  { emoji: '🤗', name: 'hugging' },
  { emoji: '🎉', name: 'party' },
  { emoji: '🎊', name: 'confetti' },
  { emoji: '🎈', name: 'balloon' },
  { emoji: '🎁', name: 'gift' },
  { emoji: '🚀', name: 'rocket' },
  { emoji: '✈️', name: 'airplane' },
  { emoji: '🚗', name: 'car' },
  { emoji: '🚴', name: 'bicycle' },
  { emoji: '🏃', name: 'running' },
  { emoji: '⭐', name: 'star' },
  { emoji: '🌟', name: 'sparkles' },
  { emoji: '💫', name: 'dizzy' },
  { emoji: '✨', name: 'shine' },
  { emoji: '❤️', name: 'heart' },
  { emoji: '💙', name: 'blue-heart' },
  { emoji: '💚', name: 'green-heart' },
  { emoji: '💛', name: 'yellow-heart' },
  { emoji: '💜', name: 'purple-heart' },
  { emoji: '🧡', name: 'orange-heart' },
  { emoji: '🖤', name: 'black-heart' },
  { emoji: '🤍', name: 'white-heart' },
  { emoji: '🌈', name: 'rainbow' },
  { emoji: '🌸', name: 'flower' },
  { emoji: '🌺', name: 'hibiscus' },
  { emoji: '🌻', name: 'sunflower' },
  { emoji: '🌹', name: 'rose' },
  { emoji: '🌷', name: 'tulip' },
  { emoji: '🌿', name: 'leaf' },
  { emoji: '🍀', name: 'clover' },
  { emoji: '🌳', name: 'tree' },
  { emoji: '🌴', name: 'palm' },
  { emoji: '🐶', name: 'dog' },
  { emoji: '🐱', name: 'cat' },
  { emoji: '🐭', name: 'mouse' },
  { emoji: '🐹', name: 'hamster' },
  { emoji: '🐰', name: 'rabbit' },
  { emoji: '🦊', name: 'fox' },
  { emoji: '🐻', name: 'bear' },
  { emoji: '🐼', name: 'panda' },
  { emoji: '🐨', name: 'koala' },
  { emoji: '🐯', name: 'tiger' },
  { emoji: '🦁', name: 'lion' },
  { emoji: '🐮', name: 'cow' },
  { emoji: '🐷', name: 'pig' },
  { emoji: '🐸', name: 'frog' },
  { emoji: '🐵', name: 'monkey' },
  { emoji: '🦄', name: 'unicorn' },
  { emoji: '🐾', name: 'paw' },
  { emoji: '🦋', name: 'butterfly' },
  { emoji: '🐝', name: 'bee' },
  { emoji: '🐞', name: 'ladybug' },
  { emoji: '🍎', name: 'apple' },
  { emoji: '🍌', name: 'banana' },
  { emoji: '🍉', name: 'watermelon' },
  { emoji: '🍇', name: 'grapes' },
  { emoji: '🍓', name: 'strawberry' },
  { emoji: '🍒', name: 'cherries' },
  { emoji: '🍕', name: 'pizza' },
  { emoji: '🍔', name: 'burger' },
  { emoji: '🍟', name: 'fries' },
  { emoji: '🍦', name: 'icecream' },
  { emoji: '🍩', name: 'donut' },
  { emoji: '🍪', name: 'cookie' },
  { emoji: '🎂', name: 'cake' },
  { emoji: '🍰', name: 'shortcake' },
  { emoji: '☕', name: 'coffee' },
  { emoji: '🥤', name: 'drink' },
  { emoji: '🧃', name: 'juice' },
  { emoji: '⚽', name: 'soccer' },
  { emoji: '🏀', name: 'basketball' },
  { emoji: '🏈', name: 'football' },
  { emoji: '⚾', name: 'baseball' },
  { emoji: '🎾', name: 'tennis' },
  { emoji: '🏐', name: 'volleyball' },
  { emoji: '🎮', name: 'game' },
  { emoji: '🎯', name: 'dart' },
  { emoji: '🎲', name: 'dice' },
  { emoji: '🎨', name: 'art' },
  { emoji: '🎭', name: 'theater' },
  { emoji: '🎪', name: 'circus' },
  { emoji: '🎬', name: 'movie' },
  { emoji: '🎵', name: 'music' },
  { emoji: '🎸', name: 'guitar' },
  { emoji: '🎹', name: 'piano' },
  { emoji: '🎤', name: 'microphone' },
  { emoji: '📚', name: 'book' },
  { emoji: '📖', name: 'open-book' },
  { emoji: '✏️', name: 'pencil' },
  { emoji: '📝', name: 'memo' },
  { emoji: '💼', name: 'briefcase' },
  { emoji: '💻', name: 'laptop' },
  { emoji: '📱', name: 'phone' },
  { emoji: '⌚', name: 'watch' },
  { emoji: '🔑', name: 'key' },
  { emoji: '🔒', name: 'lock' },
  { emoji: '💡', name: 'bulb' },
  { emoji: '🔦', name: 'flashlight' },
  { emoji: '🕯️', name: 'candle' },
  { emoji: '🏠', name: 'home' },
  { emoji: '🏡', name: 'house' },
  { emoji: '🏖️', name: 'beach' },
  { emoji: '🏔️', name: 'mountain' },
  { emoji: '⛺', name: 'tent' },
  { emoji: '🌙', name: 'moon' },
  { emoji: '☀️', name: 'sun' },
  { emoji: '⭐', name: 'star2' },
  { emoji: '☁️', name: 'cloud' },
  { emoji: '⚡', name: 'lightning' },
  { emoji: '🔥', name: 'fire' },
  { emoji: '💧', name: 'droplet' },
  { emoji: '🌊', name: 'wave' },
];
