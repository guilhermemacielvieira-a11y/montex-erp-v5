#!/usr/bin/env node
/**
 * Fix missing closing braces before export default
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

    // Pattern: "  )\n\n  export default function" should be "  );\n}\n\nexport default function"
    let fixed = 0;

    // Fix pattern: ) without ; before export
    content = content.replace(/\n\s*\)\s*\n\s*export\s+default\s+function/gm, (match) => {
      fixed++;
      return ')\n}\n\nexport default function';
    });

    // Also handle pattern: ) without any closing } before another function
    content = content.replace(/\n\s*\)\s*\n\s*\/\/ ====/gm, (match) => {
      fixed++;
      return ')\n}\n' + match.substring(match.lastIndexOf('\n'));
    });

    if (fixed > 0) {
      console.log(`Fixing: ${fileName} - ${fixed} missing closure(s)`);
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
  console.log('Fix Missing Closures');
  console.log('===================\n');

  const files = getFilesInDir(PAGES_DIR);

  let fixed = 0;
  for (const file of files) {
    if (fixFile(file)) {
      fixed++;
    }
  }

  console.log(`\n===================`);
  console.log(`Fixed: ${fixed} files`);
  console.log(`===================`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
