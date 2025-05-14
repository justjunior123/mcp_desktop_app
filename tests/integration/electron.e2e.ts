import { test, expect, _electron as electron } from '@playwright/test';
import { fileURLToPath } from 'url';
import * as path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('Application launch', () => {
  test('launches the app', async () => {
    // Launch Electron app
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../electron/dist/main.js')],
      env: {
        NODE_ENV: 'test'
      }
    });

    // Get the first window
    const window = await electronApp.firstWindow();
    expect(window).toBeTruthy();

    // Get window bounds and visibility
    const windowState = await electronApp.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return {
        bounds: win.getBounds(),
        isVisible: win.isVisible()
      };
    });

    // Verify window state
    expect(windowState.isVisible).toBe(true);
    expect(windowState.bounds.width).toBe(1200);
    expect(windowState.bounds.height).toBe(800);

    // Close the app
    await electronApp.close();
  });
}); 