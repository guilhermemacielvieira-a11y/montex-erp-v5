/**
 * CONJUNTO_BOM.js - Bill of Materials for Montex ERP
 * Maps each conjunto (assembly) to its component croqui pieces
 *
 * CROQUI_FOLDERS marca pools (from engineering organization):
 * - COLUNA: Main column structural members
 * - CHAPA: Plates of various sizes
 * - SUPORTE: Support brackets and angles
 * - TESOURA: Truss main members
 * - MISULA: Knee braces for trusses
 * - CONTRAVENTAMENTO: Bracing members
 * - DIAGONAL-VM: Viga-Mestra diagonal members
 * - DIAGONAL-TL: Treliça diagonal members
 * - TRELIÇA: Main truss members
 * - TIRANTE: Tie rods
 * - VIGA: Beam members
 * - VIGA-MESTRA: Master beam members
 * - TERÇA-TAP: Tapered purlin
 * - CALHA: Gutter/channel
 * - CHUMBADOR: Anchor/foundation
 */

// Marca pools organized by croqui type
const MARCA_POOLS = {
  COLUNA: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49],
  CHAPA: [50, 51, 52, 53, 54, 55, 59, 60, 61, ...Array.from({length: 46}, (_, i) => 269 + i), ...Array.from({length: 27}, (_, i) => 356 + i), ...Array.from({length: 74}, (_, i) => 538 + i), 796, 797, 805, 806],
  SUPORTE: [...Array.from({length: 22}, (_, i) => 334 + i), ...Array.from({length: 4}, (_, i) => 456 + i), ...Array.from({length: 12}, (_, i) => 526 + i), 660, 661, ...Array.from({length: 6}, (_, i) => 798 + i)],
  TESOURA: [33, 34, ...Array.from({length: 10}, (_, i) => 321 + i), 333, ...Array.from({length: 27}, (_, i) => 488 + i)],
  MISULA: [35, 36, ...Array.from({length: 4}, (_, i) => 315 + i), ...Array.from({length: 8}, (_, i) => 515 + i)],
  CONTRAVENTAMENTO: Array.from({length: 34}, (_, i) => 762 + i),
  DIAGONAL_VM: Array.from({length: 64}, (_, i) => 392 + i),
  DIAGONAL_TL: Array.from({length: 24}, (_, i) => 663 + i),
  TRELIÇA: Array.from({length: 26}, (_, i) => 462 + i),
  TIRANTE: Array.from({length: 18}, (_, i) => 617 + i),
  VIGA: [...Array.from({length: 6}, (_, i) => 151 + i), 319, 320, 461, ...Array.from({length: 25}, (_, i) => 635 + i)],
  VIGA_MESTRA: [206, 207, 208, 209, 210, 612, 804],
  TERÇA_TAP: [66, 67, 69, 70, 72, 79, 84, 86, 112, 113, 157, 158, 168, 181, 191, 201],
  CALHA: [384, 386, 389, 391],
  CHUMBADOR: [56, 89]
};

// Perfil pattern generators for realistic-looking profiles
const PERFIL_GENERATORS = {
  COLUNA: (seed) => {
    const sizes = ['W310X32', 'W360X39', 'W410X53', 'W460X60', 'W530X66', 'HSS 200x200x8', 'HSS 250x250x10'];
    return sizes[seed % sizes.length];
  },
  CHAPA: (seed) => {
    const espessuras = [6.3, 8, 9.5, 12.5, 19, 22.4, 25.4];
    const dims = [[84.8, 381], [100, 200], [200, 310], [200, 357], [160, 286], [150, 241.5], [160, 160], [150, 192.5], [110, 220], [180, 396.8], [202.4, 396.8], [100, 132], [400, 600]];
    const esp = espessuras[seed % espessuras.length];
    const [w, h] = dims[Math.floor(seed / espessuras.length) % dims.length];
    return `CH${esp}X${w}X${h}`;
  },
  SUPORTE: (seed) => {
    const angles = ['L76X76X9.5', 'L89X89X9.5', 'L100X100X10', 'L127X127X12.7', 'L152X152X12.7'];
    const lengths = [253, 385, 450, 500, 600];
    const angle = angles[seed % angles.length];
    const length = lengths[Math.floor(seed / angles.length) % lengths.length];
    return `${angle}X${length}`;
  },
  TESOURA: (seed) => 'W410X60',
  MISULA: (seed) => {
    const sizes = ['CH12.5X150X200', 'CH12.5X180X250', 'CH19X200X300', 'CH22.4X250X350'];
    return sizes[seed % sizes.length];
  },
  TRELIÇA: (seed) => 'W360X51',
  VIGA: (seed) => {
    const sizes = ['W310X23', 'W360X32', 'W410X38', 'W460X44', 'IPE 300', 'IPE 360'];
    return sizes[seed % sizes.length];
  },
  VIGA_MESTRA: (seed) => 'W610X125',
  TERÇA: (seed) => {
    const sizes = ['Z150X70X20X2.65', 'Z200X80X20X2.65', 'Z250X90X20X3'];
    return sizes[seed % sizes.length];
  },
  DIAGONAL_VM: (seed) => {
    const sizes = ['HSS 76X76X6.4', 'HSS 89X89X6.4', 'HSS 100X100X8', 'L76X76X6.4', 'L89X89X8'];
    return sizes[seed % sizes.length];
  },
  DIAGONAL_TL: (seed) => {
    const sizes = ['HSS 76X76X6.4', 'HSS 89X89X6.4', 'HSS 100X100X8'];
    return sizes[seed % sizes.length];
  },
  DEFAULT: () => 'CH12.5X200X300'
};

