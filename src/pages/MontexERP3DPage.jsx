// ============================================
// MONTEX ERP 3D - MÓDULO INTEGRADO AO ERP
// Versão: 3.0.0 - Visualizações Avançadas
// ============================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useObras, useProducao } from '@/contexts/ERPContext';
import { ETAPAS_PRODUCAO } from '@/data/database';

// ============================================
// CONFIGURAÇÕES E CONSTANTES
// ============================================

// Mapeamento de ETAPAS_PRODUCAO (ERP) para STATUS 3D
const STATUS_MAP = {
  [ETAPAS_PRODUCAO.AGUARDANDO]: 'NAO_INICIADO',
  [ETAPAS_PRODUCAO.CORTE]: 'EM_FABRICACAO',
  [ETAPAS_PRODUCAO.FABRICACAO]: 'EM_FABRICACAO',
  [ETAPAS_PRODUCAO.SOLDA]: 'FABRICADO',
  [ETAPAS_PRODUCAO.PINTURA]: 'FABRICADO',
  [ETAPAS_PRODUCAO.EXPEDIDO]: 'MONTADO'
};

// Status 3D com cores e configurações visuais - Paleta melhorada
export const STATUS_CONFIG = {
  NAO_INICIADO: { color: 0x6b7280, emissive: 0x1a1a1a, label: 'Não Iniciado', icon: '⏳', opacity: 0.4 },
  EM_FABRICACAO: { color: 0xf59e0b, emissive: 0x663300, label: 'Em Fabricação', icon: '🔧', opacity: 0.7 },
  FABRICADO: { color: 0x3b82f6, emissive: 0x1a365d, label: 'Fabricado', icon: '✓', opacity: 0.85 },
  EM_MONTAGEM: { color: 0x8b5cf6, emissive: 0x44337a, label: 'Em Montagem', icon: '🏗️', opacity: 0.9 },
  MONTADO: { color: 0x10b981, emissive: 0x1c4532, label: 'Montado', icon: '✅', opacity: 1.0 }
};

// Configuração de tipos de elementos
export const TYPE_CONFIG = {
  COLUNA: { color: 0x2563eb, geometry: 'box', baseHeight: 9.5 },
  TESOURA: { color: 0xdc2626, geometry: 'box', baseHeight: 0.3 },
  'VIGA-MESTRA': { color: 0x059669, geometry: 'box', baseHeight: 0.2 },
  VIGA: { color: 0x10b981, geometry: 'box', baseHeight: 0.2 },
  TERÇA: { color: 0xd97706, geometry: 'box', baseHeight: 0.15 },
  TIRANTE: { color: 0x7c3aed, geometry: 'cylinder', baseHeight: 0.05 },
  CONTRAVENTAMENTO: { color: 0xdb2777, geometry: 'cylinder', baseHeight: 0.03 },
  TRELIÇA: { color: 0x0891b2, geometry: 'box', baseHeight: 0.5 },
  CALHA: { color: 0x65a30d, geometry: 'box', baseHeight: 0.2 },
  'TERÇA-TAP': { color: 0xea580c, geometry: 'box', baseHeight: 0.1 }
};

// Grid padrão para geração de elementos
const GRID = {
  eixoX: [0, 4.5, 9.0, 13.5, 18.0, 22.5, 27.0, 31.5, 36.0, 40.5, 45.0, 49.5, 54.0, 58.5, 63.0, 67.5, 72.0, 76.5, 81.0, 85.0],
  filaY: { A: 0, B: 9.7, C: 21.1, D: 31.4, E: 35.4, F: 40.8, G: 45.2, H: 49.7 },
  filas: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
  eixos: Array.from({length: 20}, (_, i) => i + 1)
};

// ============================================
// FUNÇÃO PARA CONVERTER PEÇAS DO ERP PARA ELEMENTOS 3D
// ============================================

const convertPecasToElements = (pecas, _obraData) => {
  if (!pecas || pecas.length === 0) {
    return generateDemoElements(); // Fallback para demo
  }

  return pecas.map((peca, idx) => {
    // Mapear etapa ERP para status 3D
    const status3D = STATUS_MAP[peca.etapa] || 'NAO_INICIADO';

    // Calcular posição baseada no índice e tipo
    const tipo = peca.tipo?.toUpperCase() || 'VIGA';
    const typeConfig = TYPE_CONFIG[tipo] || TYPE_CONFIG.VIGA;

    // Distribuir elementos no grid
    const eixoIdx = idx % GRID.eixoX.length;
    const filaIdx = Math.floor(idx / GRID.eixoX.length) % GRID.filas.length;

    return {
      id: peca.id || idx + 1,
      type: tipo,
      profile: peca.perfil || 'W200X19.3',
      x: GRID.eixoX[eixoIdx] || idx * 5,
      y: GRID.filaY[GRID.filas[filaIdx]] || idx * 3,
      z: tipo === 'COLUNA' ? 0 : 7 + Math.random() * 2,
      length: peca.comprimento || typeConfig.baseHeight,
      width: 0.2 + Math.random() * 0.2,
      depth: 0.1 + Math.random() * 0.1,
      rotation: tipo === 'COLUNA' ? [0, 0, 0] : [0, 0, Math.random() * 0.5],
      posicao: peca.posicao || `${eixoIdx + 1}/${GRID.filas[filaIdx]}`,
      eixo: eixoIdx + 1,
      fila: GRID.filas[filaIdx],
      peso: peca.peso || 100,
      status: status3D,
      etapa_producao: peca.etapa,
      marca: peca.marca,
      quantidade: peca.quantidade,
      data_fabricacao: peca.dataCorte,
      data_montagem: peca.etapa === ETAPAS_PRODUCAO.EXPEDIDO ? new Date().toISOString().split('T')[0] : null
    };
  });
};

