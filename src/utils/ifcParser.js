// ============================================================
// ifcParser.js — parse do IFC (web-ifc) compartilhado entre a página 3D
// (main thread, fallback) e o Web Worker (off-main-thread).
// Extraído de MontexERP3DPage.jsx sem mudança de lógica.
// ============================================================

// web-ifc carrega via IIFE same-origin (evita problemas de build no Vercel).
// Funciona em 3 contextos:
//   - PÁGINA            → injeta <script> (tem document)
//   - WORKER clássico   → importScripts (síncrono)
//   - WORKER de módulo  → fetch + eval indireto (sem importScripts/document)
// O Vite, em dev, só transpila `import` em workers `type:'module'`; mas esses
// não têm importScripts — daí o fallback fetch+eval, que reusa o MESMO asset.
let _WebIFC = null;
export async function getWebIFC() {
  if (_WebIFC) return _WebIFC;
  const g = (typeof self !== "undefined") ? self : (typeof window !== "undefined" ? window : globalThis);
  if (!g.WebIFC) {
    if (typeof document === "undefined") {
      // Contexto WORKER (clássico ou módulo). Em module workers, importScripts
      // existe mas LANÇA; então busca o IIFE e roda via eval indireto.
      // O bundle é `"use strict"; var WebIFC = (…)()` — em eval indireto STRICT
      // o `var` NÃO vaza para o global; por isso anexamos `;WebIFC;` para que o
      // valor de retorno do eval seja o objeto, e o fixamos em self.WebIFC.
      const code = await (await fetch("/web-ifc-api-iife.js")).text();
      const mod = (0, eval)(code + "\n;WebIFC;");
      if (mod) g.WebIFC = mod;
    } else {
      // Contexto PÁGINA → injeta <script>.
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "/web-ifc-api-iife.js"; s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    }
  }
  _WebIFC = g.WebIFC;
  return _WebIFC;
}

const IFC_TYPES = {
  // Estrutura Principal (Etapa 1)
  IFCBEAM: 753842376,
  IFCCOLUMN: 843113511,        // CORRIGIDO (era 3495092785)
  IFCPLATE: 3171933400,
  IFCSLAB: 1529196076,
  IFCWALL: 2391406946,
  IFCMEMBER: 1073191201,       // CORRIGIDO (era 1411681673)
  IFCROOF: 2016517767,
  IFCSTAIRFLIGHT: 4252922144,
  IFCRAILING: 2262370178,
  IFCFOOTING: 900683007,
  // Detalhes e Conexoes (Etapa 2)
  IFCMECHANICALFASTENER: 377706215,
  IFCELEMENTASSEMBLY: 4123344466,
  IFCFASTENER: 647756555,
  IFCDISCRETEACCESSORY: 1335981549,
};

const IFC_TYPE_NAMES = {
  [IFC_TYPES.IFCBEAM]: 'Viga',
  [IFC_TYPES.IFCCOLUMN]: 'Coluna',
  [IFC_TYPES.IFCPLATE]: 'Chapa',
  [IFC_TYPES.IFCSLAB]: 'Laje',
  [IFC_TYPES.IFCWALL]: 'Parede',
  [IFC_TYPES.IFCMEMBER]: 'Elemento',
  [IFC_TYPES.IFCROOF]: 'Cobertura',
  [IFC_TYPES.IFCSTAIRFLIGHT]: 'Escada',
  [IFC_TYPES.IFCRAILING]: 'Guarda-corpo',
  [IFC_TYPES.IFCFOOTING]: 'Fundacao',
  [IFC_TYPES.IFCMECHANICALFASTENER]: 'Parafuso',
  [IFC_TYPES.IFCELEMENTASSEMBLY]: 'Conjunto',
  [IFC_TYPES.IFCFASTENER]: 'Fixador',
  [IFC_TYPES.IFCDISCRETEACCESSORY]: 'Acessorio',
};

