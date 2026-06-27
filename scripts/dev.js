// Runs the API and web dev servers together with prefixed, coloured output.
// Zero dependencies (Node built-ins only) so `npm run dev` needs no root install.
const { spawn } = require('child_process');

const RESET = '\x1b[0m';
const procs = [
  { name: 'api', script: 'dev:api', color: '\x1b[34m' }, // blue
  { name: 'web', script: 'dev:web', color: '\x1b[32m' }, // green
];

const children = procs.map((p) => {
  const child = spawn('npm', ['run', p.script], { shell: true });
  const prefix = `${p.color}[${p.name}]${RESET} `;
  const pipe = (stream, out) => {
    let buf = '';
    stream.on('data', (chunk) => {
      buf += chunk.toString();
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) out.write(prefix + line + '\n');
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => out(prefix + `exited with code ${code}`));
  return child;
});

function out(line) {
  process.stdout.write(line + '\n');
}

function shutdown() {
  for (const c of children) c.kill('SIGINT');
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
