/**
 * Tests for Date Utilities
 */

import {
  formatDateForDisplay,
  isToday,
  isTomorrow,
  isPastDate,
  getStartOfDay,
  getEndOfDay,
} from '../utils/date/date.utils';

describe('Date Utilities', () => {
  describe('formatDateForDisplay', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-03-15T10:30:00');
      const formatted = formatDateForDisplay(date);
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
    });

    it('should handle string input', () => {
      const dateString = '2024-03-15';
      const formatted = formatDateForDisplay(dateString);
      expect(formatted).toBeDefined();
    });
  });

  describe('isToday', () => {
    it('should return true for today', () => {
      const today = new Date();
      expect(isToday(today)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isToday(tomorrow)).toBe(false);
    });
  });

  describe('isTomorrow', () => {
    it('should return true for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isTomorrow(tomorrow)).toBe(true);
    });

    it('should return false for today', () => {
      const today = new Date();
      expect(isTomorrow(today)).toBe(false);
    });
  });

  describe('isPastDate', () => {
    it('should return true for past date', () => {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      expect(isPastDate(past)).toBe(true);
    });

    it('should return false for future date', () => {
      const future = new Date();
      future.setDate(future.getDate() + 7);
      expect(isPastDate(future)).toBe(false);
    });
  });

  describe('getStartOfDay', () => {
    it('should set time to 00:00:00', () => {
      const date = new Date('2024-03-15T15:30:45');
      const startOfDay = getStartOfDay(date);
      expect(startOfDay.getHours()).toBe(0);
      expect(startOfDay.getMinutes()).toBe(0);
      expect(startOfDay.getSeconds()).toBe(0);
      expect(startOfDay.getMilliseconds()).toBe(0);
    });
  });

  describe('getEndOfDay', () => {
    it('should set time to 23:59:59', () => {
      const date = new Date('2024-03-15T10:30:00');
      const endOfDay = getEndOfDay(date);
      expect(endOfDay.getHours()).toBe(23);
      expect(endOfDay.getMinutes()).toBe(59);
      expect(endOfDay.getSeconds()).toBe(59);
    });
  });
});