const PRIMARY_TYPES = [
  IFC_TYPES.IFCBEAM,
  IFC_TYPES.IFCCOLUMN,
  IFC_TYPES.IFCPLATE,
  IFC_TYPES.IFCSLAB,
  IFC_TYPES.IFCWALL,
  IFC_TYPES.IFCMEMBER,
  IFC_TYPES.IFCROOF,
  IFC_TYPES.IFCSTAIRFLIGHT,
  IFC_TYPES.IFCRAILING,
  IFC_TYPES.IFCFOOTING,
];

const SECONDARY_TYPES = [
  IFC_TYPES.IFCMECHANICALFASTENER,
  IFC_TYPES.IFCELEMENTASSEMBLY,
  IFC_TYPES.IFCFASTENER,
  IFC_TYPES.IFCDISCRETEACCESSORY,
];

const ALL_TYPES = [...PRIMARY_TYPES, ...SECONDARY_TYPES];

const USEFUL_PSET_PROPS = new Set([
  'Assembly mark', 'Part mark',
  'Assembly/Cast unit Mark', 'Assembly/Cast unit name', 'Assembly/Cast unit position code',
  'Profile', 'Class', 'Grade',
  'Top elevation', 'Bottom elevation',
  'Assembly/Cast unit top elevation', 'Assembly/Cast unit bottom elevation',
]);

const IFC_ESCAPE_MAP = {
  'A': 'Á', 'C': 'Ã', 'E': 'É', 'I': 'Í', 'O': 'Ó', 'U': 'Ú',
  'a': 'á', 'c': 'ã', 'e': 'é', 'i': 'í', 'o': 'ó', 'u': 'ú',
  'GA': 'Ç', 'ga': 'ç',
  'CO': 'Ã', 'co': 'ã',
};

function decodeIfcString(s) {
  if (!s || typeof s !== 'string') return s;
  return s.replace(/\\S\\([A-Za-z]{1,2})/g, (m, letra) => {
    // \S\GA -> Ç (mapeia G+A para Ç), \S\C -> Ã (apenas C)
    if (IFC_ESCAPE_MAP[letra]) return IFC_ESCAPE_MAP[letra];
    // fallback: tenta mapear primeira letra como acentuada
    const single = letra[0];
    if (single === 'C' || single === 'c') return single === 'C' ? 'Ã' : 'ã';
    if (single === 'G' || single === 'g') return single === 'G' ? 'Ç' : 'ç';
    return m; // mantém original se nao reconhecer
  });
}

