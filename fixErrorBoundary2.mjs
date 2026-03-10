#!/usr/bin/env node
/**
 * Fix ErrorBoundary insertion script - Version 2
 *
 * Simpler approach:
 * 1. Remove all ErrorBoundary import and tags
 * 2. Find the main export default function
 * 3. Find its main return statement
 * 4. Wrap the return content with ErrorBoundary tags
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

function removeAllErrorBoundaryCode(content) {
  // Remove ErrorBoundary import
  content = content.replace(/import\s+ErrorBoundary\s+from\s+['"]\.\.\/components\/ErrorBoundary['"];\n/g, '');

  // Remove all ErrorBoundary tags (opening and closing)
  content = content.replace(/<ErrorBoundary\s+pageName="[^"]*">/g, '');
  content = content.replace(/<\/ErrorBoundary>/g, '');

  return content;
}

function getComponentName(content) {
  const match = content.match(/export\s+default\s+function\s+(\w+)\s*\(/);
  if (match) return match[1];
  return 'Page';
}

function addErrorBoundaryImport(content) {
  // Check if already imported
  if (content.includes("import ErrorBoundary from '../components/ErrorBoundary'")) {
    return content;
  }

  // Find the first import
  const lines = content.split('\n');
  let insertIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) {
      insertIndex = i;
      // Continue to find the last import
      while (i + 1 < lines.length && lines[i + 1].startsWith('import ')) {
        i++;
        insertIndex = i;
      }
      break;
    }
  }

  if (insertIndex >= 0) {
    lines.splice(insertIndex + 1, 0, "import ErrorBoundary from '../components/ErrorBoundary';");
  }

  return lines.join('\n');
}

function wrapReturnWithErrorBoundary(content) {
  const componentName = getComponentName(content);

  // Find "export default function ComponentName()"
  const lines = content.split('\n');
  let exportLineIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('export default function') && lines[i].includes('(')) {
      exportLineIdx = i;
      break;
    }
  }

  if (exportLineIdx === -1) {
    console.warn(`Could not find export default function for ${componentName}`);
    return content;
  }

  // Find the opening brace of the function
  let openBraceIdx = exportLineIdx;
  for (let i = exportLineIdx; i < lines.length; i++) {
    if (lines[i].includes('{')) {
      openBraceIdx = i;
      break;
    }
  }

  // Now find the first "return (" after the opening brace
  let returnIdx = -1;
  let braceDepth = 0;
  let inFunctionBody = false;

  for (let i = openBraceIdx; i < lines.length; i++) {
    const line = lines[i];

    // Track brace depth
    for (const char of line) {
      if (char === '{') braceDepth++;
      if (char === '}') braceDepth--;
    }

    // Mark when we're in the function body
    if (i === openBraceIdx) {
      inFunctionBody = true;
    }

    // Look for return at depth 1 (main function body)
    if (inFunctionBody && braceDepth === 1 && line.includes('return')) {
      returnIdx = i;
      break;
    }
  }

  if (returnIdx === -1) {
    console.warn(`Could not find return statement for ${componentName}`);
    return content;
  }

  // Find the matching closing paren for the return statement
  // This is complex because the return could span multiple lines
  let parenDepth = 0;
  let foundOpenParen = false;
  let returnEndIdx = -1;

  for (let i = returnIdx; i < lines.length; i++) {
    const line = lines[i];

    // Find the opening paren of return (
    if (!foundOpenParen) {
      const parenIdx = line.indexOf('return');
      if (parenIdx >= 0) {
        // Look for the ( after return
        for (let j = parenIdx + 6; j < line.length; j++) {
          if (line[j] === '(') {
            foundOpenParen = true;
            parenDepth = 1;
            break;
          } else if (line[j] === ')') {
            // Early return or immediate closure
            foundOpenParen = true;
            parenDepth = 0;
            returnEndIdx = i;
            break;
          }
        }
      }
      continue;
    }

    // Count parens
    for (const char of line) {
      if (char === '(') parenDepth++;
      if (char === ')') parenDepth--;
    }

    if (parenDepth === 0 && foundOpenParen) {
      returnEndIdx = i;
      break;
    }
  }

  if (returnEndIdx === -1) {
    console.warn(`Could not find closing paren for return in ${componentName}`);
    return content;
  }

  // Now modify the lines
  const result = [];

  // Copy lines before return
  result.push(...lines.slice(0, returnIdx));

  // Add return with ErrorBoundary
  const returnLine = lines[returnIdx];
  const returnMatch = returnLine.match(/(\s*)return\s*\((.*)/);

  if (returnMatch) {
    const indent = returnMatch[1];
    const afterParen = returnMatch[2];

    result.push(`${indent}return (`);
    result.push(`${indent}<ErrorBoundary pageName="${componentName}">`);

    // If there's content on the same line after (
    if (afterParen.trim()) {
      result.push(`${indent}${afterParen}`);
      // Add all middle lines
      result.push(...lines.slice(returnIdx + 1, returnEndIdx));
    } else {
      // Add all middle lines
      result.push(...lines.slice(returnIdx + 1, returnEndIdx));
    }

    // Handle the closing line
    const closingLine = lines[returnEndIdx];
    const beforeSemicolon = closingLine.replace(/;?\s*$/, '');
    const hasSemicolon = /;\s*$/.test(closingLine);

    result.push(`${indent}</ErrorBoundary>`);
    result.push(`${beforeSemicolon}${hasSemicolon ? ';' : ''}`);
  } else {
    // Fallback: just add the return line
    result.push(returnLine);
  }

  // Copy remaining lines
  result.push(...lines.slice(returnEndIdx + 1));

  return result.join('\n');
}

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);

    console.log(`Processing: ${fileName}`);

    // Check if file has ErrorBoundary
    if (!content.includes('ErrorBoundary')) {
      console.log(`  ✓ No ErrorBoundary found, skipping`);
      return true;
    }

    // Remove all ErrorBoundary code
    content = removeAllErrorBoundaryCode(content);

    // Add import
    content = addErrorBoundaryImport(content);

    // Wrap return with ErrorBoundary
    content = wrapReturnWithErrorBoundary(content);

    // Write back
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✓ Fixed`);
    return true;
  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('ErrorBoundary Fix Script v2');
  console.log('===========================\n');

  const files = getFilesInDir(PAGES_DIR);
  console.log(`Found ${files.length} JSX files\n`);

  let fixed = 0;
  let failed = 0;

  for (const file of files) {
    if (fixFile(file)) {
      fixed++;
    } else {
      failed++;
    }
  }

  console.log(`\n===========================`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Failed: ${failed}`);
  console.log(`===========================`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
