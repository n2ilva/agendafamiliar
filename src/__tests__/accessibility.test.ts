/**
 * Tests for Accessibility Utilities
 */

import {
  getButtonAccessibilityProps,
  getCheckboxAccessibilityProps,
  getTextInputAccessibilityProps,
  getTaskAccessibilityProps,
  getTabAccessibilityProps,
  getAlertAccessibilityProps,
} from '../utils/accessibility';

describe('Accessibility Utilities', () => {
  describe('getButtonAccessibilityProps', () => {
    it('should return correct props for button', () => {
      const props = getButtonAccessibilityProps('Submit');
      
      expect(props.accessible).toBe(true);
      expect(props.accessibilityLabel).toBe('Submit');
      expect(props.accessibilityRole).toBe('button');
    });

    it('should include disabled state', () => {
      const props = getButtonAccessibilityProps('Submit', { disabled: true });
      
      expect(props.accessibilityState?.disabled).toBe(true);
    });

    it('should include hint if provided', () => {
      const props = getButtonAccessibilityProps('Submit', { hint: 'Saves the form' });
      
      expect(props.accessibilityHint).toBe('Saves the form');
    });
  });

  describe('getCheckboxAccessibilityProps', () => {
    it('should return checked state in label', () => {
      const checkedProps = getCheckboxAccessibilityProps('Accept terms', true);
      const uncheckedProps = getCheckboxAccessibilityProps('Accept terms', false);
      
      expect(checkedProps.accessibilityLabel).toContain('marcado');
      expect(uncheckedProps.accessibilityLabel).toContain('não marcado');
    });

    it('should have checkbox role', () => {
      const props = getCheckboxAccessibilityProps('Option', false);
      
      expect(props.accessibilityRole).toBe('checkbox');
      expect(props.accessibilityState?.checked).toBe(false);
    });
  });

  describe('getTextInputAccessibilityProps', () => {
    it('should indicate required field', () => {
      const props = getTextInputAccessibilityProps('Email', { required: true });
      
      expect(props.accessibilityLabel).toContain('obrigatório');
    });

    it('should include error message', () => {
      const props = getTextInputAccessibilityProps('Email', { error: 'Email inválido' });
      
      expect(props.accessibilityLabel).toContain('erro');
      expect(props.accessibilityLabel).toContain('Email inválido');
    });
  });

  describe('getTaskAccessibilityProps', () => {
    it('should include task title', () => {
      const props = getTaskAccessibilityProps('Comprar leite', false);
      
      expect(props.accessibilityLabel).toContain('Comprar leite');
    });

    it('should indicate completed status', () => {
      const props = getTaskAccessibilityProps('Comprar leite', true);
      
      expect(props.accessibilityLabel).toContain('concluída');
    });

    it('should include category when provided', () => {
      const props = getTaskAccessibilityProps('Reunião', false, { category: 'Trabalho' });
      
      expect(props.accessibilityLabel).toContain('categoria Trabalho');
    });

    it('should include position in list', () => {
      const props = getTaskAccessibilityProps('Task', false, { index: 2, total: 5 });
      
      expect(props.accessibilityLabel).toContain('item 3 de 5');
    });
  });

  describe('getTabAccessibilityProps', () => {
    it('should include tab position', () => {
      const props = getTabAccessibilityProps('Home', 0, 3, false);
      
      expect(props.accessibilityLabel).toContain('aba 1 de 3');
    });

    it('should indicate selected state', () => {
      const selectedProps = getTabAccessibilityProps('Home', 0, 3, true);
      const unselectedProps = getTabAccessibilityProps('Home', 0, 3, false);
      
      expect(selectedProps.accessibilityLabel).toContain('selecionada');
      expect(unselectedProps.accessibilityLabel).not.toContain('selecionada');
    });

    it('should have tab role', () => {
      const props = getTabAccessibilityProps('Tab', 0, 1, true);
      
      expect(props.accessibilityRole).toBe('tab');
      expect(props.accessibilityState?.selected).toBe(true);
    });
  });

  describe('getAlertAccessibilityProps', () => {
    it('should include type prefix', () => {
      const errorProps = getAlertAccessibilityProps('Something went wrong', 'error');
      const successProps = getAlertAccessibilityProps('Operation completed', 'success');
      
      expect(errorProps.accessibilityLabel).toContain('Erro');
      expect(successProps.accessibilityLabel).toContain('Sucesso');
    });

    it('should have alert role', () => {
      const props = getAlertAccessibilityProps('Message', 'info');
      
      expect(props.accessibilityRole).toBe('alert');
    });
  });
});
