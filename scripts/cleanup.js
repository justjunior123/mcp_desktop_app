const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const rimraf = promisify(require('rimraf'));

const ports = [3002, 3100, 5555]; // Next.js, API, and Prisma Studio ports
const platform = os.platform();

function killProcessOnPort(port) {
  return new Promise((resolve, reject) => {
    if (platform === 'win32') {
      // Windows
      exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
        if (stdout) {
          const lines = stdout.split('\n');
          lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid) {
              exec(`taskkill /F /PID ${pid}`, () => {
                console.log(`Killed process on port ${port}`);
              });
            }
          });
        }
        resolve();
      });
    } else {
      // Unix-like systems (macOS, Linux)
      exec(`lsof -ti:${port} | xargs kill -9`, () => {
        console.log(`Killed process on port ${port}`);
        resolve();
      });
    }
  });
}

function killProcessByName(processName) {
  return new Promise((resolve) => {
    if (platform === 'win32') {
      exec(`taskkill /F /IM ${processName}`, () => resolve());
    } else {
      exec(`pkill -f ${processName}`, () => resolve());
    }
  });
}

async function cleanupFiles() {
  const filesToClean = [
    '.next',
    'out',
    'dist',
    'tsconfig.tsbuildinfo',
    path.join('electron', 'dist', 'electron', 'tsconfig.tsbuildinfo')
  ];

  console.log('🧹 Cleaning up build artifacts...');
  
  await Promise.all(
    filesToClean.map(async (file) => {
      const fullPath = path.join(process.cwd(), file);
      try {
        await rimraf(fullPath);
        console.log(`✨ Cleaned up ${file}`);
      } catch (err) {
        console.warn(`⚠️ Failed to clean ${file}:`, err.message);
      }
    })
  );
}

async function cleanup() {
  console.log('🧹 Starting cleanup process...');
  
  // Clean up build artifacts and TypeScript build info
  await cleanupFiles();
  
  // Kill processes on specific ports
  await Promise.all(ports.map(port => killProcessOnPort(port)));
  
  // Kill specific processes
  await Promise.all([
    killProcessByName('electron'),
    killProcessByName('prisma'),
    killProcessByName('node')
  ]);
  
  console.log('✨ Cleanup complete!');
}

cleanup().catch(console.error); 