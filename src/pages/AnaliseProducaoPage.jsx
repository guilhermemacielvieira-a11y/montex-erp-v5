// MONTEX ERP Premium - Analise de Producao
// Dashboard completo com graficos 3D interativos
// Dados reais do Kanban Corte e Kanban Producao (tabela pecas_producao)

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Factory, Hammer, Paintbrush, Truck, Weight,
  TrendingUp, TrendingDown, Activity, Filter, RefreshCw,
  Layers, PieChart as PieIcon, Gauge, DollarSign,
  ChevronDown, Maximize2, RotateCcw, Eye
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadialBarChart, RadialBar, ComposedChart, AreaChart, Area
} from 'recharts';
import * as THREE from 'three';
import { supabase } from '../api/supabaseClient';
import { useObras } from '../contexts/ERPContext';

// ==================== 3D CHART COMPONENT ====================
function Production3DChart({ data, width = 700, height = 400, title }) {
  const mountRef = useRef(null);
  const animRef = useRef(null);
  const [isRotating, setIsRotating] = useState(true);

  useEffect(() => {
    if (!mountRef.current || !data?.length) return;

    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1e);
    scene.fog = new THREE.FogExp2(0x0a0f1e, 0.015);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(12, 10, 16);
    camera.lookAt(0, 2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 15, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);
    const pointLight1 = new THREE.PointLight(0x10b981, 1.5, 50);
    pointLight1.position.set(-8, 8, 8);
    scene.add(pointLight1);
    const pointLight2 = new THREE.PointLight(0x3b82f6, 1.2, 50);
    pointLight2.position.set(8, 6, -8);
    scene.add(pointLight2);
    const pointLight3 = new THREE.PointLight(0xf59e0b, 0.8, 40);
    pointLight3.position.set(0, 12, 0);
    scene.add(pointLight3);

    // Floor
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, metalness: 0.3, roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid
    const gridHelper = new THREE.GridHelper(25, 25, 0x1e3a5f, 0x0d1b2a);
    scene.add(gridHelper);

    const maxValue = Math.max(...data.map(d => d.value || 0), 1);
    const colors = [0x10b981, 0x3b82f6, 0xf59e0b, 0xef4444, 0x8b5cf6, 0xec4899, 0x06b6d4, 0xf97316];
    const bars = [];

    data.forEach((item, i) => {
      const targetH = Math.max((item.value / maxValue) * 8, 0.2);
      const barGeo = new THREE.BoxGeometry(1.2, 0.01, 1.2);
      const color = colors[i % colors.length];
      const barMat = new THREE.MeshPhysicalMaterial({
        color, metalness: 0.4, roughness: 0.2, clearcoat: 0.5,
        emissive: color, emissiveIntensity: 0.15
      });
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.set((i - (data.length - 1) / 2) * 2, 0.005, 0);
      bar.castShadow = true;
      bar.userData = { targetH, currentH: 0.01, index: i };
      scene.add(bar);
      bars.push(bar);

      // Glow base
      const glowGeo = new THREE.PlaneGeometry(1.4, 1.4);
      const glowMat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.3, side: THREE.DoubleSide
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.rotation.x = -Math.PI / 2;
      glow.position.set(bar.position.x, 0.01, 0);
      scene.add(glow);
    });

    // Particles
    const particlesGeo = new THREE.BufferGeometry();
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 30;
      positions[i + 1] = Math.random() * 15;
      positions[i + 2] = (Math.random() - 0.5) * 30;
    }
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particlesMat = new THREE.PointsMaterial({
      color: 0x3b82f6, size: 0.05, transparent: true, opacity: 0.6
    });
    const particles = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particles);

    let time = 0;
    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      time += 0.016;

      // Animate bars growing
      bars.forEach(bar => {
        const ud = bar.userData;
        if (ud.currentH < ud.targetH) {
          ud.currentH = Math.min(ud.currentH + ud.targetH * 0.03, ud.targetH);
          bar.geometry.dispose();
          bar.geometry = new THREE.BoxGeometry(1.2, ud.currentH, 1.2);
          bar.position.y = ud.currentH / 2;
        }
        // Subtle pulse
        const pulse = 1 + Math.sin(time * 2 + ud.index) * 0.02;
        bar.scale.x = pulse;
        bar.scale.z = pulse;
      });

      // Rotate scene
      if (isRotating) scene.rotation.y += 0.002;
      particles.rotation.y += 0.001;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [data, width, height, isRotating]);

  return (
    <div className="relative">
      <div ref={mountRef} className="rounded-xl overflow-hidden border border-slate-700/30" />
      <div className="absolute top-3 right-3 flex gap-2">
        <button onClick={() => setIsRotating(!isRotating)}
          className="p-2 bg-slate-800/80 rounded-lg border border-slate-600/50 text-slate-300 hover:text-white hover:bg-slate-700/80 transition-all">
          {isRotating ? <Eye size={14} /> : <RotateCcw size={14} />}
        </button>
      </div>
    </div>
  );
}

