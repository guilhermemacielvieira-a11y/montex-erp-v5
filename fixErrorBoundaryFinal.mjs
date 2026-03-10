#!/usr/bin/env node
/**
 * Final ErrorBoundary Fix Script
 *
 * This script cleans up malformed ErrorBoundary insertions and properly wraps
 * the main component return statements with ErrorBoundary tags.
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

function cleanErrorBoundaryCode(content) {
  // Remove ErrorBoundary import
  content = content.replace(/import\s+ErrorBoundary\s+from\s+['"]\.\.\/components\/ErrorBoundary['"];\n/g, '');

  // Remove all ErrorBoundary tags (opening and closing)
  content = content.replace(/<ErrorBoundary\s+pageName="[^"]*">\s*/g, '');
  content = content.replace(/\s*<\/ErrorBoundary>/g, '');

  // Fix broken closing braces from malformed insertions
  // Pattern: "  }\n\n  return (" where the first } is extra
  content = content.replace(/^\s*\}\s*\n(\s*return\s*\()/gm, '$1');

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

  // Find the last import statement
  const lines = content.split('\n');
  let lastImportIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) {
      lastImportIdx = i;
    }
  }

  if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, "import ErrorBoundary from '../components/ErrorBoundary';");
    return lines.join('\n');
  }

  return content;
}

function findMainReturnInFunction(lines, functionStartIdx) {
  // Find the opening brace of the function
  let openBraceIdx = -1;
  for (let i = functionStartIdx; i < lines.length; i++) {
    if (lines[i].includes('{')) {
      openBraceIdx = i;
      break;
    }
  }

  if (openBraceIdx === -1) return -1;

  // Find the closing brace of the function
  let closeBraceIdx = -1;
  let braceDepth = 0;

  for (let i = openBraceIdx; i < lines.length; i++) {
    const line = lines[i];
    for (const char of line) {
      if (char === '{') braceDepth++;
      if (char === '}') braceDepth--;
    }
    if (braceDepth === 0 && i > openBraceIdx) {
      closeBraceIdx = i;
      break;
    }
  }

  if (closeBraceIdx === -1) return -1;

  // Find the last "return (" before the closing brace
  for (let i = closeBraceIdx - 1; i > openBraceIdx; i--) {
    if (lines[i].includes('return (')) {
      return i;
    }
  }

  return -1;
}

function findReturnClosingParenIdx(lines, returnIdx) {
  let parenDepth = 0;
  let foundOpen = false;

  for (let i = returnIdx; i < lines.length; i++) {
    const line = lines[i];

    if (!foundOpen) {
      const returnPos = line.indexOf('return');
      if (returnPos >= 0) {
        // Count parens after 'return'
        for (let j = returnPos + 6; j < line.length; j++) {
          if (line[j] === '(') {
            foundOpen = true;
            parenDepth = 1;
            break;
          }
        }
      }
      continue;
    }

    for (const char of line) {
      if (char === '(') parenDepth++;
      if (char === ')') parenDepth--;
    }

    if (parenDepth === 0) {
      return i;
    }
  }

  return -1;
}

function wrapReturnWithErrorBoundary(content) {
  const componentName = getComponentName(content);
  const lines = content.split('\n');

  // Find export default function
  let exportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('export default function') && lines[i].includes('(')) {
      exportIdx = i;
      break;
    }
  }

  if (exportIdx === -1) {
    console.warn(`Could not find export default function for ${componentName}`);
    return content;
  }

  const returnIdx = findMainReturnInFunction(lines, exportIdx);
  if (returnIdx === -1) {
    console.warn(`Could not find return statement for ${componentName}`);
    return content;
  }

  const returnEndIdx = findReturnClosingParenIdx(lines, returnIdx);
  if (returnEndIdx === -1) {
    console.warn(`Could not find closing paren for return in ${componentName}`);
    return content;
  }

  // Build the new content
  const result = [];

  // Add lines before return
  result.push(...lines.slice(0, returnIdx));

  // Get the return line content
  const returnLine = lines[returnIdx];
  const returnMatch = returnLine.match(/^(\s*)return\s*\((.*)/);

  if (!returnMatch) {
    console.warn(`Could not parse return line for ${componentName}`);
    return content;
  }

  const indent = returnMatch[1];
  const afterParen = returnMatch[2];

  // Add return statement with ErrorBoundary
  result.push(`${indent}return (`);
  result.push(`${indent}  <ErrorBoundary pageName="${componentName}">`);

  // Add content after the opening paren
  if (afterParen.trim()) {
    result.push(`${indent}  ${afterParen}`);
    // Add intermediate lines
    result.push(...lines.slice(returnIdx + 1, returnEndIdx));
  } else {
    // Add intermediate lines
    result.push(...lines.slice(returnIdx + 1, returnEndIdx));
  }

  // Add closing lines
  const endLine = lines[returnEndIdx];
  const beforeParen = endLine.replace(/;?\s*$/, '');
  const hasSemicolon = /;\s*$/.test(endLine);

  result.push(`${indent}  </ErrorBoundary>`);
  result.push(`${beforeParen}${hasSemicolon ? ';' : ''}`);

  // Add remaining lines
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

    // Clean up malformed ErrorBoundary code
    content = cleanErrorBoundaryCode(content);

    // Add correct import
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
  console.log('ErrorBoundary Fix Script - Final Version');
  console.log('========================================\n');

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

  console.log(`\n========================================`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Failed: ${failed}`);
  console.log(`========================================`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
