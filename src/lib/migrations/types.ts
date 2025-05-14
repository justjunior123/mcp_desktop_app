export interface Migration {
  version: number;
  description: string;
  migrate: (config: any) => Promise<any>;
}

export interface MigrationRegistry {
  migrations: Migration[];
  currentVersion: number;
  registerMigration(migration: Migration): void;
  getMigrationPath(fromVersion: number, toVersion: number): Migration[];
}

export class ConfigMigrationError extends Error {
  constructor(message: string, public fromVersion: number, public toVersion: number) {
    super(message);
    this.name = 'ConfigMigrationError';
  }
} 