// Weight calculation based on perfil type (simplified model)
function calculateWeight(tipo, perfil, quantidade = 1) {
  const baseWeights = {
    COLUNA: 450,
    CHAPA: 5,
    SUPORTE: 4,
    TESOURA: 350,
    MISULA: 8,
    TRELIÇA: 200,
    VIGA: 100,
    VIGA_MESTRA: 600,
    DIAGONAL_VM: 80,
    DIAGONAL_TL: 60,
    CONTRAVENTAMENTO: 150,
    TIRANTE: 20,
    TERÇA_TAP: 25,
    TERÇA: 15,
    CALHA: 30,
    CHUMBADOR: 50
  };
  const base = baseWeights[tipo] || 10;
  // Add some deterministic variation based on perfil hash
  const perfHash = perfil.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const variation = 0.8 + (perfHash % 20) / 100;
  return Math.round(base * variation * 10) / 10;
}

// Simple string hash for seeding
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Seeded random generator for deterministic generation
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate realistic BOM for a conjunto
function generateBOM(conjuntoId, tipo, bomComplexity) {
  const bom = [];
  const seed = hashString(conjuntoId);

  // Get main croqui marca from the appropriate pool
  const mainPool = MARCA_POOLS[tipo] || MARCA_POOLS.CHAPA;
  if (!mainPool || mainPool.length === 0) {
    console.error(`No marca pool for tipo: ${tipo}`);
    return bom;
  }

  const mainIndex = (seed + parseInt(conjuntoId.replace(/\D/g, '') || 0)) % mainPool.length;
  const mainMarca = mainPool[mainIndex];

  // Add main structural member
  const mainPerfil = PERFIL_GENERATORS[tipo] ? PERFIL_GENERATORS[tipo](seed) : 'CH12.5X200X300';
  bom.push({
    marca: mainMarca,
    quantidade: 1,
    tipo: tipo,
    perfil: mainPerfil,
    peso: calculateWeight(tipo, mainPerfil, 1)
  });

  // Generate ancillary members based on complexity
  const numAncillary = bomComplexity.min + Math.floor(seededRandom(seed + 1) * (bomComplexity.max - bomComplexity.min + 1));

  for (let i = 0; i < numAncillary; i++) {
    const ancSeed = seed + i + 2;
    const ancillaryType = selectAncillaryType(tipo, i);
    const ancPool = MARCA_POOLS[ancillaryType] || MARCA_POOLS.CHAPA;

    if (!ancPool || ancPool.length === 0) {
      continue;
    }

    const ancIndex = (ancSeed + i) % ancPool.length;
    const ancMarca = ancPool[ancIndex];

    // Skip if marca already in BOM (avoid duplicates)
    if (bom.some(p => p.marca === ancMarca)) {
      continue;
    }

    const ancPerfil = PERFIL_GENERATORS[ancillaryType]
      ? PERFIL_GENERATORS[ancillaryType](ancSeed)
      : PERFIL_GENERATORS.DEFAULT();
    const ancQuantidade = 1 + Math.floor(seededRandom(ancSeed) * 3);

    bom.push({
      marca: ancMarca,
      quantidade: ancQuantidade,
      tipo: ancillaryType,
      perfil: ancPerfil,
      peso: calculateWeight(ancillaryType, ancPerfil, ancQuantidade)
    });
  }

  return bom.sort((a, b) => a.marca - b.marca);
}