async function extractElementsForTypes(ifcAPI, modelID, types, existingCount, onProgress, pctStart, pctEnd) {
  const elements = [];
  let processed = 0;
  let yieldCtr = 0;
  const totalTypes = types.length;

  for (const ifcType of types) {
    const typeName = IFC_TYPE_NAMES[ifcType] || 'Outro';
    const ids = ifcAPI.GetLineIDsWithType(modelID, ifcType);
    const count = ids.size();

    for (let i = 0; i < count; i++) {
      const expressID = ids.get(i);
      let props = {};
      try {
        props = ifcAPI.GetLine(modelID, expressID);
      } catch (e) { /* some elements may fail */ }

      const rawName = decodeIfcString(props.Name?.value || `Element-${expressID}`);
      const globalId = props.GlobalId?.value || '';
      const description = decodeIfcString(props.Description?.value || '');
      const objectType = decodeIfcString(props.ObjectType?.value || '');
      const tag = decodeIfcString(props.Tag?.value || '');

      // Extrair marca real do Name (novo IFC Tekla 100%): "VIGA-MESTRA [VM50A]" -> "VM50A"
      // Tambem aceita "COLUNA [C1A] A/1" -> "C1A"
      let extractedMark = '';
      const m = rawName.match(/\[([^\]]+)\]/);
      if (m) extractedMark = m[1].trim();

      // Tag tambem pode conter marca real (Tekla 19.0 grava no campo 8 do IFCELEMENTASSEMBLY)
      // Ex: '...,'VM50A',$,.NOTDEFINED.'
      const tagMark = tag.match(/^[A-Z]{1,3}\d{1,4}[A-Z]?$/i) ? tag : '';

      const name = rawName;
      // marca final priorizando Tag, depois Name[brackets]
      const marcaFromIfc = tagMark || extractedMark || '';

      // Get geometry
      let geometry = null;
      try {
        const flatMesh = ifcAPI.GetFlatMesh(modelID, expressID);
        if (flatMesh.geometries.size() > 0) {
          const placedGeom = flatMesh.geometries.get(0);
          const geomData = ifcAPI.GetGeometry(modelID, placedGeom.geometryExpressID);
          const verts = ifcAPI.GetVertexArray(geomData.GetVertexData(), geomData.GetVertexDataSize());
          const indices = ifcAPI.GetIndexArray(geomData.GetIndexData(), geomData.GetIndexDataSize());
          const transform = placedGeom.flatTransformation;

          geometry = { verts, indices, transform };
          geomData.delete();
        }
        flatMesh.delete();
      } catch (e) { /* geometry extraction can fail for some elements */ }

      if (geometry) {
        elements.push({
          expressID,
          ifcType,
          typeName,
          name,
          globalId,
          description,
          objectType,
          tag,
          marcaFromIfc,           // marca extraida do Tag/Name (Tekla 100%)
          geometry,
          isPrimary: PRIMARY_TYPES.includes(ifcType),
        });
      }

      // Cede a thread periodicamente → a UI não congela durante o parse pesado
      // (web-ifc é síncrono; o yield deixa o navegador repintar progresso/spinner).
      if (++yieldCtr >= 600) {
        yieldCtr = 0;
        const pctIn = pctStart + Math.round(((processed + (i + 1) / count) / totalTypes) * (pctEnd - pctStart));
        onProgress?.(pctIn, `${typeName}: ${i + 1}/${count}`);
        await new Promise(r => setTimeout(r, 0));
      }
    }
    processed++;
    const pct = pctStart + Math.round((processed / totalTypes) * (pctEnd - pctStart));
    const total = existingCount + elements.length;
    onProgress?.(pct, `${typeName}: ${count} encontrados (${total} total)`);
  }

  return elements;
}

async function extractPropertySets(ifcAPI, WebIFC, modelID, onProgress, pctStart, pctEnd) {
  const elementProps = new Map();
  const IFCRELDEFINESBYPROPERTIES = WebIFC.IFCRELDEFINESBYPROPERTIES || 4186316022;
  let relIds;
  try {
    relIds = ifcAPI.GetLineIDsWithType(modelID, IFCRELDEFINESBYPROPERTIES);
  } catch (e) {
    console.warn('Não foi possivel ler IFCRELDEFINESBYPROPERTIES:', e?.message);
    return elementProps;
  }
  const total = relIds.size();
  for (let i = 0; i < total; i++) {
    const relId = relIds.get(i);
    let rel;
    try { rel = ifcAPI.GetLine(modelID, relId, true); } catch (e) { continue; }
    if (!rel) continue;
    // rel foi lido com flatten=true => RelatingPropertyDefinition JÁ vem expandido
    // (não é um ref {value}). O bug anterior re-buscava via GetLine(psetId) e falhava,
    // zerando TODOS os PropertySets (position code, Profile, etc.). Usar direto.
    const pset = rel.RelatingPropertyDefinition;
    if (!pset || !Array.isArray(pset.HasProperties) || pset.HasProperties.length === 0) continue;
    const props = {};
    for (const propRaw of pset.HasProperties) {
      try {
        // flatten => propRaw já é o objeto completo; fallback defensivo se vier como ref
        const prop = (propRaw && propRaw.Name === undefined && propRaw.value !== undefined)
          ? ifcAPI.GetLine(modelID, propRaw.value) : propRaw;
        const name = prop?.Name?.value;
        if (!name || !USEFUL_PSET_PROPS.has(name)) continue;
        const val = prop?.NominalValue?.value ?? prop?.NominalValue;
        if (val !== undefined && val !== null) props[name] = decodeIfcString(String(val).trim());
      } catch (_) { /* prop inválida */ }
    }
    if (Object.keys(props).length === 0) continue;
    const objects = rel.RelatedObjects || [];
    for (const objRef of objects) {
      // flatten => objRef é objeto com expressID; senão ref {value}
      const eid = (objRef && objRef.expressID !== undefined) ? objRef.expressID
                : (objRef && objRef.value !== undefined) ? objRef.value : objRef;
      if (eid === undefined || eid === null) continue;
      if (!elementProps.has(eid)) elementProps.set(eid, {});
      Object.assign(elementProps.get(eid), props);
    }
    // Progresso + cede a thread (UI não congela durante a leitura de PropertySets)
    if (i % 1000 === 0) {
      const pct = pctStart + Math.round((i / total) * (pctEnd - pctStart));
      onProgress?.(pct, `Lendo propriedades IFC: ${i}/${total}`);
      await new Promise(r => setTimeout(r, 0));
    }
  }
  return elementProps;
}

