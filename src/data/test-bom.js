const fs = require('fs');
const code = fs.readFileSync('./conjuntoBOM.js', 'utf-8');

// Check if the generateConjuntos call for COLUNA is in there
const colunaCall = code.match(/generateConjuntos\('C',\s*1,\s*47/);
console.log('Found COLUNA generateConjuntos call:', !!colunaCall);

// Actually try to load the module
try {
  // Wrap in try/catch to catch eval errors
  const mod = require('./conjuntoBOM.js');
  console.log('Module loaded, CONJUNTO_BOM keys:', Object.keys(mod.CONJUNTO_BOM).length);
  
  // Look for C2A through C47A specifically
  const cKeys = [];
  for (let i = 2; i <= 47; i++) {
    const key = `C${i}A`;
    if (mod.CONJUNTO_BOM[key]) {
      cKeys.push(key);
    }
  }
  console.log('Found C2A-C47A keys:', cKeys.length);
  if (cKeys.length > 0) {
    console.log('  First:', cKeys[0], 'Last:', cKeys[cKeys.length - 1]);
  }
} catch (e) {
  console.error('Error loading module:', e.message);
  console.error(e.stack);
}
