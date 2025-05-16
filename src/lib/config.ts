import { AppConfig } from '@/types';

export const config: AppConfig = {
  isDevelopment: process.env.NODE_ENV === 'development',
  port: parseInt(process.env.PORT || '3002', 10),
  apiPort: parseInt(process.env.API_PORT || '3100', 10),
}; 