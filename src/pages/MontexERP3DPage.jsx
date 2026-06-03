// ==============================================
// MONTEX ERP 3D - VISUALIZADOR IFC INTEGRADO
// Versao: 5.0.0 - web-ifc + Three.js + ERP Status
// ==============================================

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { supabase } from '../api/supabaseClient';
import { useObras } from '../contexts/ERPContext';
import { loadConcluidasSmart, loadConcluidasLocal, saveConcluidasSmart, MONTAGEM_LS_KEY } from '../utils/montagemSync';

// Load web-ifc dynamically from same-origin public folder to avoid Vercel build issues
let _WebIFC = null;
async function getWebIFC() {
  if (_WebIFC) return _WebIFC;
  if (!window.WebIFC) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/web-ifc-api-iife.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  _WebIFC = window.WebIFC;
  return _WebIFC;
}

// ==============================================
// INDEXEDDB - Persistencia do arquivo IFC
// ==============================================
const IFC_DB_NAME = 'MontexIFC';
const IFC_DB_VERSION = 1;
const IFC_STORE = 'ifcFiles';

function openIFCDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IFC_DB_NAME, IFC_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IFC_STORE)) {
        db.createObjectStore(IFC_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveIFCToLocal(fileName, buffer) {
  try {
    const db = await openIFCDB();
    const tx = db.transaction(IFC_STORE, 'readwrite');
    tx.objectStore(IFC_STORE).put({
      id: 'current',
      fileName,
      buffer,
      savedAt: Date.now(),
    });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
    db.close();
    console.log('IFC salvo no IndexedDB:', fileName);
  } catch (e) {
    console.warn('Erro ao salvar IFC no IndexedDB:', e);
  }
}

async function loadIFCFromLocal() {
  try {
    const db = await openIFCDB();
    const tx = db.transaction(IFC_STORE, 'readonly');
    const req = tx.objectStore(IFC_STORE).get('current');
    const result = await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result || null;
  } catch (e) {
    console.warn('Erro ao ler IFC do IndexedDB:', e);
    return null;
  }
}

// ==============================================
// SUPABASE STORAGE - Persistencia online do IFC
// ==============================================
const SUPABASE_STORAGE_BUCKET = 'ifc-models';
const SUPABASE_IFC_PATH = 'current-model.ifc';

async function uploadIFCToSupabase(buffer) {
  try {
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const { error } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .upload(SUPABASE_IFC_PATH, blob, { upsert: true, cacheControl: '3600' });
    if (error) throw error;
    console.log('IFC uploaded to Supabase Storage');
    return true;
  } catch (e) {
    console.warn('Erro ao enviar IFC para Supabase:', e);
    return false;
  }
}

async function downloadIFCFromSupabase() {
  try {
    const { data, error } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .download(SUPABASE_IFC_PATH);
    if (error) throw error;
    if (!data) return null;
    const buffer = await data.arrayBuffer();
    console.log('IFC downloaded from Supabase Storage:', (buffer.byteLength / 1024 / 1024).toFixed(1), 'MB');
    return buffer;
  } catch (e) {
    console.warn('Erro ao baixar IFC do Supabase:', e);
    return null;
  }
}

// ==============================================
// CONFIGURACOES DE STATUS (3 status do fluxo Expedicao/Montagem)
// Sincronizado com MontagemPage:
//   - EMBARQUE: peca em etapa=expedido (Fila de Embarque)
//   - EM_OBRA:  peca em etapa=enviado (Aguardando Montagem)
//   - MONTADO:  peca marcada como Concluida no MontagemPage (localStorage)
// ==============================================

const STATUS_CONFIG = {
  NAO_INICIADO: { color: new THREE.Color(0.18, 0.20, 0.25), label: 'Sem Escopo',            hex: '#374151', opacity: 0.18, order: 0 },
  EMBARQUE:     { color: new THREE.Color(0.97, 0.52, 0.10), label: 'Fila de Embarque',      hex: '#f97316', opacity: 0.85, order: 1 },
  EM_OBRA:      { color: new THREE.Color(0.92, 0.70, 0.05), label: 'Entregue em Obra',      hex: '#eab308', opacity: 0.92, order: 2 },
  MONTADO:      { color: new THREE.Color(0.13, 0.80, 0.40), label: 'Montado',               hex: '#22c55e', opacity: 1.0,  order: 3 },
};

// Alias para o helper compartilhado (sincroniza com MontagemPage)
const loadConcluidasFromLS = loadConcluidasLocal;

// IFC type IDs - CORRIGIDOS conforme web-ifc v0.0.76 runtime
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

// Etapa 1: Estrutura principal (vigas, colunas, chapas)
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

// Etapa 2: Conexoes e detalhes (parafusos, assemblies)
const SECONDARY_TYPES = [
  IFC_TYPES.IFCMECHANICALFASTENER,
  IFC_TYPES.IFCELEMENTASSEMBLY,
  IFC_TYPES.IFCFASTENER,
  IFC_TYPES.IFCDISCRETEACCESSORY,
];

const ALL_TYPES = [...PRIMARY_TYPES, ...SECONDARY_TYPES];

// ==============================================
// IFC PARSER - Extrai geometria via web-ifc
// ==============================================

// Extrai geometria de um conjunto de tipos IFC
function extractElementsForTypes(ifcAPI, modelID, types, existingCount, onProgress, pctStart, pctEnd) {
  const elements = [];
  let processed = 0;
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

      const name = decodeIfcString(props.Name?.value || props.Tag?.value || `Element-${expressID}`);
      const globalId = props.GlobalId?.value || '';
      const description = decodeIfcString(props.Description?.value || '');
      const objectType = decodeIfcString(props.ObjectType?.value || '');
      const tag = props.Tag?.value || '';

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
          geometry,
          isPrimary: PRIMARY_TYPES.includes(ifcType),
        });
      }
    }
    processed++;
    const pct = pctStart + Math.round((processed / totalTypes) * (pctEnd - pctStart));
    const total = existingCount + elements.length;
    onProgress?.(pct, `${typeName}: ${count} encontrados (${total} total)`);
  }

  return elements;
}

// Props uteis para extrair dos PropertySets (Tekla)
const USEFUL_PSET_PROPS = new Set([
  'Assembly mark', 'Part mark',
  'Assembly/Cast unit Mark', 'Assembly/Cast unit name', 'Assembly/Cast unit position code',
  'Profile', 'Class', 'Grade',
  'Top elevation', 'Bottom elevation',
  'Assembly/Cast unit top elevation', 'Assembly/Cast unit bottom elevation',
]);

// IFC usa escape \S\letra para acentos (encoding ISO-8859-1 short form)
// Ex: TRELI\S\GA -> TRELIÇA, M\S\CO-FRANCESA -> MÃO-FRANCESA
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

// Extrai PropertySets do IFC e retorna Map: expressID -> { propName: value }
// IFC do Tekla expõe Pset_BeamCommon e similares com Assembly mark, Position code, etc.
function extractPropertySets(ifcAPI, WebIFC, modelID, onProgress, pctStart, pctEnd) {
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
    const psetRef = rel.RelatingPropertyDefinition;
    if (!psetRef) continue;
    const psetId = (psetRef.value !== undefined) ? psetRef.value : psetRef;
    let pset;
    try { pset = ifcAPI.GetLine(modelID, psetId, true); } catch (e) { continue; }
    if (!pset?.HasProperties) continue;
    const props = {};
    for (const propRef of pset.HasProperties) {
      try {
        const propId = (propRef.value !== undefined) ? propRef.value : propRef;
        const prop = ifcAPI.GetLine(modelID, propId);
        const name = prop?.Name?.value;
        if (!name || !USEFUL_PSET_PROPS.has(name)) continue;
        const val = prop?.NominalValue?.value ?? prop?.NominalValue;
        if (val !== undefined && val !== null) props[name] = decodeIfcString(String(val).trim());
      } catch (_) { /* prop inválida */ }
    }
    if (Object.keys(props).length === 0) continue;
    const objects = rel.RelatedObjects || [];
    for (const objRef of objects) {
      const eid = (objRef.value !== undefined) ? objRef.value : objRef;
      if (!elementProps.has(eid)) elementProps.set(eid, {});
      Object.assign(elementProps.get(eid), props);
    }
    // Progresso
    if (i % 2000 === 0) {
      const pct = pctStart + Math.round((i / total) * (pctEnd - pctStart));
      onProgress?.(pct, `Lendo propriedades IFC: ${i}/${total}`);
    }
  }
  return elementProps;
}

