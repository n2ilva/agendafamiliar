/**
 * Tests for Logger Utility
 */

import logger from '../utils/logger';

describe('Logger', () => {
  let consoleSpy: {
    log: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    logger.clearHistory();
  });

  describe('log levels', () => {
    it('should log debug messages', () => {
      logger.debug('Debug message');
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should log info messages', () => {
      logger.info('Info message');
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should log warning messages', () => {
      logger.warn('Warning message');
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      logger.error('Error message');
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should log success messages', () => {
      logger.success('Success message');
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('tags', () => {
    it('should include tag in log message', () => {
      logger.info('Tagged message', 'TestTag');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[TestTag]'),
        expect.anything()
      );
    });
  });

  describe('history', () => {
    it('should store log history', () => {
      logger.info('First message');
      logger.warn('Second message');
      
      const history = logger.getHistory();
      expect(history.length).toBe(2);
    });

    it('should clear history', () => {
      logger.info('Message');
      logger.clearHistory();
      
      const history = logger.getHistory();
      expect(history.length).toBe(0);
    });

    it('should limit history size', () => {
      // Log more than maxHistory (default 100)
      for (let i = 0; i < 150; i++) {
        logger.debug(`Message ${i}`);
      }
      
      const history = logger.getHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe('filtering', () => {
    it('should filter history by level', () => {
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');
      
      const warnings = logger.getHistory('warn');
      expect(warnings.length).toBe(1);
      expect(warnings[0].level).toBe('warn');
    });
  });
});
