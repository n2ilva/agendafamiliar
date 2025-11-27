import { StyleSheet } from 'react-native';
import { APP_COLORS } from '../../constants/colors';

export const getStyles = (colors: any) => StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  scrollContainerWeb: {
    paddingHorizontal: 0,
  },
  pageContainer: {
    width: '100%',
    alignSelf: 'center',
  },
  pageContainerWeb: {
    width: '70%',
    maxWidth: 1000,
    minWidth: 320,
    alignSelf: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
    width: '100%',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 10,
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: APP_COLORS.text.primary,
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: APP_COLORS.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  optionsContainer: {
    width: '100%',
    gap: 20,
  },
  roleOption: {
    backgroundColor: APP_COLORS.background.lightGray,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roleOptionWeb: {
    alignSelf: 'stretch',
    width: '100%',
    marginHorizontal: 0,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: APP_COLORS.text.primary,
    marginTop: 15,
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 12,
    color: APP_COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  formContainer: {
    width: '100%',
    gap: 20,
  },
  input: {
    backgroundColor: APP_COLORS.background.lightGray,
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.border.light,
    color: APP_COLORS.text.primary,
  },
  primaryButton: {
    backgroundColor: APP_COLORS.primary.main,
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  inviteCodeBoxInline: {
    marginTop: 12,
    alignItems: 'center',
  },
  inviteCodeLabelInline: {
    fontSize: 14,
    color: APP_COLORS.text.secondary,
  },
  inviteCodeTextInline: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '700',
    color: APP_COLORS.primary.main,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: APP_COLORS.background.white,
    borderWidth: 1,
    borderColor: APP_COLORS.border.light,
  },
  logoutButtonText: {
    fontSize: 14,
    color: APP_COLORS.text.secondary,
    marginLeft: 8,
    fontWeight: '500',
  },
});
