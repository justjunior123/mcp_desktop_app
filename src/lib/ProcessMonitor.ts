import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as os from 'os';

export interface ProcessStats {
  pid: number;
  cpu: number;  // CPU usage percentage
  memory: {
    rss: number;    // Resident Set Size in bytes
    heapTotal: number;
    heapUsed: number;
  };
  uptime: number;  // Process uptime in milliseconds
}

export class ProcessMonitor extends EventEmitter {
  private process: ChildProcess;
  private pollInterval: number;
  private intervalId?: NodeJS.Timeout;
  private startTime: number;

  constructor(process: ChildProcess, pollIntervalMs: number = 5000) {
    super();
    this.process = process;
    this.pollInterval = pollIntervalMs;
    this.startTime = Date.now();
  }

  /**
   * Start monitoring the process
   */
  start(): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.collectStats();
    }, this.pollInterval);

    // Initial stats collection
    this.collectStats();
  }

  /**
   * Stop monitoring the process
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Collect process statistics
   */
  private async collectStats(): Promise<void> {
    try {
      const pid = this.process.pid;
      if (!pid) {
        this.emit('error', new Error('Process PID not available'));
        return;
      }

      const stats: ProcessStats = {
        pid,
        cpu: await this.getCpuUsage(pid),
        memory: await this.getMemoryUsage(pid),
        uptime: Date.now() - this.startTime
      };

      this.emit('stats', stats);
    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * Get CPU usage for the process
   */
  private async getCpuUsage(pid: number): Promise<number> {
    // This is a simplified CPU calculation
    // For more accurate results, we'd need to track CPU time over intervals
    const usage = process.cpuUsage();
    return ((usage.user + usage.system) / 1000000) * 100; // Convert to percentage
  }

  /**
   * Get memory usage for the process
   */
  private async getMemoryUsage(pid: number): Promise<ProcessStats['memory']> {
    const usage = process.memoryUsage();
    return {
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed
    };
  }
} 