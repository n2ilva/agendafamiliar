/**
 * Tests for Date Utilities
 */

import {
  safeToDate,
  isToday,
  isUpcoming,
  isTaskOverdue,
} from '../utils/date/date.utils';

describe('Date Utilities', () => {
  describe('safeToDate', () => {
    it('should return Date for Date input', () => {
      const date = new Date('2024-03-15T10:30:00');
      const result = safeToDate(date);
      expect(result).toBeInstanceOf(Date);
    });

    it('should handle string input', () => {
      const dateString = '2024-03-15';
      const result = safeToDate(dateString);
      expect(result).toBeInstanceOf(Date);
    });

    it('should return undefined for invalid input', () => {
      expect(safeToDate(null)).toBeUndefined();
      expect(safeToDate(undefined)).toBeUndefined();
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

  describe('isUpcoming', () => {
    it('should return true for future date', () => {
      const future = new Date();
      future.setDate(future.getDate() + 7);
      expect(isUpcoming(future)).toBe(true);
    });

    it('should return false for past date', () => {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      expect(isUpcoming(past)).toBe(false);
    });
  });

  describe('isTaskOverdue', () => {
    it('should return true for past incomplete task', () => {
      const past = new Date();
      past.setDate(past.getDate() - 1);
      expect(isTaskOverdue(past, undefined, false)).toBe(true);
    });

    it('should return false for completed task', () => {
      const past = new Date();
      past.setDate(past.getDate() - 1);
      expect(isTaskOverdue(past, undefined, true)).toBe(false);
    });

    it('should return false for future task', () => {
      const future = new Date();
      future.setDate(future.getDate() + 7);
      expect(isTaskOverdue(future, undefined, false)).toBe(false);
    });
  });
});
