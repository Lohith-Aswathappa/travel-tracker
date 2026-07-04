import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 4321);

function runBuild() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(ROOT, 'scripts/build.mjs')], {
      cwd: ROOT,
      stdio: 'inherit'
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Build failed with exit code ${code}`));
    });
  });
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon'
  }[ext] || 'application/octet-stream';
}

async function resolveFile(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0]).replace(/^\/+/g, '');
  let filePath = path.join(DIST, cleanPath);
  const normalized = path.normalize(filePath);
  if (!normalized.startsWith(DIST)) return path.join(DIST, '404.html');

  try {
    const stat = await fs.stat(normalized);
    if (stat.isDirectory()) return path.join(normalized, 'index.html');
    return normalized;
  } catch {
    if (!path.extname(normalized)) return path.join(normalized, 'index.html');
    return path.join(DIST, '404.html');
  }
}

await runBuild();

const server = http.createServer(async (req, res) => {
  try {
    const filePath = await resolveFile(req.url || '/');
    const data = await fs.readFile(filePath);
    const is404 = path.basename(filePath) === '404.html';
    res.writeHead(is404 ? 404 : 200, { 'content-type': contentType(filePath) });
    res.end(data);
  } catch (error) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(error.message);
  }
});

server.listen(PORT, () => {
  console.log(`Local preview: http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop. Re-run npm run dev after edits.');
});
