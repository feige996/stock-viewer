import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const pidFile = path.resolve(rootDir, '.stock.pid');
const logFile = path.resolve(rootDir, '.stock.log');

const action = process.argv[2] || 'status';

function isRunning(pid) {
  const num = Number(pid);
  if (!num || isNaN(num) || num <= 0) return false;
  try {
    process.kill(num, 0);
    return true;
  } catch {
    return false;
  }
}

function getPidFromPort(port) {
  try {
    const out = execSync(`lsof -ti :${port}`, { encoding: 'utf8' }).trim();
    const pid = out.split('\n')[0];
    return pid ? Number(pid) : null;
  } catch {
    return null;
  }
}

if (action === 'start') {
  let activePid = null;
  if (fs.existsSync(pidFile)) {
    const existingPid = fs.readFileSync(pidFile, 'utf8').trim();
    if (isRunning(existingPid)) {
      activePid = existingPid;
    }
  }

  if (!activePid) {
    const portPid = getPidFromPort(30413);
    if (portPid && isRunning(portPid)) {
      activePid = portPid;
      fs.writeFileSync(pidFile, String(portPid) + '\n', 'utf8');
    }
  }

  if (activePid) {
    console.log(`Stock viewer is already running (PID: ${activePid}) at http://localhost:30413`);
    process.exit(0);
  }

  const logFd = fs.openSync(logFile, 'a');
  const viteBin = path.resolve(rootDir, 'node_modules/vite/bin/vite.js');

  const child = spawn(process.execPath, [viteBin, 'preview', '--port', '30413'], {
    cwd: rootDir,
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env: { ...process.env, NODE_ENV: 'production' },
  });

  child.unref();
  fs.writeFileSync(pidFile, String(child.pid) + '\n', 'utf8');
  console.log(`✓ Stock viewer started in background at http://localhost:30413 (PID: ${child.pid})`);
} else if (action === 'stop') {
  let pid = null;
  if (fs.existsSync(pidFile)) {
    const filePid = fs.readFileSync(pidFile, 'utf8').trim();
    if (isRunning(filePid)) {
      pid = filePid;
    }
  }

  if (!pid) {
    pid = getPidFromPort(30413);
  }

  if (pid && isRunning(pid)) {
    try {
      process.kill(Number(pid));
      console.log(`✓ Stopped stock viewer process (PID: ${pid})`);
    } catch (err) {
      console.log(`Failed to stop process ${pid}:`, err.message);
    }
  } else {
    console.log('Stock viewer is not currently running.');
  }

  if (fs.existsSync(pidFile)) {
    try {
      fs.unlinkSync(pidFile);
    } catch {}
  }
} else if (action === 'status') {
  let pid = null;
  if (fs.existsSync(pidFile)) {
    const filePid = fs.readFileSync(pidFile, 'utf8').trim();
    if (isRunning(filePid)) {
      pid = filePid;
    }
  }

  if (!pid) {
    pid = getPidFromPort(30413);
    if (pid && isRunning(pid)) {
      fs.writeFileSync(pidFile, String(pid) + '\n', 'utf8');
    }
  }

  if (pid && isRunning(pid)) {
    console.log(`● Stock viewer is RUNNING (PID: ${pid}) at http://localhost:30413`);
  } else {
    console.log('○ Stock viewer is NOT running');
  }
}
