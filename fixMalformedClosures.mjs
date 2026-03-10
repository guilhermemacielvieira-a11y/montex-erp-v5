#!/usr/bin/env node
/**
 * Fix malformed );} closures left from bad ErrorBoundary insertions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

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

    // Look for pattern: );}  which should be );} or just )}
    const malformedPattern = /\s*\)\s*;\s*\}\s*\n/g;

    let matches = 0;
    content = content.replace(/(\s*)\)\s*;\s*\}\s*\n/gm, (match) => {
      // Check context - if we're inside a JSX ternary or conditional, replace with just )}
      matches++;
      return match.replace(/\)\s*;\s*\}/, ')');
    });

    if (matches > 0) {
      console.log(`Fixing: ${fileName} - ${matches} malformed closure(s)`);
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
  console.log('Fix Malformed Closures');
  console.log('=====================\n');

  const files = getFilesInDir(PAGES_DIR);

  let fixed = 0;
  for (const file of files) {
    if (fixFile(file)) {
      fixed++;
    }
  }

  console.log(`\n=====================`);
  console.log(`Fixed: ${fixed} files`);
  console.log(`=====================`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
