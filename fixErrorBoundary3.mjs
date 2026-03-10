#!/usr/bin/env node
/**
 * Fix ErrorBoundary insertion script - Version 3
 *
 * Better approach that handles early returns correctly
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
  let functionOpenBraceIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('export default function') && lines[i].includes('(')) {
      exportLineIdx = i;
      // Find the opening brace of the function
      for (let j = i; j < lines.length; j++) {
        if (lines[j].includes('{')) {
          functionOpenBraceIdx = j;
          break;
        }
      }
      break;
    }
  }

  if (exportLineIdx === -1 || functionOpenBraceIdx === -1) {
    console.warn(`Could not find export default function for ${componentName}`);
    return content;
  }

  // Now find the MAIN return statement (not early returns)
  // Strategy: find the last "return (" in the function (before final closing brace)
  // OR find return ( that comes after some other statements

  // Find the closing brace of the function
  let functionCloseBraceIdx = -1;
  let braceDepth = 0;

  for (let i = functionOpenBraceIdx; i < lines.length; i++) {
    const line = lines[i];
    for (const char of line) {
      if (char === '{') braceDepth++;
      if (char === '}') braceDepth--;
    }
    if (braceDepth === 0 && i > functionOpenBraceIdx) {
      functionCloseBraceIdx = i;
      break;
    }
  }

  if (functionCloseBraceIdx === -1) {
    console.warn(`Could not find closing brace for ${componentName}`);
    return content;
  }

  // Find all return statements in the function body and pick the right one
  // The main return is usually the last "return (" statement before the final closing brace
  let mainReturnIdx = -1;

  // Look backwards from the closing brace
  for (let i = functionCloseBraceIdx - 1; i > functionOpenBraceIdx; i--) {
    const line = lines[i];
    // Skip pure closing braces or return that's part of ternary on same line
    if (line.includes('return (')) {
      mainReturnIdx = i;
      break;
    }
  }

  // If not found, try forward search but skip early returns
  if (mainReturnIdx === -1) {
    for (let i = functionOpenBraceIdx + 1; i < functionCloseBraceIdx; i++) {
      const line = lines[i];
      // Skip if it's an early return (single line with return)
      if (line.includes('return') && !line.includes('return (')) {
        continue; // Skip early returns like "return null;" or "return <Component />"
      }
      if (line.includes('return (')) {
        // Check if it's an early return by looking at preceding lines
        let isEarlyReturn = false;
        for (let j = i - 1; j > functionOpenBraceIdx; j--) {
          const prevLine = lines[j];
          if (prevLine.includes('if (') || prevLine.includes('}')) {
            isEarlyReturn = true;
            break;
          }
          if (prevLine.trim() === '' || prevLine.includes('const ') || prevLine.includes('let ')) {
            continue;
          }
        }
        if (!isEarlyReturn) {
          mainReturnIdx = i;
          break;
        }
      }
    }
  }

  if (mainReturnIdx === -1) {
    console.warn(`Could not find main return statement for ${componentName}`);
    return content;
  }

  // Find the matching closing paren for the return statement
  let parenDepth = 0;
  let foundOpenParen = false;
  let returnEndIdx = -1;

  for (let i = mainReturnIdx; i < functionCloseBraceIdx; i++) {
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
  result.push(...lines.slice(0, mainReturnIdx));

  // Add return with ErrorBoundary
  const returnLine = lines[mainReturnIdx];
  const returnMatch = returnLine.match(/^(\s*)return\s*\((.*)/);

  if (returnMatch) {
    const indent = returnMatch[1];
    const afterParen = returnMatch[2];

    result.push(`${indent}return (`);
    result.push(`${indent}  <ErrorBoundary pageName="${componentName}">`);

    // If there's content on the same line after (
    if (afterParen.trim()) {
      result.push(`${indent}  ${afterParen}`);
      // Add all middle lines
      for (let i = mainReturnIdx + 1; i < returnEndIdx; i++) {
        result.push(lines[i]);
      }
    } else {
      // Add all middle lines
      for (let i = mainReturnIdx + 1; i < returnEndIdx; i++) {
        result.push(lines[i]);
      }
    }

    // Handle the closing line
    const closingLine = lines[returnEndIdx];
    const beforeClosing = closingLine.replace(/;?\s*$/, '');
    const hasSemicolon = /;\s*$/.test(closingLine);

    result.push(`${indent}  </ErrorBoundary>`);
    result.push(`${beforeClosing}${hasSemicolon ? ';' : ''}`);
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
  console.log('ErrorBoundary Fix Script v3');
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