// ============================================
// GERADOR DE ELEMENTOS DEMO (FALLBACK)
// ============================================

const generateDemoElements = () => {
  const elements = [];
  let id = 1;
  const { eixoX, filaY, filas } = GRID;

  // COLUNAS
  for (let ei = 0; ei < 17; ei += 4) {
    filas.forEach((fila, fi) => {
      if (fi % 2 === 0) {
        const prog = Math.random();
        elements.push({
          id: id++, type: 'COLUNA', profile: 'W410X53',
          x: eixoX[ei], y: filaY[fila], z: 0,
          length: 9.5, width: 0.4, depth: 0.4, rotation: [0, 0, 0],
          posicao: `${ei + 1}/${fila}`, eixo: ei + 1, fila,
          peso: 598,
          status: prog > 0.7 ? 'MONTADO' : prog > 0.5 ? 'EM_MONTAGEM' : prog > 0.3 ? 'FABRICADO' : 'EM_FABRICACAO'
        });
      }
    });
  }

  // TESOURAS
  for (let i = 0; i < 16; i += 2) {
    filas.forEach((fila, fIdx) => {
      if (fIdx < filas.length - 1) {
        const nextFila = filas[fIdx + 1];
        const prog = Math.random();
        elements.push({
          id: id++, type: 'TESOURA', profile: 'W250X25.3',
          x: eixoX[i], y: (filaY[fila] + filaY[nextFila]) / 2, z: 8.5,
          length: filaY[nextFila] - filaY[fila], width: 0.25, depth: 0.1,
          rotation: [0, 0, Math.PI / 2],
          posicao: `${i + 1}/${fila}-${nextFila}`, eixo: i + 1, fila,
          peso: 350,
          status: prog > 0.6 ? 'FABRICADO' : prog > 0.3 ? 'EM_FABRICACAO' : 'NAO_INICIADO'
        });
      }
    });
  }

  // VIGAS
  filas.filter((_, i) => i % 3 === 0).forEach(fila => {
    for (let i = 0; i < 15; i += 8) {
      elements.push({
        id: id++, type: 'VIGA-MESTRA', profile: 'W200X19.3',
        x: (eixoX[i] + eixoX[i + 4]) / 2, y: filaY[fila], z: 7.5,
        length: 18, width: 0.2, depth: 0.1,
        rotation: [0, 0, 0],
        posicao: `${i + 1}-${i + 5}/${fila}`, eixo: i + 1, fila,
        peso: 973,
        status: Math.random() > 0.5 ? 'FABRICADO' : 'EM_FABRICACAO'
      });
    }
  });

  // TERÇAS
  for (let i = 0; i < 17; i += 2) {
    for (let j = 0; j < 6; j++) {
      const yPos = j * 8;
      if (yPos <= 49.7) {
        elements.push({
          id: id++, type: 'TERÇA', profile: 'UE200X75X20X2',
          x: eixoX[i], y: yPos, z: 9.0,
          length: 4.5, width: 0.2, depth: 0.075,
          rotation: [0, 0, 0],
          posicao: `${i + 1}/T${j + 1}`, eixo: i + 1, fila: 'T' + (j + 1),
          peso: 28,
          status: 'NAO_INICIADO'
        });
      }
    }
  }

  return elements;
};

// ============================================
// HELPER: Interpolação linear (Lerp)
// ============================================

const lerp = (start, end, t) => start + (end - start) * Math.max(0, Math.min(1, t));

// ============================================
// HELPER: Presets de câmera
// ============================================

const CAMERA_PRESETS = {
  frontal: { pos: { x: 40, y: 25, z: -80 }, target: { x: 40, y: 25, z: 5 } },
  lateral: { pos: { x: 120, y: 30, z: 25 }, target: { x: 40, y: 25, z: 5 } },
  superior: { pos: { x: 40, y: 120, z: 25 }, target: { x: 40, y: 25, z: 5 } },
  isometrica: { pos: { x: 100, y: 60, z: 100 }, target: { x: 40, y: 25, z: 5 } },
  perspectiva: { pos: { x: 80, y: 50, z: 80 }, target: { x: 40, y: 25, z: 5 } }
};

// ============================================
// COMPONENTE VIEWER 3D - VERSÃO MELHORADA
// ============================================