async function parseIFCFile(fileBuffer, onProgress, onStageComplete) {
  const WebIFC = await getWebIFC();
  const ifcAPI = new WebIFC.IfcAPI();
  ifcAPI.SetWasmPath('/');
  await ifcAPI.Init();

  // Validar IDs contra a biblioteca em runtime (seguranca contra hardcoded errados)
  const typeNames = Object.keys(IFC_TYPES);
  for (const name of typeNames) {
    if (WebIFC[name] !== undefined && WebIFC[name] !== IFC_TYPES[name]) {
      console.warn(`IFC_TYPES.${name} corrigido: ${IFC_TYPES[name]} -> ${WebIFC[name]}`);
      IFC_TYPES[name] = WebIFC[name];
    }
  }

  onProgress?.(5, 'WASM inicializado. Abrindo modelo...');

  const data = new Uint8Array(fileBuffer);
  const modelID = ifcAPI.OpenModel(data);
  onProgress?.(15, 'Modelo aberto. Etapa 1: Estrutura principal...');

  // ETAPA 1: Estrutura principal (vigas, colunas, chapas)
  const primaryElements = await extractElementsForTypes(
    ifcAPI, modelID, PRIMARY_TYPES, 0, onProgress, 15, 55
  );
  onProgress?.(55, `Etapa 1 concluida: ${primaryElements.length} elementos estruturais`);

  // Notifica que a estrutura principal esta pronta para renderizar
  onStageComplete?.('primary', primaryElements);

  // ETAPA 2: Detalhes e conexoes (parafusos, assemblies)
  onProgress?.(57, 'Etapa 2: Conexoes e detalhes...');
  const secondaryElements = await extractElementsForTypes(
    ifcAPI, modelID, SECONDARY_TYPES, primaryElements.length, onProgress, 57, 80
  );
  onProgress?.(80, `Etapa 2 concluida: ${secondaryElements.length} conexoes/detalhes`);

  // ETAPA 3: Extrair PropertySets (Tekla expõe Assembly mark, Position code, Profile, etc.)
  onProgress?.(82, 'Etapa 3: Lendo PropertySets...');
  const elementProps = await extractPropertySets(ifcAPI, WebIFC, modelID, onProgress, 82, 92);
  let enriched = 0;
  for (const el of [...primaryElements, ...secondaryElements]) {
    const props = elementProps.get(el.expressID);
    if (props) {
      el.props = props;
      enriched++;
    }
  }
  console.log(`[IFC] ${enriched}/${primaryElements.length + secondaryElements.length} elementos enriquecidos com PropertySets`);

  // ETAPA 4: Propagar props do Assembly pai para os filhos (IFCRELAGGREGATES)
  // Tekla agrega elementos em IFCELEMENTASSEMBLY. Assembly tem position_code,
  // mas seus filhos (DIAGONAL-VM, MONTANTE-VM, CHAPA, etc.) podem nao ter.
  // Vamos propagar position_code + Assembly/Cast unit name do pai para os filhos.
  onProgress?.(93, 'Etapa 4: Propagando dados de Assembly para filhos...');
  try {
    const IFCRELAGGREGATES = WebIFC.IFCRELAGGREGATES || 160246688;
    const relIds = ifcAPI.GetLineIDsWithType(modelID, IFCRELAGGREGATES);
    const total = relIds.size();
    const allEls = new Map();
    for (const el of [...primaryElements, ...secondaryElements]) allEls.set(el.expressID, el);
    let propagated = 0;
    for (let i = 0; i < total; i++) {
      try {
        const rel = ifcAPI.GetLine(modelID, relIds.get(i), true); // flatten => refs viram objetos
        if (!rel) continue;
        const parentRef = rel.RelatingObject;
        if (!parentRef) continue;
        // FIX: com flatten, a ref é objeto expandido — usar .expressID (não .value).
        const parentId = parentRef.expressID ?? parentRef.value ?? parentRef;
        const parentProps = elementProps.get(parentId);
        // MARCA REAL do Assembly: vem no Name "TIPO [MARCA] GRID" (ex: "COLUNA [C1A] A/1")
        // ou no pset 'Assembly/Cast unit Mark'. Ignora placeholders mascarados "(?)".
        const parentName = parentRef?.Name?.value || '';
        const markMatch = parentName.match(/\[([^\]]+)\]/);
        let realMark = (markMatch ? markMatch[1].trim() : '')
          || (parentProps && parentProps['Assembly/Cast unit Mark']) || '';
        if (realMark.includes('(?)')) realMark = '';
        const objects = rel.RelatedObjects || [];
        for (const objRef of objects) {
          const childId = objRef?.expressID ?? objRef?.value ?? objRef;
          const child = allEls.get(childId);
          if (!child) continue;
          // Referência ao assembly pai (agrupamento por peça física).
          child.assemblyId = parentId;
          // Propagar props do pai (sem sobrescrever as próprias).
          if (parentProps) child.props = { ...parentProps, ...(child.props || {}) };
          // CRÍTICO: injetar a MARCA REAL do conjunto nos filhos, para a Strategy 0a
          // casar marca→ERP. As peças têm 'Assembly mark' mascarado (TS0(?)); aqui
          // sobrescrevemos com a marca real do IFCELEMENTASSEMBLY (C1A, C6A, TS100A…).
          if (realMark) {
            child.props = child.props || {};
            child.props['Assembly/Cast unit Mark'] = realMark;
            // CRÍTICO: também em marcaFromIfc — a peça tem Name "TESOURA" (sem marca)
            // e Tag sem marca; o real está no Assembly pai. Sem isto, a camada de
            // REDISTRIBUIÇÃO quantity-aware (que lê el.marcaFromIfc) fica inerte e
            // a super-marcação de marcas com SPLIT (ex: TS59A) volta a acontecer.
            child.marcaFromIfc = realMark;
          }
          propagated++;
        }
      } catch (_) { /* relacao invalida */ }
    }
    console.log(`[IFC] ${propagated} elementos receberam props propagadas de Assembly pai`);
  } catch (e) {
    console.warn('Erro ao propagar Assembly props:', e?.message);
  }

  const allElements = [...primaryElements, ...secondaryElements];
  onProgress?.(98, `Finalizando... ${allElements.length} elementos, ${enriched} com props`);
  ifcAPI.CloseModel(modelID);
  ifcAPI.delete?.();
  onProgress?.(100, `Concluido! ${allElements.length} elementos carregados`);

  return allElements;
}

export { IFC_TYPES, IFC_TYPE_NAMES, PRIMARY_TYPES, SECONDARY_TYPES, ALL_TYPES, decodeIfcString, extractElementsForTypes, extractPropertySets, parseIFCFile };