// ==================== 3D SPHERES COMPONENT ====================
function Production3DSpheres({ data, width = 600, height = 350 }) {
  const mountRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current || !data?.length) return;
    while (mountRef.current.firstChild) mountRef.current.removeChild(mountRef.current.firstChild);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1e);
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 8, 18);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 5);
    scene.add(dir);
    const point1 = new THREE.PointLight(0x10b981, 1.2, 40);
    point1.position.set(-6, 6, 6);
    scene.add(point1);
    const point2 = new THREE.PointLight(0x3b82f6, 1.0, 40);
    point2.position.set(6, 4, -6);
    scene.add(point2);

    // Grid floor
    const grid = new THREE.GridHelper(20, 20, 0x1e3a5f, 0x0d1b2a);
    grid.position.y = -3;
    scene.add(grid);

    const maxVal = Math.max(...data.map(d => d.pesoTotal || 0), 1);
    const colors = [0x10b981, 0x3b82f6, 0xf59e0b, 0xef4444, 0x8b5cf6, 0xec4899, 0x06b6d4, 0xf97316];
    const spheres = [];

    data.slice(0, 8).forEach((item, i) => {
      const radius = Math.max((item.pesoTotal / maxVal) * 2.5, 0.3);
      const geo = new THREE.SphereGeometry(radius, 32, 32);
      const color = colors[i % colors.length];
      const mat = new THREE.MeshPhysicalMaterial({
        color, metalness: 0.3, roughness: 0.2, clearcoat: 0.8,
        emissive: color, emissiveIntensity: 0.1, transparent: true, opacity: 0.85
      });
      const sphere = new THREE.Mesh(geo, mat);
      const angle = (i / Math.min(data.length, 8)) * Math.PI * 2;
      const dist = 5;
      sphere.position.set(Math.cos(angle) * dist, radius - 1, Math.sin(angle) * dist);
      sphere.userData = { baseY: radius - 1, index: i };
      scene.add(sphere);
      spheres.push(sphere);

      // Ring around sphere
      const ringGeo = new THREE.TorusGeometry(radius + 0.3, 0.05, 8, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(sphere.position);
      ring.rotation.x = Math.PI / 2;
      scene.add(ring);
    });

    // Particles
    const pGeo = new THREE.BufferGeometry();
    const pCount = 150;
    const pos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount * 3; i += 3) {
      pos[i] = (Math.random() - 0.5) * 25;
      pos[i+1] = Math.random() * 12;
      pos[i+2] = (Math.random() - 0.5) * 25;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pMat = new THREE.PointsMaterial({ color: 0x8b5cf6, size: 0.04, transparent: true, opacity: 0.5 });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    let time = 0;
    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      time += 0.016;
      spheres.forEach((s, i) => {
        s.position.y = s.userData.baseY + Math.sin(time * 1.5 + i * 0.8) * 0.3;
        s.rotation.y += 0.005;
      });
      scene.rotation.y += 0.002;
      particles.rotation.y -= 0.001;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [data, width, height]);

  return <div ref={mountRef} className="rounded-xl overflow-hidden border border-slate-700/30" />;
}

// ==================== GAUGE COMPONENT ====================
function GaugeChart({ value, max, label, color, icon: Icon }) {
  const percentage = Math.min((value / max) * 100, 100);
  const gaugeData = [
    { name: label, value: percentage, fill: color },
    { name: 'remaining', value: 100 - percentage, fill: '#1e293b' }
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-20">
        <ResponsiveContainer width="100%" height={80}>
          <RadialBarChart cx="50%" cy="100%" innerRadius="60%" outerRadius="100%"
            startAngle={180} endAngle={0} data={[gaugeData[0]]}>
            <RadialBar background={{ fill: '#1e293b' }} dataKey="value" cornerRadius={5}
              fill={color} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          {Icon && <Icon size={14} className="mb-0.5" style={{ color }} />}
          <span className="text-lg font-bold text-white">{percentage.toFixed(1)}%</span>
        </div>
      </div>
      <span className="text-xs text-slate-400 mt-1 text-center">{label}</span>
    </div>
  );
}

