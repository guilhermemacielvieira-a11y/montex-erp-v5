#!/usr/bin/env node
/**
 * Comprehensive syntax fix for all remaining issues from ErrorBoundary insertion
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

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    let changes = 0;

    // Fix pattern: if (...) { statement } <missing close for next if
    // This is complex, so use a more aggressive approach

    // Fix: "    )\n\n  " (missing ; and })
    content = content.replace(/(\s+)\)\s*\n(\s+)\n\s*switch/gm, (match, space, space2) => {
      changes++;
      return `${space});\n    }\n\n    switch`;
    });

    // Fix: missing } after statement followed by case/default
    content = content.replace(/(\s+)\w+\([^)]*\)\s*\n(\s+)case\s+/gm, (match, space, space2) => {
      changes++;
      return `${space};\n    }\n    case `;
    });

    // Fix malformed if statements: "if (...) {\n   statement\n  if ("
    content = content.replace(/(\s+)if\s*\([^)]*\)\s*\{([^}]+)\n\s+if\s*\(/gm, (match, space, content) => {
      changes++;
      return `${space}if ${match.split('if')[1]}\n    }\n    if (`;
    });

    // Fix: Missing closing brace before case statement
    content = content.replace(/lista\.filter\([^)]*\)\s*\n(\s+)if\s*\(/gm, (match, space) => {
      changes++;
      return `${match.split('\n')[0]};\n    }\n    if (`;
    });

    if (changes > 0) {
      console.log(`Fixing: ${fileName} - ${changes} pattern(s)`);
      fs.writeFileSync(filePath, content, 'utf-8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('Comprehensive Syntax Fix');
  console.log('======================\n');

  const files = getFilesInDir(PAGES_DIR);

  let fixed = 0;
  for (const file of files) {
    if (fixFile(file)) {
      fixed++;
    }
  }

  console.log(`\n======================`);
  console.log(`Fixed: ${fixed} files`);
  console.log(`======================`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
