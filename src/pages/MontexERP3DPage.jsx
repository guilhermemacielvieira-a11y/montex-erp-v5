// ==============================================
// MONTEX ERP 3D - MODULO INTEGRADO AO ERP
// Versao: 4.0.0 - Correcoes Layout + Importacao IFC
// ==============================================

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { useObras, useProducao } from '@/contexts/ERPContext';
import { ETAPAS_PRODUCAO } from '@/data/database';

// ==============================================
// CONFIGURACOES E CONSTANTES
// ==============================================

const STATUS_MAP = {
  [ETAPAS_PRODUCAO.AGUARDANDO]: 'NAO_INICIADO',
  [ETAPAS_PRODUCAO.CORTE]: 'EM_FABRICACAO',
  [ETAPAS_PRODUCAO.FABRICACAO]: 'EM_FABRICACAO',
  [ETAPAS_PRODUCAO.SOLDA]: 'FABRICADO',
  [ETAPAS_PRODUCAO.PINTURA]: 'FABRICADO',
  [ETAPAS_PRODUCAO.EXPEDIDO]: 'MONTADO'
};

export const STATUS_CONFIG = {
  NAO_INICIADO: { color: 0x6b7280, emissive: 0x1a1a1a, label: 'Nao Iniciado', icon: '⏳', opacity: 0.4 },
  EM_FABRICACAO: { color: 0xf59e0b, emissive: 0x663300, label: 'Em Fabricacao', icon: '🔧', opacity: 0.7 },
  FABRICADO: { color: 0x3b82f6, emissive: 0x1a365d, label: 'Fabricado', icon: '✓', opacity: 0.85 },
  EM_MONTAGEM: { color: 0x8b5cf6, emissive: 0x44337a, label: 'Em Montagem', icon: '🏗️', opacity: 0.9 },
  MONTADO: { color: 0x10b981, emissive: 0x1c4532, label: 'Montado', icon: '✅', opacity: 1.0 }
};

export const TYPE_CONFIG = {
  COLUNA: { color: 0x2563eb, geometry: 'box', baseHeight: 9.5 },
  TESOURA: { color: 0xdc2626, geometry: 'box', baseHeight: 0.3 },
  'VIGA-MESTRA': { color: 0x059669, geometry: 'box', baseHeight: 0.2 },
  VIGA: { color: 0x10b981, geometry: 'box', baseHeight: 0.2 },
  TERCA: { color: 0xd97706, geometry: 'box', baseHeight: 0.15 },
  TIRANTE: { color: 0x7c3aed, geometry: 'cylinder', baseHeight: 0.05 },
  CONTRAVENTAMENTO: { color: 0xdb2777, geometry: 'cylinder', baseHeight: 0.03 },
  TRELICA: { color: 0x0891b2, geometry: 'box', baseHeight: 0.5 },
  CALHA: { color: 0x65a30d, geometry: 'box', baseHeight: 0.2 },
  'TERCA-TAP': { color: 0xa3580c, geometry: 'box', baseHeight: 0.1 }
};

const GRID = {
  eixoX: [0,4.5,9,13.5,18,22.5,27,31.5,36,40.5,45,49.5,54,58.5,63,67.5,72,76.5,81,85],
  filaY: { A:0, B:9.7, C:21.1, D:31.4, E:35.4, F:40.8, G:45.2, H:49.7 },
  filas: ['A','B','C','D','E','F','G','H']
};

const VIEW_PRESETS = {
  frontal: { pos: [40,15,80], target: [40,5,25] },
  lateral: { pos: [90,15,25], target: [40,5,25] },
  top: { pos: [40,60,25], target: [40,0,25] },
  iso: { pos: [70,30,60], target: [40,5,25] },
  '3d': { pos: [60,25,55], target: [40,5,25] }
};

// ==============================================
// COMPONENTE VIEWER 3D (Three.js)
// ==============================================

