#!/usr/bin/env node
// One command for local development: `npm run dev` in procurement-system/.
// Starts the API (nodemon) and the web app (Vite) together, with prefixed logs.
// Runs both tools with `node` directly instead of `npm run` / `npx`, which saves
// a few seconds of npm start-up for each. Ctrl+C stops both.
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const apps = [
  { name: 'api', color: 36, cwd: path.join(root, 'backend'), bin: 'node_modules/nodemon/bin/nodemon.js', args: ['server.js'] },
  { name: 'web', color: 35, cwd: path.join(root, 'frontend'), bin: 'node_modules/vite/bin/vite.js', args: [] },
];

const children = [];
let stopping = false;

function stopAll(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const c of children) if (!c.killed) c.kill();
  setTimeout(() => process.exit(code), 300);
}

for (const app of apps) {
  const bin = path.join(app.cwd, app.bin);
  if (!fs.existsSync(bin)) {
    console.error(`[${app.name}] ${app.bin} not found. Run "npm install" in ${path.basename(app.cwd)}/ first.`);
    process.exit(1);
  }
  const tag = `\x1b[${app.color}m[${app.name}]\x1b[0m `;
  const child = spawn(process.execPath, [bin, ...app.args], {
    cwd: app.cwd,
    env: { ...process.env, FORCE_COLOR: '1' },
    stdio: ['inherit', 'pipe', 'pipe'],
  });
  const relay = (stream, out) => {
    let buf = '';
    stream.on('data', (chunk) => {
      buf += chunk;
      const lines = buf.split(/\r?\n/);
      buf = lines.pop();
      for (const line of lines) out.write(tag + line + '\n');
    });
  };
  relay(child.stdout, process.stdout);
  relay(child.stderr, process.stderr);
  child.on('exit', (code) => {
    if (!stopping) {
      console.error(`${tag}exited with code ${code}; stopping the other app.`);
      stopAll(code || 1);
    }
  });
  children.push(child);
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
