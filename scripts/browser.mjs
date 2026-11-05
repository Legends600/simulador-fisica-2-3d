import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
export async function launchBrowser() {
  const executablePath =
    process.env.BROWSER_PATH ||
    [
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    ].find(existsSync);
  return chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: [
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
    ],
  });
}
