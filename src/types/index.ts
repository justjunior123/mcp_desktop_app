// Global type definitions
export interface AppConfig {
  isDevelopment: boolean;
  port: number;
  apiPort: number;
}

// Service types
export interface ServiceStatus {
  isRunning: boolean;
  error?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
} 