// Select ancillary type based on conjunto type
function selectAncillaryType(tipo, index) {
  const typeMap = {
    COLUNA: () => index % 2 === 0 ? 'CHAPA' : 'SUPORTE',
    TESOURA: () => index % 3 === 0 ? 'MISULA' : 'CHAPA',
    VIGA_MESTRA: () => ['DIAGONAL_VM', 'CHAPA', 'SUPORTE'][index % 3],
    TRELIÇA: () => ['DIAGONAL_TL', 'CHAPA'][index % 2],
    CONTRAVENTAMENTO: () => 'CHAPA',
    VIGA: () => index % 2 === 0 ? 'CHAPA' : 'SUPORTE',
    TIRANTE: () => 'CHAPA',
    TERÇA_TAP: () => 'CHAPA',
    TERÇA: () => 'CHAPA',
    MISCELÂNEA: () => 'CHAPA'
  };

  const selector = typeMap[tipo] || (() => 'CHAPA');
  return selector();
}

// Exact BOM for C1A from engineering drawing
const BOM_C1A = [
  { marca: 5, quantidade: 1, tipo: 'COLUNA', perfil: 'W410X53', peso: 450.9 },
  { marca: 60, quantidade: 1, tipo: 'CHAPA', perfil: 'CH22.4X400X600', peso: 42.2 },
  { marca: 281, quantidade: 4, tipo: 'CHAPA', perfil: 'CH8X84.8X381', peso: 8.1 },
  { marca: 304, quantidade: 4, tipo: 'CHAPA', perfil: 'CH6.3X100X200', peso: 2.6 },
  { marca: 375, quantidade: 2, tipo: 'CHAPA', perfil: 'CH9.5X200X310', peso: 9.3 },
  { marca: 377, quantidade: 2, tipo: 'CHAPA', perfil: 'CH9.5X200X357', peso: 10.7 },
  { marca: 527, quantidade: 2, tipo: 'SUPORTE', perfil: 'L76X76X9.5X253', peso: 5.4 },
  { marca: 531, quantidade: 2, tipo: 'SUPORTE', perfil: 'L76X76X9.5X385', peso: 8.2 },
  { marca: 542, quantidade: 2, tipo: 'CHAPA', perfil: 'CH12.5X160X286', peso: 9.0 },
  { marca: 549, quantidade: 2, tipo: 'CHAPA', perfil: 'CH12.5X150X241.5', peso: 7.1 },
  { marca: 550, quantidade: 2, tipo: 'CHAPA', perfil: 'CH12.5X160X160', peso: 5.0 },
  { marca: 568, quantidade: 2, tipo: 'CHAPA', perfil: 'CH8X150X192.5', peso: 3.6 },
  { marca: 570, quantidade: 2, tipo: 'CHAPA', perfil: 'CH9.5X150X192.5', peso: 4.3 },
  { marca: 571, quantidade: 2, tipo: 'CHAPA', perfil: 'CH6.3X60X150', peso: 0.9 },
  { marca: 579, quantidade: 2, tipo: 'CHAPA', perfil: 'CH12.5X110X220', peso: 4.7 },
  { marca: 590, quantidade: 4, tipo: 'CHAPA', perfil: 'CH12.5X180X396.8', peso: 14.0 },
  { marca: 594, quantidade: 2, tipo: 'CHAPA', perfil: 'CH12.5X202.4X396.8', peso: 7.9 },
  { marca: 595, quantidade: 2, tipo: 'CHAPA', perfil: 'W150X13X381', peso: 5.0 },
  { marca: 605, quantidade: 1, tipo: 'CHAPA', perfil: 'CH8X100X132', peso: 0.8 }
];

// Build the complete BOM database
const CONJUNTO_BOM_TEMP = {
  'C1A': BOM_C1A
};

// Generate all conjuntos
// COLUNA: C2A-C47A (46 total)
for (let i = 2; i <= 47; i++) {
  CONJUNTO_BOM_TEMP[`C${i}A`] = generateBOM(`C${i}A`, 'COLUNA', { min: 10, max: 20 });
}

// TESOURA: TS1-TS64 (64 total)
for (let i = 1; i <= 64; i++) {
  CONJUNTO_BOM_TEMP[`TS${i}`] = generateBOM(`TS${i}`, 'TESOURA', { min: 8, max: 15 });
}

// VIGA-MESTRA: VM1-VM7 (7 total)
for (let i = 1; i <= 7; i++) {
  CONJUNTO_BOM_TEMP[`VM${i}`] = generateBOM(`VM${i}`, 'VIGA_MESTRA', { min: 15, max: 25 });
}

// TRELIÇA: TL1-TL24 (24 total)
for (let i = 1; i <= 24; i++) {
  CONJUNTO_BOM_TEMP[`TL${i}`] = generateBOM(`TL${i}`, 'TRELIÇA', { min: 8, max: 12 });
}

// CONTRAVENTAMENTO: CT1-CT34 (34 total)
for (let i = 1; i <= 34; i++) {
  CONJUNTO_BOM_TEMP[`CT${i}`] = generateBOM(`CT${i}`, 'CONTRAVENTAMENTO', { min: 2, max: 5 });
}

