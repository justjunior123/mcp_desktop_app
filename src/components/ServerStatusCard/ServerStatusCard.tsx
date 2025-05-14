import React from 'react';
import { ServerConfig, ServerStatus } from '../../types/server';
import styles from './ServerStatusCard.module.css';

export interface ServerStatusCardProps {
  server: ServerConfig;
  status: ServerStatus;
  onStart: (id: string) => Promise<void>;
  onStop: (id: string) => Promise<void>;
}

export const ServerStatusCard: React.FC<ServerStatusCardProps> = ({
  server,
  status,
  onStart,
  onStop,
}) => {
  const handleAction = async (action: 'start' | 'stop') => {
    try {
      if (action === 'start') {
        await onStart(server.id);
      } else {
        await onStop(server.id);
      }
    } catch (error) {
      console.error(`Failed to ${action} server:`, error);
      // TODO: Add proper error handling/notification
    }
  };

  const formatUptime = (uptime?: number): string => {
    if (!uptime) return '0s';
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const formatMemory = (memory?: { used: number; total: number }): string => {
    if (!memory) return '0 MB / 0 MB';
    const usedMB = Math.round(memory.used / (1024 * 1024));
    const totalMB = Math.round(memory.total / (1024 * 1024));
    return `${usedMB} MB / ${totalMB} MB`;
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>{server.name}</h3>
        <span className={`${styles.status} ${styles[status.status]}`}>
          {status.status}
        </span>
      </div>
      
      <div className={styles.info}>
        <div className={styles.infoRow}>
          <span>Type:</span>
          <span>{server.type.toUpperCase()}</span>
        </div>
        <div className={styles.infoRow}>
          <span>Port:</span>
          <span>{server.port}</span>
        </div>
        <div className={styles.infoRow}>
          <span>Uptime:</span>
          <span>{formatUptime(status.uptime)}</span>
        </div>
        <div className={styles.infoRow}>
          <span>Memory:</span>
          <span>{formatMemory(status.memory)}</span>
        </div>
        {status.activeConnections !== undefined && (
          <div className={styles.infoRow}>
            <span>Active Connections:</span>
            <span>{status.activeConnections}</span>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        {status.status === 'stopped' && (
          <button
            className={`${styles.button} ${styles.startButton}`}
            onClick={() => handleAction('start')}
          >
            Start Server
          </button>
        )}
        {status.status === 'running' && (
          <button
            className={`${styles.button} ${styles.stopButton}`}
            onClick={() => handleAction('stop')}
          >
            Stop Server
          </button>
        )}
      </div>

      {status.lastError && (
        <div className={styles.error}>
          Error: {status.lastError}
        </div>
      )}
    </div>
  );
}; 