// Parser principal com carregamento em 2 etapas
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
  const primaryElements = extractElementsForTypes(
    ifcAPI, modelID, PRIMARY_TYPES, 0, onProgress, 15, 55
  );
  onProgress?.(55, `Etapa 1 concluida: ${primaryElements.length} elementos estruturais`);

  // Notifica que a estrutura principal esta pronta para renderizar
  onStageComplete?.('primary', primaryElements);

  // ETAPA 2: Detalhes e conexoes (parafusos, assemblies)
  onProgress?.(57, 'Etapa 2: Conexoes e detalhes...');
  const secondaryElements = extractElementsForTypes(
    ifcAPI, modelID, SECONDARY_TYPES, primaryElements.length, onProgress, 57, 80
  );
  onProgress?.(80, `Etapa 2 concluida: ${secondaryElements.length} conexoes/detalhes`);

  // ETAPA 3: Extrair PropertySets (Tekla expõe Assembly mark, Position code, Profile, etc.)
  onProgress?.(82, 'Etapa 3: Lendo PropertySets...');
  const elementProps = extractPropertySets(ifcAPI, WebIFC, modelID, onProgress, 82, 92);
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
        const rel = ifcAPI.GetLine(modelID, relIds.get(i), true);
        if (!rel) continue;
        const parentRef = rel.RelatingObject;
        if (!parentRef) continue;
        const parentId = (parentRef.value !== undefined) ? parentRef.value : parentRef;
        const parentProps = elementProps.get(parentId);
        if (!parentProps) continue;
        const objects = rel.RelatedObjects || [];
        for (const objRef of objects) {
          const childId = (objRef.value !== undefined) ? objRef.value : objRef;
          const child = allEls.get(childId);
          if (!child) continue;
          // Propagar props do pai (mas sem sobrescrever as proprias)
          child.props = { ...parentProps, ...(child.props || {}) };
          // Marcar elemento com referencia ao assembly pai
          child.assemblyId = parentId;
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

// ==============================================
// THREE.JS SCENE MANAGER
// ==============================================

class SceneManager {
  constructor(container) {
    this.container = container;
    this.meshMap = new Map(); // expressID -> mesh
    this.allMeshes = [];

    const w = container.clientWidth;
    const h = container.clientHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f1a);

    // Camera
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 5000);
    this.camera.position.set(50, 40, 80);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;
    container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 500;
    this.controls.maxPolarAngle = Math.PI * 0.85;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xbde0fe, 0x2d3748, 0.6);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(80, 100, 60);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.left = -150;
    dir.shadow.camera.right = 150;
    dir.shadow.camera.top = 150;
    dir.shadow.camera.bottom = -150;
    dir.shadow.camera.far = 400;
    this.scene.add(dir);

    const fill = new THREE.DirectionalLight(0x94a3b8, 0.4);
    fill.position.set(-50, 30, -40);
    this.scene.add(fill);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(500, 500);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.95, metalness: 0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const grid = new THREE.GridHelper(300, 60, 0x1e3a5f, 0x0f1d32);
    this.scene.add(grid);

    // Raycaster
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Animate
    this._animate = this._animate.bind(this);
    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
    this._animate();
  }

  _animate() {
    this._raf = requestAnimationFrame(this._animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  _onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // Cria mesh Three.js a partir de um elemento IFC
  _createMesh(el) {
    const { verts, indices, transform } = el.geometry;
    if (!verts || !indices || verts.length === 0 || indices.length === 0) return null;

    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(indices.length * 3);
    const normals = new Float32Array(indices.length * 3);

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      positions[i * 3] = verts[idx * 6];
      positions[i * 3 + 1] = verts[idx * 6 + 1];
      positions[i * 3 + 2] = verts[idx * 6 + 2];
      normals[i * 3] = verts[idx * 6 + 3];
      normals[i * 3 + 1] = verts[idx * 6 + 4];
      normals[i * 3 + 2] = verts[idx * 6 + 5];
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

    const defaultColor = new THREE.Color(0.6, 0.65, 0.7);
    const mat = new THREE.MeshStandardMaterial({
      color: defaultColor.clone(),
      roughness: 0.5,
      metalness: 0.6,
      transparent: true,
      opacity: el.isPrimary ? 0.85 : 0.6,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geom, mat);

    if (transform && transform.length >= 16) {
      const m4 = new THREE.Matrix4();
      m4.set(
        transform[0], transform[4], transform[8], transform[12],
        transform[1], transform[5], transform[9], transform[13],
        transform[2], transform[6], transform[10], transform[14],
        transform[3], transform[7], transform[11], transform[15]
      );
      mesh.applyMatrix4(m4);
    }

    mesh.castShadow = el.isPrimary;
    mesh.receiveShadow = true;
    mesh.userData = { element: el, expressID: el.expressID };
    return mesh;
  }

  loadElements(elements) {
    // Clear previous
    this.allMeshes.forEach(m => {
      this.scene.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    });
    this.allMeshes = [];
    this.meshMap.clear();

    this._addElementsInternal(elements, true);
  }

  // Adiciona elementos incrementalmente (sem limpar os existentes)
  addElements(elements) {
    this._addElementsInternal(elements, false);
  }

  _addElementsInternal(elements, centerCamera) {
    const bbox = new THREE.Box3();
    // Include existing meshes in bbox if not centering fresh
    if (!centerCamera) {
      for (const m of this.allMeshes) bbox.expandByObject(m);
    }

    for (const el of elements) {
      const mesh = this._createMesh(el);
      if (!mesh) continue;

      this.scene.add(mesh);
      this.allMeshes.push(mesh);
      this.meshMap.set(el.expressID, mesh);
      bbox.expandByObject(mesh);
    }

    // Center camera on model
    if (centerCamera && this.allMeshes.length > 0) {
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      bbox.getCenter(center);
      bbox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const dist = maxDim * 1.5;

      this.camera.position.set(center.x + dist * 0.6, center.y + dist * 0.4, center.z + dist * 0.8);
      this.controls.target.copy(center);
      this.controls.update();
    }
  }

  applyStatusColors(statusMap, statusFilter = null) {
    // statusMap: { expressID -> statusKey }
    // statusFilter: Set de status ativos. Se vazio = mostrar TODOS com cor cheia.
    // Pecas fora do filtro ficam em modo "ghost" (cinza translucido) para manter
    // o IFC completo visivel como contexto.
    const hasFilter = statusFilter && statusFilter.size > 0;
    const GHOST = new THREE.Color(0.10, 0.12, 0.15);

    for (const [expressID, mesh] of this.meshMap.entries()) {
      const statusKey = statusMap.get(expressID) || 'NAO_INICIADO';
      const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.NAO_INICIADO;

      const isHighlighted = !hasFilter || statusFilter.has(statusKey);

      if (isHighlighted) {
        mesh.material.color.copy(cfg.color);
        mesh.material.opacity = cfg.opacity;
        mesh.material.emissive = new THREE.Color(cfg.color.r * 0.15, cfg.color.g * 0.15, cfg.color.b * 0.15);
        mesh.material.emissiveIntensity = hasFilter ? 0.4 : 0;
      } else {
        // Ghost mode — peca fora do filtro mas IFC permanece visivel
        mesh.material.color.copy(GHOST);
        mesh.material.opacity = 0.08;
        mesh.material.emissive = new THREE.Color(0x000000);
        mesh.material.emissiveIntensity = 0;
      }
      mesh.material.needsUpdate = true;
    }
  }

  applyTypeColors() {
    const typeColors = {
      'Viga': new THREE.Color(0x3b82f6),
      'Coluna': new THREE.Color(0xef4444),
      'Chapa': new THREE.Color(0xf59e0b),
      'Laje': new THREE.Color(0x8b5cf6),
      'Elemento': new THREE.Color(0x06b6d4),
      'Cobertura': new THREE.Color(0x10b981),
      'Parafuso': new THREE.Color(0x94a3b8),
      'Conjunto': new THREE.Color(0xfbbf24),
      'Fixador': new THREE.Color(0xa78bfa),
      'Acessorio': new THREE.Color(0xfb923c),
      'Outro': new THREE.Color(0x6b7280),
    };
    for (const mesh of this.allMeshes) {
      const typeName = mesh.userData.element?.typeName || 'Outro';
      const c = typeColors[typeName] || typeColors['Outro'];
      mesh.material.color.copy(c);
      mesh.material.opacity = mesh.userData.element?.isPrimary ? 0.85 : 0.6;
      mesh.material.needsUpdate = true;
    }
  }

  setView(preset) {
    const center = this.controls.target.clone();
    const dist = this.camera.position.distanceTo(center);
    const presets = {
      front: { x: 0, y: 0.3, z: 1 },
      back: { x: 0, y: 0.3, z: -1 },
      left: { x: -1, y: 0.3, z: 0 },
      right: { x: 1, y: 0.3, z: 0 },
      top: { x: 0, y: 1, z: 0.01 },
      iso: { x: 0.6, y: 0.5, z: 0.8 },
    };
    const dir = presets[preset] || presets.iso;
    const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
    this.camera.position.set(
      center.x + (dir.x / len) * dist,
      center.y + (dir.y / len) * dist,
      center.z + (dir.z / len) * dist
    );
    this.controls.update();
  }

  raycast(event) {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.allMeshes);
    return hits.length > 0 ? hits[0].object : null;
  }

  highlightMesh(mesh, highlight) {
    if (!mesh) return;
    if (highlight) {
      mesh.material.emissive = new THREE.Color(0xfbbf24);
      mesh.material.emissiveIntensity = 0.4;
    } else {
      mesh.material.emissive = new THREE.Color(0x000000);
      mesh.material.emissiveIntensity = 0;
    }
    mesh.material.needsUpdate = true;
  }

  setVisibility(filterFn) {
    for (const mesh of this.allMeshes) {
      mesh.visible = filterFn(mesh.userData.element);
    }
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    if (this._raf) cancelAnimationFrame(this._raf);
    this.controls.dispose();
    this.allMeshes.forEach(m => { m.geometry.dispose(); m.material.dispose(); });
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

// ==============================================
// COMPONENTE PRINCIPAL
// ==============================================

export default function MontexERP3DPage({ obraAtualData: obraAtualDataProp }) {
  const { obraAtual, obraAtualData: obraAtualDataCtx } = useObras();
  const obraAtualData = obraAtualDataProp || obraAtualDataCtx;
  const containerRef = useRef(null);
  const sceneManagerRef = useRef(null);
  const hoveredRef = useRef(null);

  // State
  const [ifcElements, setIfcElements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [colorMode, setColorMode] = useState('status'); // status | type
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState(new Set()); // empty = ALL; Set of active status keys
  const [showStats, setShowStats] = useState(false);
  const [erpPecas, setErpPecas] = useState([]);
  const [erpLoading, setErpLoading] = useState(true);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showFasteners, setShowFasteners] = useState(false);
  const [loadingStage, setLoadingStage] = useState(''); // 'primary' | 'secondary' | ''
  const [expedicoes, setExpedicoes] = useState([]);
  // Sincronizado com MontagemPage (localStorage + Supabase entity_store)
  const [concluidasMontagem, setConcluidasMontagem] = useState(() =>
    loadConcluidasSmart(remoto => setConcluidasMontagem(remoto))
  );

  // Listener: sincroniza quando MontagemPage marca/desmarca peca
  useEffect(() => {
    const handler = (e) => {
      if (e.key === MONTAGEM_LS_KEY || e.key === null) {
        setConcluidasMontagem(loadConcluidasFromLS());
      }
    };
    window.addEventListener('storage', handler);
    // Poll a cada 3s para detectar mudancas na mesma aba (storage event nao dispara local)
    const interval = setInterval(() => {
      const fresh = loadConcluidasFromLS();
      setConcluidasMontagem(prev => {
        const pks = Object.keys(prev);
        const fks = Object.keys(fresh);
        if (pks.length !== fks.length || pks.some(k => !fresh[k])) return fresh;
        return prev;
      });
    }, 3000);
    return () => { window.removeEventListener('storage', handler); clearInterval(interval); };
  }, []);

  const fileInputRef = useRef(null);

  // ==============================================
  // FETCH ERP DATA + EXPEDICOES
  // ==============================================
  // Carrega APENAS pecas_producao da obra (com paginação 1000+).
  // Materiais de corte foram REMOVIDOS do escopo para evitar inflar contadores -
  // o modulo 3D agora reflete fielmente as PECAS do ERP (532 na Super Luna), nao
  // os materiais de corte (que sao etapas intermediarias).
  useEffect(() => {
    if (!obraAtual) return;
    async function loadERP() {
      setErpLoading(true);
      try {
        // Paginacao manual: PostgREST limita 1000 linhas/req
        const producao = [];
        let offset = 0;
        while (true) {
          const { data, error } = await supabase
            .from('pecas_producao')
            .select('id, marca, nome, tipo, etapa, status, peso_total, peso_unitario, quantidade, perfil')
            .eq('obra_id', obraAtual)
            .range(offset, offset + 999);
          if (error) throw error;
          if (!data || data.length === 0) break;
          producao.push(...data);
          if (data.length < 1000) break;
          offset += 1000;
        }

        const { data: expData } = await supabase
          .from('expedicoes')
          .select('id, numero_romaneio, status, peso_total, pecas, pecas_ids, data_expedicao, destino')
          .eq('obra_id', obraAtual);

        setExpedicoes(expData || []);

        // Mapear: id da peca -> status da expedicao (mantido como override secundario)
        const expedicaoStatusMap = new Map();
        (expData || []).forEach(exp => {
          const expStatus = mapExpedicaoStatus(exp.status);
          const pecasArr = Array.isArray(exp.pecas) ? exp.pecas : [];
          pecasArr.forEach(p => {
            const marca = typeof p === 'string' ? p : (p.marca || p.nome || p.peca || '');
            if (marca) expedicaoStatusMap.set(marca.toUpperCase().trim(), expStatus);
          });
          const idsArr = Array.isArray(exp.pecas_ids) ? exp.pecas_ids : [];
          idsArr.forEach(id => expedicaoStatusMap.set(String(id), expStatus));
        });

        const allPecas = (producao || []).map(p => {
          const marca = (p.marca || p.nome || '').trim();
          const marcaKey = marca.toUpperCase();
          const status = expedicaoStatusMap.get(marcaKey)
            || expedicaoStatusMap.get(String(p.id))
            || mapProducaoEtapa(p.etapa);
          return {
            id: p.id,
            marca,
            tipo: (p.tipo || '').toUpperCase().trim(),
            etapa: p.etapa,
            status,
            perfil: p.perfil,
            peso: parseFloat(p.peso_total) || 0,
            pesoUnit: parseFloat(p.peso_unitario) || 0,
            quantidade: parseInt(p.quantidade) || 1,
          };
        });

        console.log(`[3D] Carregadas ${allPecas.length} pecas da obra ${obraAtual}`);
        setErpPecas(allPecas);
      } catch (e) {
        console.warn('Erro ao carregar ERP:', e);
      }
      setErpLoading(false);
    }
    loadERP();
  }, [obraAtual]);

  // Apenas pecas em etapas Expedido (Embarque) / Enviado (Em Obra) entram no escopo.
  // Demais etapas (fabricacao, solda, pintura, aguardando, corte) sao consideradas "Sem Escopo"
  // pois nao fazem parte do fluxo de Montagem.
  function mapCorteStatus(_st) {
    return 'NAO_INICIADO';
  }

  function mapProducaoEtapa(etapa) {
    if (etapa === 'expedicao' || etapa === 'expedido') return 'EMBARQUE';
    if (etapa === 'enviado' || etapa === 'entregue') return 'EM_OBRA';
    if (etapa === 'montagem' || etapa === 'montado') return 'EM_OBRA'; // ainda nao concluido manualmente
    return 'NAO_INICIADO';
  }

  function mapExpedicaoStatus(_status) {
    // Status do romaneio nao usado: a verdade vem da etapa da peca.
    // Manter fallback EM_OBRA para pecas listadas em romaneios entregues.
    return 'EM_OBRA';
  }

  // ==============================================
  // MATCH IFC ELEMENTS TO ERP DATA (multi-strategy)
  // ==============================================

  // Mapeamento IFC typeName / name → ERP tipo (normalizado)
  const IFC_TO_ERP_TIPO = {
    'COLUNA': 'COLUNA',
    'VIGA': 'VIGA',
    'CHAPA': 'CHAPA',
    'LAJE': 'LAJE',
    'PAREDE': 'PAREDE',
    'ELEMENTO': 'ELEMENTO',
    'COBERTURA': 'COBERTURA',
    'ESCADA': 'ESCADA',
    'GUARDA-CORPO': 'GUARDA-CORPO',
    'FUNDACAO': 'FUNDACAO',
    'PARAFUSO': 'PARAFUSO',
    'CONJUNTO': 'CONJUNTO',
    'FIXADOR': 'FIXADOR',
    'ACESSORIO': 'ACESSORIO',
    // Nomes comuns de elementos IFC que mapeiam para tipos ERP
    'TERÇA': 'TERÇA',
    'TERCA': 'TERÇA',
    'TESOURA': 'TESOURA',
    'CONTRAVENTAMENTO': 'CONTRAVENTAMENTO',
    'TRELIÇA': 'TRELIÇA',
    'TRELICA': 'TRELIÇA',
    'CALHA': 'CALHA',
    'COLUNETA': 'COLUNETA',
    'BOCAL': 'BOCAL',
    'CHUMBADOR': 'CHUMBADOR',
    'PLACA': 'PLACA',
    'BASE': 'PLACA DE BASE',
    'PLACA DE BASE': 'PLACA DE BASE',
    'BEAM': 'VIGA',
    'COLUMN': 'COLUNA',
    'PLATE': 'CHAPA',
    'BRACE': 'CONTRAVENTAMENTO',
    'PURLIN': 'TERÇA',
    'TRUSS': 'TESOURA',
  };

  const statusMap = useMemo(() => {
    const map = new Map();
    if (ifcElements.length === 0 || erpPecas.length === 0) return map;

    // Override: aplicar MONTADO para pecas marcadas no MontagemPage (localStorage)
    // Verificado por id da peca apos o matching
    const pecaIdsMontadas = new Set(Object.keys(concluidasMontagem || {}));

    const statusPriority = ['MONTADO', 'EM_OBRA', 'EMBARQUE', 'NAO_INICIADO'];

    // Pre-index ERP peças por marca (upper)
    const marcaIndex = new Map();
    for (const peca of erpPecas) {
      const marca = (peca.marca || '').toUpperCase().trim();
      if (marca && marca.length >= 2) {
        marcaIndex.set(marca, peca);
      }
    }

    // Pre-index ERP peças por perfil (upper)
    const perfilIndex = new Map();
    for (const peca of erpPecas) {
      const perfil = (peca.perfil || '').toUpperCase().trim();
      if (perfil) {
        if (!perfilIndex.has(perfil)) perfilIndex.set(perfil, []);
        perfilIndex.get(perfil).push(peca);
      }
    }

    // ===== NOVO: Distribuição por Position code (peça individual) =====
    // Como o IFC do Tekla nao expõe marca explicita (apenas tipo + position code),
    // mapeamos cada Position code unico a UMA peca do ERP daquele tipo.
    // Funciona perfeitamente para tipos com correspondencia 1:1 (ex VIGA-MESTRA: 7 IFC = 7 ERP).
    // Para tipos com mais IFC que ERP, peças repetem; o inverso, position codes ficam sem match.
    const IFC_TIPO_NAME_TO_ERP = {
      'COLUNA': 'COLUNA', 'TESOURA': 'TESOURA',
      'VIGA': 'VIGA', 'VIGA-MESTRA': 'VIGA-MESTRA', 'VIGAMESTRA': 'VIGA-MESTRA',
      'TERÇA': 'TERÇA', 'TERCA': 'TERÇA', 'TERÇA-TAP': 'TERÇA-TAP', 'TERCA-TAP': 'TERÇA-TAP',
      'TRELIÇA': 'TRELIÇA', 'TRELICA': 'TRELIÇA',
      'CONTRAVENTAMENTO': 'CONTRAVENTAMENTO', 'TIRANTE': 'TIRANTE',
      'CHUMBADOR': 'CHUMBADOR', 'CALHA': 'CALHA',
      'MÃO FRANCESA': 'MÃO-FRANCESA', 'MAO FRANCESA': 'MÃO-FRANCESA', 'MÃO-FRANCESA': 'MÃO-FRANCESA',
      'COLUNETA': 'COLUNETA', 'BOCAL': 'BOCAL', 'DIAGONAL': 'DIAGONAL', 'SUPORTE': 'SUPORTE',
    };
    // 1. Coletar position codes unicos por tipo IFC name
    const positionsByTipoIfc = new Map(); // tipoIfc -> Set de position codes
    for (const el of ifcElements) {
      const pos = el.props?.['Assembly/Cast unit position code'];
      const tipoIfc = (el.name || el.props?.['Assembly/Cast unit name'] || '').toUpperCase().trim();
      if (!pos || !tipoIfc) continue;
      if (!positionsByTipoIfc.has(tipoIfc)) positionsByTipoIfc.set(tipoIfc, new Set());
      positionsByTipoIfc.get(tipoIfc).add(pos);
    }
    // 2. Construir mapa: (tipo, position) -> peca ERP especifica
    //    Ordena posicoes alfabeticamente e atribui sequencialmente as pecas do tipo
    const positionToPecaMap = new Map(); // key "TIPO::POSITION" -> peca
    for (const [tipoIfc, posicoesSet] of positionsByTipoIfc) {
      const tipoErp = IFC_TIPO_NAME_TO_ERP[tipoIfc];
      if (!tipoErp) continue;
      const pecasDoTipo = (erpPecas.filter(p => p.tipo === tipoErp))
        .sort((a, b) => (a.marca || '').localeCompare(b.marca || ''));
      if (pecasDoTipo.length === 0) continue;
      const posicoesOrdenadas = Array.from(posicoesSet).sort();
      for (let i = 0; i < posicoesOrdenadas.length; i++) {
        const pos = posicoesOrdenadas[i];
        const peca = pecasDoTipo[i % pecasDoTipo.length]; // ciclico se IFC tem mais que ERP
        positionToPecaMap.set(`${tipoIfc}::${pos}`, peca);
      }
    }

    // Pre-index ERP peças por tipo (upper) - NOVO: para match por tipo de peça
    const tipoIndex = new Map();
    for (const peca of erpPecas) {
      const tipo = (peca.tipo || '').toUpperCase().trim();
      if (tipo) {
        if (!tipoIndex.has(tipo)) tipoIndex.set(tipo, []);
        tipoIndex.get(tipo).push(peca);
      }
    }

    // Helper: encontrar o status mais avançado de um grupo de peças
    const getMostAdvancedStatus = (pecas) => {
      return pecas.reduce((best, p) => {
        const bestIdx = statusPriority.indexOf(best.status);
        const pIdx = statusPriority.indexOf(p.status);
        return pIdx < bestIdx ? p : best;
      }, pecas[0]);
    };

    // Helper: calcular status representativo de um grupo (o mais comum, nao o mais avançado)
    // Usa o status EFETIVO: aplica o override MONTADO (montagem via localStorage/Supabase)
    // para que elementos colorizados por TIPO (Strategy 7) fiquem VERDES quando montados.
    const getRepresentativeStatus = (pecas) => {
      const statusCount = {};
      let maxCount = 0;
      let dominantStatus = 'NAO_INICIADO';
      for (const p of pecas) {
        const st = pecaIdsMontadas.has(String(p.id)) ? 'MONTADO' : p.status;
        statusCount[st] = (statusCount[st] || 0) + 1;
        if (statusCount[st] > maxCount) {
          maxCount = statusCount[st];
          dominantStatus = st;
        }
      }
      return dominantStatus;
    };

    // Helper: tokeniza string em tokens significativos para matching
    // Ex: "VM50A_D1-DIAG" -> ["VM50A", "D1", "DIAG"]
    // Ex: "DIAGONAL-VM50A.01" -> ["DIAGONAL", "VM50A", "01"]
    const tokenize = (s) => {
      if (!s) return [];
      return s.toUpperCase().split(/[-_.\s\/\\:,]+/).filter(t => t.length >= 2);
    };

    // Helper: extrai marcas-padrao via regex
    // Padroes conhecidos: VM, V, C, CT, TS, TC, TP, DN, TR, WM, CV
    //  - 1-3 letras maiusculas iniciais + digitos + 0-2 letras finais (variante)
    //  - Ex: VM50A, C1A, TS59A, CT125F, V128H, TC163C, TP145A, DN170A
    const MARCA_REGEX = /\b((?:VM|WM|VS|C|CT|CV|TS|TC|TP|TR|DN|TC|MF|SP|TL|TI|VS)\d{1,4}[A-Z]?)\b/i;
    const extrairMarcasDoTexto = (s) => {
      if (!s) return [];
      const matches = [];
      const regex = new RegExp(MARCA_REGEX.source, 'gi');
      let m;
      while ((m = regex.exec(s.toUpperCase())) !== null) {
        matches.push(m[1].toUpperCase());
      }
      return matches;
    };

    for (const el of ifcElements) {
      const elName = (el.name || '').toUpperCase().trim();
      const elDesc = (el.description || '').toUpperCase().trim();
      const elGlobalId = (el.globalId || '').toUpperCase().trim();
      const elTag = (el.tag || el.objectType || '').toUpperCase().trim();
      // PropertySets (Tekla): perfil estrutural é fonte adicional de match
      const elProps = el.props || {};
      const elProfile = (elProps['Profile'] || '').toUpperCase().trim();
      const elGrade = (elProps['Grade'] || '').toUpperCase().trim();

      let bestMatch = null;
      let matchedStatus = null;

      // Strategy 0 (PRIORITARIA): Match por Position code do PropertySet (Tekla)
      // Cada peca fisica tem 1 position code unico. Atribuimos sequencialmente as pecas do ERP.
      const elPosition = elProps['Assembly/Cast unit position code'];
      const elTipoAssembly = (elProps['Assembly/Cast unit name'] || elName || '').toUpperCase().trim();
      if (elPosition && elTipoAssembly) {
        const key = `${elTipoAssembly}::${elPosition}`;
        if (positionToPecaMap.has(key)) {
          bestMatch = positionToPecaMap.get(key);
        }
      }

      // Strategy 1: Marca exata no name (mais confiavel)
      if (!bestMatch && marcaIndex.has(elName)) {
        bestMatch = marcaIndex.get(elName);
      }

      // Strategy 2 (NOVO): Tokenizar e buscar marca exata em cada token
      // Cobre: "VM50A_DIAG" -> token VM50A bate
      //         "DIAG-VM50A-1" -> token VM50A bate
      //         "C1A.PL" -> token C1A bate
      if (!bestMatch) {
        const tokens = [...tokenize(elName), ...tokenize(elDesc), ...tokenize(elTag), ...tokenize(elGlobalId)];
        for (const tk of tokens) {
          if (marcaIndex.has(tk)) {
            bestMatch = marcaIndex.get(tk);
            break;
          }
        }
      }

      // Strategy 3 (NOVO): Regex extrai padroes de marca do texto bruto
      // Cobre nomes como "Beam-VM50A-Diag" sem separadores limpos
      if (!bestMatch) {
        const candidatos = [
          ...extrairMarcasDoTexto(elName),
          ...extrairMarcasDoTexto(elDesc),
          ...extrairMarcasDoTexto(elTag),
        ];
        for (const c of candidatos) {
          if (marcaIndex.has(c)) {
            bestMatch = marcaIndex.get(c);
            break;
          }
        }
      }

      // Strategy 4: Substring contains (fallback mais permissivo)
      if (!bestMatch && elName.length >= 3) {
        for (const [marca, peca] of marcaIndex) {
          if (marca.length >= 3 && elName.includes(marca)) {
            bestMatch = peca;
            break;
          }
        }
      }

      // Strategy 5: Description/GlobalId contains marca
      if (!bestMatch && (elDesc || elGlobalId)) {
        for (const [marca, peca] of marcaIndex) {
          if (marca.length >= 3) {
            if ((elDesc && elDesc.includes(marca)) || (elGlobalId && elGlobalId.includes(marca))) {
              bestMatch = peca;
              break;
            }
          }
        }
      }

      // Strategy 6: Match by perfil in description ou PropertySet Profile
      if (!bestMatch) {
        const perfisCandidatos = [elDesc, elProfile].filter(Boolean);
        for (const perfil of perfisCandidatos) {
          const pecasByPerfil = perfilIndex.get(perfil);
          if (pecasByPerfil && pecasByPerfil.length > 0) {
            bestMatch = getMostAdvancedStatus(pecasByPerfil);
            break;
          }
        }
      }

      // ========================================
      // Strategy 7 (FALLBACK POR TIPO): IFC do Tekla nao expoe marca especifica
      // (so prefixo como C0(?), VM0(?), TS0(?)). Para colorir o 3D usamos status
      // majoritario do TIPO ERP correspondente ao name/description do IFC.
      // ========================================
      if (!bestMatch && !matchedStatus) {
        // Mapeamento de IFC name -> ERP tipo (acentos e variantes)
        const IFC_TO_ERP_TIPO_MAP = {
          'COLUNA': 'COLUNA', 'COLUMN': 'COLUNA',
          'TESOURA': 'TESOURA', 'TRUSS': 'TESOURA',
          'VIGA': 'VIGA', 'BEAM': 'VIGA',
          'VIGA MESTRA': 'VIGA-MESTRA', 'VIGAMESTRA': 'VIGA-MESTRA', 'VIGA-MESTRA': 'VIGA-MESTRA',
          // Sub-elementos da Viga-Mestra herdam o status do conjunto VIGA-MESTRA
          // (o IFC do Tekla nao expõe a marca; diagonais/montantes/misulas pertencem ao mesmo conjunto)
          'DIAGONAL-VM': 'VIGA-MESTRA', 'MONTANTE-VM': 'VIGA-MESTRA', 'MISULA': 'VIGA-MESTRA',
          'TERÇA': 'TERÇA', 'TERCA': 'TERÇA', 'PURLIN': 'TERÇA',
          'TERÇA-TAP': 'TERÇA-TAP', 'TERCA-TAP': 'TERÇA-TAP',
          'TRELIÇA': 'TRELIÇA', 'TRELICA': 'TRELIÇA',
          // Sub-elementos da Treliça herdam o status do conjunto TRELIÇA
          'DIAGONAL-TL': 'TRELIÇA', 'MONTANTE-TL': 'TRELIÇA',
          'CONTRAVENTAMENTO': 'CONTRAVENTAMENTO', 'BRACE': 'CONTRAVENTAMENTO',
          'TIRANTE': 'TIRANTE',
          'CHUMBADOR': 'CHUMBADOR',
          'MÃO FRANCESA': 'MÃO-FRANCESA', 'MAO FRANCESA': 'MÃO-FRANCESA', 'MÃO-FRANCESA': 'MÃO-FRANCESA',
          'COLUNETA': 'COLUNETA',
          'BOCAL': 'BOCAL',
          'CALHA': 'CALHA',
          'DIAGONAL': 'DIAGONAL',
          'SUPORTE': 'SUPORTE',
        };
        const candidatos = [elName, elDesc, elTag];
        for (const txt of candidatos) {
          if (!txt) continue;
          const erpTipo = IFC_TO_ERP_TIPO_MAP[txt];
          if (erpTipo && tipoIndex.has(erpTipo)) {
            matchedStatus = getRepresentativeStatus(tipoIndex.get(erpTipo));
            break;
          }
        }
      }

      // FIM: matching multi-estrategia.
      // - Marca exata (1-3) é prioritaria
      // - Substring/regex (4-6) cobre nomes derivados
      // - Tipo majoritario (7) é fallback para IFC com marcas mascaradas (Tekla)

      if (bestMatch) {
        // Override MONTADO: peca marcada como montada via MontagemPage (localStorage)
        if (pecaIdsMontadas.has(String(bestMatch.id))) {
          map.set(el.expressID, 'MONTADO');
        } else {
          map.set(el.expressID, bestMatch.status);
        }
      } else if (matchedStatus) {
        // Strategy 7 (FALLBACK POR TIPO): sem marca/perfil/position casavel.
        // matchedStatus ja é o status representativo (montado-aware) do TIPO ERP.
        // Garante que familias sem ERP proprio (DIAGONAL-VM, MONTANTE-VM, DIAGONAL-TL...)
        // destaquem herdando o status do conjunto-pai (VIGA-MESTRA / TRELIÇA).
        map.set(el.expressID, matchedStatus);
      }
      // sem else: elemento sem match e sem tipo conhecido -> NAO_INICIADO no render
    }
    return map;
  }, [ifcElements, erpPecas, concluidasMontagem]);

  // pecaMap: expressID -> peça do ERP correspondente (para acao Marcar como Montada)
  // Usa MESMA logica de matching do statusMap (incluindo Strategy 0 por Position code)
  const pecaMap = useMemo(() => {
    const map = new Map();
    if (ifcElements.length === 0 || erpPecas.length === 0) return map;

    const marcaIndex = new Map();
    for (const peca of erpPecas) {
      const marca = (peca.marca || '').toUpperCase().trim();
      if (marca && marca.length >= 2) marcaIndex.set(marca, peca);
    }

    // Construir mesmo position-to-peca mapping
    const IFC_T = {
      'COLUNA':'COLUNA','TESOURA':'TESOURA','VIGA':'VIGA','VIGA-MESTRA':'VIGA-MESTRA','VIGAMESTRA':'VIGA-MESTRA',
      'TERÇA':'TERÇA','TERCA':'TERÇA','TERÇA-TAP':'TERÇA-TAP','TERCA-TAP':'TERÇA-TAP',
      'TRELIÇA':'TRELIÇA','TRELICA':'TRELIÇA','CONTRAVENTAMENTO':'CONTRAVENTAMENTO',
      'TIRANTE':'TIRANTE','CHUMBADOR':'CHUMBADOR','CALHA':'CALHA',
      'MÃO FRANCESA':'MÃO-FRANCESA','MAO FRANCESA':'MÃO-FRANCESA','MÃO-FRANCESA':'MÃO-FRANCESA',
      'COLUNETA':'COLUNETA','BOCAL':'BOCAL','DIAGONAL':'DIAGONAL','SUPORTE':'SUPORTE',
    };
    const positionsByTipo = new Map();
    for (const el of ifcElements) {
      const pos = el.props?.['Assembly/Cast unit position code'];
      const tipoIfc = (el.name || el.props?.['Assembly/Cast unit name'] || '').toUpperCase().trim();
      if (!pos || !tipoIfc) continue;
      if (!positionsByTipo.has(tipoIfc)) positionsByTipo.set(tipoIfc, new Set());
      positionsByTipo.get(tipoIfc).add(pos);
    }
    const posToPeca = new Map();
    for (const [tipoIfc, posicoes] of positionsByTipo) {
      const tipoErp = IFC_T[tipoIfc];
      if (!tipoErp) continue;
      const pecasDoTipo = erpPecas.filter(p => p.tipo === tipoErp).sort((a,b) => (a.marca||'').localeCompare(b.marca||''));
      if (!pecasDoTipo.length) continue;
      const posList = Array.from(posicoes).sort();
      for (let i = 0; i < posList.length; i++) {
        posToPeca.set(`${tipoIfc}::${posList[i]}`, pecasDoTipo[i % pecasDoTipo.length]);
      }
    }

    const tokenize = (s) => !s ? [] : s.toUpperCase().split(/[-_.\s\/\\:,]+/).filter(t => t.length >= 2);
    const MR = /\b((?:VM|WM|VS|C|CT|CV|TS|TC|TP|TR|DN|MF|SP|TL|TI)\d{1,4}[A-Z]?)\b/gi;
    for (const el of ifcElements) {
      const elName = (el.name || '').toUpperCase().trim();
      const elDesc = (el.description || '').toUpperCase().trim();
      const elTag = (el.tag || el.objectType || '').toUpperCase().trim();
      const elPos = el.props?.['Assembly/Cast unit position code'];
      const elTipoAssembly = (el.props?.['Assembly/Cast unit name'] || elName).toUpperCase().trim();
      // Strategy 0: position code (mais confiavel)
      if (elPos && elTipoAssembly) {
        const key = `${elTipoAssembly}::${elPos}`;
        if (posToPeca.has(key)) { map.set(el.expressID, posToPeca.get(key)); continue; }
      }
      // Strategy 1: marca exata
      if (marcaIndex.has(elName)) { map.set(el.expressID, marcaIndex.get(elName)); continue; }
      // Strategy 2: tokens
      const tokens = [...tokenize(elName), ...tokenize(elDesc), ...tokenize(elTag)];
      let found = null;
      for (const tk of tokens) {
        if (marcaIndex.has(tk)) { found = marcaIndex.get(tk); break; }
      }
      if (found) { map.set(el.expressID, found); continue; }
      // Strategy 3: regex
      const text = `${elName} ${elDesc} ${elTag}`;
      MR.lastIndex = 0;
      let m;
      while ((m = MR.exec(text)) !== null) {
        const c = m[1].toUpperCase();
        if (marcaIndex.has(c)) { map.set(el.expressID, marcaIndex.get(c)); break; }
      }
    }
    return map;
  }, [ifcElements, erpPecas]);

  // ==============================================
  // ESTATISTICAS BASEADAS NAS PEÇAS DO ERP (fonte da verdade)
  // ==============================================
  // O painel mostra DADOS DAS PEÇAS, nao dos elementos IFC, pois:
  //  - IFC e granular (cada parafuso, cada placa = 1 elemento -> 13.669 elementos)
  //  - ERP organiza por marca (532 peças, cada uma com quantidade fisica)
  //  - KPI correto = quantas peças/unidades estao em cada status
  const erpStats = useMemo(() => {
    const result = {
      total: erpPecas.length,
      totalUnidades: 0,
      totalPeso: 0,
      byStatus: { MONTADO: { pecas: 0, unidades: 0, peso: 0 },
                  EM_OBRA:  { pecas: 0, unidades: 0, peso: 0 },
                  EMBARQUE: { pecas: 0, unidades: 0, peso: 0 },
                  NAO_INICIADO: { pecas: 0, unidades: 0, peso: 0 } },
      byType: {},
    };
    const pecaIdsMontadas = new Set(Object.keys(concluidasMontagem || {}));
    for (const p of erpPecas) {
      // Override montado via MontagemPage
      const status = pecaIdsMontadas.has(String(p.id)) ? 'MONTADO' : p.status;
      const qtd = p.quantidade || 1;
      const peso = p.peso || 0;
      result.totalUnidades += qtd;
      result.totalPeso += peso;
      const b = result.byStatus[status] || result.byStatus.NAO_INICIADO;
      b.pecas++; b.unidades += qtd; b.peso += peso;
      const tipo = p.tipo || 'SEM_TIPO';
      if (!result.byType[tipo]) result.byType[tipo] = { pecas: 0, unidades: 0, peso: 0 };
      result.byType[tipo].pecas++;
      result.byType[tipo].unidades += qtd;
      result.byType[tipo].peso += peso;
    }
    return result;
  }, [erpPecas, concluidasMontagem]);

  // ==============================================
  // INIT THREE.JS SCENE
  // ==============================================
  useEffect(() => {
    if (!containerRef.current) return;
    const sm = new SceneManager(containerRef.current);
    sceneManagerRef.current = sm;
    return () => sm.dispose();
  }, []);

  // ==============================================
  // APPLY COLORS WHEN STATUS MAP OR COLOR MODE CHANGES
  // ==============================================
  useEffect(() => {
    const sm = sceneManagerRef.current;
    if (!sm || ifcElements.length === 0) return;
    if (colorMode === 'status') {
      // Passa o filtro de status para aplicar "ghost mode" nas pecas fora do filtro
      sm.applyStatusColors(statusMap, statusFilter);
    } else {
      sm.applyTypeColors();
    }
  }, [statusMap, colorMode, ifcElements, statusFilter]);

  // ==============================================
  // IFC FILE HANDLING
  // ==============================================
  // Helper para aplicar cores ERP a um set de elementos (usa statusMap global)
  const applyColorsToScene = useCallback((sm, _elements) => {
    if (!sm) return;
    if (colorMode === 'status') {
      sm.applyStatusColors(statusMap, statusFilter);
    } else {
      sm.applyTypeColors();
    }
  }, [statusMap, colorMode, statusFilter]);

  // ==============================================
  // TOGGLE FASTENERS (parafusos) - carrega sob demanda
  // ==============================================
  useEffect(() => {
    const sm = sceneManagerRef.current;
    if (!sm || ifcElements.length === 0) return;

    const fastenerIDs = new Set(
      ifcElements.filter(el => el.ifcType === IFC_TYPES.IFCMECHANICALFASTENER).map(el => el.expressID)
    );
    if (fastenerIDs.size === 0) return;

    if (showFasteners) {
      // Adicionar parafusos que ainda nao estao no scene
      const missing = ifcElements.filter(el =>
        el.ifcType === IFC_TYPES.IFCMECHANICALFASTENER && !sm.meshMap.has(el.expressID)
      );
      if (missing.length > 0) {
        sm.addElements(missing);
        applyColorsToScene(sm, ifcElements);
      }
      // Garantir visibilidade
      for (const [id, mesh] of sm.meshMap.entries()) {
        if (fastenerIDs.has(id)) mesh.visible = true;
      }
    } else {
      // Esconder parafusos
      for (const [id, mesh] of sm.meshMap.entries()) {
        if (fastenerIDs.has(id)) mesh.visible = false;
      }
    }
  }, [showFasteners, ifcElements, applyColorsToScene]);

  // ==============================================
  // APPLY FILTERS
  // ==============================================
  useEffect(() => {
    const sm = sceneManagerRef.current;
    if (!sm || ifcElements.length === 0) return;
    // IFC completo permanece visivel como contexto. Filtro de status NAO oculta -
    // apenas escurece pecas fora do filtro via applyStatusColors (ghost mode).
    // Filtros de Tipo e Search continuam ocultando pecas para foco rapido.
    sm.setVisibility(el => {
      if (el.ifcType === IFC_TYPES.IFCMECHANICALFASTENER) return showFasteners;
      if (typeFilter !== 'ALL' && el.typeName !== typeFilter) return false;
      if (searchText) {
        const q = searchText.toUpperCase();
        if (!(el.name || '').toUpperCase().includes(q) && !(el.typeName || '').toUpperCase().includes(q)) return false;
      }
      return true;
    });
  }, [typeFilter, searchText, ifcElements, showFasteners]);

  const handleFile = useCallback(async (file, { skipUpload = false } = {}) => {
    if (!file || !file.name.match(/\.ifc$/i)) return;
    setShowUpload(false);
    setLoading(true);
    setProgress(0);
    setProgressText(skipUpload ? 'Carregando modelo salvo...' : 'Lendo arquivo...');
    setLoadingStage('');

    try {
      const buffer = await file.arrayBuffer();
      setProgressText('Inicializando parser IFC...');
      setProgress(5);

      const sm = sceneManagerRef.current;

      const elements = await parseIFCFile(buffer, (pct, txt) => {
        setProgress(pct);
        setProgressText(txt);
      }, (stage, stageElements) => {
        // Callback de etapa - renderiza progressivamente
        if (stage === 'primary' && sm) {
          setLoadingStage('primary');
          // Carrega estrutura principal imediatamente
          sm.loadElements(stageElements);
          applyColorsToScene(sm, stageElements);
          setProgressText(`Estrutura principal renderizada (${stageElements.length} elementos). Carregando detalhes...`);
        }
      });

      // Etapa 2: Adicionar elementos secundarios (exceto parafusos por padrao)
      const secondaryOnly = elements.filter(el => !el.isPrimary);
      const withoutFasteners = secondaryOnly.filter(el => el.ifcType !== IFC_TYPES.IFCMECHANICALFASTENER);

      if (sm && withoutFasteners.length > 0) {
        sm.addElements(withoutFasteners);
        applyColorsToScene(sm, elements);
      }

      setIfcElements(elements);
      setModelLoaded(true);
      setLoadingStage('');

      // Persistir: IndexedDB (cache local) + Supabase Storage (online, so em upload manual)
      saveIFCToLocal(file.name, buffer);
      if (!skipUpload) {
        uploadIFCToSupabase(buffer).then(ok => {
          if (ok) console.log('IFC persistido online com sucesso');
        });
      }
    } catch (err) {
      console.error('Erro ao processar IFC:', err);
      setProgressText('Erro: ' + err.message);
    }
    setLoading(false);
  }, [erpPecas, colorMode, applyColorsToScene]);

  // ==============================================
  // AUTO-LOAD IFC: IndexedDB cache -> Supabase Storage fallback
  // ==============================================
  const autoLoadTriedRef = useRef(false);
  useEffect(() => {
    if (autoLoadTriedRef.current || modelLoaded || loading) return;
    autoLoadTriedRef.current = true;

    async function autoLoad() {
      // 1. Tentar IndexedDB (cache local rapido)
      const local = await loadIFCFromLocal();
      if (local && local.buffer) {
        console.log('Auto-load: IFC encontrado no IndexedDB:', local.fileName);
        const fakeFile = new File([local.buffer], local.fileName || 'model.ifc');
        handleFile(fakeFile, { skipUpload: true });
        return;
      }

      // 2. Fallback: Supabase Storage (online)
      console.log('Auto-load: Tentando Supabase Storage...');
      const buffer = await downloadIFCFromSupabase();
      if (buffer) {
        console.log('Auto-load: IFC baixado do Supabase Storage');
        saveIFCToLocal('model.ifc', buffer);
        const fakeFile = new File([buffer], 'model.ifc');
        handleFile(fakeFile, { skipUpload: true });
        return;
      }

      console.log('Auto-load: Nenhum IFC persistido encontrado');
    }

    setTimeout(autoLoad, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==============================================
  // MOUSE INTERACTION
  // ==============================================
  const handleClick = useCallback((e) => {
    const sm = sceneManagerRef.current;
    if (!sm) return;
    const hit = sm.raycast(e);
    if (hoveredRef.current) sm.highlightMesh(hoveredRef.current, false);
    if (hit) {
      sm.highlightMesh(hit, true);
      hoveredRef.current = hit;
      const el = hit.userData.element;
      const erpStatus = statusMap.get(el.expressID) || 'NAO_INICIADO';
      const erpPeca = pecaMap.get(el.expressID) || null;
      setSelectedElement({ ...el, erpStatus, erpPeca });
    } else {
      hoveredRef.current = null;
      setSelectedElement(null);
    }
  }, [statusMap, pecaMap]);

  // Toggle Marcar/Desmarcar peça como Montada (sincroniza com MontagemPage)
  const toggleMontagem = useCallback((peca) => {
    if (!peca) return;
    const pecaId = String(peca.id);
    const next = { ...concluidasMontagem };
    const wasMontada = !!next[pecaId];
    if (wasMontada) {
      delete next[pecaId];
    } else {
      next[pecaId] = {
        montadoEm: new Date().toISOString(),
        origem: 'MontexERP3DPage',
        marca: peca.marca,
      };
    }
    setConcluidasMontagem(next);
    saveConcluidasSmart(next);
    // Refletir mudança imediata no painel selecionado
    if (selectedElement) {
      const novoStatus = wasMontada
        ? (peca.status || 'NAO_INICIADO')
        : 'MONTADO';
      setSelectedElement({ ...selectedElement, erpStatus: novoStatus });
    }
  }, [concluidasMontagem, selectedElement]);

  // ==============================================
  // STATISTICS
  // ==============================================
  const stats = useMemo(() => {
    if (ifcElements.length === 0) return null;
    const byType = {};
    const byStatus = {};
    let matched = 0;

    for (const el of ifcElements) {
      byType[el.typeName] = (byType[el.typeName] || 0) + 1;
      const st = statusMap.get(el.expressID) || 'NAO_INICIADO';
      byStatus[st] = (byStatus[st] || 0) + 1;
      if (statusMap.has(el.expressID)) matched++;
    }

    return {
      total: ifcElements.length,
      byType,
      byStatus,
      matched,
      matchRate: ifcElements.length > 0 ? Math.round((matched / ifcElements.length) * 100) : 0,
    };
  }, [ifcElements, statusMap]);

  const obraName = obraAtualData?.nome || 'SUPER LUNA - BELO VALE';

  // ==============================================
  // RENDER
  // ==============================================
  return (
    <div className="p-4">
      <div className="min-h-screen bg-gradient-to-br from-[#030712] via-[#0a1628] to-[#030712] -m-6 relative">

        {/* HEADER */}
        <header className="bg-black/60 backdrop-blur-xl border-b border-cyan-500/20 px-6 py-3 relative z-20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-cyan-500/20">3D</div>
              <div>
                <h1 className="text-white font-bold text-lg tracking-tight">MONTEX ERP 3D</h1>
                <p className="text-cyan-400/60 text-xs">{obraName} - Visualizador IFC Integrado</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Color Mode Toggle */}
              <div className="flex bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                <button onClick={() => setColorMode('status')}
                  className={`px-3 py-1.5 text-xs font-medium transition-all ${colorMode === 'status' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                  Status ERP
                </button>
                <button onClick={() => setColorMode('type')}
                  className={`px-3 py-1.5 text-xs font-medium transition-all ${colorMode === 'type' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                  Tipo IFC
                </button>
              </div>

              {/* Toggle Fasteners */}
              {modelLoaded && (
                <button onClick={() => setShowFasteners(!showFasteners)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${showFasteners ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                  title="Mostrar/ocultar parafusos e conectores">
                  {showFasteners ? '🔩 Parafusos ON' : '🔩 Parafusos OFF'}
                </button>
              )}

              {/* Upload IFC */}
              <button onClick={() => setShowUpload(true)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-emerald-500/20 transition-all">
                Importar IFC
              </button>
            </div>
          </div>
        </header>

        {/* MAIN AREA */}
        <div className="flex h-[calc(100vh-120px)] relative">

          {/* STATS TOGGLE */}
          <button onClick={() => setShowStats(!showStats)}
            className="absolute left-3 top-3 z-30 bg-black/70 backdrop-blur border border-cyan-500/30 text-cyan-400 w-10 h-10 rounded-xl flex items-center justify-center text-sm hover:bg-cyan-500/20 transition-all shadow-lg"
            title="Painel de Dados">
            {showStats ? '\u2715' : '\u2630'}
          </button>

          {/* LEFT PANEL - Stats & Filters */}
          <div className={`absolute left-0 top-0 bottom-0 w-[320px] z-20 bg-gradient-to-b from-[#0a1628]/95 to-[#030712]/95 backdrop-blur-xl border-r border-cyan-500/15 overflow-y-auto transition-transform duration-300 ${showStats ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="p-4 pt-16 space-y-4">

              {/* Search */}
              <div>
                <input type="text" value={searchText} onChange={e => setSearchText(e.target.value)}
                  placeholder="Buscar elemento..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50" />
              </div>

              {/* Banner: IFC Tekla sem marcas explicitas */}
              {modelLoaded && stats && stats.matchRate < 50 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-[10px]">
                  <p className="text-amber-300 font-bold mb-1">⚠️ IFC com marcas mascaradas (Tekla)</p>
                  <p className="text-amber-200/80 leading-relaxed">
                    Modelo IFC exportado sem nomenclatura de marca (apenas tipo).
                    Coloração 3D usa <strong>status majoritário por TIPO</strong>.
                    KPIs continuam fiéis aos dados do ERP.
                  </p>
                </div>
              )}

              {/* Model Info — agora baseado em PEÇAS DO ERP (fonte da verdade) */}
              <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4">
                <h3 className="text-cyan-400 text-sm font-bold mb-3">Peças do ERP (Obra)</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <div className="text-white text-lg font-bold">{erpStats.total.toLocaleString()}</div>
                    <div className="text-slate-400 text-[10px]">Marcas</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <div className="text-amber-400 text-lg font-bold">{erpStats.totalUnidades.toLocaleString()}</div>
                    <div className="text-slate-400 text-[10px]">Unidades</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <div className="text-emerald-400 text-lg font-bold">{(erpStats.totalPeso/1000).toFixed(1)}t</div>
                    <div className="text-slate-400 text-[10px]">Peso</div>
                  </div>
                </div>
                {stats && (
                  <div className="mt-2 pt-2 border-t border-cyan-500/20 grid grid-cols-2 gap-2 text-[10px]">
                    <div className="flex justify-between"><span className="text-slate-500">Elementos IFC</span><span className="text-slate-300">{stats.total.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Match IFC</span><span className="text-emerald-400">{stats.matchRate}%</span></div>
                  </div>
                )}
              </div>

              {/* Filter by Type — usa peças do ERP */}
              <div>
                <h3 className="text-white text-xs font-semibold mb-2">Filtrar por Tipo</h3>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs">
                  <option value="ALL">Todos os Tipos</option>
                  {Object.entries(erpStats.byType).sort((a, b) => b[1].unidades - a[1].unidades).map(([type, d]) => (
                    <option key={type} value={type}>{type} ({d.pecas} peças · {d.unidades} un)</option>
                  ))}
                </select>
              </div>

              {/* Filter by Status — usa peças/unidades do ERP */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white text-xs font-semibold">Filtrar por Status</h3>
                  {statusFilter.size > 0 && (
                    <button onClick={() => setStatusFilter(new Set())}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors">
                      Limpar ({statusFilter.size})
                    </button>
                  )}
                </div>
                {statusFilter.size === 0 && (
                  <p className="text-[10px] text-slate-500 mb-2">Clique para filtrar (multi-select) · números em peças / unidades</p>
                )}
                <div className="space-y-1">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                    const isActive = statusFilter.size === 0 || statusFilter.has(key);
                    const erp = erpStats.byStatus[key] || { pecas: 0, unidades: 0 };
                    const count = erp.pecas; // mostra PEÇAS DO ERP
                    return (
                      <button key={key}
                        onClick={() => {
                          setStatusFilter(prev => {
                            const next = new Set(prev);
                            if (next.has(key)) {
                              next.delete(key);
                            } else {
                              next.add(key);
                            }
                            return next;
                          });
                        }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${
                          statusFilter.size > 0 && statusFilter.has(key)
                            ? 'bg-white/10 border border-white/20'
                            : statusFilter.size > 0
                              ? 'opacity-30 hover:opacity-60'
                              : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="w-3.5 h-3.5 rounded-sm flex-shrink-0 border border-white/10"
                          style={{ backgroundColor: isActive ? cfg.hex : 'transparent', borderColor: cfg.hex }} />
                        <span className={`flex-1 text-left ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>
                          {cfg.label}
                        </span>
                        <span className={`tabular-nums text-right ${count > 0 ? 'text-white font-medium' : 'text-slate-600'}`}>
                          {count} <span className="text-[9px] text-slate-500">/ {erp.unidades} un</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {/* Atalhos rapidos */}
                <div className="flex gap-1.5 mt-2">
                  <button onClick={() => setStatusFilter(new Set(['EMBARQUE']))}
                    className="flex-1 px-2 py-1 rounded text-[10px] bg-orange-500/10 border border-orange-500/30 text-orange-300 hover:bg-orange-500/20 transition-all">
                    🚚 Embarque
                  </button>
                  <button onClick={() => setStatusFilter(new Set(['EM_OBRA']))}
                    className="flex-1 px-2 py-1 rounded text-[10px] bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20 transition-all">
                    🏗️ Em Obra
                  </button>
                  <button onClick={() => setStatusFilter(new Set(['MONTADO']))}
                    className="flex-1 px-2 py-1 rounded text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-all">
                    ✓ Montado
                  </button>
                </div>
              </div>

              {/* Type Distribution — usa peças do ERP */}
              <div>
                <h3 className="text-white text-xs font-semibold mb-2">Distribuição por Tipo (peças do ERP)</h3>
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {Object.entries(erpStats.byType).sort((a, b) => b[1].unidades - a[1].unidades).map(([type, d]) => (
                    <div key={type} className="flex items-center gap-2 text-xs">
                      <span className="text-slate-300 flex-1 truncate" title={type}>{type}</span>
                      <span className="text-slate-400 tabular-nums">{d.pecas}</span>
                      <span className="text-slate-500 tabular-nums text-[9px]">/ {d.unidades}un</span>
                      <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500/60 rounded-full" style={{ width: `${(d.unidades / (erpStats.totalUnidades || 1)) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ERP vs IFC integridade */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <h3 className="text-white text-xs font-semibold mb-2">Integridade ERP × IFC</h3>
                <div className="text-xs text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Peças/Marcas no ERP</span>
                    <span className="text-cyan-300 font-bold">{erpStats.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unidades físicas</span>
                    <span className="text-amber-300 font-bold">{erpStats.totalUnidades.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Peso total contratado</span>
                    <span className="text-white">{(erpStats.totalPeso/1000).toFixed(2)} t</span>
                  </div>
                  <div className="h-px bg-white/10 my-2" />
                  <div className="flex justify-between">
                    <span>Elementos IFC</span>
                    <span className="text-white">{ifcElements.length.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IFC com marca ERP</span>
                    <span className="text-emerald-400">{stats?.matched || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IFC sem escopo</span>
                    <span className="text-slate-500">{(ifcElements.length - (stats?.matched || 0)).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Expedição Status */}
              {expedicoes.length > 0 && (
                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3">
                  <h3 className="text-yellow-400 text-xs font-semibold mb-2">Expedicoes</h3>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Romaneios</span>
                      <span className="text-white">{expedicoes.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Entregues</span>
                      <span className="text-yellow-400">{expedicoes.filter(e => (e.status || '').toLowerCase() === 'entregue').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Em Transito</span>
                      <span className="text-violet-400">{expedicoes.filter(e => (e.status || '').toLowerCase() === 'em_transito').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Peso Total</span>
                      <span className="text-white">{(expedicoes.reduce((s, e) => s + (parseFloat(e.peso_total) || 0), 0) / 1000).toFixed(1)} ton</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3D VIEWPORT */}
          <div className="flex-1 relative overflow-hidden">
            <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" onClick={handleClick} />

            {/* Stats badges */}
            {modelLoaded && stats && (
              <div className="absolute top-3 left-14 flex gap-2 pointer-events-none">
                {[
                  { val: erpStats.total.toLocaleString(), label: 'Peças ERP', bg: 'from-cyan-700/80 to-cyan-800/80' },
                  { val: erpStats.totalUnidades.toLocaleString(), label: 'Unidades', bg: 'from-amber-700/80 to-amber-800/80' },
                  { val: erpStats.byStatus.MONTADO.unidades + '/' + erpStats.totalUnidades, label: 'Montadas', bg: 'from-emerald-700/80 to-emerald-800/80' },
                ].map((b, i) => (
                  <div key={i} className={`bg-gradient-to-b ${b.bg} backdrop-blur rounded-lg px-3 py-1.5 text-center border border-white/10`}>
                    <div className="text-white text-sm font-bold">{b.val}</div>
                    <div className="text-slate-300 text-[10px]">{b.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* View Presets */}
            <div className="absolute top-3 right-4 flex flex-col gap-1.5">
              {[
                { key: 'front', label: 'Frontal' },
                { key: 'back', label: 'Traseira' },
                { key: 'left', label: 'Esquerda' },
                { key: 'right', label: 'Direita' },
                { key: 'top', label: 'Superior' },
                { key: 'iso', label: 'Isometrica' },
              ].map(v => (
                <button key={v.key} onClick={() => sceneManagerRef.current?.setView(v.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-black/50 text-slate-300 hover:bg-cyan-500/30 hover:text-white border border-white/10 transition-all backdrop-blur">
                  {v.label}
                </button>
              ))}
            </div>

            {/* Welcome Screen (no model loaded) */}
            {!modelLoaded && !loading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center pointer-events-auto">
                  <div className="text-6xl mb-4 opacity-50">🏗️</div>
                  <h2 className="text-white text-2xl font-bold mb-2">Visualizador 3D IFC</h2>
                  <p className="text-slate-400 text-sm mb-6 max-w-md">
                    Carregue o arquivo IFC do projeto para visualizar a estrutura 3D integrada com os dados de producao do ERP Montex.
                  </p>
                  <button onClick={() => setShowUpload(true)}
                    className="px-8 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:shadow-xl hover:shadow-emerald-500/30 transition-all">
                    Importar Arquivo IFC
                  </button>
                  <p className="text-slate-500 text-xs mt-3">Formatos suportados: .ifc (IFC2x3, IFC4)</p>
                </div>
              </div>
            )}

            {/* Loading Overlay */}
            {loading && (
              <div className={`absolute inset-0 flex items-center justify-center z-30 ${loadingStage === 'primary' ? 'bg-black/40 pointer-events-none' : 'bg-black/80 backdrop-blur-sm'}`}>
                <div className="text-center max-w-md w-full px-8">
                  <div className="text-5xl mb-4 animate-pulse">{loadingStage === 'primary' ? '🏗️' : '⚙️'}</div>
                  <h3 className="text-white text-xl font-bold mb-4">
                    {loadingStage === 'primary' ? 'Carregando Detalhes...' : 'Processando Modelo IFC'}
                  </h3>
                  <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-300" style={{ width: progress + '%' }} />
                  </div>
                  <p className="text-cyan-400 text-sm">{progressText}</p>
                  <p className="text-slate-500 text-xs mt-2">{progress}%</p>
                </div>
              </div>
            )}

            {/* Controls Help */}
            <div className="absolute bottom-4 right-4">
              <div className="bg-black/60 backdrop-blur rounded-xl p-3 border border-white/10 text-xs text-slate-400">
                <div className="font-semibold text-white mb-1">Controles</div>
                <div>Arrastar: Rotacionar</div>
                <div>Scroll: Zoom</div>
                <div>Shift+Arrastar: Pan</div>
                <div>Clique: Selecionar</div>
                {modelLoaded && <div className="mt-1 text-emerald-400 font-medium">Modelo IFC Carregado</div>}
                {!modelLoaded && <div className="mt-1 text-orange-400 font-medium">Nenhum modelo</div>}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL - Selected Element Detail */}
          {selectedElement && (
            <div className="absolute right-0 top-0 bottom-0 w-[340px] z-20 bg-gradient-to-b from-[#0a1628]/95 to-[#030712]/95 backdrop-blur-xl border-l border-cyan-500/15 overflow-y-auto">
              <div className="sticky top-0 z-10 bg-[#0a1628]/90 backdrop-blur p-4 border-b border-white/10 flex justify-between items-center">
                <div>
                  <h3 className="text-white font-bold text-sm">Elemento Selecionado</h3>
                  <p className="text-cyan-400/60 text-xs">#{selectedElement.expressID}</p>
                </div>
                <button onClick={() => setSelectedElement(null)}
                  className="bg-white/10 hover:bg-white/20 w-8 h-8 rounded-lg text-sm flex items-center justify-center text-white">{'\u2715'}</button>
              </div>

              <div className="p-4 space-y-4">
                {/* Identity */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <h4 className="text-cyan-400 text-xs font-semibold mb-3">Identificacao</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Nome</span>
                      <span className="text-white text-xs font-medium truncate max-w-[180px]">{selectedElement.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Tipo IFC</span>
                      <span className="text-white text-xs">{selectedElement.typeName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">GlobalId</span>
                      <span className="text-white text-xs font-mono truncate max-w-[160px]">{selectedElement.globalId}</span>
                    </div>
                    {selectedElement.description && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-xs">Descricao</span>
                        <span className="text-white text-xs truncate max-w-[180px]">{selectedElement.description}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Peça vinculada do ERP + ação Marcar como Montada */}
                {selectedElement.erpPeca && (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                    <h4 className="text-emerald-400 text-xs font-semibold mb-3 flex items-center gap-1">
                      <span>🔗</span> Peça do ERP vinculada
                    </h4>
                    <div className="space-y-1.5 text-xs mb-3">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500 text-[10px]">Marca</span>
                        <span className="text-white text-[11px] font-bold font-mono">{selectedElement.erpPeca.marca}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500 text-[10px]">Tipo</span>
                        <span className="text-white text-[11px]">{selectedElement.erpPeca.tipo || '-'}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500 text-[10px]">Etapa atual</span>
                        <span className="text-white text-[11px]">{selectedElement.erpPeca.etapa || '-'}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500 text-[10px]">Quantidade</span>
                        <span className="text-white text-[11px] font-bold">{selectedElement.erpPeca.quantidade || 1} un</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500 text-[10px]">Peso total</span>
                        <span className="text-white text-[11px] tabular-nums">{(selectedElement.erpPeca.peso || 0).toFixed(2)} kg</span>
                      </div>
                    </div>

                    {/* Acao: Marcar / Desmarcar como Montada */}
                    {(() => {
                      const peca = selectedElement.erpPeca;
                      const isMontada = !!concluidasMontagem[String(peca.id)];
                      const podeMontar = ['enviado','entregue','montagem'].includes(peca.etapa) || isMontada;
                      if (!podeMontar) {
                        return (
                          <div className="text-[10px] text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded p-2">
                            ⚠️ Peça ainda em produção (etapa={peca.etapa}). Só pode marcar como montada após chegar em obra (etapa=enviado).
                          </div>
                        );
                      }
                      if (isMontada) {
                        return (
                          <button
                            onClick={() => toggleMontagem(peca)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2"
                          >
                            ↩ Desmarcar Montagem
                          </button>
                        );
                      }
                      return (
                        <button
                          onClick={() => toggleMontagem(peca)}
                          className="w-full px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30"
                        >
                          ✓ Marcar como Montada
                        </button>
                      );
                    })()}
                    <p className="text-[9px] text-slate-500 mt-2 text-center">Sincroniza automaticamente com a MontagemPage</p>
                  </div>
                )}

                {/* Propriedades Tekla (PropertySets) */}
                {selectedElement.props && Object.keys(selectedElement.props).length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <h4 className="text-cyan-400 text-xs font-semibold mb-3">Propriedades Tekla</h4>
                    <div className="space-y-1.5 text-xs">
                      {Object.entries(selectedElement.props).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2">
                          <span className="text-slate-500 text-[10px] flex-shrink-0">{k}</span>
                          <span className="text-white text-[11px] font-mono text-right truncate max-w-[160px]" title={v}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status ERP (4 niveis do fluxo Montagem) */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <h4 className="text-cyan-400 text-xs font-semibold mb-3">Status no Fluxo</h4>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_CONFIG[selectedElement.erpStatus]?.hex || '#6b7280' }} />
                    <span className="text-white text-sm font-semibold">{STATUS_CONFIG[selectedElement.erpStatus]?.label || 'Sem Escopo'}</span>
                  </div>

                  {/* Pipeline 4 niveis: NAO_INICIADO -> EMBARQUE -> EM_OBRA -> MONTADO */}
                  <div className="space-y-1.5">
                    {['NAO_INICIADO', 'EMBARQUE', 'EM_OBRA', 'MONTADO'].map((key) => {
                      const cfg = STATUS_CONFIG[key];
                      const order = ['NAO_INICIADO', 'EMBARQUE', 'EM_OBRA', 'MONTADO'];
                      const currentIdx = order.indexOf(selectedElement.erpStatus);
                      const thisIdx = order.indexOf(key);
                      const done = thisIdx <= currentIdx;
                      return (
                        <div key={key} className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${done ? 'bg-white/5' : 'opacity-40'}`}>
                          <div className={`w-2.5 h-2.5 rounded-full ${done ? '' : 'border border-white/20'}`}
                            style={done ? { backgroundColor: cfg.hex } : {}} />
                          <span className={done ? 'text-white' : 'text-slate-500'}>{cfg.label}</span>
                          {done && <span className="ml-auto text-emerald-400 text-[10px]">OK</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* UPLOAD MODAL */}
        {showUpload && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={e => e.target === e.currentTarget && setShowUpload(false)}>
            <div className="bg-gradient-to-br from-[#0f1d32] to-[#0a1628] border border-cyan-500/20 rounded-2xl p-8 w-[90%] max-w-[600px] text-white shadow-2xl shadow-cyan-500/10">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold">Importar Arquivo IFC</h2>
                  <p className="text-slate-400 text-sm mt-1">Carregue o modelo BIM para visualizacao 3D</p>
                </div>
                <button onClick={() => setShowUpload(false)} className="bg-white/10 hover:bg-white/20 w-9 h-9 rounded-lg text-lg flex items-center justify-center">{'\u2715'}</button>
              </div>

              <div className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${isDragOver ? 'border-cyan-400 bg-cyan-500/10' : 'border-cyan-500/30 bg-cyan-500/5 hover:border-cyan-400/60'}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={e => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}>
                <div className="text-5xl mb-4">🏗️</div>
                <p className="text-lg font-semibold">Arraste o arquivo IFC aqui</p>
                <p className="text-slate-400 text-sm mt-2">ou clique para selecionar</p>
                <p className="text-slate-500 text-xs mt-4">Suporte: .ifc (IFC2x3, IFC4) - Tekla, Revit, etc.</p>
                <input ref={fileInputRef} type="file" accept=".ifc" className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>

              <div className="mt-5 p-4 bg-cyan-500/5 border border-cyan-500/15 rounded-xl">
                <h4 className="text-sm font-semibold text-cyan-400 mb-2">Como funciona</h4>
                <div className="text-xs text-slate-400 space-y-1">
                  <p>1. O arquivo IFC e processado localmente no navegador (web-ifc WASM)</p>
                  <p>2. Elementos estruturais sao extraidos com geometria real</p>
                  <p>3. Nomes das pecas sao mapeados aos dados do ERP (marca/nome)</p>
                  <p>4. Cores refletem o status real de producao de cada elemento</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