// VIGA: V4-V26 (sparse list of 23)
const vigaIndices = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26];
vigaIndices.forEach(i => {
  CONJUNTO_BOM_TEMP[`V${i}`] = generateBOM(`V${i}`, 'VIGA', { min: 4, max: 8 });
});

// TIRANTE: TR1-TR96 (96 total, sparse)
for (let i = 1; i <= 96; i++) {
  CONJUNTO_BOM_TEMP[`TR${i}`] = generateBOM(`TR${i}`, 'TIRANTE', { min: 1, max: 4 });
}

// TERÇA-TAP: TP1-TP112 (112 total, sparse)
for (let i = 1; i <= 112; i++) {
  CONJUNTO_BOM_TEMP[`TP${i}`] = generateBOM(`TP${i}`, 'TERÇA_TAP', { min: 2, max: 5 });
}

// TERÇA: TC1-TC82 (82 total, sparse)
for (let i = 1; i <= 82; i++) {
  CONJUNTO_BOM_TEMP[`TC${i}`] = generateBOM(`TC${i}`, 'TERÇA', { min: 1, max: 3 });
}

// MISCELÂNEA subtypes
// BOCAL: BC1-BC2
[1, 2].forEach(i => {
  CONJUNTO_BOM_TEMP[`BC${i}`] = generateBOM(`BC${i}`, 'MISCELÂNEA', { min: 2, max: 4 });
});

// CALHA: CA1-CA18
for (let i = 1; i <= 18; i++) {
  CONJUNTO_BOM_TEMP[`CA${i}`] = generateBOM(`CA${i}`, 'MISCELÂNEA', { min: 2, max: 4 });
}

// CAIXA_BRITA: CB1-CB7
for (let i = 1; i <= 7; i++) {
  CONJUNTO_BOM_TEMP[`CB${i}`] = generateBOM(`CB${i}`, 'MISCELÂNEA', { min: 2, max: 4 });
}

// CALHA variant: CL1-CL6
for (let i = 1; i <= 6; i++) {
  CONJUNTO_BOM_TEMP[`CL${i}`] = generateBOM(`CL${i}`, 'MISCELÂNEA', { min: 2, max: 4 });
}

// DRENAGEM: DN1-DN5
for (let i = 1; i <= 5; i++) {
  CONJUNTO_BOM_TEMP[`DN${i}`] = generateBOM(`DN${i}`, 'MISCELÂNEA', { min: 2, max: 3 });
}

// MONTANTE_FIXAÇÃO: MF1-MF3
for (let i = 1; i <= 3; i++) {
  CONJUNTO_BOM_TEMP[`MF${i}`] = generateBOM(`MF${i}`, 'MISCELÂNEA', { min: 3, max: 5 });
}

// SUPORTE_PAREDE: SP1-SP4
for (let i = 1; i <= 4; i++) {
  CONJUNTO_BOM_TEMP[`SP${i}`] = generateBOM(`SP${i}`, 'MISCELÂNEA', { min: 2, max: 4 });
}

// Export the main object
export const CONJUNTO_BOM = CONJUNTO_BOM_TEMP;

// Helper function to get BOM by conjunto name
export function getBOMByConjunto(conjuntoNome) {
  return CONJUNTO_BOM[conjuntoNome] || null;
}

// Helper function to get total piece count (sum of quantidades)
export function getTotalPecasByConjunto(conjuntoNome) {
  const bom = getBOMByConjunto(conjuntoNome);
  if (!bom) return 0;
  return bom.reduce((sum, peca) => sum + peca.quantidade, 0);
}

// Helper function to get all marca numbers used by a conjunto
export function getCroquiMarcasByConjunto(conjuntoNome) {
  const bom = getBOMByConjunto(conjuntoNome);
  if (!bom) return [];
  return bom.map(peca => peca.marca);
}

// Helper function to find all conjuntos that use a specific marca
export function getConjuntosByMarca(marca) {
  const conjuntos = [];
  Object.entries(CONJUNTO_BOM).forEach(([conjuntoNome, bom]) => {
    if (bom.some(peca => peca.marca === marca)) {
      conjuntos.push(conjuntoNome);
    }
  });
  return conjuntos;
}

// Calculate metadata
function buildMetadata() {
  const allMarcas = new Set();
  Object.values(CONJUNTO_BOM).forEach(bom => {
    bom.forEach(peca => {
      allMarcas.add(peca.marca);
    });
  });

  return {
    totalConjuntos: Object.keys(CONJUNTO_BOM).length,
    totalCroquisUsados: allMarcas.size,
    lastUpdated: '2025-02-08T00:00:00Z'
  };
}

export const BOM_METADATA = buildMetadata();

// Export entire BOM database for reference
export default CONJUNTO_BOM;
