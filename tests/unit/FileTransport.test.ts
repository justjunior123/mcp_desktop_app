import fs from 'fs';
import path from 'path';
import { FileTransport } from '../../src/services/logging/transports/FileTransport';
import { LogLevel } from '../../src/services/logging/types';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  createWriteStream: jest.fn(),
  existsSync: jest.fn(),
  statSync: jest.fn(),
  mkdirSync: jest.fn(),
  promises: {
    unlink: jest.fn().mockResolvedValue(undefined),
    rename: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/mock/app/userData')
  }
}));

describe('FileTransport', () => {
  let mockWriteStream: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock write stream
    mockWriteStream = {
      write: jest.fn().mockImplementation((data, callback) => {
        if (callback) callback(null);
        return true;
      }),
      end: jest.fn().mockImplementation(callback => {
        if (callback) callback();
      }),
      on: jest.fn(),
      once: jest.fn()
    };
    
    (fs.createWriteStream as jest.Mock).mockReturnValue(mockWriteStream);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.statSync as jest.Mock).mockReturnValue({ size: 0 });
  });
  
  describe('Initialization', () => {
    it('creates log directory if it does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
      
      new FileTransport({ filename: 'test.log' });
      
      expect(fs.mkdirSync).toHaveBeenCalled();
    });
    
    it('uses app data path when available', () => {
      new FileTransport({ filename: 'test.log' });
      
      expect(fs.createWriteStream).toHaveBeenCalledWith(
        expect.stringContaining('/mock/app/userData/logs/test.log'),
        expect.anything()
      );
    });
    
    it('falls back to working directory if app is not available', () => {
      // Save original create stream mock
      const originalCreateWriteStream = fs.createWriteStream;
      
      // Reset and recreate mocks for this test
      jest.resetModules();
      
      // Mock fs again with working createWriteStream
      const mockCreateWriteStream = jest.fn().mockReturnValue(mockWriteStream);
      jest.doMock('fs', () => ({
        ...jest.requireActual('fs'),
        createWriteStream: mockCreateWriteStream,
        existsSync: jest.fn().mockReturnValue(true),
        statSync: jest.fn().mockReturnValue({ size: 0 }),
        mkdirSync: jest.fn()
      }));
      
      // Mock electron with null app
      jest.doMock('electron', () => ({
        app: null
      }));
      
      // Need to dynamically require to get the updated mocks
      const { FileTransport } = jest.requireActual('../../src/services/logging/transports/FileTransport');
      
      // Create a transport with updated mocks
      new FileTransport({ filename: 'test.log' });
      
      // Should use cwd path
      expect(mockCreateWriteStream).toHaveBeenCalled();
      const calledPath = mockCreateWriteStream.mock.calls[0][0];
      expect(calledPath).toMatch(/logs\/test.log$/);
      
      // Restore original mocks
      fs.createWriteStream = originalCreateWriteStream;
    });
    
    it('uses provided directory if specified', () => {
      new FileTransport({
        filename: 'test.log',
        directory: '/custom/logs'
      });
      
      expect(fs.createWriteStream).toHaveBeenCalledWith(
        '/custom/logs/test.log',
        expect.anything()
      );
    });
    
    it('sets initial file size from existing file', () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.statSync as jest.Mock).mockReturnValueOnce({ size: 1024 });
      
      const transport = new FileTransport({ filename: 'test.log' });
      
      // Access private property to test internal state
      expect((transport as any).currentSize).toBe(1024);
    });
  });
  
  describe('Logging', () => {
    it('writes log entry to file in JSON format', async () => {
      const transport = new FileTransport({
        filename: 'test.log',
        format: 'json'
      });
      
      await transport.log({
        timestamp: new Date('2023-01-01T12:00:00Z'),
        level: LogLevel.INFO,
        message: 'Test message',
        category: 'test',
        context: { user: 'test' }
      });
      
      expect(mockWriteStream.write).toHaveBeenCalled();
      
      // Extract the data written to the stream
      const data = mockWriteStream.write.mock.calls[0][0];
      
      // Verify it's valid JSON
      const parsed = JSON.parse(data);
      expect(parsed).toMatchObject({
        timestamp: '2023-01-01T12:00:00.000Z',
        level: 'info',
        message: 'Test message',
        category: 'test',
        context: { user: 'test' }
      });
    });
    
    it('writes log entry to file in text format', async () => {
      const transport = new FileTransport({
        filename: 'test.log',
        format: 'text'
      });
      
      await transport.log({
        timestamp: new Date('2023-01-01T12:00:00Z'),
        level: LogLevel.INFO,
        message: 'Test message',
        category: 'test',
        context: { user: 'test' }
      });
      
      expect(mockWriteStream.write).toHaveBeenCalled();
      
      // Extract the data written to the stream
      const data = mockWriteStream.write.mock.calls[0][0];
      
      // Verify it contains all parts of the log in text format
      expect(data).toContain('2023-01-01T12:00:00.000Z');
      expect(data).toContain('INFO');
      expect(data).toContain('test');
      expect(data).toContain('Test message');
      
      // In text format, the context is pretty-printed, so the exact format may vary
      // Just check that the user value is included
      expect(data).toContain('user');
      expect(data).toContain('test');
    });
    
    it('tracks file size and triggers rotation when limit is reached', async () => {
      // Create a small log file with 100 byte limit
      const transport = new FileTransport({
        filename: 'test.log',
        maxSize: 100
      });
      
      // Mock a large entry
      const mockEntry = {
        timestamp: new Date(),
        level: LogLevel.INFO,
        message: 'This is a long message that will exceed the file size limit',
        category: 'test',
        context: { large: 'data'.repeat(50) }
      };
      
      // Mock the rotate method
      const rotateSpy = jest.spyOn(transport, 'rotate').mockResolvedValue();
      
      // Write log entry
      await transport.log(mockEntry);
      
      // Transport should track that we wrote more than 100 bytes
      expect((transport as any).currentSize).toBeGreaterThan(100);
      
      // The rotate method should have been called
      expect(rotateSpy).toHaveBeenCalled();
    });
    
    it('reopens stream after rotate', async () => {
      const transport = new FileTransport({
        filename: 'test.log'
      });
      
      // Log an entry first
      await transport.log({
        timestamp: new Date(),
        level: LogLevel.INFO,
        message: 'Before rotation',
        category: 'test'
      });
      
      // Then rotate the file
      await transport.rotate();
      
      // Then log another entry
      await transport.log({
        timestamp: new Date(),
        level: LogLevel.INFO,
        message: 'After rotation',
        category: 'test'
      });
      
      // Stream should have been reopened for writing
      expect(fs.createWriteStream).toHaveBeenCalledTimes(2);
      expect(mockWriteStream.write).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('File Rotation', () => {
    it('rotates log files', async () => {
      const transport = new FileTransport({
        filename: 'test.log',
        maxFiles: 3
      });
      
      // Call rotate
      await transport.rotate();
      
      // Should rename the current file
      expect(fs.promises.rename).toHaveBeenCalledWith(
        expect.stringContaining('test.log'),
        expect.stringContaining('test.log.1')
      );
    });
    
    it('deletes oldest log file when maxFiles is reached', async () => {
      const transport = new FileTransport({
        filename: 'test.log',
        maxFiles: 3
      });
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      // Call rotate
      await transport.rotate();
      
      // Should delete the oldest log file (test.log.2)
      expect(fs.promises.unlink).toHaveBeenCalledWith(
        expect.stringContaining('test.log.2')
      );
    });
    
    it('resets file size after rotation', async () => {
      const transport = new FileTransport({
        filename: 'test.log'
      });
      
      // Set a large initial size
      (transport as any).currentSize = 1000;
      
      // Call rotate
      await transport.rotate();
      
      // Size should be reset
      expect((transport as any).currentSize).toBe(0);
    });
  });
  
  describe('Error Handling', () => {
    it('handles write errors', async () => {
      const transport = new FileTransport({
        filename: 'test.log'
      });
      
      // Simulate write error
      mockWriteStream.write.mockImplementationOnce((data: any, callback: any) => {
        if (callback) callback(new Error('Write error'));
        return true;
      });
      
      // Log entry should reject with the error
      await expect(transport.log({
        timestamp: new Date(),
        level: LogLevel.INFO,
        message: 'Test',
        category: 'test'
      })).rejects.toThrow('Write error');
    });
    
    it('handles directory creation errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Permission denied');
      });
      
      new FileTransport({ filename: 'test.log' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to create log directory:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
    
    it('handles file open errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      (fs.createWriteStream as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Permission denied');
      });
      
      const transport = new FileTransport({ filename: 'test.log' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to open log file stream:',
        expect.any(Error)
      );
      
      expect((transport as any).stream).toBeNull();
      
      consoleSpy.mockRestore();
    });
    
    it('handles rotation errors gracefully', async () => {
      const transport = new FileTransport({
        filename: 'test.log'
      });
      
      (fs.promises.rename as jest.Mock).mockRejectedValueOnce(new Error('Rename error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Rotation should not throw despite internal errors
      await transport.rotate();
      
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('Cleanup', () => {
    it('closes the stream when cleaning up', async () => {
      const transport = new FileTransport({
        filename: 'test.log'
      });
      
      await transport.cleanup();
      
      expect(mockWriteStream.end).toHaveBeenCalled();
    });
    
    it('handles cleanup when no stream is open', async () => {
      const transport = new FileTransport({
        filename: 'test.log'
      });
      
      // Set stream to null
      (transport as any).stream = null;
      
      // Should not throw
      await expect(transport.cleanup()).resolves.not.toThrow();
    });
  });
}); 