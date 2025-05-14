import { ProcessMonitor, ProcessStats } from '../../src/lib/ProcessMonitor';
import { ChildProcess } from 'child_process';
import { jest } from '@jest/globals';

describe('ProcessMonitor', () => {
  let monitor: ProcessMonitor;
  let mockProcess: jest.Mocked<ChildProcess>;
  let mockPid: number | undefined = 12345;

  beforeEach(() => {
    mockProcess = {
      on: jest.fn(),
      off: jest.fn(),
      removeListener: jest.fn(),
      emit: jest.fn(),
      // Use getter/setter for pid to allow modification in tests
      get pid() { return mockPid; },
      set pid(value: number | undefined) { mockPid = value; }
    } as any;

    monitor = new ProcessMonitor(mockProcess, 1000); // 1 second interval for faster tests
  });

  afterEach(() => {
    monitor.stop();
    jest.clearAllMocks();
    mockPid = 12345; // Reset mockPid to default value
  });

  it('starts monitoring and emits stats', (done) => {
    expect.assertions(4);

    monitor.on('stats', (stats: ProcessStats) => {
      expect(stats.pid).toBe(12345);
      expect(stats.cpu).toBeGreaterThanOrEqual(0);
      expect(stats.memory).toEqual(expect.objectContaining({
        rss: expect.any(Number),
        heapTotal: expect.any(Number),
        heapUsed: expect.any(Number)
      }));
      expect(stats.uptime).toBeGreaterThanOrEqual(0);
      done();
    });

    monitor.start();
  });

  it('stops monitoring when stop is called', () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    monitor.start();
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    monitor.stop();
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
  });

  it('handles missing PID gracefully', (done) => {
    mockPid = undefined; // Now we can safely modify the mock pid

    monitor.on('error', (error) => {
      expect(error.message).toBe('Process PID not available');
      done();
    });

    monitor.start();
  });

  it('emits multiple stats events over time', (done) => {
    const statsEvents: ProcessStats[] = [];

    monitor.on('stats', (stats: ProcessStats) => {
      statsEvents.push(stats);
      if (statsEvents.length >= 2) {
        expect(statsEvents[1].uptime).toBeGreaterThan(statsEvents[0].uptime);
        done();
      }
    });

    monitor.start();
  });
}); 