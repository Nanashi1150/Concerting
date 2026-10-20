import { cpSync, existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = join(root, 'public');
const output = join(root, 'dist');
function check(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) check(file);
    else if (entry.name.endsWith('.js')) {
      execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
      const code = readFileSync(file, 'utf8');
      for (const match of code.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
        if (match[1].startsWith('.') && !existsSync(resolve(dirname(file), match[1]))) {
          throw new Error(`Missing import ${match[1]} in ${file}`);
        }
      }
    }
  }
}
check(source);
if (dirname(output) !== resolve(root)) throw new Error('Invalid output directory');
rmSync(output, { recursive: true, force: true });
cpSync(source, output, { recursive: true });
console.log('Build complete: dist/ (JavaScript syntax and import paths checked)');
