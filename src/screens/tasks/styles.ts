import { StyleSheet, Platform } from 'react-native';
import { APP_COLORS } from '../../constants/colors';

export const getStyles = (colors: any, activeTheme: any) => StyleSheet.create({
  // Wrapper de página: mantém o layout atual no mobile; na web centraliza e limita largura
  pageContainer: {
    flex: 1,
    alignSelf: 'stretch',
  },
  pageContainerWeb: {
    width: '100%',
    maxWidth: 1100, // Limita a largura máxima em pixels para desktop
    minWidth: 320,
    alignSelf: 'center',
  },
  familyContentContainer: {
    paddingHorizontal: 0,
    paddingTop: 16,
    paddingBottom: 40,
    width: '100%',
  },
  familyContentContainerWeb: {
    paddingHorizontal: 20,
  },
  familyCard: {
    backgroundColor: colors.surface,
    borderRadius: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 12,
    width: '100%',
  },
  familyCardMobile: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 20,
  },
  familyCardWeb: {
    borderRadius: 12,
    borderWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    marginHorizontal: 0,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  familyCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  familyCardHeaderText: {
    flex: 1,
    gap: 4,
  },
  familyCardActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  familyCardActionText: {
    color: APP_COLORS.primary.main,
    fontWeight: '600',
    fontSize: 14,
  },
  familyCardValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 12,
    backgroundColor: colors.inputBackground,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  familyCardBadge: {
    backgroundColor: APP_COLORS.primary.main + '20',
    color: APP_COLORS.primary.main,
    fontWeight: '600',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  familyMemberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: APP_COLORS.primary.main,
    marginBottom: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  familyMemberCardMobile: {
    flexDirection: 'column',
    gap: 16,
    padding: 18,
  },
  // Container para centralizar a lista de membros
  familyMemberCardWeb: {
    flexDirection: 'column',
    gap: 16,
    padding: 18,
  },
  inviteCodeBoxWeb: {
    borderRadius: 10,
    borderWidth: 2,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    marginHorizontal: 0,
    marginVertical: 12,
    shadowColor: APP_COLORS.primary.main,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inviteCodeBoxMobile: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2196F3',
    marginHorizontal: 4,
  },
  copyButtonMobile: {
    marginLeft: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  inviteCodeMetaRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  inviteCodeMetaMobile: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 10,
  },
  inviteCodeExpiryMobile: {
    textAlign: 'center',
    width: '100%',
  },
  regenCodeButtonMobile: {
    alignSelf: 'center',
    marginLeft: 0,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  createFamilyNoteWeb: {
    borderRadius: 10,
    borderWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    marginHorizontal: 0,
  },
  closeModalButtonWeb: {
    borderRadius: 8,
    marginTop: 16,
    marginHorizontal: 16,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 480,
  },
  closeButtonFixedWeb: {
    position: 'relative',
    left: undefined as unknown as number,
    right: undefined as unknown as number,
    bottom: 0,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 480,
    marginTop: 16,
    marginBottom: 16,
  },
  // Bloco esquerdo: avatar + detalhes (ocupa o espaço disponível)
  memberLeftContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    paddingRight: 12,
  },
  memberLeftContainerMobile: {
    paddingRight: 0,
    width: '100%',
  },
  // Coluna direita: ações (mantém à direita)
  memberRightColumn: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  // Alinhamento à direita para o grupo de ações
  memberActionsRight: {
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    zIndex: 1, // Garante que o conteúdo fique acima do background
  },
  content: {
    flex: 1,
    paddingHorizontal: 8, // padding menor no mobile
    paddingTop: 12, // Reduzir padding superior
    paddingBottom: 100, // Aumentar padding inferior para os botões flutuantes
  },
  categoryFiltersContainer: {
    marginBottom: 20,
  },
  categoryScrollView: {
    flexGrow: 0,
  },
  categoryFilters: {
    paddingHorizontal: 4,
    paddingRight: 20,
  },
  categoryFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: colors.surface,
    minWidth: 80,
  },
  categoryFilterActive: {
    backgroundColor: APP_COLORS.primary.main,
    borderColor: APP_COLORS.primary.main,
  },
  categoryFilterText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  categoryFilterTextActive: {
    color: '#fff',
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: APP_COLORS.primary.main,
    backgroundColor: colors.surface,
    borderStyle: 'dashed',
    minWidth: 80,
  },
  addCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    color: APP_COLORS.primary.main,
  },
  horizontalScrollContainer: {
    marginBottom: 20,
    maxHeight: 70,
    ...Platform.select({
      web: {
        overflowX: 'scroll' as any,
        overflowY: 'hidden' as any,
        WebkitOverflowScrolling: 'touch' as any,
      },
    }),
  },
  iconSelectorContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 16,
    ...Platform.select({
      web: {
        flexWrap: 'nowrap' as any,
      },
    }),
  },
  iconSelector: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconSelectorActive: {
    borderColor: APP_COLORS.primary.main,
    backgroundColor: APP_COLORS.primary.light,
  },
  colorSelectorContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 16,
    ...Platform.select({
      web: {
        flexWrap: 'nowrap' as any,
      },
    }),
  },
  colorSelector: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorSelectorActive: {
    borderColor: colors.textPrimary,
  },
  categoryPreview: {
    marginBottom: 20,
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  privateToggleContainer: {
    marginTop: 12,
    marginBottom: 6,
    alignItems: 'flex-start'
  },
  privateToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: colors.surface
  },
  privateToggleButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: colors.surface,
    gap: 4,
  },
  privateToggleButtonActive: {
    backgroundColor: APP_COLORS.primary.main,
    borderColor: APP_COLORS.primary.main
  },
  privateToggleText: {
    marginRight: 8,
    color: colors.textPrimary
  },
  privateToggleTextCompact: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  privateToggleTextActive: {
    color: '#fff'
  },
  privateHint: {
    marginTop: 6,
    fontSize: 12,
    color: '#888'
  },
  categoryPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  categoryPreviewText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16, // Reduzir margem
    gap: 8, // Reduzir gap
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10, // Reduzir padding
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceSecondary,
  },
  dateTimeButtonText: {
    fontSize: 13, // Reduzir tamanho da fonte
    color: colors.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  // Web: manter um pouco mais de respiro lateral
  contentWeb: {
    paddingHorizontal: 16,
  },
  // Estilos específicos para Web para centralizar os botões de Data/Hora
  dateTimeContainerWeb: {
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  dateTimeButtonWeb: {
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 160,
    marginHorizontal: 6,
  },
  repeatContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  repeatIconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repeatIconButtonActive: {
    borderColor: APP_COLORS.primary.main,
    backgroundColor: APP_COLORS.primary.light,
  },
  customDaysContainer: {
    marginBottom: 16, // Reduzir margem
  },
  customDaysLabel: {
    fontSize: 13, // Reduzir tamanho da fonte
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6, // Reduzir margem
  },
  customDaysSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chipButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  chipButtonActive: {
    backgroundColor: APP_COLORS.primary.light,
    borderColor: APP_COLORS.primary.main,
  },
  chipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: APP_COLORS.primary.main,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayButtonActive: {
    backgroundColor: APP_COLORS.primary.main,
    borderColor: APP_COLORS.primary.main,
  },
  dayButtonText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dayButtonTextActive: {
    color: '#fff',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleButtonActive: {
    backgroundColor: APP_COLORS.primary.main,
    borderColor: APP_COLORS.primary.main,
  },
  toggleButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  summaryContainer: {
    marginBottom: 16, // Reduzir margem
  },
  summaryText: {
    fontSize: 13, // Reduzir tamanho da fonte
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30, // Reduzir padding horizontal
  },
  emptyText: {
    fontSize: 16, // Reduzir tamanho da fonte
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginTop: 16, // Reduzir margem superior
    marginBottom: 6, // Reduzir margem inferior
  },
  emptySubtext: {
    fontSize: 13, // Reduzir tamanho da fonte
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18, // Reduzir line height
  },
  smallModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  smallModalContent: {
    width: '95%',
    maxWidth: 500,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 16,
    maxHeight: '75%',
  },
  smallModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 12,
    textAlign: 'center',
  },
  taskList: {
    flex: 1,
    minHeight: '100%',
  },
  taskListContent: {
    paddingBottom: 100, // Espaço para o botão fixo
    flexGrow: 0,
    alignItems: 'stretch',
  },
  taskItem: {
    backgroundColor: colors.surface,
    borderRadius: 12, // Reduzir border radius
    marginHorizontal: 0, // ocupar 100% do container
    marginBottom: 12, // Reduzir margem inferior
    padding: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    alignSelf: 'stretch',
    width: '100%',
  },
  taskCompleted: {
    opacity: 0.6,
    backgroundColor: colors.surfaceSecondary,
  },
  // Category Header - New Styles
  categoryHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: activeTheme === 'dark' ? 0 : 1,
    borderBottomColor: activeTheme === 'dark' ? 'transparent' : 'rgba(0,0,0,0.05)',
  },
  categoryHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  repeatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.primary.main,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 2,
    gap: 3,
  },
  repeatBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: APP_COLORS.text.white,
  },
  categoryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  privateIndicatorRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.03)'
  },
  privateIndicatorRightText: {
    marginLeft: 4,
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '700'
  },
  privateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.03)'
  },
  privateIndicatorText: {
    marginLeft: 4,
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '700'
  },
  categoryHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  taskCardHeader: {
    padding: 12, // Reduzir padding
    paddingBottom: 8, // Reduzir padding inferior
  },
  taskMainContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxContainer: {
    marginRight: 12, // Reduzir margem
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: activeTheme === 'dark' ? '#fff' : APP_COLORS.primary.main,
    backgroundColor: activeTheme === 'dark' ? 'transparent' : colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: APP_COLORS.primary.main,
    borderColor: APP_COLORS.primary.main,
  },
  checkboxDisabled: {
    backgroundColor: activeTheme === 'dark' ? 'transparent' : colors.background,
    borderColor: activeTheme === 'dark' ? '#555' : '#ccc',
  },
  unlockIconButton: {
    padding: 8,
    marginLeft: 8,
  },
  taskTextContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16, // Reduzir tamanho da fonte
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 22, // Reduzir line height
    marginBottom: 3, // Reduzir margem
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textTertiary,
  },
  taskDescription: {
    fontSize: 13, // Reduzir tamanho da fonte
    color: activeTheme === 'dark' ? '#fff' : colors.textSecondary,
    lineHeight: 18, // Reduzir line height
    marginTop: 3, // Reduzir margem
  },
  taskDescriptionCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textTertiary,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 70,
    justifyContent: 'center',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  scheduleInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12, // Reduzir padding horizontal
    paddingBottom: 12, // Reduzir padding inferior
    gap: 6, // Reduzir gap
    borderTopWidth: activeTheme === 'dark' ? 0 : 1,
    borderTopColor: activeTheme === 'dark' ? 'transparent' : '#f0f0f0',
    paddingTop: 8, // Reduzir padding superior
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 8, // Reduzir padding horizontal
    paddingVertical: 4, // Reduzir padding vertical
    borderRadius: 10, // Reduzir border radius
    borderWidth: activeTheme === 'dark' ? 0 : 1,
    borderColor: activeTheme === 'dark' ? 'transparent' : '#e9ecef',
  },
  scheduleText: {
    fontSize: 11, // Reduzir tamanho da fonte
    color: activeTheme === 'dark' ? '#fff' : '#495057',
    marginLeft: 3, // Reduzir margem
    fontWeight: '600',
  },
  // Estilos para horário das subtarefas
  subtaskScheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginLeft: 2,
  },
  subtaskScheduleText: {
    fontSize: 10,
    color: activeTheme === 'dark' ? '#fff' : colors.textTertiary,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  scheduleActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 'auto', // Empurra para a direita
  },
  collapseButton: {
    backgroundColor: 'transparent',
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapseButtonContainer: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleActionButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 6,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  scheduleActionButtonActive: {
    backgroundColor: APP_COLORS.primary.main,
    borderColor: APP_COLORS.primary.main,
  },
  scheduleActionButtonText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  overdueText: {
    color: '#dc3545',
    fontWeight: '700',
  },
  overdueIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: activeTheme === 'dark' ? 'rgba(220,53,69,0.15)' : '#fff5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: activeTheme === 'dark' ? 'rgba(220,53,69,0.4)' : '#fecaca',
  },
  overdueLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#dc3545',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: APP_COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  modalOverlayMobile: {
    padding: 0,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '95%',
    maxWidth: 500,
    height: '75%',
    alignSelf: 'center',
  },
  // No web, expandir o modal de Gerenciar Família para ocupar tela cheia (como mobile)
  modalContentWeb: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    minHeight: '100%',
    maxHeight: '100%',
    borderRadius: 0,
    padding: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignSelf: 'center',
  },
  // Conteúdo do modal de configurações com espaço para o botão fixo
  settingsModalContent: {
    position: 'relative',
    paddingBottom: 72, // espaço para o botão "Fechar" fixo
  },
  // Conteúdo do modal de aprovações com espaço para o botão fixo
  approvalModalContent: {
    position: 'relative',
    paddingBottom: 72, // espaço para o botão "Fechar" fixo
  },
  fullscreenLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  fullscreenLoadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
  },
  fullscreenLoadingText: {
    marginTop: 12,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16, // Reduzir margem
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: APP_COLORS.primary.main,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10, // Reduzir padding
    fontSize: 15, // Reduzir tamanho da fonte
    marginBottom: 12, // Reduzir margem
    backgroundColor: colors.surfaceSecondary,
    width: '99%', // Garantir que ocupe toda a largura disponível
    alignSelf: 'stretch', // Garantir que se estenda corretamente
  },
  textArea: {
    height: 70, // Reduzir altura
    textAlignVertical: 'top',
    width: '99%', // Garantir largura total
    alignSelf: 'stretch', // Garantir que se estenda corretamente
  },

  categoryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  categorySelectorContainer: {
    marginBottom: 16,
  },
  categorySelectorScrollView: {
    flexGrow: 0,
  },
  categorySelectorScroll: {
    paddingHorizontal: 4,
    paddingRight: 20,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10, // Reduzir padding
    paddingVertical: 6, // Reduzir padding
    marginRight: 8,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 85, // Reduzir largura mínima
    justifyContent: 'center',
  },
  categorySelectorActive: {
    borderWidth: 2,
  },
  categorySelectorText: {
    fontSize: 11, // Reduzir tamanho da fonte
    fontWeight: '600',
    marginLeft: 3, // Reduzir margem
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4, // Reduzir margem superior
    paddingTop: 8, // Adicionar um pouco de padding
  },
  button: {
    flex: 1,
    paddingVertical: 10, // Reduzir padding vertical
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surfaceSecondary,
    marginRight: 8,
  },
  cancelButtonText: {
    color: APP_COLORS.text.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: APP_COLORS.primary.main,
    marginLeft: 8,
  },
  buttonDisabled: {
    backgroundColor: '#a0c8ff', // Cor mais clara para indicar que está desabilitado
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Date Picker Styles
  datePickerModal: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    margin: 20,
    marginTop: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    color: colors.textPrimary,
  },
  dateInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    textAlign: 'center',
    fontSize: 16,
    width: 60,
    marginHorizontal: 5,
  },
  dateSeparator: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginHorizontal: 5,
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  datePickerCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    marginRight: 8,
  },
  datePickerCancelText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: APP_COLORS.primary.main,
    marginLeft: 8,
  },
  datePickerConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Time Picker Styles
  timePickerModal: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    margin: 20,
    marginTop: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    color: colors.textPrimary,
  },
  timeInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    textAlign: 'center',
    fontSize: 18,
    width: 50,
    marginHorizontal: 5,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginHorizontal: 10,
  },
  timePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timePickerCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    marginRight: 8,
  },
  timePickerCancelText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  timePickerConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: APP_COLORS.primary.main,
    marginLeft: 8,
  },
  timePickerConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Keyboard Avoiding Styles
  keyboardAvoidingView: {
    flex: 1,
  },
  modalScrollView: {
    flex: 1,
    marginBottom: 12, // Reduzir margem
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  // Tab Styles (DEPRECATED - mantidos para compatibilidade)
  /*
  tabContainer: {
                flexDirection: 'row',
              backgroundColor: colors.surfaceSecondary,
              borderRadius: 12,
              padding: 4,
              marginHorizontal: 20,
              marginVertical: 16,
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
              elevation: 2,
  },
              tab: {
                flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 8,
              backgroundColor: 'transparent',
  },
              activeTab: {
                backgroundColor: colors.surface,
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 1,
  },
              tabText: {
                fontSize: 14,
              fontWeight: '600',
              color: colors.textSecondary,
              marginLeft: 6,
              marginRight: 8,
  },
              activeTabText: {
                color: APP_COLORS.primary.main,
  },
              taskCount: {
                backgroundColor: '#e3f2fd',
              borderRadius: 10,
              minWidth: 20,
              height: 20,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 6,
  },
              taskCountText: {
                fontSize: 11,
              fontWeight: '600',
              color: colors.textSecondary,
  },
              activeTaskCountText: {
                color: '#fff',
  },
              */
  // Container principal para tabs e filtro
  tabsHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    paddingBottom: 10,
  },
  // Simple Tab Styles (Nova aparência simplificada)
  simpleTabContainer: {
    flexDirection: 'row',
    flex: 1, // Ocupa o espaço disponível
  },
  simpleTab: {
    flex: 1,
    paddingVertical: 10, // Reduzir padding vertical
    paddingHorizontal: 8, // Reduzir mais o padding horizontal para mobile
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeSimpleTab: {
    borderBottomColor: APP_COLORS.primary.main,
  },
  simpleTabText: {
    fontSize: 15, // Reduzir tamanho da fonte
    fontWeight: '500',
    color: colors.textSecondary,
  },
  activeSimpleTabText: {
    color: APP_COLORS.primary.main,
    fontWeight: '600',
  },
  // History Styles
  historyModalWrapper: {
    width: '95%',
    maxWidth: 500,
    maxHeight: '75%',
    minHeight: 320,
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  historyModalSafeArea: {
    flex: 1,
    position: 'relative',
    paddingBottom: 72, // espaço para o botão "Fechar" fixo
  },
  historySubtitle: {
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  historyListContainer: {
    flex: 1,
    width: '100%',
    marginBottom: 12,
    minHeight: 200,
  },
  historyList: {
    flex: 1,
  },
  historyListContent: {
    paddingBottom: 84, // garantir que o conteúdo não fique sob o botão fixo
  },
  emptyHistoryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyHistoryText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  historyItem: {
    flexDirection: 'row',
    padding: 16,
    width: '95%',
    alignSelf: 'center',
    marginVertical: 4,
    backgroundColor: colors.surface,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  historyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
    justifyContent: 'center',
  },
  historyText: {
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  historyAction: {
    fontWeight: '600',
    color: APP_COLORS.primary.main,
  },
  historyDetails: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  historyTime: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  // Overdue Task Styles
  taskOverdue: {
    // Manter o fundo do card conforme o tema; no dark permanecer escuro
    backgroundColor: activeTheme === 'dark' ? colors.surface : '#fff5f5',
    borderWidth: 2,
    borderColor: activeTheme === 'dark' ? 'rgba(220,53,69,0.4)' : '#fecaca',
  },
  pendingRecurringIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  pendingRecurringLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#f39c12',
    textTransform: 'uppercase',
  },
  taskTitlePending: {
    color: '#b45309',
  },
  taskDescriptionPending: {
    color: '#92400e',
  },
  lastUpdateText: {
    fontSize: 11,
    color: '#28a745',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  refreshContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  refreshButton: {
    marginLeft: 8,
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#f0f9f0',
  },
  refreshButtonActive: {
    backgroundColor: '#e7f3ff',
  },
  rotating: {
    transform: [{ rotate: '45deg' }],
  },
  approvalStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: activeTheme === 'dark' ? 'rgba(255,193,7,0.15)' : '#fff3cd',
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: activeTheme === 'dark' ? 'rgba(255,152,0,0.4)' : '#ff9800',
  },
  approvalStatusApproved: {
    backgroundColor: activeTheme === 'dark' ? 'rgba(76,175,80,0.15)' : '#d4edda',
    borderColor: activeTheme === 'dark' ? 'rgba(76,175,80,0.4)' : '#4CAF50',
  },
  approvalStatusRejected: {
    backgroundColor: activeTheme === 'dark' ? 'rgba(231,76,60,0.15)' : '#f8d7da',
    borderColor: activeTheme === 'dark' ? 'rgba(231,76,60,0.4)' : '#e74c3c',
  },
  approvalStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ff9800',
    marginLeft: 4,
  },
  approvalStatusTextApproved: {
    color: '#4CAF50',
  },
  approvalStatusTextRejected: {
    color: '#e74c3c',
  },
  noNotificationsText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginVertical: 20,
  },
  notificationsList: {
    maxHeight: 400,
    marginVertical: 10,
  },
  notificationItem: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notificationTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  notificationTaskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 5,
  },
  notificationTime: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 10,
  },
  approvalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  approvalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    gap: 5,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#e74c3c',
  },
  approvalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: APP_COLORS.primary.main,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center',
  },
  // Botão "Fechar" fixo no rodapé do modal de aprovações
  closeButtonFixed: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 16,
    marginTop: 0,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 16,
  },
  // Estilos do Modal de Família
  familyModalContent: {
    maxHeight: '75%',
    minHeight: '75%',
    paddingBottom: 20, // espaço para o botão "Fechar" fixo
  },
  familyModalContentMobile: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    minHeight: '100%',
    maxHeight: '100%',
    borderRadius: 0,
    padding: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    paddingBottom: 20, // espaço para o botão "Fechar" fixo
  },
  familyModalHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  closeModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: APP_COLORS.primary.main,
    marginTop: 15,
  },
  closeModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  familyContent: {
    flex: 1,
  },

  familySectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  familySectionSubtitle: {
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 16,
    lineHeight: 22,
  },
  generateCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primary.main,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 8,
  },
  generateCodeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
  },
  inviteCodeContainer: {
    marginTop: 15,
    marginHorizontal: 0,
    padding: 0,
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
  },
  inviteCodeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  inviteCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: APP_COLORS.primary.main,
    width: '100%',
  },
  inviteCodeText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: APP_COLORS.primary.main,
    letterSpacing: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyButton: {
    backgroundColor: APP_COLORS.primary.main,
    padding: 12,
    borderRadius: 8,
    marginLeft: 12,
  },
  inviteCodeExpiry: {
    fontSize: 12,
    color: colors.textPrimary,
    fontStyle: 'italic',
    marginTop: 5,
  },
  regenCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.primary.main,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginLeft: 8
  },
  regenCodeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6
  },
  activeInvites: {
    marginTop: 15,
  },
  activeInvitesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: APP_COLORS.text.primary,
    marginBottom: 8,
  },
  activeInviteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    padding: 10,
    borderRadius: 6,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeInviteCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: APP_COLORS.primary.main,
  },
  activeInviteExpiry: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  familyMember: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  memberAvatarColumn: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberDetailsColumn: {
    flex: 1,
    paddingLeft: 16,
  },
  memberInfo: {
    flex: 1,
    gap: 4,
  },
  memberAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  memberAvatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  memberAvatarEmoji: {
    fontSize: 32,
  },
  memberDetails: {
    flex: 1,
    gap: 4,
  },
  memberName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  memberRole: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  memberRoleText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  memberRoleAdmin: {
    color: APP_COLORS.primary.main,
    fontWeight: '600',
  },
  memberEmail: {
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 6,
    lineHeight: 18,
  },
  memberJoinDate: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  removeMemberButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: APP_COLORS.status.error + '20',
    minHeight: 48,
    minWidth: 48,
  },
  removeMemberButtonMobile: {
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 12,
  },
  memberActionsMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  changeMemberRoleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: APP_COLORS.primary.main + '20',
    gap: 8,
    minHeight: 48,
    minWidth: 160,
  },
  changeMemberRoleButtonMobile: {
    flex: 1,
  },
  changeMemberRoleButtonText: {
    fontSize: 15,
    color: APP_COLORS.primary.main,
    fontWeight: '600',
  },

  // Novos estilos para cards de membros - Design simplificado
  memberCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 14,
  },
  memberAvatarAndInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 200,
  },
  memberRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  editMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#e6f3ff',
    borderRadius: 8,
    minWidth: 100,
  },
  editMemberButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: APP_COLORS.primary.main,
  },

  // Estilos do Modal de Edição de Membro
  editMemberModalContent: {
    maxHeight: '75%',
    minHeight: '60%',
    paddingBottom: 20,
  },
  editMemberScroll: {
    flex: 1,
  },
  editMemberInfo: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  editMemberAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.border,
    marginBottom: 12,
  },
  editMemberAvatarImage: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  editMemberAvatarEmoji: {
    fontSize: 48,
  },
  editMemberName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  editMemberJoinDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  editSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  editSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  editSectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  permissionsEditContainer: {
    gap: 12,
  },
  permissionEditItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
  permissionEditItemActive: {
    backgroundColor: '#e6f3ff',
    borderColor: APP_COLORS.primary.main,
  },
  permissionEditLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  permissionEditLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  permissionEditLabelActive: {
    color: APP_COLORS.primary.main,
  },
  permissionCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: APP_COLORS.border.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionCheckboxActive: {
    backgroundColor: APP_COLORS.primary.main,
    borderColor: APP_COLORS.primary.main,
  },
  permissionsNote: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  changeRoleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: APP_COLORS.primary.main + '20',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: APP_COLORS.primary.main,
  },
  changeRoleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.primary.main,
  },
  removeMemberButtonEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: APP_COLORS.status.error,
    borderRadius: 10,
  },
  removeMemberButtonTextEdit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  closeIconButton: {
    padding: 4,
  },

  // Estilos para edição do nome da família
  familyNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSecondary,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currentFamilyName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  editFamilyNameIconButton: {
    padding: 10,
    borderRadius: 6,
    backgroundColor: APP_COLORS.primary.main + '20',
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editFamilyNameContainer: {
    backgroundColor: APP_COLORS.background.lightGray,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: APP_COLORS.border.light,
  },
  editFamilyNameInput: {
    backgroundColor: APP_COLORS.background.white,
    borderWidth: 2,
    borderColor: APP_COLORS.border.light,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    marginBottom: 16,
  },
  editFamilyNameActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editFamilyNameButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: APP_COLORS.primary.main,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  // Estilos para indicador de conectividade
  connectivityIndicator: {
    backgroundColor: colors.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  connectivityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  connectivityText: {
    fontSize: 13,
    fontWeight: '500',
  },
  syncingIndicator: {
    marginLeft: 4,
  },
  // Estilos para informações de autoria
  authorshipInfo: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderTopWidth: activeTheme === 'dark' ? 0 : 1,
    borderTopColor: activeTheme === 'dark' ? 'transparent' : '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  authorshipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 6,
  },
  authorshipText: {
    fontSize: 11,
    color: activeTheme === 'dark' ? '#fff' : colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  historyAuthor: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  syncingDot: {
    fontSize: 20,
    color: '#4CAF50',
  },
  // Estilos para botão de filtro e rodapé
  filterButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.primary.main,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginLeft: 8, // Espaçamento do container de tabs
  },
  createTaskButton: {
    backgroundColor: APP_COLORS.primary.main,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    maxWidth: 300,
    marginBottom: 15,
    borderRadius: 12,
    gap: 8,
    shadowColor: APP_COLORS.primary.main,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    elevation: 4,

  },
  // Container para o botão fixo respeitando safe area
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent', // Removido o background
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    // Removidas as propriedades de borda e sombra
    alignItems: 'center',
    justifyContent: 'center',
  },
  createTaskButtonFixed: {
    backgroundColor: APP_COLORS.primary.main,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    maxWidth: 250,
    width: '100%',
    borderRadius: 12,
    gap: 8,
    shadowColor: APP_COLORS.primary.main,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    elevation: 4,
  },
  createTaskButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  filterDropdownMenuFloating: {
    position: 'absolute',
    // top e right serão definidos dinamicamente via inline style
    width: 240,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
    maxHeight: 320,
    zIndex: 1001,
    overflow: 'hidden',
  },
  filterDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
    minHeight: 52,
  },
  filterDropdownItemActive: {
    backgroundColor: '#f0f4ff',
  },
  filterDropdownItemText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
    fontWeight: '400',
  },
  filterDropdownItemTextActive: {
    color: APP_COLORS.primary.main,
    fontWeight: '600',
  },
  deleteCategoryButton: {
    padding: 6,
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#f9fafb',
  },
  filterDropdownSeparator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 4,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  // Estilos para modal de configurações
  settingsOptions: {
    width: '100%',
    marginVertical: 20,
  },
  settingsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.surfaceSecondary,
    marginBottom: 2,
    borderRadius: 8,
  },
  settingsOptionText: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    marginLeft: 15,
    fontWeight: '500',
  },
  // Botão de ação do modal de configurações (redondo e verde)
  settingsActionFab: {
    position: 'absolute',
    bottom: 86, // acima do botão Fechar (que está em bottom: 16)
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: APP_COLORS.status.success,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  // Estilos do Modal do Manual
  manualModalContent: {
    position: 'relative',
    paddingBottom: 72,
  },
  manualScroll: {
    flexGrow: 0,
  },
  manualContent: {
    paddingBottom: 8,
  },
  manualParagraph: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 12,
    lineHeight: 20,
  },
  manualSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: APP_COLORS.secondary.main,
    marginTop: 8,
    marginBottom: 8,
  },
  manualListItem: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 6,
    lineHeight: 20,
  },
  // Estilos para interface de criação de família
  createFamilyIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  createFamilyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  createFamilySubtitle: {
    fontSize: 15,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  createFamilyInputContainer: {
    marginBottom: 25,
  },
  createFamilyInput: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 18,
    fontSize: 17,
    color: colors.textPrimary,
  },
  createFamilyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primary.main,
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 12,
    gap: 10,
    marginBottom: 20,
    shadowColor: APP_COLORS.primary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  createFamilyButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  createFamilyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  createFamilyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff9e6',
    padding: 16,
    borderRadius: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: '#ffc107',
    gap: 10,
    marginTop: 20,
    marginHorizontal: -20,
  },
  createFamilyNoteText: {
    flex: 1,
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  // ===== Permissões de Membros =====
  permissionsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8'
  },
  permissionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6
  },
  permissionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  permissionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bbb',
    backgroundColor: colors.surface,
    marginRight: 8,
    marginBottom: 8
  },
  permissionChipActive: {
    backgroundColor: APP_COLORS.primary.main,
    borderColor: APP_COLORS.primary.main
  },
  permissionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555'
  },
  permissionChipTextActive: {
    color: '#fff'
  },
  permissionsHint: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2
  },
  // Banner unificado de sincronização no modal de família
  familySyncBanner: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f6ff',
    borderWidth: 1,
    borderColor: '#cfe3ff',
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
  },
  familySyncBannerText: {
    color: '#0a58ca',
    fontSize: 13,
    fontWeight: '600',
  },
  // Estilos para o modal de picker do iOS
  iosPickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 9999,
    elevation: 9999,
  },
  iosPickerContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    zIndex: 10000,
    elevation: 10000,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  iosPickerDoneButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  iosPickerDoneButtonText: {
    color: APP_COLORS.primary.main,
    fontSize: 17,
    fontWeight: '600',
  },
  iosDateTimePicker: {
    backgroundColor: colors.surface,
    height: 200,
  },
  // iOS inline picker dentro do container do modal de tarefa
  iosInlinePickerBox: {
    marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  iosInlinePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: colors.surface,
  },
  // Estilos do modal de loading de sincronização
  syncLoadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncLoadingContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  syncLoadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  postponeModalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: APP_COLORS.text.secondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  pickerSection: {
    marginBottom: 20,
  },
  pickerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: APP_COLORS.text.primary,
    marginBottom: 8,
  },

  postponeWarningText: {
    marginTop: 6,
    marginBottom: 2,
    color: '#b45309', // amber-700
    fontSize: 12,
    textAlign: 'center',
  },
  opacityDisabled: {
    opacity: 0.5,
  },
});

