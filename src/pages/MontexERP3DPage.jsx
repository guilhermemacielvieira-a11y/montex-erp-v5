// ==============================================
// MONTEX ERP 3D - VISUALIZADOR IFC INTEGRADO
// Versao: 5.0.0 - web-ifc + Three.js + ERP Status
// ==============================================

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { supabase } from '../api/supabaseClient';

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
// CONFIGURACOES DE STATUS ERP
// ==============================================

const STATUS_CONFIG = {
  NAO_INICIADO: { color: new THREE.Color(0.42, 0.45, 0.50), label: 'Nao Iniciado', hex: '#6b7280', opacity: 0.35 },
  CORTE:        { color: new THREE.Color(0.96, 0.62, 0.04), label: 'Em Corte',      hex: '#f59e0b', opacity: 0.7 },
  FABRICACAO:   { color: new THREE.Color(0.23, 0.51, 0.96), label: 'Fabricacao',     hex: '#3b82f6', opacity: 0.75 },
  SOLDA:        { color: new THREE.Color(0.55, 0.36, 0.96), label: 'Solda',          hex: '#8b5cf6', opacity: 0.8 },
  PINTURA:      { color: new THREE.Color(0.06, 0.73, 0.51), label: 'Pintura',        hex: '#10b981', opacity: 0.85 },
  EXPEDICAO:    { color: new THREE.Color(0.06, 0.52, 0.96), label: 'Expedicao',      hex: '#0ea5e9', opacity: 0.9 },
  MONTADO:      { color: new THREE.Color(0.13, 0.80, 0.40), label: 'Montado',        hex: '#22c55e', opacity: 1.0 },
};

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

      const name = props.Name?.value || props.Tag?.value || `Element-${expressID}`;
      const globalId = props.GlobalId?.value || '';
      const description = props.Description?.value || '';

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
    ifcAPI, modelID, PRIMARY_TYPES, 0, onProgress, 15, 60
  );
  onProgress?.(60, `Etapa 1 concluida: ${primaryElements.length} elementos estruturais`);

  // Notifica que a estrutura principal esta pronta para renderizar
  onStageComplete?.('primary', primaryElements);

  // ETAPA 2: Detalhes e conexoes (parafusos, assemblies)
  onProgress?.(62, 'Etapa 2: Conexoes e detalhes...');
  const secondaryElements = extractElementsForTypes(
    ifcAPI, modelID, SECONDARY_TYPES, primaryElements.length, onProgress, 62, 90
  );
  onProgress?.(90, `Etapa 2 concluida: ${secondaryElements.length} conexoes/detalhes`);

  const allElements = [...primaryElements, ...secondaryElements];

  onProgress?.(95, `Finalizando... ${allElements.length} elementos totais`);
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

  applyStatusColors(statusMap) {
    // statusMap: { expressID -> statusKey }
    for (const [expressID, mesh] of this.meshMap.entries()) {
      const statusKey = statusMap.get(expressID);
      const cfg = statusKey ? STATUS_CONFIG[statusKey] : STATUS_CONFIG.NAO_INICIADO;
      if (cfg) {
        mesh.material.color.copy(cfg.color);
        mesh.material.opacity = cfg.opacity;
        mesh.material.needsUpdate = true;
      }
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

export default function MontexERP3DPage({ obraAtualData }) {
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
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showStats, setShowStats] = useState(false);
  const [erpPecas, setErpPecas] = useState([]);
  const [erpLoading, setErpLoading] = useState(true);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showFasteners, setShowFasteners] = useState(false);
  const [loadingStage, setLoadingStage] = useState(''); // 'primary' | 'secondary' | ''

  const fileInputRef = useRef(null);

  // ==============================================
  // FETCH ERP DATA
  // ==============================================
  useEffect(() => {
    async function loadERP() {
      setErpLoading(true);
      try {
        const [{ data: corte }, { data: producao }] = await Promise.all([
          supabase.from('materiais_corte').select('id, marca, peca, status_corte, perfil, peso_teorico, comprimento_mm'),
          supabase.from('pecas_producao').select('id, marca, nome, tipo, etapa, status, peso_total, perfil'),
        ]);
        const allPecas = [];
        (corte || []).forEach(c => {
          allPecas.push({
            marca: c.marca || c.peca || '',
            status: mapCorteStatus(c.status_corte),
            perfil: c.perfil,
            peso: parseFloat(c.peso_teorico) || 0,
            source: 'corte',
          });
        });
        (producao || []).forEach(p => {
          allPecas.push({
            marca: p.marca || p.nome || '',
            status: mapProducaoEtapa(p.etapa),
            perfil: p.perfil,
            peso: parseFloat(p.peso_total) || 0,
            source: 'producao',
          });
        });
        setErpPecas(allPecas);
      } catch (e) {
        console.warn('Erro ao carregar ERP:', e);
      }
      setErpLoading(false);
    }
    loadERP();
  }, []);

  function mapCorteStatus(st) {
    if (!st || st === 'aguardando' || st === 'programacao') return 'NAO_INICIADO';
    if (st === 'cortando' || st === 'em_corte') return 'CORTE';
    if (st === 'finalizado' || st === 'liberado') return 'FABRICACAO';
    return 'NAO_INICIADO';
  }

  function mapProducaoEtapa(etapa) {
    if (!etapa || etapa === 'fabricacao') return 'FABRICACAO';
    if (etapa === 'solda') return 'SOLDA';
    if (etapa === 'pintura') return 'PINTURA';
    if (etapa === 'expedicao' || etapa === 'expedido') return 'EXPEDICAO';
    if (etapa === 'finalizado' || etapa === 'entregue') return 'MONTADO';
    return 'FABRICACAO';
  }

  // ==============================================
  // MATCH IFC ELEMENTS TO ERP DATA
  // ==============================================
  const statusMap = useMemo(() => {
    const map = new Map();
    if (ifcElements.length === 0 || erpPecas.length === 0) return map;

    for (const el of ifcElements) {
      const elName = (el.name || '').toUpperCase().trim();
      // Try matching by marca (name contains marca)
      let bestMatch = null;
      for (const peca of erpPecas) {
        const marca = (peca.marca || '').toUpperCase().trim();
        if (!marca) continue;
        if (elName === marca || elName.includes(marca) || marca.includes(elName)) {
          bestMatch = peca;
          break;
        }
      }
      if (bestMatch) {
        map.set(el.expressID, bestMatch.status);
      }
    }
    return map;
  }, [ifcElements, erpPecas]);

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
      sm.applyStatusColors(statusMap);
    } else {
      sm.applyTypeColors();
    }
  }, [statusMap, colorMode, ifcElements]);

  // ==============================================
  // IFC FILE HANDLING
  // ==============================================
  // Helper para aplicar cores ERP a um set de elementos
  const applyColorsToScene = useCallback((sm, elements) => {
    if (!sm) return;
    if (colorMode === 'status') {
      const newMap = new Map();
      for (const el of elements) {
        const elName = (el.name || '').toUpperCase().trim();
        for (const peca of erpPecas) {
          const marca = (peca.marca || '').toUpperCase().trim();
          if (!marca) continue;
          if (elName === marca || elName.includes(marca) || marca.includes(elName)) {
            newMap.set(el.expressID, peca.status);
            break;
          }
        }
      }
      sm.applyStatusColors(newMap);
    } else {
      sm.applyTypeColors();
    }
  }, [erpPecas, colorMode]);

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
    sm.setVisibility(el => {
      // Parafusos controlados pelo toggle separado
      if (el.ifcType === IFC_TYPES.IFCMECHANICALFASTENER) return showFasteners;
      if (typeFilter !== 'ALL' && el.typeName !== typeFilter) return false;
      if (statusFilter !== 'ALL') {
        const st = statusMap.get(el.expressID) || 'NAO_INICIADO';
        if (st !== statusFilter) return false;
      }
      if (searchText) {
        const q = searchText.toUpperCase();
        if (!(el.name || '').toUpperCase().includes(q) && !(el.typeName || '').toUpperCase().includes(q)) return false;
      }
      return true;
    });
  }, [typeFilter, statusFilter, searchText, ifcElements, statusMap, showFasteners]);

  const handleFile = useCallback(async (file) => {
    if (!file || !file.name.match(/\.ifc$/i)) return;
    setShowUpload(false);
    setLoading(true);
    setProgress(0);
    setProgressText('Lendo arquivo...');
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

      // Persistir: IndexedDB (cache local) + Supabase Storage (online)
      saveIFCToLocal(file.name, buffer);
      uploadIFCToSupabase(buffer).then(ok => {
        if (ok) console.log('IFC persistido online com sucesso');
      });
    } catch (err) {
      console.error('Erro ao processar IFC:', err);
      setProgressText('Erro: ' + err.message);
    }
    setLoading(false);
  }, [erpPecas, colorMode, applyColorsToScene]);

  // ==============================================
  // AUTO-LOAD IFC: IndexedDB cache -> Supabase Storage fallback
  // ==============================================
  useEffect(() => {
    if (modelLoaded || loading) return;
    let cancelled = false;

    async function autoLoad() {
      // 1. Tentar IndexedDB (cache local rapido)
      const local = await loadIFCFromLocal();
      if (local && local.buffer && !cancelled) {
        console.log('Auto-load: IFC encontrado no IndexedDB:', local.fileName);
        const fakeFile = new File([local.buffer], local.fileName || 'model.ifc');
        handleFile(fakeFile);
        return;
      }

      // 2. Fallback: Supabase Storage (online)
      console.log('Auto-load: Tentando Supabase Storage...');
      const buffer = await downloadIFCFromSupabase();
      if (buffer && !cancelled) {
        console.log('Auto-load: IFC baixado do Supabase Storage');
        saveIFCToLocal('model.ifc', buffer);
        const fakeFile = new File([buffer], 'model.ifc');
        handleFile(fakeFile);
        return;
      }

      if (!cancelled) {
        console.log('Auto-load: Nenhum IFC persistido encontrado');
      }
    }

    const timer = setTimeout(autoLoad, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [modelLoaded, loading, handleFile]);

  // ==============================================
  // MOUSE INTERACTION
  // ==============================================
  const handleClick = useCallback((e) => {
    const sm = sceneManagerRef.current;
    if (!sm) return;
    const hit = sm.raycast(e);
    // Unhighlight previous
    if (hoveredRef.current) sm.highlightMesh(hoveredRef.current, false);
    if (hit) {
      sm.highlightMesh(hit, true);
      hoveredRef.current = hit;
      const el = hit.userData.element;
      const erpStatus = statusMap.get(el.expressID) || 'NAO_INICIADO';
      setSelectedElement({ ...el, erpStatus });
    } else {
      hoveredRef.current = null;
      setSelectedElement(null);
    }
  }, [statusMap]);

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

              {/* Model Info */}
              {stats && (
                <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4">
                  <h3 className="text-cyan-400 text-sm font-bold mb-3">Modelo IFC</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <div className="text-white text-lg font-bold">{stats.total.toLocaleString()}</div>
                      <div className="text-slate-400 text-[10px]">Elementos</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <div className="text-emerald-400 text-lg font-bold">{stats.matchRate}%</div>
                      <div className="text-slate-400 text-[10px]">Match ERP</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Filter by Type */}
              <div>
                <h3 className="text-white text-xs font-semibold mb-2">Filtrar por Tipo</h3>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs">
                  <option value="ALL">Todos os Tipos</option>
                  {stats && Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                    <option key={type} value={type}>{type} ({count})</option>
                  ))}
                </select>
              </div>

              {/* Filter by Status */}
              <div>
                <h3 className="text-white text-xs font-semibold mb-2">Filtrar por Status</h3>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs">
                  <option value="ALL">Todos os Status</option>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label} {stats ? `(${stats.byStatus[key] || 0})` : ''}</option>
                  ))}
                </select>
              </div>

              {/* Status Legend */}
              <div>
                <h3 className="text-white text-xs font-semibold mb-2">Legenda Status</h3>
                <div className="space-y-1.5">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: cfg.hex }} />
                      <span className="text-slate-300 flex-1">{cfg.label}</span>
                      {stats && <span className="text-slate-500">{stats.byStatus[key] || 0}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Type Distribution */}
              {stats && (
                <div>
                  <h3 className="text-white text-xs font-semibold mb-2">Distribuicao por Tipo</h3>
                  <div className="space-y-1.5">
                    {Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                      <div key={type} className="flex items-center gap-2 text-xs">
                        <span className="text-slate-300 flex-1">{type}</span>
                        <span className="text-slate-500">{count}</span>
                        <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-500/60 rounded-full" style={{ width: `${(count / stats.total) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ERP Data Status */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <h3 className="text-white text-xs font-semibold mb-2">Dados ERP</h3>
                <div className="text-xs text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Pecas no ERP</span>
                    <span className="text-white">{erpPecas.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Elementos IFC</span>
                    <span className="text-white">{ifcElements.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mapeados</span>
                    <span className="text-emerald-400">{stats?.matched || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3D VIEWPORT */}
          <div className="flex-1 relative overflow-hidden">
            <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" onClick={handleClick} />

            {/* Stats badges */}
            {modelLoaded && stats && (
              <div className="absolute top-3 left-14 flex gap-2 pointer-events-none">
                {[
                  { val: stats.total.toLocaleString(), label: 'Elementos', bg: 'from-slate-700/80 to-slate-800/80' },
                  { val: stats.matchRate + '%', label: 'ERP Match', bg: 'from-emerald-700/80 to-emerald-800/80' },
                  { val: Object.keys(stats.byType).length, label: 'Tipos', bg: 'from-blue-700/80 to-blue-800/80' },
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

                {/* ERP Status */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <h4 className="text-cyan-400 text-xs font-semibold mb-3">Status ERP</h4>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_CONFIG[selectedElement.erpStatus]?.hex || '#6b7280' }} />
                    <span className="text-white text-sm font-semibold">{STATUS_CONFIG[selectedElement.erpStatus]?.label || 'Nao Iniciado'}</span>
                  </div>

                  {/* Pipeline */}
                  <div className="space-y-1.5">
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                      const statusOrder = ['NAO_INICIADO', 'CORTE', 'FABRICACAO', 'SOLDA', 'PINTURA', 'EXPEDICAO', 'MONTADO'];
                      const currentIdx = statusOrder.indexOf(selectedElement.erpStatus);
                      const thisIdx = statusOrder.indexOf(key);
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