// ==================== KPI CARD ====================
function KPICard({ title, value, unit, icon: Icon, color, trend, subtitle, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 rounded-xl border border-slate-700/50 p-4 hover:border-slate-600/50 transition-all hover:shadow-lg hover:shadow-slate-900/50"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg" style={{ backgroundColor: color + '20' }}>
          <Icon size={20} style={{ color }} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center text-xs font-medium ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend >= 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider">{title}</h3>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-2xl font-bold text-white">
          {typeof value === 'number' ? value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : value}
        </span>
        {unit && <span className="text-sm text-slate-400">{unit}</span>}
      </div>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </motion.div>
  );
}

// ==================== COLORS ====================
const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#e11d48', '#14b8a6', '#a855f7', '#f43f5e', '#0ea5e9', '#eab308', '#d946ef'];

// ==================== FORMAT CURRENCY ====================
const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

// ==================== MAIN PAGE ====================
export default function AnaliseProducaoPage() {
  const { obraAtual } = useObras();
  const [pecas, setPecas] = useState([]);
  const [idsEntregues, setIdsEntregues] = useState(new Set());
  const [pesoEntregue, setPesoEntregue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [showFilter, setShowFilter] = useState(false);

  // Fetch data from Supabase (filtrado por obra selecionada)
  useEffect(() => {
    if (!obraAtual) { setPecas([]); setIdsEntregues(new Set()); setPesoEntregue(0); setLoading(false); return; }
    const fetchData = async () => {
      try {
        setLoading(true);
        // Buscar peças de produção
        const { data, error } = await supabase
          .from('pecas_producao')
          .select('*')
          .eq('obra_id', obraAtual);
        if (error) throw error;
        setPecas(data || []);

        // Buscar expedições ENTREGUE para identificar peças já entregues em obra
        try {
          const { data: exps } = await supabase
            .from('expedicoes')
            .select('id, status, pecas, peso_total')
            .eq('obra_id', obraAtual)
            .eq('status', 'ENTREGUE');
          const entregues = exps || [];
          const ids = new Set();
          let pesoEnt = 0;
          entregues.forEach(exp => {
            pesoEnt += parseFloat(exp.peso_total) || 0;
            const pecasExp = typeof exp.pecas === 'string' ? JSON.parse(exp.pecas) : (exp.pecas || []);
            if (Array.isArray(pecasExp)) {
              pecasExp.forEach(pe => {
                const pecaId = typeof pe === 'object' ? (pe.id || pe.pecaId) : pe;
                if (pecaId) ids.add(pecaId);
              });
            }
          });
          setIdsEntregues(ids);
          setPesoEntregue(pesoEnt);
        } catch (expErr) {
          console.warn('Erro ao buscar expedições:', expErr);
        }
      } catch (err) {
        console.error('Erro ao carregar pecas:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [obraAtual]);

  // Filtered data
  const pecasFiltradas = useMemo(() => {
    if (filtroCategoria === 'todas') return pecas;
    return pecas.filter(p => p.tipo === filtroCategoria);
  }, [pecas, filtroCategoria]);

  // Categories
  const categorias = useMemo(() => {
    const tipos = [...new Set(pecas.map(p => p.tipo).filter(Boolean))];
    return tipos.sort();
  }, [pecas]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const pf = pecasFiltradas;
    const pesoTotal = pf.reduce((s, p) => s + (parseFloat(p.peso_total) || 0), 0);

    const fabricadas = pf.filter(p =>
      p.etapa === 'solda' || p.etapa === 'pintura' || p.etapa === 'expedido' ||
      p.status === 'concluido' || p.data_fim_fabricacao
    );
    const pesoFabricado = fabricadas.reduce((s, p) => s + (parseFloat(p.peso_total) || 0), 0);

    const soldadas = pf.filter(p =>
      p.etapa === 'pintura' || p.etapa === 'expedido' || p.data_fim_solda
    );
    const pesoSoldado = soldadas.reduce((s, p) => s + (parseFloat(p.peso_total) || 0), 0);

    const pintadas = pf.filter(p =>
      p.etapa === 'expedido' || p.data_fim_pintura
    );
    const pesoPintado = pintadas.reduce((s, p) => s + (parseFloat(p.peso_total) || 0), 0);

    const expedidas = pf.filter(p => p.etapa === 'expedido');
    const pesoExpedidoTotal = expedidas.reduce((s, p) => s + (parseFloat(p.peso_total) || 0), 0);

    // Separar: peças expedidas que já foram entregues vs aguardando embarque
    const expedAguardando = expedidas.filter(p => !idsEntregues.has(p.id));
    const pesoAguardandoEnvio = expedAguardando.reduce((s, p) => s + (parseFloat(p.peso_total) || 0), 0);
    const pesoJaEntregue = pesoEntregue > 0 ? pesoEntregue : (pesoExpedidoTotal - pesoAguardandoEnvio);

    const pesoNaoFabricado = pesoTotal - pesoFabricado;
    const pesoProduzido = pesoFabricado;

    return {
      pesoTotal, pesoFabricado, pesoNaoFabricado, pesoSoldado,
      pesoPintado, pesoEnviado: pesoAguardandoEnvio, pesoExpedidoTotal, pesoJaEntregue, pesoProduzido,
      percFabricado: pesoTotal > 0 ? (pesoFabricado / pesoTotal) * 100 : 0,
      percSoldado: pesoTotal > 0 ? (pesoSoldado / pesoTotal) * 100 : 0,
      percPintado: pesoTotal > 0 ? (pesoPintado / pesoTotal) * 100 : 0,
      percEnviado: pesoTotal > 0 ? (pesoAguardandoEnvio / pesoTotal) * 100 : 0,
      percEntregue: pesoTotal > 0 ? (pesoJaEntregue / pesoTotal) * 100 : 0,
      totalPecas: pf.length,
      pecasConcluidas: pf.filter(p => p.status === 'concluido').length,
      pecasAguardandoEnvio: expedAguardando.length,
    };
  }, [pecasFiltradas, idsEntregues, pesoEntregue]);

  // Data for 3D chart
  const data3D = useMemo(() => [
    { label: 'Total Obra', value: kpis.pesoTotal },
    { label: 'Fabricado', value: kpis.pesoFabricado },
    { label: 'Soldado', value: kpis.pesoSoldado },
    { label: 'Pintado', value: kpis.pesoPintado },
    { label: 'Nao Fabricado', value: kpis.pesoNaoFabricado },
    { label: 'Aguardando Envio', value: kpis.pesoEnviado },
  ], [kpis]);

  // Data by category for comparison chart
  const dadosPorCategoria = useMemo(() => {
    const map = {};
    pecas.forEach(p => {
      const tipo = p.tipo || 'Sem tipo';
      if (!map[tipo]) map[tipo] = { tipo, pesoTotal: 0, fabricado: 0, soldado: 0, pintado: 0, enviado: 0, qtd: 0 };
      const peso = parseFloat(p.peso_total) || 0;
      map[tipo].pesoTotal += peso;
      map[tipo].qtd += 1;
      if (p.etapa === 'solda' || p.etapa === 'pintura' || p.etapa === 'expedido' || p.data_fim_fabricacao) map[tipo].fabricado += peso;
      if (p.etapa === 'pintura' || p.etapa === 'expedido' || p.data_fim_solda) map[tipo].soldado += peso;
      if (p.etapa === 'expedido' || p.data_fim_pintura) map[tipo].pintado += peso;
      if (p.etapa === 'expedido') map[tipo].enviado += peso;
    });
    return Object.values(map).sort((a, b) => b.pesoTotal - a.pesoTotal);
  }, [pecas]);

  // Pie chart data for distribution
  const pieData = useMemo(() => {
    return dadosPorCategoria.slice(0, 10).map((d, i) => ({
      name: d.tipo, value: Math.round(d.pesoTotal * 100) / 100, fill: CHART_COLORS[i % CHART_COLORS.length]
    }));
  }, [dadosPorCategoria]);

  // Status distribution pie
  const statusPie = useMemo(() => [
    { name: 'Fabricado', value: kpis.pesoFabricado, fill: '#10b981' },
    { name: 'Nao Fabricado', value: kpis.pesoNaoFabricado, fill: '#ef4444' },
    { name: 'Aguardando Envio', value: kpis.pesoEnviado, fill: '#3b82f6' },
  ].filter(d => d.value > 0), [kpis]);

  // Financial Valuation Data
  const VALORES_ETAPA = { corte: 1.20, fabricacao: 2.50, solda: 3.00, pintura: 1.80, expedicao: 0.50 };

  const dadosFinanceiros = useMemo(() => {
    const valorFab = kpis.pesoFabricado * VALORES_ETAPA.fabricacao;
    const valorSolda = kpis.pesoSoldado * VALORES_ETAPA.solda;
    const valorPintura = kpis.pesoPintado * VALORES_ETAPA.pintura;
    const valorExpedicao = kpis.pesoEnviado * VALORES_ETAPA.expedicao;
    const valorTotal = valorFab + valorSolda + valorPintura + valorExpedicao;
    return {
      valorFab, valorSolda, valorPintura, valorExpedicao, valorTotal,
      barData: [
        { etapa: 'Fabricação', valor: valorFab, kg: kpis.pesoFabricado, cor: '#10b981' },
        { etapa: 'Solda', valor: valorSolda, kg: kpis.pesoSoldado, cor: '#3b82f6' },
        { etapa: 'Pintura', valor: valorPintura, kg: kpis.pesoPintado, cor: '#f59e0b' },
        { etapa: 'Expedição', valor: valorExpedicao, kg: kpis.pesoEnviado, cor: '#06b6d4' },
      ],
      radialData: [
        { name: 'Fabricação', value: kpis.percFabricado, fill: '#10b981' },
        { name: 'Solda', value: kpis.percSoldado, fill: '#3b82f6' },
        { name: 'Pintura', value: kpis.percPintado, fill: '#f59e0b' },
        { name: 'Expedição', value: kpis.percEnviado, fill: '#06b6d4' },
      ]
    };
  }, [kpis]);

  // Production waterfall data
  const waterfallData = useMemo(() => [
    { name: 'Total Obra', value: kpis.pesoTotal, fill: '#6366f1', total: kpis.pesoTotal },
    { name: 'Não Fabricado', value: -kpis.pesoNaoFabricado, fill: '#ef4444', total: kpis.pesoFabricado },
    { name: 'Fabricado', value: kpis.pesoFabricado, fill: '#10b981', total: kpis.pesoFabricado },
    { name: 'Soldado', value: kpis.pesoSoldado, fill: '#3b82f6', total: kpis.pesoSoldado },
    { name: 'Pintado', value: kpis.pesoPintado, fill: '#f59e0b', total: kpis.pesoPintado },
    { name: 'Pronto Envio', value: kpis.pesoEnviado, fill: '#06b6d4', total: kpis.pesoEnviado },
  ], [kpis]);

  // Tabs
  const tabs = [
    { id: 'visao-geral', label: 'Visao Geral', icon: BarChart3 },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'categorias', label: 'Categorias', icon: Layers },
    { id: '3d', label: 'Grafico 3D', icon: Maximize2 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
          <span className="text-slate-400">Carregando dados de producao...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-xl border border-emerald-500/30">
            <Activity size={28} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Analise de Producao</h1>
            <p className="text-slate-400 text-sm">Dashboard interativo com graficos 3D</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Category Filter */}
          <div className="relative">
            <button onClick={() => setShowFilter(!showFilter)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 rounded-lg border border-slate-700/50 text-slate-300 hover:text-white hover:border-slate-600 transition-all">
              <Filter size={16} />
              <span className="text-sm">{filtroCategoria === 'todas' ? 'Todas Categorias' : filtroCategoria}</span>
              <ChevronDown size={14} />
            </button>
            <AnimatePresence>
              {showFilter && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
                  <button onClick={() => { setFiltroCategoria('todas'); setShowFilter(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-700 transition-colors ${filtroCategoria === 'todas' ? 'text-emerald-400 bg-slate-700/50' : 'text-slate-300'}`}>
                    Todas Categorias
                  </button>
                  {categorias.map(cat => (
                    <button key={cat} onClick={() => { setFiltroCategoria(cat); setShowFilter(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-700 transition-colors ${filtroCategoria === cat ? 'text-emerald-400 bg-slate-700/50' : 'text-slate-300'}`}>
                      {cat}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full border border-emerald-500/30">
            {pecas.length} pecas
          </span>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        <KPICard title="Peso Total" value={kpis.pesoTotal} unit="kg" icon={Weight} color="#6366f1" delay={0} subtitle="Peso total da obra" />
        <KPICard title="Fabricado" value={kpis.pesoFabricado} unit="kg" icon={Factory} color="#10b981" trend={kpis.percFabricado} subtitle={`${kpis.percFabricado.toFixed(1)}% concluido`} delay={0.05} />
        <KPICard title="Soldado" value={kpis.pesoSoldado} unit="kg" icon={Hammer} color="#3b82f6" trend={kpis.percSoldado} subtitle={`${kpis.percSoldado.toFixed(1)}% soldado`} delay={0.1} />
        <KPICard title="Pintado" value={kpis.pesoPintado} unit="kg" icon={Paintbrush} color="#f59e0b" trend={kpis.percPintado} subtitle={`${kpis.percPintado.toFixed(1)}% pintado`} delay={0.15} />
        <KPICard title="Produzido" value={kpis.pesoProduzido} unit="kg" icon={Activity} color="#8b5cf6" delay={0.2} subtitle="Peso produzido total" />
        <KPICard title="Nao Fabricado" value={kpis.pesoNaoFabricado} unit="kg" icon={TrendingDown} color="#ef4444" delay={0.25} subtitle={`${(100 - kpis.percFabricado).toFixed(1)}% pendente`} />
        <KPICard title="Aguardando Envio" value={kpis.pesoEnviado} unit="kg" icon={Truck} color="#06b6d4" trend={kpis.percEnviado} subtitle={`${kpis.pecasAguardandoEnvio} peças na fila · ${kpis.pesoJaEntregue.toLocaleString('pt-BR', {maximumFractionDigits:0})} kg entregue`} delay={0.3} />
      </div>

      {/* Gauge Charts */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 rounded-xl border border-slate-700/50 p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Gauge size={18} className="text-emerald-400" /> Progresso da Producao
        </h3>
        <div className="flex flex-wrap justify-around gap-4">
          <GaugeChart value={kpis.pesoFabricado} max={kpis.pesoTotal} label="Fabricacao" color="#10b981" icon={Factory} />
          <GaugeChart value={kpis.pesoSoldado} max={kpis.pesoTotal} label="Solda" color="#3b82f6" icon={Hammer} />
          <GaugeChart value={kpis.pesoPintado} max={kpis.pesoTotal} label="Pintura" color="#f59e0b" icon={Paintbrush} />
          <GaugeChart value={kpis.pesoEnviado} max={kpis.pesoTotal} label="Expedicao" color="#06b6d4" icon={Truck} />
          <GaugeChart value={kpis.pesoProduzido} max={kpis.pesoTotal} label="Producao Total" color="#8b5cf6" icon={Activity} />
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700/50 pb-2 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-slate-800 text-emerald-400 border border-slate-700/50 border-b-transparent'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}>
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'visao-geral' && (
          <motion.div key="visao" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 space-y-6">
            {/* Status Distribution Pie */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 rounded-xl border border-slate-700/50 p-5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <PieIcon size={18} className="text-blue-400" /> Distribuicao por Status
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={statusPie} cx="50%" cy="50%" innerRadius={60} outerRadius={110}
                    paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}>
                    {statusPie.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(val) => `${parseFloat(val).toLocaleString('pt-BR')} kg`}
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Category Distribution Pie */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 rounded-xl border border-slate-700/50 p-5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Layers size={18} className="text-purple-400" /> Distribuicao por Categoria
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={110}
                    paddingAngle={2} dataKey="value" label={({ name, percent }) => percent > 0.05 ? `${name}` : ''}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(val) => `${parseFloat(val).toLocaleString('pt-BR')} kg`}
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Summary Bar Chart */}
            <div className="lg:col-span-2 bg-gradient-to-br from-slate-900/80 to-slate-800/50 rounded-xl border border-slate-700/50 p-5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-emerald-400" /> Resumo de Producao (kg)
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={[{
                  name: 'Producao',
                  'Peso Total': kpis.pesoTotal,
                  'Fabricado': kpis.pesoFabricado,
                  'Soldado': kpis.pesoSoldado,
                  'Pintado': kpis.pesoPintado,
                  'Nao Fabricado': kpis.pesoNaoFabricado,
                  'Aguardando Envio': kpis.pesoEnviado,
                }]} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" tickFormatter={v => `${(v/1000).toFixed(0)}t`} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" width={0} />
                  <Tooltip formatter={(val) => `${parseFloat(val).toLocaleString('pt-BR')} kg`}
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ color: '#94a3b8' }} />
                  <Bar dataKey="Peso Total" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Fabricado" fill="#10b981" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Soldado" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Pintado" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Nao Fabricado" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Aguardando Envio" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 3D + Progress Row */}
            <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Mini 3D Chart */}
              <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 rounded-xl border border-slate-700/50 p-5">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Maximize2 size={18} className="text-emerald-400" /> Producao 3D
                </h3>
                <Production3DChart data={data3D} width={450} height={300} />
              </div>
              {/* Radial Progress */}
              <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 rounded-xl border border-slate-700/50 p-5">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Gauge size={18} className="text-purple-400" /> Progresso por Etapa
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%"
                    data={dadosFinanceiros.radialData} startAngle={180} endAngle={-180}>
                    <RadialBar background={{ fill: '#1e293b' }} dataKey="value" cornerRadius={5} label={{ fill: '#fff', fontSize: 11, position: 'insideStart' }} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                    <Tooltip formatter={(val) => `${parseFloat(val).toFixed(1)}%`}
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'financeiro' && (
          <motion.div key="fin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* Financial KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <KPICard title="Valor Fabricacao" value={dadosFinanceiros.valorFab} unit="BRL" icon={Factory} color="#10b981" subtitle={`${kpis.pesoFabricado.toFixed(0)} kg`} delay={0} />
              <KPICard title="Valor Solda" value={dadosFinanceiros.valorSolda} unit="BRL" icon={Hammer} color="#3b82f6" subtitle={`${kpis.pesoSoldado.toFixed(0)} kg`} delay={0.05} />
              <KPICard title="Valor Pintura" value={dadosFinanceiros.valorPintura} unit="BRL" icon={Paintbrush} color="#f59e0b" subtitle={`${kpis.pesoPintado.toFixed(0)} kg`} delay={0.1} />
              <KPICard title="Valor Expedicao" value={dadosFinanceiros.valorExpedicao} unit="BRL" icon={Truck} color="#06b6d4" subtitle={`${kpis.pesoEnviado.toFixed(0)} kg`} delay={0.15} />
            </div>

            {/* Financial Value Bar Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 rounded-xl border border-slate-700/50 p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 size={18} className="text-green-400" /> Valor por Etapa (R$)
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dadosFinanceiros.barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="etapa" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip formatter={(val) => formatCurrency(val)}
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                    <Bar dataKey="valor" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Financial Distribution Pie */}
              <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 rounded-xl border border-slate-700/50 p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <PieIcon size={18} className="text-yellow-400" /> Distribuicao de Valor
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={dadosFinanceiros.barData} cx="50%" cy="50%" innerRadius={60} outerRadius={110}
                      paddingAngle={2} dataKey="valor" label={({ etapa, percent }) => `${etapa} ${(percent * 100).toFixed(1)}%`}>
                      {dadosFinanceiros.barData.map((entry, i) => <Cell key={i} fill={entry.cor} />)}
                    </Pie>
                    <Tooltip formatter={(val) => formatCurrency(val)}
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Total Financial Value Summary */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <DollarSign size={20} className="text-emerald-400" /> Resumo Financeiro Total
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700/30">
                  <div>
                    <p className="text-slate-400 text-sm">Valor Total Produzido</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(dadosFinanceiros.valorTotal)}</p>
                  </div>
                  <div className="text-emerald-400/20 text-4xl">
                    <DollarSign />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700/30">
                  <div>
                    <p className="text-slate-400 text-sm">Peso Total Processado</p>
                    <p className="text-2xl font-bold text-blue-400 mt-1">{kpis.pesoTotal.toLocaleString('pt-BR')} kg</p>
                  </div>
                  <div className="text-blue-400/20 text-4xl">
                    <Weight />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'categorias' && (
          <motion.div key="cat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* Comparison by Category */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 rounded-xl border border-slate-700/50 p-5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Layers size={18} className="text-purple-400" /> Comparacao por Categoria (kg)
              </h3>
              <ResponsiveContainer width="100%" height={450}>
                <ComposedChart data={dadosPorCategoria.slice(0, 12)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="tipo" stroke="#64748b" angle={-30} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tickFormatter={v => `${(v/1000).toFixed(0)}t`} />
                  <Tooltip formatter={(val) => `${parseFloat(val).toLocaleString('pt-BR')} kg`}
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ color: '#94a3b8' }} />
                  <Bar dataKey="pesoTotal" name="Peso Total" fill="#6366f1" radius={[4, 4, 0, 0]} opacity={0.8} />
                  <Bar dataKey="fabricado" name="Fabricado" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="soldado" name="Soldado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pintado" name="Pintado" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="enviado" name="Aguardando Envio" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* 3D Category Spheres */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 rounded-xl border border-slate-700/50 p-5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Maximize2 size={18} className="text-purple-400" /> Visualizacao 3D por Categoria
              </h3>
              <Production3DSpheres data={dadosPorCategoria.slice(0, 8)} width={Math.min(window.innerWidth - 100, 1000)} height={400} />
              <div className="mt-3 flex flex-wrap gap-2 justify-center">
                {dadosPorCategoria.slice(0, 8).map((d, i) => (
                  <span key={i} className="px-2 py-1 bg-slate-800/50 rounded text-xs text-slate-300 border border-slate-700/30">
                    <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: CHART_COLORS[i] }} />
                    {d.tipo}: {d.pesoTotal.toLocaleString('pt-BR', {maximumFractionDigits:0})} kg
                  </span>
                ))}
              </div>
            </div>

            {/* Category Table */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 rounded-xl border border-slate-700/50 p-5 overflow-x-auto">
              <h3 className="text-white font-semibold mb-4">Detalhamento por Categoria</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Categoria</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Peso Total</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Fabricado</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">%</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Soldado</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Pintado</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Aguardando Envio</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Qtd</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosPorCategoria.map((row, i) => (
                    <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                      <td className="py-2 px-3 text-white font-medium">{row.tipo}</td>
                      <td className="py-2 px-3 text-right text-slate-300">{row.pesoTotal.toLocaleString('pt-BR', {maximumFractionDigits:1})} kg</td>
                      <td className="py-2 px-3 text-right text-emerald-400">{row.fabricado.toLocaleString('pt-BR', {maximumFractionDigits:1})} kg</td>
                      <td className="py-2 px-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          row.pesoTotal > 0 && (row.fabricado / row.pesoTotal) > 0.5 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {row.pesoTotal > 0 ? ((row.fabricado / row.pesoTotal) * 100).toFixed(1) : 0}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-blue-400">{row.soldado.toLocaleString('pt-BR', {maximumFractionDigits:1})} kg</td>
                      <td className="py-2 px-3 text-right text-amber-400">{row.pintado.toLocaleString('pt-BR', {maximumFractionDigits:1})} kg</td>
                      <td className="py-2 px-3 text-right text-cyan-400">{row.enviado.toLocaleString('pt-BR', {maximumFractionDigits:1})} kg</td>
                      <td className="py-2 px-3 text-right text-slate-400">{row.qtd}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-600 font-bold">
                    <td className="py-2 px-3 text-white">TOTAL</td>
                    <td className="py-2 px-3 text-right text-white">{kpis.pesoTotal.toLocaleString('pt-BR', {maximumFractionDigits:1})} kg</td>
                    <td className="py-2 px-3 text-right text-emerald-400">{kpis.pesoFabricado.toLocaleString('pt-BR', {maximumFractionDigits:1})} kg</td>
                    <td className="py-2 px-3 text-right text-emerald-400">{kpis.percFabricado.toFixed(1)}%</td>
                    <td className="py-2 px-3 text-right text-blue-400">{kpis.pesoSoldado.toLocaleString('pt-BR', {maximumFractionDigits:1})} kg</td>
                    <td className="py-2 px-3 text-right text-amber-400">{kpis.pesoPintado.toLocaleString('pt-BR', {maximumFractionDigits:1})} kg</td>
                    <td className="py-2 px-3 text-right text-cyan-400">{kpis.pesoEnviado.toLocaleString('pt-BR', {maximumFractionDigits:1})} kg</td>
                    <td className="py-2 px-3 text-right text-slate-300">{pecas.length}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === '3d' && (
          <motion.div key="3d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 rounded-xl border border-slate-700/50 p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Maximize2 size={18} className="text-emerald-400" /> Grafico 3D Interativo - Producao
            </h3>
            <Production3DChart data={data3D} width={Math.min(window.innerWidth - 100, 1100)} height={500} />
            <div className="mt-4 flex flex-wrap gap-3 justify-center">
              {data3D.map((d, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/30">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                  <span className="text-xs text-slate-300">{d.label}:</span>
                  <span className="text-xs font-bold text-white">{d.value.toLocaleString('pt-BR', {maximumFractionDigits:1})} kg</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
