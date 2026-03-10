#!/usr/bin/env node
/**
 * Fix ErrorBoundary insertion script
 *
 * This script:
 * 1. Removes all ErrorBoundary imports and tags from page files
 * 2. Re-adds them correctly at the main exported component level
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

function removeErrorBoundaryTags(content) {
  // Remove ErrorBoundary opening tags
  content = content.replace(/<ErrorBoundary\s+pageName="[^"]*">/g, '');
  // Remove ErrorBoundary closing tags
  content = content.replace(/<\/ErrorBoundary>/g, '');
  return content;
}

function removeErrorBoundaryImport(content) {
  // Remove the ErrorBoundary import line
  content = content.replace(/import\s+ErrorBoundary\s+from\s+['"]\.\.\/components\/ErrorBoundary['"];\n/g, '');
  return content;
}

function addErrorBoundaryImport(content) {
  // Find the first import statement
  const importMatch = content.match(/^import\s+/m);
  if (!importMatch) return content;

  // Find where to insert (after existing imports)
  const lines = content.split('\n');
  let insertIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) {
      insertIndex = i + 1;
    } else if (lines[i].trim() === '' && insertIndex > 0) {
      break;
    }
  }

  // Check if already imported
  if (content.includes("import ErrorBoundary from '../components/ErrorBoundary'")) {
    return content;
  }

  // Insert after the first import block
  lines.splice(insertIndex, 0, "import ErrorBoundary from '../components/ErrorBoundary';");
  return lines.join('\n');
}

function getComponentName(content) {
  // Find export default function ComponentName() or export default function() etc
  const match = content.match(/export\s+default\s+function\s+(\w+)/);
  if (match) return match[1];
  return 'Page';
}

function wrapMainComponentReturn(content) {
  // Find the main export default function
  const exportMatch = content.match(/export\s+default\s+function\s+\w+\s*\(\s*\)\s*\{/);
  if (!exportMatch) {
    console.warn('Could not find export default function');
    return content;
  }

  const componentName = getComponentName(content);

  // Find the function start position
  const functionStart = content.indexOf(exportMatch[0]);
  const functionBody = content.substring(functionStart);

  // Find the FIRST return statement (which is the main return)
  // We need to be careful to find the FIRST return, not returns in inner functions
  const lines = functionBody.split('\n');
  let returnIndex = -1;
  let braceDepth = 0;
  let foundFunctionStart = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Count braces to track depth
    for (const char of line) {
      if (char === '{') braceDepth++;
      if (char === '}') braceDepth--;
    }

    if (line.includes('{') && !foundFunctionStart) {
      foundFunctionStart = true;
      continue;
    }

    // The main return should be at brace depth 1 (inside the main function)
    if (foundFunctionStart && braceDepth === 1 && line.includes('return')) {
      returnIndex = i;
      break;
    }
  }

  if (returnIndex === -1) {
    console.warn(`Could not find return statement in ${componentName}`);
    return content;
  }

  // Now we need to wrap the return content
  // Extract from return statement to the final closing parenthesis and semicolon
  let returnLine = lines[returnIndex];

  // Check if return is on same line as opening paren
  const returnMatch = returnLine.match(/return\s*\(\s*(.*)/);
  if (!returnMatch) {
    console.warn(`Could not parse return statement for ${componentName}`);
    return content;
  }

  // Reconstruct with ErrorBoundary wrapping
  // Find the last line with );
  let endIndex = returnIndex;
  let parenDepth = 1; // We're already inside the first (

  if (returnMatch[1].trim()) {
    // If there's content on the same line
    parenDepth += (returnMatch[1].match(/\(/g) || []).length;
    parenDepth -= (returnMatch[1].match(/\)/g) || []).length;
  }

  for (let i = returnIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    parenDepth += (line.match(/\(/g) || []).length;
    parenDepth -= (line.match(/\)/g) || []).length;

    if (parenDepth === 0) {
      endIndex = i;
      break;
    }
  }

  // Build the wrapped return
  const returnStartLine = returnIndex;
  const returnEndLine = endIndex;

  // Get the content after "return ("
  const contentStart = lines[returnStartLine].indexOf('return');
  const beforeReturn = lines[returnStartLine].substring(0, contentStart);

  // Replace the return block
  let newLines = lines.slice(0, returnStartLine);

  newLines.push(`${beforeReturn}return (`);
  newLines.push(`<ErrorBoundary pageName="${componentName}">`);

  // Add the return content (without the "return (" part)
  const returnContent = lines[returnStartLine].substring(contentStart + 6).trim();
  if (returnContent !== '(') {
    // The opening paren was on the same line
    newLines.push(returnContent);
    newLines.push(...lines.slice(returnStartLine + 1, returnEndLine));
  } else {
    newLines.push(...lines.slice(returnStartLine + 1, returnEndLine));
  }

  // Handle the closing line
  const lastLine = lines[returnEndLine];
  const closingMatch = lastLine.match(/(.*?)(;?\s*)$/);
  if (closingMatch) {
    const beforeClosing = closingMatch[1];
    const closing = closingMatch[2];

    if (beforeClosing.trim() === ')') {
      newLines.push(`</ErrorBoundary>`);
      newLines.push(`)${closing}`);
    } else {
      newLines.push(beforeClosing);
      newLines.push(`</ErrorBoundary>`);
      newLines.push(`)${closing}`);
    }
  }

  newLines.push(...lines.slice(returnEndLine + 1));

  return newLines.join('\n');
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

    // Remove all ErrorBoundary imports and tags
    content = removeErrorBoundaryTags(content);
    content = removeErrorBoundaryImport(content);

    // Add back the correct import
    content = addErrorBoundaryImport(content);

    // Wrap the main component return with ErrorBoundary
    content = wrapMainComponentReturn(content);

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
  console.log('ErrorBoundary Fix Script');
  console.log('=======================\n');

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

  console.log(`\n=======================`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Failed: ${failed}`);
  console.log(`=======================`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
