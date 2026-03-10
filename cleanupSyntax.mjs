#!/usr/bin/env node
/**
 * Cleanup syntax errors from malformed ErrorBoundary insertions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAGES_DIR = path.join(__dirname, 'src/pages');

function getFilesInDir(dir) {
  return fs.readdirSync(dir)
    .filter(file => file.endsWith('.jsx'))
    .map(file => path.join(dir, file));
}

function cleanupFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  let changed = false;

  // Fix: "  );}  " pattern (malformed closing)
  if (/\s*\)\s*;\s*}\s*\n\s+{/.test(content)) {
    console.log(`Fixing: ${fileName} - malformed closing parenthesis`);
    content = content.replace(/(\s*\)\s*;\s*}\s*\n)\s+{/gm, '$1');
    changed = true;
  }

  // Fix extra closing brace after return statement
  if (/if\s*\([^)]*\)\s*\{[^}]*return[^;]*;\s*}\s*\n\s*}\s*\n\s*return\s*\(/gm.test(content)) {
    console.log(`Fixing: ${fileName} - misplaced closing brace after early return`);
    content = content.replace(/if\s*\(([^)]*)\)\s*\{\s*return\s*\(([^)]*)\)\s*;\s*\}\s*\n\s*}\s*\n\s*return\s*\(/gm,
      'if ($1) {\n    return ($2);\n  }\n\n  return (');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }
  return false;
}

async function main() {
  console.log('Cleanup Syntax Script');
  console.log('====================\n');

  const files = getFilesInDir(PAGES_DIR);

  let fixed = 0;
  for (const file of files) {
    if (cleanupFile(file)) {
      fixed++;
    }
  }

  console.log(`\n====================`);
  console.log(`Fixed: ${fixed} files`);
  console.log(`====================`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
