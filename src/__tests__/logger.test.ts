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
    logger.setMinLevel('debug'); // Enable all logs for testing
  });

  afterEach(() => {
    jest.restoreAllMocks();
    logger.clearHistory();
  });

  describe('log levels', () => {
    it('should log debug messages', () => {
      logger.debug('Test', 'Debug message');
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should log info messages', () => {
      logger.info('Test', 'Info message');
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should log warning messages', () => {
      logger.warn('Test', 'Warning message');
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      logger.error('Test', 'Error message');
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should log success messages', () => {
      logger.success('Test', 'Success message');
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('tags', () => {
    it('should include tag in log message', () => {
      logger.info('TestTag', 'Tagged message');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[TestTag]'),
        expect.anything()
      );
    });
  });

  describe('history', () => {
    it('should store log history', () => {
      logger.info('Test', 'First message');
      logger.warn('Test', 'Second message');
      
      const history = logger.getHistory();
      expect(history.length).toBe(2);
    });

    it('should clear history', () => {
      logger.info('Test', 'Message');
      logger.clearHistory();
      
      const history = logger.getHistory();
      expect(history.length).toBe(0);
    });

    it('should limit history size', () => {
      // Log more than maxHistory (default 100)
      for (let i = 0; i < 150; i++) {
        logger.debug('Test', `Message ${i}`);
      }
      
      const history = logger.getHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe('min level filtering', () => {
    it('should filter based on min level', () => {
      logger.setMinLevel('warn');
      
      logger.debug('Test', 'Debug message');
      logger.info('Test', 'Info message');
      
      // Debug and info should not be logged when minLevel is warn
      expect(consoleSpy.log).not.toHaveBeenCalled();
      
      logger.warn('Test', 'Warning message');
      expect(consoleSpy.warn).toHaveBeenCalled();
    });
  });
});