const Viewer3D = ({
  elements,
  selectedElement,
  onSelectElement,
  viewMode,
  activeFilters,
  highlightType,
  regionFilter,
  timelineDate,
  isVRMode
}) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef({ isDragging: false, rotation: { x: -0.4, y: 0.6 }, zoom: 120, target: { x: 40, y: 25, z: 5 } });
  const meshesRef = useRef(new Map());
  const animationRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const cameraTransitionRef = useRef(null);
  const [hoveredElement, setHoveredElement] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene com background gradient
    const scene = new THREE.Scene();
    const isDarkMode = document.documentElement.classList.contains('dark');
    scene.background = new THREE.Color(isDarkMode ? 0x0a0a0f : 0xf0f4f8);
    scene.fog = new THREE.FogExp2(isDarkMode ? 0x0a0a0f : 0xf0f4f8, 0.006);
    sceneRef.current = scene;

    // Camera
    const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(isVRMode ? 90 : 50, aspect, 0.1, 1000);
    camera.position.set(120, 80, 120);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights aprimoradas
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const sun = new THREE.DirectionalLight(0xfff5e6, 1.8);
    sun.position.set(100, 150, 80);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 4096;
    sun.shadow.mapSize.height = 4096;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 500;
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    scene.add(sun);

    scene.add(new THREE.DirectionalLight(0x87ceeb, 0.5).translateX(-50).translateY(50));
    scene.add(new THREE.HemisphereLight(0x87ceeb, 0x3d3d3d, 0.6));

    // Floor melhorado
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: isDarkMode ? 0x1a1a1a : 0xe5e7eb, roughness: 0.8, metalness: 0.1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(40, -0.1, 25);
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid melhorado
    const grid = new THREE.GridHelper(200, 40, isDarkMode ? 0x444444 : 0xcccccc, isDarkMode ? 0x1a1a1a : 0xe5e7eb);
    grid.position.set(40, 0, 25);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add(grid);

    // === LABELS 3D NOS EIXOS ===
    const createTextSprite = (text, position, color = '#ffffff', size = 1.2) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.roundRect(10, 10, 236, 108, 12);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.font = 'bold 56px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 64);
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.85 });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(position.x, position.y, position.z);
      sprite.scale.set(size * 3, size * 1.5, 1);
      return sprite;
    };

    // Labels dos Eixos (1-20 ao longo do X)
    [0, 4, 8, 12, 16].forEach(ei => {
      if (GRID.eixoX[ei] !== undefined) {
        const label = createTextSprite(`E${ei + 1}`, { x: GRID.eixoX[ei], y: 0.5, z: -3 }, '#60a5fa', 0.8);
        scene.add(label);
      }
    });

    // Labels das Filas (A-H ao longo do Z)
    GRID.filas.forEach(fila => {
      const label = createTextSprite(fila, { x: -4, y: 0.5, z: GRID.filaY[fila] }, '#f59e0b', 0.8);
      scene.add(label);
    });

    // Mouse tracking para hover
    const onMouseMove = (e) => {
      if (controlsRef.current.isDragging) {
        const dx = e.clientX - controlsRef.current.lastMouse.x;
        const dy = e.clientY - controlsRef.current.lastMouse.y;
        controlsRef.current.rotation.y += dx * 0.005;
        controlsRef.current.rotation.x = Math.max(-1.5, Math.min(0.2, controlsRef.current.rotation.x + dy * 0.005));
        controlsRef.current.lastMouse = { x: e.clientX, y: e.clientY };
      }

      // Raycasting para hover
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(Array.from(meshesRef.current.values()));

      meshesRef.current.forEach(mesh => {
        const wasHovered = mesh.userData.hovered;
        mesh.userData.hovered = false;
        if (wasHovered && !mesh.userData.selected) {
          mesh.material.emissive.setHex(0x000000);
        }
      });

      if (intersects.length > 0) {
        const mesh = intersects[0].object;
        if (mesh.userData && !mesh.userData.selected) {
          mesh.userData.hovered = true;
          mesh.material.emissive.setHex(0xffff00);
        }
        setHoveredElement(mesh.userData);
        setHoverPos({ x: e.clientX, y: e.clientY });
      } else {
        setHoveredElement(null);
      }
    };

    const onMouseDown = (e) => {
      controlsRef.current.isDragging = true;
      controlsRef.current.lastMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      controlsRef.current.isDragging = false;
    };

    const onClick = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(Array.from(meshesRef.current.values()));

      if (intersects.length > 0) {
        const mesh = intersects[0].object;
        if (mesh.userData) {
          onSelectElement(mesh.userData);
        }
      }
    };

    const onWheel = (e) => {
      e.preventDefault();
      controlsRef.current.zoom = Math.max(30, Math.min(300, controlsRef.current.zoom + e.deltaY * 0.1));
    };

    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mouseleave', onMouseUp);
    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    // Animation loop com transição de câmera suave
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      const c = controlsRef.current;

      // Aplicar transição de câmera se houver
      if (cameraTransitionRef.current) {
        const { startPos, startTarget, endPos, endTarget, progress } = cameraTransitionRef.current;
        const t = Math.min(progress + 0.05, 1);

        c.target.x = lerp(startTarget.x, endTarget.x, t);
        c.target.y = lerp(startTarget.y, endTarget.y, t);
        c.target.z = lerp(startTarget.z, endTarget.z, t);
        c.zoom = lerp(Math.sqrt(startPos.x**2 + startPos.y**2 + startPos.z**2), Math.sqrt(endPos.x**2 + endPos.y**2 + endPos.z**2), t);

        cameraTransitionRef.current.progress = t;
        if (t >= 1) cameraTransitionRef.current = null;
      }

      camera.position.x = c.target.x + c.zoom * Math.sin(c.rotation.y) * Math.cos(c.rotation.x);
      camera.position.y = c.target.z + c.zoom * Math.sin(-c.rotation.x) + 30;
      camera.position.z = c.target.y + c.zoom * Math.cos(c.rotation.y) * Math.cos(c.rotation.x);
      camera.lookAt(c.target.x, c.target.z, c.target.y);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('mouseleave', onMouseUp);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('wheel', onWheel);

      // Limpar todos os meshes da cena
      meshesRef.current.forEach(mesh => {
        mesh.geometry?.dispose();
        mesh.material?.dispose();
      });
      meshesRef.current.clear();

      // Limpar objetos da cena (floor, grid, lights, sprites)
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (obj.material.map) obj.material.map.dispose();
          obj.material.dispose();
        }
      });

      renderer.dispose();
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [isVRMode, onSelectElement]);

  // Função para aplicar transição de câmera
  const applyPreset = (preset) => {
    const p = CAMERA_PRESETS[preset];
    if (!p) return;

    const c = controlsRef.current;
    const currentPos = {
      x: c.target.x + c.zoom * Math.sin(c.rotation.y) * Math.cos(c.rotation.x),
      y: c.target.z + c.zoom * Math.sin(-c.rotation.x) + 30,
      z: c.target.y + c.zoom * Math.cos(c.rotation.y) * Math.cos(c.rotation.x)
    };
    const currentTarget = { ...c.target };

    cameraTransitionRef.current = {
      startPos: currentPos,
      startTarget: currentTarget,
      endPos: p.pos,
      endTarget: p.target,
      progress: 0
    };
  };

  // Update meshes com hover e click
  useEffect(() => {
    if (!sceneRef.current) return;

    meshesRef.current.forEach(mesh => {
      sceneRef.current.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    meshesRef.current.clear();

    elements.forEach(el => {
      // Filters
      if (!activeFilters.includes(el.status)) return;
      if (highlightType && highlightType !== 'ALL' && el.type !== highlightType) return;
      if (regionFilter) {
        const { eixoMin, eixoMax, filaMin, filaMax } = regionFilter;
        if (el.eixo < eixoMin || el.eixo > eixoMax) return;
        const filaIdx = GRID.filas.indexOf(el.fila);
        const minIdx = GRID.filas.indexOf(filaMin);
        const maxIdx = GRID.filas.indexOf(filaMax);
        if (filaIdx >= 0 && minIdx >= 0 && maxIdx >= 0 && (filaIdx < minIdx || filaIdx > maxIdx)) return;
      }
      if (timelineDate && el.data_montagem && el.data_montagem > timelineDate) return;

      // Color baseado em view mode
      let color, opacity, emissive = 0x000000;
      if (viewMode === 'status') {
        const cfg = STATUS_CONFIG[el.status] || STATUS_CONFIG.NAO_INICIADO;
        color = cfg.color;
        emissive = cfg.emissive;
        opacity = cfg.opacity;
      } else {
        const cfg = TYPE_CONFIG[el.type] || { color: 0x888888 };
        color = cfg.color;
        opacity = 0.9;
      }

      if (selectedElement?.id === el.id) {
        emissive = 0xffff00;
        opacity = 1;
      }

      // Geometry melhorada com BoxGeometry para estrutura realista
      let geometry;
      if (el.type === 'COLUNA') {
        geometry = new THREE.BoxGeometry(el.width, el.length, el.depth);
      } else if (el.type === 'TIRANTE' || el.type === 'CONTRAVENTAMENTO') {
        geometry = new THREE.CylinderGeometry(el.width / 2, el.width / 2, el.length, 8);
      } else {
        geometry = new THREE.BoxGeometry(el.length, el.width, el.depth);
      }

      // Material metálico realista
      const material = new THREE.MeshStandardMaterial({
        color,
        emissive,
        metalness: 0.8,
        roughness: 0.3,
        transparent: opacity < 1,
        opacity,
        flatShading: false
      });

      const mesh = new THREE.Mesh(geometry, material);

      // Posicionamento correto
      if (el.type === 'COLUNA') {
        mesh.position.set(el.x, el.z + el.length / 2, el.y);
      } else {
        mesh.position.set(el.x, el.z, el.y);
        if (el.rotation) mesh.rotation.set(...el.rotation);
      }

      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = {
        ...el,
        selected: selectedElement?.id === el.id,
        hovered: false
      };

      sceneRef.current.add(mesh);
      meshesRef.current.set(el.id, mesh);
    });
  }, [elements, viewMode, activeFilters, highlightType, regionFilter, timelineDate, selectedElement]);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" style={{ minHeight: '500px' }} />

      {/* Camera Preset Buttons */}
      <div className="absolute top-4 right-20 flex flex-col gap-1.5">
        {[
          { key: 'frontal', label: 'Frontal', icon: '🔲' },
          { key: 'lateral', label: 'Lateral', icon: '📐' },
          { key: 'superior', label: 'Top', icon: '⬆️' },
          { key: 'isometrica', label: 'Iso', icon: '🔷' },
          { key: 'perspectiva', label: '3D', icon: '🎯' }
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => applyPreset(key)}
            className="px-3 py-1.5 bg-black/60 hover:bg-blue-600 text-white text-xs rounded-lg transition-all border border-white/10 backdrop-blur-sm"
            title={`Vista ${label}`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Hover Tooltip - segue o mouse */}
      {hoveredElement && (
        <div
          className="pointer-events-none fixed z-50 bg-black/90 backdrop-blur-md rounded-lg px-3 py-2 border border-orange-500/40 shadow-xl"
          style={{
            left: hoverPos.x + 16,
            top: hoverPos.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: `#${(STATUS_CONFIG[hoveredElement.status]?.color || 0x888888).toString(16).padStart(6, '0')}` }}
            />
            <span className="text-white text-xs font-bold">{hoveredElement.type}</span>
            <span className="text-slate-300 text-xs">#{hoveredElement.id}</span>
          </div>
          <div className="text-xs space-y-0.5">
            <p className="text-slate-200">Pos: <span className="text-orange-400 font-mono">{hoveredElement.posicao}</span></p>
            <p className="text-slate-200">Peso: <span className="text-cyan-400 font-mono">{hoveredElement.peso} kg</span></p>
            <p className="text-slate-200">Status: <span className="text-emerald-400">{STATUS_CONFIG[hoveredElement.status]?.label}</span></p>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// COMPONENTE TIMELINE COM ANIMAÇÃO
// ============================================

const TimelineControl = ({ currentDate, onDateChange, isPlaying, onTogglePlay }) => {
  const startDate = new Date('2025-01-15');
  const endDate = new Date('2025-05-30');
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const currentDays = Math.ceil((new Date(currentDate) - startDate) / (1000 * 60 * 60 * 24));
  const progressPercent = (currentDays / totalDays) * 100;

  const fases = [
    { id: 1, nome: 'Colunas', cor: '#2563eb', inicio: 0 },
    { id: 2, nome: 'Vigas', cor: '#059669', inicio: 15 },
    { id: 3, nome: 'Tesouras', cor: '#dc2626', inicio: 30 },
    { id: 4, nome: 'Terças', cor: '#d97706', inicio: 50 },
    { id: 5, nome: 'Contraventamento', cor: '#7c3aed', inicio: 65 },
    { id: 6, nome: 'Fechamentos', cor: '#0891b2', inicio: 80 }
  ];

  return (
    <div className="bg-gradient-to-r from-black/80 to-black/60 backdrop-blur-xl rounded-2xl p-5 border border-blue-500/20 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-white font-semibold flex items-center gap-2">
          <span>📅</span> Timeline de Construção
        </h4>
        <div className="flex items-center gap-3">
          <button
            onClick={onTogglePlay}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isPlaying
                ? 'bg-red-600 hover:bg-red-700 shadow-lg'
                : 'bg-green-600 hover:bg-green-700 shadow-lg'
            } text-white`}
          >
            {isPlaying ? '⏸️ Pausar' : '▶️ Play'}
          </button>
          <span className="text-white text-sm font-mono bg-white/10 px-3 py-1 rounded">{currentDate}</span>
        </div>
      </div>

      {/* Barra de progresso visual */}
      <div className="mb-4 space-y-2">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Progresso</span>
          <span>{progressPercent.toFixed(0)}%</span>
        </div>
        <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-green-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Slider interativo */}
      <input
        type="range"
        min={0}
        max={totalDays}
        value={Math.max(0, currentDays)}
        onChange={(e) => {
          const newDate = new Date(startDate);
          newDate.setDate(startDate.getDate() + parseInt(e.target.value));
          onDateChange(newDate.toISOString().split('T')[0]);
        }}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />

      {/* Marcos de tempo */}
      <div className="flex justify-between text-xs text-slate-400 mt-2 px-1">
        <span>Jan 15</span>
        <span>Fev 10</span>
        <span>Mar 10</span>
        <span>Abr 10</span>
        <span>Mai 30</span>
      </div>

      {/* Legenda de fases com indicadores de progresso */}
      <div className="mt-4 pt-3 border-t border-gray-700">
        <div className="grid grid-cols-3 gap-2">
          {fases.map(fase => {
            const isActive = progressPercent >= fase.inicio;
            return (
              <div key={fase.id} className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full transition-all ${
                    isActive ? 'scale-125 shadow-lg' : 'opacity-50'
                  }`}
                  style={{ backgroundColor: fase.cor }}
                />
                <span className={`text-xs ${isActive ? 'text-white font-medium' : 'text-slate-400'}`}>
                  {fase.nome}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE FILTRO DE REGIÃO
// ============================================

const RegionFilter = ({ value: _value, onChange, onClear }) => {
  const [eixoMin, setEixoMin] = useState(1);
  const [eixoMax, setEixoMax] = useState(17);
  const [filaMin, setFilaMin] = useState('A');
  const [filaMax, setFilaMax] = useState('H');

  const handleApply = () => {
    onChange({ eixoMin, eixoMax, filaMin, filaMax });
  };

  return (
    <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
      <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
        <span>🗺️</span> Filtro por Região
      </h4>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-slate-300 text-xs">Eixo Início</label>
          <select value={eixoMin} onChange={e => setEixoMin(+e.target.value)}
            className="w-full bg-slate-800 text-white rounded px-2 py-1 text-sm border border-slate-600">
            {GRID.eixos.slice(0, 17).map(e => <option key={e} value={e} className="bg-slate-800 text-white">{e}</option>)}
          </select>
        </div>
        <div>
          <label className="text-slate-300 text-xs">Eixo Fim</label>
          <select value={eixoMax} onChange={e => setEixoMax(+e.target.value)}
            className="w-full bg-slate-800 text-white rounded px-2 py-1 text-sm border border-slate-600">
            {GRID.eixos.slice(0, 17).map(e => <option key={e} value={e} className="bg-slate-800 text-white">{e}</option>)}
          </select>
        </div>
        <div>
          <label className="text-slate-300 text-xs">Fila Início</label>
          <select value={filaMin} onChange={e => setFilaMin(e.target.value)}
            className="w-full bg-slate-800 text-white rounded px-2 py-1 text-sm border border-slate-600">
            {GRID.filas.map(f => <option key={f} value={f} className="bg-slate-800 text-white">{f}</option>)}
          </select>
        </div>
        <div>
          <label className="text-slate-300 text-xs">Fila Fim</label>
          <select value={filaMax} onChange={e => setFilaMax(e.target.value)}
            className="w-full bg-slate-800 text-white rounded px-2 py-1 text-sm border border-slate-600">
            {GRID.filas.map(f => <option key={f} value={f} className="bg-slate-800 text-white">{f}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button onClick={handleApply} className="flex-1 bg-blue-500 text-white rounded py-1.5 text-sm font-medium">
          Aplicar
        </button>
        <button onClick={onClear} className="px-3 bg-gray-600 text-white rounded py-1.5 text-sm">
          Limpar
        </button>
      </div>
    </div>
  );
};

// ============================================
// PAINEL DE ESTATÍSTICAS COM PROGRESSO
// ============================================

const StatsPanel = ({ elements, obraData }) => {
  const stats = useMemo(() => {
    const byStatus = {}, byType = {};
    let peso = 0, pesoByStatus = {};
    Object.keys(STATUS_CONFIG).forEach(s => { byStatus[s] = 0; pesoByStatus[s] = 0; });
    elements.forEach(e => {
      if (byStatus[e.status] !== undefined) {
        byStatus[e.status]++;
        pesoByStatus[e.status] += e.peso || 0;
      }
      byType[e.type] = (byType[e.type] || 0) + 1;
      peso += e.peso || 0;
    });

    // Calcular progresso de conclusão
    const fabricado = byStatus.FABRICADO || 0;
    const montado = byStatus.MONTADO || 0;
    const emMontagem = byStatus.EM_MONTAGEM || 0;
    const total = elements.length;
    const percentualConclusao = total > 0 ? Math.round((montado + fabricado + emMontagem) / total * 100) : 0;
    const percentualMontado = total > 0 ? Math.round(montado / total * 100) : 0;
    const pesoMontado = pesoByStatus.MONTADO || 0;
    const pesoFabricado = pesoByStatus.FABRICADO || 0;

    return { byStatus, byType, peso, pesoByStatus, total, percentualConclusao, percentualMontado, montado, fabricado, emMontagem, pesoMontado, pesoFabricado };
  }, [elements]);

  return (
    <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-4 border border-white/10 space-y-4">
      <div>
        <h4 className="text-white font-semibold mb-3">Estatísticas da Obra</h4>

        {obraData && (
          <div className="mb-3 p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
            <p className="text-orange-400 text-xs font-medium">{obraData.codigo}</p>
            <p className="text-white text-sm truncate">{obraData.nome}</p>
          </div>
        )}
      </div>

      {/* KPIs Principais - 4 cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/5 rounded-lg p-2 text-center border border-white/10">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-slate-300">Peças</p>
        </div>
        <div className="bg-white/5 rounded-lg p-2 text-center border border-white/10">
          <p className="text-2xl font-bold text-orange-400">{(stats.peso/1000).toFixed(1)}t</p>
          <p className="text-xs text-slate-300">Peso Total</p>
        </div>
        <div className="bg-emerald-500/10 rounded-lg p-2 text-center border border-emerald-500/20">
          <p className="text-2xl font-bold text-emerald-400">{stats.montado}</p>
          <p className="text-xs text-slate-300">Montadas</p>
        </div>
        <div className="bg-blue-500/10 rounded-lg p-2 text-center border border-blue-500/20">
          <p className="text-2xl font-bold text-blue-400">{stats.fabricado}</p>
          <p className="text-xs text-slate-300">Fabricadas</p>
        </div>
      </div>

      {/* Barra de Progresso Principal */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-slate-200 text-xs font-medium">Progresso Geral</span>
          <span className="text-white font-bold text-sm">{stats.percentualConclusao}%</span>
        </div>
        <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${stats.percentualConclusao}%` }}
          />
        </div>
      </div>

      {/* Barra de Progresso por Peso */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-slate-200 text-xs font-medium">Peso Montado</span>
          <span className="text-emerald-400 font-bold text-sm">{(stats.pesoMontado/1000).toFixed(1)}t / {(stats.peso/1000).toFixed(1)}t</span>
        </div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-green-400 rounded-full transition-all"
            style={{ width: `${stats.peso > 0 ? (stats.pesoMontado / stats.peso * 100) : 0}%` }}
          />
        </div>
      </div>

      {/* Distribuição por Status - com barras visuais */}
      <div className="pt-2 border-t border-white/10">
        <p className="text-slate-300 text-xs font-medium mb-2">Por Status</p>
        <div className="space-y-2">
          {Object.entries(stats.byStatus).map(([status, count]) => {
            const cfg = STATUS_CONFIG[status];
            if (!cfg) return null;
            const percentage = stats.total > 0 ? Math.round(count / stats.total * 100) : 0;
            const colorHex = `#${cfg.color.toString(16).padStart(6, '0')}`;
            return (
              <div key={status}>
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorHex }} />
                    <span className="text-slate-200 text-xs">{cfg.label}</span>
                  </div>
                  <span className="text-white font-mono text-xs">{count} ({percentage}%)</span>
                </div>
                <div className="w-full h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%`, backgroundColor: colorHex }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Distribuição por Tipo - top 5 */}
      <div className="pt-2 border-t border-white/10">
        <p className="text-slate-300 text-xs font-medium mb-2">Por Tipo de Peça</p>
        <div className="space-y-1.5">
          {Object.entries(stats.byType)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([type, count]) => {
              const percentage = stats.total > 0 ? Math.round(count / stats.total * 100) : 0;
              const cfg = TYPE_CONFIG[type];
              const colorHex = cfg ? `#${cfg.color.toString(16).padStart(6, '0')}` : '#888';
              return (
                <div key={type} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded" style={{ backgroundColor: colorHex }} />
                  <span className="text-slate-200 text-xs flex-1 truncate">{type}</span>
                  <div className="w-16 h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: colorHex }} />
                  </div>
                  <span className="text-white font-mono text-xs w-6 text-right">{count}</span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE PRINCIPAL - INTEGRADO COM ERP
// ============================================

export default function MontexERP3DPage() {
  // Hooks do ERPContext
  const { obraAtualData } = useObras();
  const { pecasObraAtual } = useProducao();

  // Estados locais
  const [elements, setElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [viewMode, setViewMode] = useState('status');
  const [activeFilters, setActiveFilters] = useState(Object.keys(STATUS_CONFIG));
  const [highlightType, setHighlightType] = useState('ALL');
  const [regionFilter, setRegionFilter] = useState(null);
  const [timelineDate, setTimelineDate] = useState('2025-03-01');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVRMode, setIsVRMode] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);
  const [useERPData, setUseERPData] = useState(true);

  // Converter peças do ERP ou usar demo
  useEffect(() => {
    if (useERPData && pecasObraAtual && pecasObraAtual.length > 0) {
      const convertedElements = convertPecasToElements(pecasObraAtual, obraAtualData);
      setElements(convertedElements);
    } else {
      setElements(generateDemoElements());
    }
  }, [pecasObraAtual, obraAtualData, useERPData]);

  // Timeline animation
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTimelineDate(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() + 1);
        if (d > new Date('2025-05-30')) { setIsPlaying(false); return '2025-05-30'; }
        return d.toISOString().split('T')[0];
      });
    }, 200);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleFilterToggle = (f) => setActiveFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 -m-6">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-xl border-b border-white/10 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-xl">M</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">MONTEX ERP 3D</h1>
              <p className="text-gray-400 text-xs">Visualização Estrutural em Tempo Real</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {obraAtualData && (
              <div className="text-right">
                <p className="text-orange-400 font-semibold">{obraAtualData.codigo}</p>
                <p className="text-gray-400 text-xs truncate max-w-[200px]">{obraAtualData.nome}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setUseERPData(!useERPData)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  useERPData ? 'bg-green-500 text-white' : 'bg-white/10 text-gray-300'
                }`}
              >
                {useERPData ? '📊 ERP' : '🎮 Demo'}
              </button>
              {['status', 'tipo'].map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === mode ? 'bg-orange-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}>
                  {mode === 'status' ? '📊 Status' : '📦 Tipo'}
                </button>
              ))}
              <button onClick={() => setIsVRMode(!isVRMode)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${isVRMode ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-300'}`}>
                🥽 VR
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-140px)]">
        {/* Left Panel */}
        <div className="w-80 p-4 space-y-4 overflow-y-auto">
          <StatsPanel elements={elements} obraData={obraAtualData} />

          {/* Legenda */}
          <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
            <h4 className="text-white font-semibold mb-3">🎨 Legenda</h4>
            <div className="space-y-2">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded">
                  <input type="checkbox" checked={activeFilters.includes(key)} onChange={() => handleFilterToggle(key)} className="w-4 h-4" />
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: `#${cfg.color.toString(16).padStart(6, '0')}` }} />
                  <span className="text-white text-xs">{cfg.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Filtro Tipo */}
          <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
            <h4 className="text-white font-semibold mb-3">🔍 Tipo</h4>
            <select value={highlightType} onChange={e => setHighlightType(e.target.value)}
              className="w-full bg-slate-800 text-white rounded-lg px-3 py-2 border border-slate-600">
              <option value="ALL" className="bg-slate-800 text-white">Todos</option>
              {Object.keys(TYPE_CONFIG).map(t => <option key={t} value={t} className="bg-slate-800 text-white">{t}</option>)}
            </select>
          </div>

          <RegionFilter value={regionFilter} onChange={setRegionFilter} onClear={() => setRegionFilter(null)} />
        </div>

        {/* 3D Viewer */}
        <div className="flex-1 relative">
          <Viewer3D
            elements={elements}
            selectedElement={selectedElement}
            onSelectElement={setSelectedElement}
            viewMode={viewMode}
            activeFilters={activeFilters}
            highlightType={highlightType}
            regionFilter={regionFilter}
            timelineDate={showTimeline ? timelineDate : null}
            isVRMode={isVRMode}
          />

          {/* Timeline */}
          {showTimeline && (
            <div className="absolute bottom-4 left-4 right-4 max-w-2xl">
              <TimelineControl
                currentDate={timelineDate}
                onDateChange={setTimelineDate}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
              />
            </div>
          )}

          {/* Toggle Timeline Button */}
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className="absolute top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {showTimeline ? '🙈 Ocultar' : '📅 Timeline'}
          </button>

          {/* Data Overlay - KPIs flutuantes no viewport */}
          <div className="absolute top-4 left-4 flex gap-2 pointer-events-none">
            {[
              { label: 'Peças', value: elements.length, color: 'text-white', bg: 'bg-white/10' },
              { label: 'Montadas', value: elements.filter(e => e.status === 'MONTADO').length, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Fabricadas', value: elements.filter(e => e.status === 'FABRICADO').length, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'Peso', value: `${(elements.reduce((a, e) => a + (e.peso || 0), 0) / 1000).toFixed(1)}t`, color: 'text-orange-400', bg: 'bg-orange-500/10' },
            ].map((kpi, i) => (
              <div key={i} className={`${kpi.bg} backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/10`}>
                <p className={`${kpi.color} font-bold text-sm`}>{kpi.value}</p>
                <p className="text-slate-300 text-[10px]">{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Info Panel - Elemento Selecionado (melhorado) */}
          {selectedElement && (
            <div className="absolute top-16 left-4 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl rounded-xl p-4 text-sm border border-orange-500/30 shadow-2xl w-72">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: `#${(TYPE_CONFIG[selectedElement.type]?.color || 0x888888).toString(16).padStart(6, '0')}` }}
                  />
                  <h5 className="text-white font-bold text-base">{selectedElement.type}</h5>
                  <span className="text-slate-400 text-xs">#{selectedElement.id}</span>
                </div>
                <button
                  onClick={() => setSelectedElement(null)}
                  className="text-gray-400 hover:text-white bg-white/10 rounded-full w-6 h-6 flex items-center justify-center text-xs"
                >
                  X
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-orange-400 font-mono font-bold">{selectedElement.posicao}</p>
                  <p className="text-slate-400 text-[10px]">Posição</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-cyan-400 font-mono font-bold">{selectedElement.peso} kg</p>
                  <p className="text-slate-400 text-[10px]">Peso</p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-300">Perfil</span>
                  <span className="text-white font-mono">{selectedElement.profile || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Eixo / Fila</span>
                  <span className="text-white font-mono">E{selectedElement.eixo} / {selectedElement.fila}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Status</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: `#${(STATUS_CONFIG[selectedElement.status]?.color || 0x888888).toString(16).padStart(6, '0')}` }}
                    />
                    <span className="text-white">{STATUS_CONFIG[selectedElement.status]?.label || 'Desconhecido'}</span>
                  </div>
                </div>
                {selectedElement.marca && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">Marca</span>
                    <span className="text-white font-mono">{selectedElement.marca}</span>
                  </div>
                )}
                {selectedElement.data_fabricacao && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">Fabricação</span>
                    <span className="text-emerald-400 font-mono">{selectedElement.data_fabricacao}</span>
                  </div>
                )}
                {selectedElement.data_montagem && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">Montagem</span>
                    <span className="text-green-400 font-mono">{selectedElement.data_montagem}</span>
                  </div>
                )}
              </div>

              {/* Dimensões */}
              <div className="mt-3 pt-2 border-t border-white/10">
                <p className="text-slate-400 text-[10px] mb-1">DIMENSÕES</p>
                <div className="flex gap-3 text-xs">
                  <span className="text-gray-300">L: <span className="text-white font-mono">{selectedElement.length?.toFixed(2)}m</span></span>
                  <span className="text-gray-300">W: <span className="text-white font-mono">{selectedElement.width?.toFixed(2)}m</span></span>
                  <span className="text-gray-300">D: <span className="text-white font-mono">{selectedElement.depth?.toFixed(2)}m</span></span>
                </div>
              </div>
            </div>
          )}

          {/* Controls Help */}
          <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-xs text-gray-300 border border-white/10">
            <p className="font-semibold text-white mb-2">Controles</p>
            <p>🖱️ Arrastar: Rotacionar Vista</p>
            <p>🔄 Scroll: Zoom In/Out</p>
            <p>🖱️ Clique: Selecionar Peça</p>
            <p className="mt-2 text-orange-400 font-medium">
              {useERPData ? `${elements.length} peças` : 'Modo Demo'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