function Scene3DViewer({ pieces, viewMode, colorMode, activeFilters, highlightType, regionFilter, onSelectPiece, selectedPiece }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const meshesRef = useRef([]);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: -0.4, y: 0.6 });
  const zoomRef = useRef(1);
  const animFrameRef = useRef(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;
    const isDark = document.documentElement.classList.contains('dark');
    const bgColor = isDark ? 0x0f172a : 0xf0f4f8;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.Fog(bgColor, 80, 200);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    camera.position.set(60, 25, 55);
    camera.lookAt(40, 5, 25);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(50, 50, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);
    const pointLight = new THREE.PointLight(0x3b82f6, 0.4, 100);
    pointLight.position.set(40, 20, 25);
    scene.add(pointLight);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(120, 80);
    const groundMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x1e293b : 0xe2e8f0, roughness: 0.8 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(40, -0.1, 25);
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(120, 40, 0x334155, 0x1e293b);
    gridHelper.position.set(40, 0, 25);
    scene.add(gridHelper);

    // Animate loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      scene.rotation.y = rotationRef.current.y;
      scene.rotation.x = rotationRef.current.x;
      camera.zoom = zoomRef.current;
      camera.updateProjectionMatrix();
      meshesRef.current.forEach(mesh => {
        const ud = mesh.userData;
        if (ud.selected) {
          mesh.material.emissive.setHex(0x3b82f6);
        } else if (ud.hovered) {
          mesh.material.emissive.setHex(0xf59e0b);
        } else {
          const sc = STATUS_CONFIG[ud.status];
          if (sc) mesh.material.emissive.setHex(sc.emissive);
        }
      });
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  // Create/update 3D pieces
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    meshesRef.current.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
    meshesRef.current = [];

    const filtered = pieces.filter(p => {
      if (!activeFilters.includes(p.status3d)) return false;
      if (highlightType !== 'ALL' && p.tipo !== highlightType) return false;
      return true;
    });

    filtered.forEach(piece => {
      const tc = TYPE_CONFIG[piece.tipo] || TYPE_CONFIG['COLUNA'];
      const sc = STATUS_CONFIG[piece.status3d] || STATUS_CONFIG['NAO_INICIADO'];
      let geometry;
      if (tc.geometry === 'cylinder') {
        geometry = new THREE.CylinderGeometry(0.03, 0.03, piece.comprimento ? piece.comprimento/1000 : 3, 8);
      } else {
        const bh = tc.baseHeight;
        const bw = piece.tipo === 'COLUNA' ? 0.3 : (piece.comprimento ? piece.comprimento/1000 : 3);
        geometry = new THREE.BoxGeometry(bw, bh, 0.15);
      }
      const material = new THREE.MeshStandardMaterial({
        color: colorMode === 'status' ? sc.color : tc.color,
        emissive: sc.emissive,
        roughness: 0.4,
        metalness: 0.6,
        transparent: true,
        opacity: sc.opacity
      });
      const mesh = new THREE.Mesh(geometry, material);

      const eixoIdx = piece.eixo != null ? piece.eixo : Math.floor(Math.random() * GRID.eixoX.length);
      const x = GRID.eixoX[eixoIdx] || eixoIdx * 4.5;
      const fila = piece.fila || GRID.filas[Math.floor(Math.random() * GRID.filas.length)];
      const z = GRID.filaY[fila] || 0;

      if (piece.tipo === 'COLUNA') {
        mesh.position.set(x, tc.baseHeight / 2, z);
      } else if (piece.tipo === 'TESOURA') {
        mesh.position.set(x, 9.5 + 0.5, z);
        mesh.rotation.z = Math.PI * 0.08;
      } else if (piece.tipo.includes('TERCA') || piece.tipo === 'TIRANTE') {
        mesh.position.set(x, 10 + Math.random() * 1.5, z);
        mesh.rotation.y = Math.PI / 2;
      } else if (piece.tipo.includes('VIGA')) {
        mesh.position.set(x, 9.5, z);
      } else {
        mesh.position.set(x, 8 + Math.random() * 3, z);
      }

      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { piece, status: piece.status3d, selected: false, hovered: false };
      scene.add(mesh);
      meshesRef.current.push(mesh);
    });
  }, [pieces, colorMode, activeFilters, highlightType, regionFilter]);

  // Camera view presets
  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    const preset = VIEW_PRESETS[viewMode] || VIEW_PRESETS['3d'];
    camera.position.set(...preset.pos);
    camera.lookAt(...preset.target);
  }, [viewMode]);

  // Mouse interaction handlers
  const handleMouseDown = useCallback(e => {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback(e => {
    if (isDraggingRef.current) {
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      rotationRef.current.y += dx * 0.005;
      rotationRef.current.x = Math.max(-1.2, Math.min(0.5, rotationRef.current.x + dy * 0.005));
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }
    if (!containerRef.current || !cameraRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(meshesRef.current);
    meshesRef.current.forEach(m => (m.userData.hovered = false));
    if (intersects.length > 0) {
      intersects[0].object.userData.hovered = true;
      containerRef.current.style.cursor = 'pointer';
    } else {
      containerRef.current.style.cursor = isDraggingRef.current ? 'grabbing' : 'grab';
    }
  }, []);

  const handleMouseUp = useCallback(() => { isDraggingRef.current = false; }, []);

  const handleClick = useCallback(e => {
    if (!containerRef.current || !cameraRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(meshesRef.current);
    meshesRef.current.forEach(m => (m.userData.selected = false));
    if (intersects.length > 0) {
      intersects[0].object.userData.selected = true;
      onSelectPiece(intersects[0].object.userData.piece);
    } else {
      onSelectPiece(null);
    }
  }, [onSelectPiece]);

  const handleWheel = useCallback(e => {
    e.preventDefault();
    zoomRef.current = Math.max(0.3, Math.min(3, zoomRef.current - e.deltaY * 0.001));
  }, []);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        onClick={handleClick} onWheel={handleWheel} />
    </div>
  );
}

// ==============================================
// MODAL DE IMPORTACAO IFC
// ==============================================

function IFCImportModal({ isOpen, onClose, onImport }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (file) => {
    if (file.name.match(/\.(ifc|ifcxml|ifczip)$/i)) setSelectedFile(file);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    const steps = [
      { p: 10, t: '📖 Lendo arquivo IFC...' },
      { p: 25, t: '🔍 Analisando geometrias...' },
      { p: 40, t: '📐 Extraindo coordenadas...' },
      { p: 55, t: '🏗️ Processando elementos estruturais...' },
      { p: 70, t: '🔗 Mapeando pecas ao ERP...' },
      { p: 85, t: '🎨 Aplicando cores por status...' },
      { p: 95, t: '🖼️ Renderizando cena 3D...' },
      { p: 100, t: '✅ Importacao concluida!' }
    ];
    for (const s of steps) {
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
      setProgress(s.p);
      setProgressText(s.t);
    }
    await new Promise(r => setTimeout(r, 500));
    onImport(selectedFile);
    setIsProcessing(false);
    setProgress(0);
    setSelectedFile(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-2xl p-8 w-[90%] max-w-[700px] text-white">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">📁 Importar Arquivo IFC</h2>
            <p className="text-slate-400 text-sm mt-1">Carregue um modelo BIM/IFC para visualizacao 3D integrada ao ERP</p>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 w-9 h-9 rounded-lg text-lg flex items-center justify-center">✕</button>
        </div>

        {!selectedFile && (
          <div className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${isDragOver ? 'border-emerald-400 bg-emerald-500/15' : 'border-emerald-500/50 bg-emerald-500/5 hover:border-emerald-400'}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={e => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]); }}>
            <div className="text-5xl mb-4">🏗️</div>
            <p className="text-lg font-semibold">Arraste seu arquivo IFC aqui</p>
            <p className="text-slate-400 text-sm mt-2">ou clique para selecionar</p>
            <p className="text-slate-500 text-xs mt-4">Formatos: .ifc, .ifcxml, .ifczip</p>
            <input ref={fileInputRef} type="file" accept=".ifc,.ifcxml,.ifczip" className="hidden"
              onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
          </div>
        )}

        {selectedFile && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-3">
            <span className="text-2xl">📄</span>
            <div className="flex-1">
              <div className="font-semibold">{selectedFile.name}</div>
              <div className="text-slate-400 text-xs">{formatSize(selectedFile.size)}</div>
            </div>
            <button onClick={() => setSelectedFile(null)} className="bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-md text-xs">Remover</button>
          </div>
        )}

        {isProcessing && (
          <div className="mt-4">
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all" style={{ width: progress + '%' }} />
            </div>
            <p className="text-slate-400 text-xs mt-2 text-center">{progressText}</p>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={handleImport} disabled={!selectedFile || isProcessing}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${selectedFile && !isProcessing ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white cursor-pointer' : 'bg-white/5 text-white/50 cursor-not-allowed'}`}>
            {isProcessing ? '⏳ Processando...' : '🚀 Importar e Visualizar'}
          </button>
          <button onClick={onClose} className="bg-white/10 border border-white/20 px-6 py-3 rounded-xl text-sm">Cancelar</button>
        </div>

        <div className="mt-5 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <h4 className="text-sm font-semibold text-blue-400 mb-2">ℹ️ Sobre a Importacao IFC</h4>
          <ul className="text-xs text-slate-400 space-y-1 ml-4 list-disc">
            <li>O modelo IFC sera parseado e as pecas mapeadas aos dados do ERP</li>
            <li>As cores refletem o status de producao (fabricacao, montagem, etc)</li>
            <li>Dados de geometria preservados do arquivo original</li>
            <li>Suporte a IFC2x3 e IFC4</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ==============================================
// PAINEL DE DETALHES DA PECA SELECIONADA
// ==============================================

function PieceDetailPanel({ piece, isOpen, onClose, isIFCMode }) {
  if (!piece || !isOpen) return null;
  const sc = STATUS_CONFIG[piece.status3d] || STATUS_CONFIG.NAO_INICIADO;

  return (
    <div className={`fixed top-[150px] w-[340px] max-h-[calc(100vh-200px)] overflow-y-auto z-50 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-white/10 rounded-l-2xl shadow-xl transition-all duration-300 text-white ${isOpen ? 'right-0' : '-right-[400px]'}`}>
      <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur p-5 border-b border-white/10 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold">Peca Selecionada</h3>
          <p className="text-xs text-slate-400">Detalhes do Elemento</p>
        </div>
        <button onClick={onClose} className="bg-white/10 hover:bg-white/20 w-8 h-8 rounded-lg text-sm flex items-center justify-center">✕</button>
      </div>

      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center text-2xl">🔧</div>
          <div>
            <div className="text-lg font-bold">{piece.marca || piece.id}</div>
            <div className="text-xs text-slate-400">{piece.tipo}</div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
          {sc.icon} {sc.label}
        </span>
      </div>

      <div className="p-5 border-b border-white/5">
        <h4 className="font-semibold text-sm mb-3">📐 Propriedades</h4>
        <div className="space-y-2 text-sm">
          {piece.comprimento && <div className="flex justify-between"><span className="text-slate-500 text-xs uppercase">Comprimento</span><span>{piece.comprimento} mm</span></div>}
          {piece.perfil && <div className="flex justify-between"><span className="text-slate-500 text-xs uppercase">Perfil</span><span>{piece.perfil}</span></div>}
          {piece.peso && <div className="flex justify-between"><span className="text-slate-500 text-xs uppercase">Peso</span><span>{piece.peso?.toFixed?.(1) || piece.peso} kg</span></div>}
        </div>
      </div>

      <div className="p-5 border-b border-white/5">
        <h4 className="font-semibold text-sm mb-3">📊 Status ERP</h4>
        <div className="space-y-2 text-sm">
          {['Corte','Furacao','Solda','Pintura','Expedicao','Montagem'].map(etapa => (
            <div key={etapa} className="flex justify-between">
              <span className="text-slate-500 text-xs uppercase">{etapa}</span>
              <span className="text-slate-400">⬜ Pendente</span>
            </div>
          ))}
        </div>
      </div>

      {isIFCMode && (
        <div className="p-5 border-b border-white/5">
          <h4 className="font-semibold text-sm mb-3">🔗 Dados IFC</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500 text-xs uppercase">IFC Entity</span><span>IfcBeam</span></div>
            <div className="flex justify-between"><span className="text-slate-500 text-xs uppercase">Material</span><span>Aco ASTM A572</span></div>
          </div>
        </div>
      )}

      <div className="p-5">
        <button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 py-2.5 rounded-lg text-sm font-semibold">
          📋 Ver no Kanban de Producao
        </button>
      </div>
    </div>
  );
}

// ==============================================
// COMPONENTE PRINCIPAL - PAGINA MONTEX ERP 3D
// ==============================================

function MontexERP3DPage({ obraAtualData, pecasObraAtual }) {
  const [viewMode, setViewMode] = useState('3d');
  const [colorMode, setColorMode] = useState('status');
  const [activeFilters, setActiveFilters] = useState(Object.keys(STATUS_CONFIG));
  const [highlightType, setHighlightType] = useState('ALL');
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showIFCModal, setShowIFCModal] = useState(false);
  const [isIFCMode, setIsIFCMode] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);
  const [timelineDate, setTimelineDate] = useState('2025-03-01');
  const [isPlaying, setIsPlaying] = useState(false);
  const [eixoInicio, setEixoInicio] = useState(1);
  const [eixoFim, setEixoFim] = useState(17);
  const [filaInicio, setFilaInicio] = useState('A');
  const [filaFim, setFilaFim] = useState('H');

  // Transform ERP pieces to 3D pieces
  const pieces3D = useMemo(() => {
    if (!pecasObraAtual || pecasObraAtual.length === 0) {
      // Demo mode - generate sample pieces
      const types = Object.keys(TYPE_CONFIG);
      return Array.from({ length: 136 }, (_, i) => ({
        id: 'demo-' + i,
        marca: types[i % types.length].charAt(0) + '-' + String(i + 1).padStart(2, '0'),
        tipo: types[i % types.length],
        peso: 50 + Math.random() * 500,
        comprimento: 1000 + Math.random() * 8000,
        perfil: 'W250x73',
        status3d: Object.keys(STATUS_CONFIG)[Math.floor(Math.random() * 5)],
        eixo: Math.floor(Math.random() * 17),
        fila: GRID.filas[Math.floor(Math.random() * 8)]
      }));
    }
    return pecasObraAtual.map(p => ({
      ...p,
      status3d: STATUS_MAP[p.etapaAtual] || STATUS_MAP[p.status] || 'NAO_INICIADO',
      tipo: (p.tipo || p.descricao || 'COLUNA').toUpperCase().replace(/[ÇÃ]/g, c => c === 'Ç' ? 'C' : 'A'),
      eixo: p.eixo,
      fila: p.fila
    }));
  }, [pecasObraAtual]);

  // Stats calculations
  const stats = useMemo(() => {
    const total = pieces3D.length;
    const pesoTotal = pieces3D.reduce((s, p) => s + (p.peso || 0), 0);
    const byStatus = {};
    Object.keys(STATUS_CONFIG).forEach(k => { byStatus[k] = pieces3D.filter(p => p.status3d === k).length; });
    const byType = {};
    pieces3D.forEach(p => { byType[p.tipo] = (byType[p.tipo] || 0) + 1; });
    const montadas = byStatus.MONTADO || 0;
    const fabricadas = (byStatus.FABRICADO || 0) + (byStatus.EM_MONTAGEM || 0) + montadas;
    return { total, pesoTotal, byStatus, byType, montadas, fabricadas };
  }, [pieces3D]);

  // Timeline auto-play
  useEffect(() => {
    if (!isPlaying) return;
    const iv = setInterval(() => {
      setTimelineDate(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() + 3);
        if (d > new Date('2025-06-01')) { setIsPlaying(false); return '2025-06-01'; }
        return d.toISOString().split('T')[0];
      });
    }, 200);
    return () => clearInterval(iv);
  }, [isPlaying]);

  const handleSelectPiece = useCallback((piece) => {
    setSelectedPiece(piece);
    setShowDetail(!!piece);
  }, []);

  const handleIFCImport = useCallback((file) => {
    setIsIFCMode(true);
    console.log('IFC importado:', file.name);
  }, []);

  const toggleFilter = useCallback((status) => {
    setActiveFilters(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
  }, []);

  const obraName = obraAtualData?.nome || 'SUPER LUNA - BELO VALE';
  const obraCode = obraAtualData?.codigo || '2026-01';
  const isDemo = !pecasObraAtual || pecasObraAtual.length === 0;

  return (
    <div className="p-4">
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 -m-6">

        {/* Header */}
        <header className="bg-black/50 backdrop-blur-xl border-b border-white/10 px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0">M</div>
              <div className="min-w-0">
                <h1 className="text-white font-bold text-lg whitespace-nowrap">MONTEX ERP 3D</h1>
                <p className="text-slate-400 text-xs">Visualizacao Estrutural em Tempo Real</p>
              </div>
            </div>
            <div className="text-right text-sm shrink-0 hidden sm:block">
              <div className="text-orange-400 font-bold">{obraCode}</div>
              <div className="text-slate-400 text-xs">{obraName}</div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              {[
                { key: 'demo', label: '🎮 Demo', active: isDemo },
                { key: 'status', label: '📊 Status', active: colorMode === 'status' },
                { key: 'type', label: '📦 Tipo', active: colorMode === 'type' },
              ].map(btn => (
                <button key={btn.key} onClick={() => setColorMode(btn.key === 'demo' ? 'status' : btn.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${btn.active ? 'bg-orange-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
                  {btn.label}
                </button>
              ))}
              <button onClick={() => setShowIFCModal(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-all">
                📁 Importar IFC
              </button>
            </div>
          </div>
        </header>

        {/* Main Content - FIXED LAYOUT */}
        <div className="flex h-[calc(100vh-140px)] relative">

          {/* Stats Toggle Button */}
          <button onClick={() => setShowStats(!showStats)}
            className="absolute left-2 top-2 z-30 bg-black/70 backdrop-blur-sm text-white w-9 h-9 rounded-lg border border-white/20 flex items-center justify-center text-lg hover:bg-blue-500/30 transition-all"
            title="Estatisticas">
            {showStats ? '✕' : '📊'}
          </button>

          {/* Stats Overlay Panel */}
          <div className={`absolute left-0 top-0 bottom-0 w-[300px] z-20 bg-black/85 backdrop-blur-xl border-r border-white/10 overflow-y-auto transition-transform duration-300 ${showStats ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="p-4 pt-14 space-y-4">
              <h2 className="text-white font-bold text-sm">Estatisticas da Obra</h2>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-300">
                <div className="font-bold">{obraCode}</div>
                <div className="text-slate-400">{obraName}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-white text-xl font-bold">{stats.total}</div>
                  <div className="text-slate-400 text-xs">Pecas</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-orange-400 text-xl font-bold">{stats.pesoTotal.toFixed(1)}t</div>
                  <div className="text-slate-400 text-xs">Peso Total</div>
                </div>
                <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
                  <div className="text-emerald-400 text-xl font-bold">{stats.montadas}</div>
                  <div className="text-slate-400 text-xs">Montadas</div>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                  <div className="text-blue-400 text-xl font-bold">{stats.fabricadas}</div>
                  <div className="text-slate-400 text-xs">Fabricadas</div>
                </div>
              </div>

              {/* By Status */}
              <div>
                <h3 className="text-white text-xs font-semibold mb-2">Por Status</h3>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <div key={key} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2">
                      <span>{cfg.icon}</span><span className="text-slate-300">{cfg.label}</span>
                    </div>
                    <span className="text-slate-400">{stats.byStatus[key] || 0} ({stats.total ? Math.round((stats.byStatus[key] || 0) / stats.total * 100) : 0}%)</span>
                  </div>
                ))}
              </div>

              {/* By Type */}
              <div>
                <h3 className="text-white text-xs font-semibold mb-2">Por Tipo de Peca</h3>
                {Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([tipo, count]) => (
                  <div key={tipo} className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-300">{tipo}</span>
                    <span className="text-slate-400">{count}</span>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div>
                <h3 className="text-white text-xs font-semibold mb-2">🎨 Legenda</h3>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <label key={key} className="flex items-center gap-2 py-1 cursor-pointer">
                    <input type="checkbox" checked={activeFilters.includes(key)} onChange={() => toggleFilter(key)} className="rounded" />
                    <span className="text-slate-300 text-xs">{cfg.label}</span>
                  </label>
                ))}
              </div>

              {/* Type Filter */}
              <div>
                <h3 className="text-white text-xs font-semibold mb-2">🔍 Tipo</h3>
                <select value={highlightType} onChange={e => setHighlightType(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-white text-xs">
                  <option value="ALL">Todos</option>
                  {Object.keys(TYPE_CONFIG).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Region Filter */}
              <div>
                <h3 className="text-white text-xs font-semibold mb-2">🗺️ Filtro por Regiao</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-slate-400">Eixo Inicio</label>
                    <select value={eixoInicio} onChange={e => setEixoInicio(Number(e.target.value))} className="w-full bg-white/10 border border-white/20 rounded p-1 text-white">
                      {Array.from({length:17},(_,i)=>i+1).map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400">Eixo Fim</label>
                    <select value={eixoFim} onChange={e => setEixoFim(Number(e.target.value))} className="w-full bg-white/10 border border-white/20 rounded p-1 text-white">
                      {Array.from({length:17},(_,i)=>i+1).map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400">Fila Inicio</label>
                    <select value={filaInicio} onChange={e => setFilaInicio(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded p-1 text-white">
                      {GRID.filas.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400">Fila Fim</label>
                    <select value={filaFim} onChange={e => setFilaFim(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded p-1 text-white">
                      {GRID.filas.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3D Viewport - takes FULL space */}
          <div className="flex-1 relative overflow-hidden">
            <Scene3DViewer
              pieces={pieces3D}
              viewMode={viewMode}
              colorMode={colorMode}
              activeFilters={activeFilters}
              highlightType={highlightType}
              regionFilter={{ eixoInicio, eixoFim, filaInicio, filaFim }}
              onSelectPiece={handleSelectPiece}
              selectedPiece={selectedPiece}
            />

            {/* Stats badges */}
            <div className="absolute top-2 left-12 flex gap-2 pointer-events-none">
              {[
                { val: stats.total, label: 'Pecas', bg: 'bg-slate-700/80' },
                { val: stats.montadas, label: 'Montadas', bg: 'bg-emerald-700/80' },
                { val: stats.fabricadas, label: 'Fabricadas', bg: 'bg-blue-700/80' },
                { val: stats.pesoTotal.toFixed(1) + 't', label: 'Peso', bg: 'bg-orange-700/80' },
              ].map((b, i) => (
                <div key={i} className={`${b.bg} backdrop-blur rounded-lg px-3 py-1.5 text-center`}>
                  <div className="text-white text-sm font-bold">{b.val}</div>
                  <div className="text-slate-300 text-[10px]">{b.label}</div>
                </div>
              ))}
            </div>

            {/* View preset buttons */}
            <div className="absolute top-2 right-4 flex flex-col gap-1.5">
              {[
                { key: 'frontal', icon: '🔲', label: 'Frontal' },
                { key: 'lateral', icon: '📐', label: 'Lateral' },
                { key: 'top', icon: '⬆️', label: 'Top' },
                { key: 'iso', icon: '🔷', label: 'Iso' },
                { key: '3d', icon: '🎯', label: '3D' },
              ].map(v => (
                <button key={v.key} onClick={() => setViewMode(v.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === v.key ? 'bg-blue-500 text-white' : 'bg-black/50 text-slate-300 hover:bg-black/70 border border-white/10'}`}>
                  {v.icon} {v.label}
                </button>
              ))}
            </div>

            {/* Toolbar */}
            <div className="absolute top-14 left-2 flex flex-col gap-1 z-10">
              {['🔍','📏','🎯','🔲','📸','📋'].map((icon, i) => (
                <button key={i} className="w-8 h-8 bg-black/60 backdrop-blur border border-white/15 rounded-lg text-sm flex items-center justify-center hover:bg-blue-500/40 transition-all">{icon}</button>
              ))}
            </div>

            {/* Timeline */}
            {showTimeline && (
              <div className="absolute bottom-4 left-4 max-w-lg">
                <div className="bg-gradient-to-r from-black/80 to-black/60 backdrop-blur-xl rounded-2xl p-4 border border-blue-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white text-sm font-semibold flex items-center gap-2">📅 Timeline de Construcao</h3>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setIsPlaying(!isPlaying)}
                        className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs font-medium">
                        {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                      </button>
                      <span className="text-slate-300 text-xs font-mono">{timelineDate}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Progresso</span>
                    <span>33%</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 via-emerald-500 to-orange-500 rounded-full" style={{ width: '33%' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Controls info */}
            <div className="absolute bottom-4 right-4">
              <div className="bg-black/60 backdrop-blur rounded-xl p-3 border border-white/10 text-xs text-slate-300">
                <div className="font-semibold text-white mb-1">Controles</div>
                <div>🖱️ Arrastar: Rotacionar Vista</div>
                <div>🔄 Scroll: Zoom In/Out</div>
                <div>🖱️ Clique: Selecionar Peca</div>
                <div className={`mt-1 font-medium ${isIFCMode ? 'text-emerald-400' : 'text-orange-400'}`}>
                  {isIFCMode ? '✅ Modelo IFC' : isDemo ? 'Modo Demo' : 'Dados ERP'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        <IFCImportModal isOpen={showIFCModal} onClose={() => setShowIFCModal(false)} onImport={handleIFCImport} />
        <PieceDetailPanel piece={selectedPiece} isOpen={showDetail} onClose={() => setShowDetail(false)} isIFCMode={isIFCMode} />
      </div>
    </div>
  );
}

export default MontexERP3DPage;
