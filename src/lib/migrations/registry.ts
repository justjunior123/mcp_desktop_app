import { Migration, MigrationRegistry, ConfigMigrationError } from './types';

export class ConfigMigrationRegistry implements MigrationRegistry {
  migrations: Migration[] = [];
  currentVersion: number;

  constructor(currentVersion: number) {
    this.currentVersion = currentVersion;
  }

  registerMigration(migration: Migration): void {
    // Ensure migrations are ordered by version
    const index = this.migrations.findIndex(m => m.version > migration.version);
    if (index === -1) {
      this.migrations.push(migration);
    } else {
      this.migrations.splice(index, 0, migration);
    }
  }

  getMigrationPath(fromVersion: number, toVersion: number): Migration[] {
    if (fromVersion > toVersion) {
      throw new ConfigMigrationError(
        'Cannot downgrade configuration version',
        fromVersion,
        toVersion
      );
    }

    if (fromVersion === toVersion) {
      return [];
    }

    const migrations = this.migrations
      .filter(m => m.version > fromVersion && m.version <= toVersion)
      .sort((a, b) => a.version - b.version);

    if (migrations.length === 0) {
      throw new ConfigMigrationError(
        'No migration path found',
        fromVersion,
        toVersion
      );
    }

    // Verify we have a continuous path
    let expectedVersion = fromVersion;
    for (const migration of migrations) {
      if (migration.version !== expectedVersion + 1) {
        throw new ConfigMigrationError(
          `Missing migration for version ${expectedVersion + 1}`,
          fromVersion,
          toVersion
        );
      }
      expectedVersion = migration.version;
    }

    return migrations;
  }
} 