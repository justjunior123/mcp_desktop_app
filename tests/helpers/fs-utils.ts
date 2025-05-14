import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const chmod = promisify(fs.chmod);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);

// Constants for permissions
export const PERMISSIONS = {
  FULL: 0o777,
  READ_WRITE: 0o666,
  READ_ONLY: 0o444,
} as const;

/**
 * Ensures a directory exists with proper permissions
 */
export async function ensureDirectory(dirPath: string, permissions = PERMISSIONS.FULL): Promise<void> {
  try {
    await stat(dirPath);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await mkdir(dirPath, { recursive: true, mode: permissions });
    } else {
      throw error;
    }
  }
  
  await chmod(dirPath, permissions);
}

/**
 * Recursively sets permissions on a directory and its contents
 */
export async function setPermissionsRecursive(
  targetPath: string,
  permissions = PERMISSIONS.FULL
): Promise<void> {
  try {
    const stats = await stat(targetPath);
    
    await chmod(targetPath, permissions);
    
    if (stats.isDirectory()) {
      const entries = await readdir(targetPath);
      await Promise.all(
        entries.map((entry) =>
          setPermissionsRecursive(path.join(targetPath, entry), permissions)
        )
      );
    }
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw new Error(`Failed to set permissions on ${targetPath}: ${error.message}`);
    }
  }
}

/**
 * Safely removes a file or directory with proper permission handling
 */
export async function safeRemove(targetPath: string): Promise<void> {
  try {
    const stats = await stat(targetPath);
    
    // Ensure we have permissions to remove the target
    await chmod(targetPath, PERMISSIONS.FULL);
    
    if (stats.isDirectory()) {
      const entries = await readdir(targetPath);
      await Promise.all(
        entries.map((entry) => safeRemove(path.join(targetPath, entry)))
      );
      await rmdir(targetPath);
    } else {
      await unlink(targetPath);
    }
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw new Error(`Failed to remove ${targetPath}: ${error.message}`);
    }
  }
}

/**
 * Creates a temporary test directory with proper permissions
 */
export async function createTestDirectory(
  baseName: string,
  permissions = PERMISSIONS.FULL
): Promise<string> {
  const testDir = path.join(process.cwd(), `test-${baseName}-${Date.now()}`);
  await ensureDirectory(testDir, permissions);
  return testDir;
} 