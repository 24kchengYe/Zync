const path = require('path');
const { spawn } = require('child_process');
const waitOn = require('wait-on');

const repoRoot = path.resolve(__dirname, '..');
const port = process.env.VITE_PORT || process.env.PORT || '4521';
const resource = `http-get://localhost:${port}`;

let electronChild = null;

function closeChild() {
  if (!electronChild || electronChild.killed) {
    return;
  }

  electronChild.kill();
}

process.on('SIGINT', () => {
  closeChild();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeChild();
  process.exit(0);
});

async function main() {
  console.log(`[electron-dev] Waiting for ${resource}`);

  await waitOn({
    resources: [resource],
    timeout: 120000,
    interval: 250,
    tcpTimeout: 1000,
    validateStatus(status) {
      return status >= 200 && status < 500;
    },
  });

  const electronBinary = require('electron');

  console.log(`[electron-dev] Launching Electron from ${repoRoot}`);

  electronChild = spawn(electronBinary, ['.'], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  });

  electronChild.on('error', (error) => {
    console.error('[electron-dev] Failed to launch Electron:', error);
    process.exit(1);
  });

  electronChild.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(`[electron-dev] Failed while waiting for ${resource}:`, error);
  process.exit(1);
});
