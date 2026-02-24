// MONTEX ERP Premium - Módulo de Gestão de Equipes
// CRUD completo: Criar, Editar, Excluir funcionários e equipes
// Persistência automática via Supabase + ERPContext

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Users, UserPlus, User, Briefcase, Award, TrendingUp, BarChart3,
  Search, Pencil, Trash2, Save,
  Plus, Shield, UserCheck
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar
} from 'recharts';

// ERPContext - dados reais com CRUD
import { useEquipes } from '@/contexts/ERPContext';

// Setores disponíveis
const SETORES = ['Geral', 'Produção', 'Fabricação', 'Solda', 'Pintura', 'Montagem', 'Expedição', 'Administrativo'];
const TIPOS_EQUIPE = [
  { value: 'producao', label: 'Produção / Fábrica' },
  { value: 'pintura', label: 'Pintura' },
  { value: 'montagem', label: 'Montagem' },
  { value: 'solda', label: 'Solda' },
  { value: 'expedicao', label: 'Expedição' },
];

// Dados mock fallback caso ERPContext não tenha dados
const mockFuncionarios = [
  { id: 'FUNC001', nome: 'Cristiane Vieira', cargo: 'Auxiliar de Serviços Gerais', setor: 'Geral', equipeId: null, equipeNome: '-', status: 'ativo', ativo: true, pecasMes: 0, eficiencia: 0, qualidade: 0 },
  { id: 'FUNC002', nome: 'Diego Alves da Silva', cargo: 'Montador I', setor: 'Montagem', equipeId: 'EQP003', equipeNome: 'Equipe Montagem Campo', status: 'ativo', ativo: true, pecasMes: 85, eficiencia: 88, qualidade: 96 },
  { id: 'FUNC003', nome: 'David Barbosa de Souza', cargo: 'Coordenador de Produção', setor: 'Produção', equipeId: 'EQP001', equipeNome: 'Equipe Fábrica', status: 'ativo', ativo: true, pecasMes: 0, eficiencia: 0, qualidade: 0 },
  { id: 'FUNC004', nome: 'Eder Bruno Silva Ferreira', cargo: 'Montador I', setor: 'Montagem', equipeId: 'EQP003', equipeNome: 'Equipe Montagem Campo', status: 'ativo', ativo: true, pecasMes: 92, eficiencia: 91, qualidade: 97 },
  { id: 'FUNC005', nome: 'Derlei Gobbi', cargo: 'Montador I', setor: 'Montagem', equipeId: 'EQP003', equipeNome: 'Equipe Montagem Campo', status: 'ativo', ativo: true, pecasMes: 78, eficiencia: 82, qualidade: 94 },
  { id: 'FUNC006', nome: 'Erick Welison Hosni de Paula', cargo: 'Meio Oficial de Montador', setor: 'Montagem', equipeId: 'EQP003', equipeNome: 'Equipe Montagem Campo', status: 'ativo', ativo: true, pecasMes: 55, eficiencia: 76, qualidade: 92 },
  { id: 'FUNC007', nome: 'Flavio da Cruz', cargo: 'Instalador Esquadrias Alumínio', setor: 'Fabricação', equipeId: 'EQP001', equipeNome: 'Equipe Fábrica', status: 'ativo', ativo: true, pecasMes: 68, eficiencia: 89, qualidade: 98 },
  { id: 'FUNC008', nome: 'Flavio de Jesus Santos', cargo: 'Líder de Produção', setor: 'Produção', equipeId: 'EQP001', equipeNome: 'Equipe Fábrica', status: 'ativo', ativo: true, pecasMes: 45, eficiencia: 94, qualidade: 99 },
  { id: 'FUNC009', nome: 'Gilmar Sousa da Silva', cargo: 'Soldador II', setor: 'Solda', equipeId: 'EQP001', equipeNome: 'Equipe Fábrica', status: 'ativo', ativo: true, pecasMes: 110, eficiencia: 96, qualidade: 98 },
  { id: 'FUNC010', nome: 'Gabriel Ferreira Santos', cargo: 'Montador I', setor: 'Montagem', equipeId: 'EQP003', equipeNome: 'Equipe Montagem Campo', status: 'ativo', ativo: true, pecasMes: 82, eficiencia: 85, qualidade: 95 },
  { id: 'FUNC011', nome: 'Jeferson Bruno de O. Costa', cargo: 'Montador III', setor: 'Montagem', equipeId: 'EQP003', equipeNome: 'Equipe Montagem Campo', status: 'ativo', ativo: true, pecasMes: 120, eficiencia: 97, qualidade: 99 },
  { id: 'FUNC012', nome: 'João Ermelindo Soares', cargo: 'Serralheiro de Alumínio', setor: 'Fabricação', equipeId: 'EQP001', equipeNome: 'Equipe Fábrica', status: 'ativo', ativo: true, pecasMes: 95, eficiencia: 93, qualidade: 97 },
  { id: 'FUNC013', nome: 'João Batista Alves Rodrigues', cargo: 'Ajudante de Montagem', setor: 'Montagem', equipeId: 'EQP003', equipeNome: 'Equipe Montagem Campo', status: 'ativo', ativo: true, pecasMes: 40, eficiencia: 72, qualidade: 90 },
  { id: 'FUNC014', nome: 'José Eduardo Lucas', cargo: 'Meio Oficial de Montador', setor: 'Montagem', equipeId: 'EQP004', equipeNome: 'Equipe Montagem Interior', status: 'ativo', ativo: true, pecasMes: 58, eficiencia: 78, qualidade: 93 },
  { id: 'FUNC015', nome: 'Juscelio Rodrigues de Souza', cargo: 'Soldador I', setor: 'Solda', equipeId: 'EQP001', equipeNome: 'Equipe Fábrica', status: 'ativo', ativo: true, pecasMes: 88, eficiencia: 90, qualidade: 96 },
  { id: 'FUNC016', nome: 'Juscelio Rodrigues', cargo: 'Montador III', setor: 'Montagem', equipeId: 'EQP003', equipeNome: 'Equipe Montagem Campo', status: 'ativo', ativo: true, pecasMes: 115, eficiencia: 95, qualidade: 98 },
  { id: 'FUNC017', nome: 'Luiz Barbosa Ferrera', cargo: 'Soldador I', setor: 'Solda', equipeId: 'EQP001', equipeNome: 'Equipe Fábrica', status: 'ativo', ativo: true, pecasMes: 85, eficiencia: 88, qualidade: 95 },
  { id: 'FUNC018', nome: 'Ricardo Alves Pereira', cargo: 'Caldeireiro Montador', setor: 'Fabricação', equipeId: 'EQP001', equipeNome: 'Equipe Fábrica', status: 'ativo', ativo: true, pecasMes: 72, eficiencia: 91, qualidade: 97 },
  { id: 'FUNC019', nome: 'Tarcísio Vieira de Almeida', cargo: 'Almoxarife', setor: 'Geral', equipeId: null, equipeNome: '-', status: 'ativo', ativo: true, pecasMes: 0, eficiencia: 0, qualidade: 0 },
  { id: 'FUNC020', nome: 'Waldercy Miranda', cargo: 'Montador II', setor: 'Montagem', equipeId: 'EQP003', equipeNome: 'Equipe Montagem Campo', status: 'ativo', ativo: true, pecasMes: 98, eficiencia: 92, qualidade: 96 },
  { id: 'FUNC021', nome: 'Wendel Gabriel Alves dos Reis', cargo: 'Meio Oficial de Montador', setor: 'Montagem', equipeId: 'EQP004', equipeNome: 'Equipe Montagem Interior', status: 'ativo', ativo: true, pecasMes: 52, eficiencia: 75, qualidade: 91 },
  { id: 'FUNC022', nome: 'Whashington de Oliveira', cargo: 'Encarregado de Campo II', setor: 'Produção', equipeId: 'EQP003', equipeNome: 'Equipe Montagem Campo', status: 'ativo', ativo: true, pecasMes: 35, eficiencia: 93, qualidade: 99 },
];

const mockEquipes = [
  { id: 'EQP001', nome: 'Equipe Fábrica', tipo: 'producao', liderId: 'FUNC003', liderNome: 'David Barbosa de Souza', turno: 'Diurno', setor: 'Fabricação', metaMes: 600, producaoMes: 563, eficiencia: 92, ativa: true },
  { id: 'EQP002', nome: 'Equipe Pintura', tipo: 'pintura', liderId: 'FUNC008', liderNome: 'Flavio de Jesus Santos', turno: 'Diurno', setor: 'Pintura', metaMes: 140, producaoMes: 120, eficiencia: 85, ativa: true },
  { id: 'EQP003', nome: 'Equipe Montagem Campo', tipo: 'montagem', liderId: 'FUNC022', liderNome: 'Whashington de Oliveira', turno: 'Diurno', setor: 'Montagem', metaMes: 850, producaoMes: 745, eficiencia: 89, ativa: true },
  { id: 'EQP004', nome: 'Equipe Montagem Interior', tipo: 'montagem', liderId: 'FUNC011', liderNome: 'Jeferson Bruno de O. Costa', turno: 'Diurno', setor: 'Montagem', metaMes: 150, producaoMes: 110, eficiencia: 77, ativa: true },
];

const getStatusColor = (status) => {
  switch (status) {
    case 'ativo': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'ferias': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'afastado': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'inativo': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
};

const getEfColor = (v) => v >= 90 ? 'text-emerald-400' : v >= 75 ? 'text-blue-400' : v >= 60 ? 'text-amber-400' : 'text-red-400';

// ======================================================
// COMPONENTE PRINCIPAL
// ======================================================
export default function EquipesPage() {
  // ERPContext - dados reais + CRUD
  const {
    funcionarios: ctxFuncionarios,
    equipes: ctxEquipes,
    addFuncionario, updateFuncionario, deleteFuncionario,
    addEquipe, updateEquipe, deleteEquipe,
  } = useEquipes();

  // Usar dados do context se disponíveis, senão mock
  const funcionarios = ctxFuncionarios?.length > 0 ? ctxFuncionarios : mockFuncionarios;
  const equipes = ctxEquipes?.length > 0 ? ctxEquipes : mockEquipes;

  const [activeTab, setActiveTab] = useState('funcionarios');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroSetor, setFiltroSetor] = useState('todos');

  // Modais
  const [funcDialog, setFuncDialog] = useState(false);
  const [equipeDialog, setEquipeDialog] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null); // { type, id, nome }
  const [editingFunc, setEditingFunc] = useState(null);
  const [editingEquipe, setEditingEquipe] = useState(null);

  // Form funcionário
  const emptyFunc = { nome: '', cargo: '', setor: '', telefone: '', equipeId: '', equipeNome: '', status: 'ativo', pecasMes: 0, eficiencia: 0, qualidade: 0, salario: 0 };
  const [funcForm, setFuncForm] = useState(emptyFunc);

  // Form equipe
  const emptyEquipe = { nome: '', tipo: '', liderNome: '', turno: 'Diurno', setor: '', metaMes: 0, producaoMes: 0, eficiencia: 0 };
  const [equipeForm, setEquipeForm] = useState(emptyEquipe);

  // ========== KPIs ==========
  const kpis = useMemo(() => {
    const ativos = funcionarios.filter(f => f.status === 'ativo' || f.ativo !== false).length;
    const totalProducao = funcionarios.reduce((s, f) => s + (f.pecasMes || f.metricas?.pecasMes || 0), 0);
    const efArr = funcionarios.filter(f => (f.eficiencia || f.metricas?.eficiencia || 0) > 0);
    const efMedia = efArr.length > 0 ? Math.round(efArr.reduce((s, f) => s + (f.eficiencia || f.metricas?.eficiencia || 0), 0) / efArr.length) : 0;
    return { ativos, totalProducao, efMedia, totalEquipes: equipes.length };
  }, [funcionarios, equipes]);

  // ========== FILTROS ==========
  const funcFiltrados = useMemo(() => {
    return funcionarios.filter(f => {
      if (searchTerm && !f.nome.toLowerCase().includes(searchTerm.toLowerCase()) && !(f.cargo || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filtroSetor !== 'todos' && f.setor !== filtroSetor) return false;
      return true;
    });
  }, [funcionarios, searchTerm, filtroSetor]);

  // ========== HANDLERS FUNCIONÁRIO ==========
  const handleOpenFuncDialog = useCallback((func = null) => {
    if (func) {
      setEditingFunc(func.id);
      setFuncForm({
        nome: func.nome || '',
        cargo: func.cargo || '',
        setor: func.setor || '',
        telefone: func.telefone || '',
        equipeId: func.equipeId || '',
        equipeNome: func.equipeNome || func.equipe || '',
        status: func.status || 'ativo',
        pecasMes: func.pecasMes || func.metricas?.pecasMes || 0,
        eficiencia: func.eficiencia || func.metricas?.eficiencia || 0,
        qualidade: func.qualidade || func.metricas?.qualidade || 0,
        salario: func.salario || 0,
      });
    } else {
      setEditingFunc(null);
      setFuncForm(emptyFunc);
    }
    setFuncDialog(true);
  }, []);

  const handleSaveFunc = useCallback(async () => {
    if (!funcForm.nome || !funcForm.cargo || !funcForm.setor) {
      toast.error('Preencha Nome, Cargo e Setor');
      return;
    }
    // Encontrar nome da equipe selecionada
    const equipeObj = equipes.find(e => e.id === funcForm.equipeId);
    const data = {
      ...funcForm,
      equipeNome: equipeObj?.nome || funcForm.equipeNome || '-',
      ativo: funcForm.status === 'ativo',
      pecasMes: Number(funcForm.pecasMes) || 0,
      eficiencia: Number(funcForm.eficiencia) || 0,
      qualidade: Number(funcForm.qualidade) || 0,
      salario: Number(funcForm.salario) || 0,
    };

    if (editingFunc) {
      await updateFuncionario(editingFunc, data);
      toast.success(`${data.nome} atualizado!`);
    } else {
      const newId = `FUNC${String(Date.now()).slice(-6)}`;
      await addFuncionario({ id: newId, ...data });
      toast.success(`${data.nome} cadastrado!`);
    }
    setFuncDialog(false);
    setEditingFunc(null);
    setFuncForm(emptyFunc);
  }, [funcForm, editingFunc, equipes, updateFuncionario, addFuncionario]);

  const handleDeleteFunc = useCallback(async () => {
    if (!confirmDialog) return;
    await deleteFuncionario(confirmDialog.id);
    toast.success(`${confirmDialog.nome} removido`);
    setConfirmDialog(null);
  }, [confirmDialog, deleteFuncionario]);

  // ========== HANDLERS EQUIPE ==========
  const handleOpenEquipeDialog = useCallback((eq = null) => {
    if (eq) {
      setEditingEquipe(eq.id);
      setEquipeForm({
        nome: eq.nome || '',
        tipo: eq.tipo || '',
        liderNome: eq.liderNome || eq.lider || '',
        turno: eq.turno || 'Diurno',
        setor: eq.setor || '',
        metaMes: eq.metaMes || 0,
        producaoMes: eq.producaoMes || 0,
        eficiencia: eq.eficiencia || 0,
      });
    } else {
      setEditingEquipe(null);
      setEquipeForm(emptyEquipe);
    }
    setEquipeDialog(true);
  }, []);

  const handleSaveEquipe = useCallback(async () => {
    if (!equipeForm.nome || !equipeForm.tipo) {
      toast.error('Preencha Nome e Tipo da equipe');
      return;
    }
    const data = {
      ...equipeForm,
      metaMes: Number(equipeForm.metaMes) || 0,
      producaoMes: Number(equipeForm.producaoMes) || 0,
      eficiencia: Number(equipeForm.eficiencia) || 0,
      ativa: true,
    };
    if (editingEquipe) {
      await updateEquipe(editingEquipe, data);
      toast.success(`${data.nome} atualizada!`);
    } else {
      const newId = `EQP${String(Date.now()).slice(-6)}`;
      await addEquipe({ id: newId, ...data });
      toast.success(`${data.nome} criada!`);
    }
    setEquipeDialog(false);
    setEditingEquipe(null);
    setEquipeForm(emptyEquipe);
  }, [equipeForm, editingEquipe, updateEquipe, addEquipe]);

  const handleDeleteEquipe = useCallback(async () => {
    if (!confirmDialog) return;
    await deleteEquipe(confirmDialog.id);
    toast.success(`${confirmDialog.nome} removida`);
    setConfirmDialog(null);
  }, [confirmDialog, deleteEquipe]);

  // Membros de uma equipe
  const getMembros = useCallback((equipeId) => {
    return funcionarios.filter(f => f.equipeId === equipeId);
  }, [funcionarios]);

  // ========== DADOS GRÁFICO DESEMPENHO ==========
  const producaoData = useMemo(() => {
    return funcionarios
      .filter(f => (f.pecasMes || f.metricas?.pecasMes || 0) > 0)
      .sort((a, b) => (b.pecasMes || b.metricas?.pecasMes || 0) - (a.pecasMes || a.metricas?.pecasMes || 0))
      .slice(0, 10)
      .map(f => ({
        nome: f.nome.split(' ').slice(0, 2).join(' '),
        pecas: f.pecasMes || f.metricas?.pecasMes || 0,
        eficiencia: f.eficiencia || f.metricas?.eficiencia || 0,
      }));
  }, [funcionarios]);

  const radarData = useMemo(() => {
    const avgEf = kpis.efMedia;
    const avgQual = funcionarios.filter(f => (f.qualidade || f.metricas?.qualidade || 0) > 0)
      .reduce((s, f, _, a) => s + (f.qualidade || f.metricas?.qualidade || 0) / a.length, 0);
    return [
      { subject: 'Produção', A: Math.min(100, Math.round(kpis.totalProducao / 15)), fullMark: 100 },
      { subject: 'Qualidade', A: Math.round(avgQual), fullMark: 100 },
      { subject: 'Eficiência', A: avgEf, fullMark: 100 },
      { subject: 'Equipes', A: Math.min(100, equipes.length * 25), fullMark: 100 },
      { subject: 'Segurança', A: 98, fullMark: 100 },
    ];
  }, [funcionarios, equipes, kpis]);

  // ========== SETORES DISPONÍVEIS ==========
  const setoresDisponiveis = useMemo(() => {
    const s = new Set(funcionarios.map(f => f.setor).filter(Boolean));
    SETORES.forEach(st => s.add(st));
    return [...s].sort();
  }, [funcionarios]);

  // ======================================================
  // RENDER
  // ======================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
            Gestão de Equipes
          </h1>
          <p className="text-slate-400 mt-1">Funcionários, equipes e métricas de produção - dados sincronizados com Supabase</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleOpenEquipeDialog()} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-2" />
            Nova Equipe
          </Button>
          <Button onClick={() => handleOpenFuncDialog()} className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Funcionário
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: UserCheck, label: 'Funcionários Ativos', value: kpis.ativos, color: 'from-cyan-500 to-blue-500' },
          { icon: TrendingUp, label: 'Produção Total', value: kpis.totalProducao, color: 'from-emerald-500 to-green-500' },
          { icon: Award, label: 'Eficiência Média', value: `${kpis.efMedia}%`, color: 'from-purple-500 to-indigo-500' },
          { icon: Shield, label: 'Equipes', value: kpis.totalEquipes, color: 'from-amber-500 to-orange-500' },
        ].map((kpi) => (
          <Card key={kpi.label} className="bg-slate-900/60 border-slate-700/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center", kpi.color)}>
                <kpi.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{kpi.label}</p>
                <p className="text-2xl font-bold text-white">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList className="bg-slate-800/50 border border-slate-700/50">
            <TabsTrigger value="funcionarios" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              <User className="h-4 w-4 mr-2" /> Funcionários
            </TabsTrigger>
            <TabsTrigger value="equipes" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              <Users className="h-4 w-4 mr-2" /> Equipes
            </TabsTrigger>
            <TabsTrigger value="desempenho" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              <BarChart3 className="h-4 w-4 mr-2" /> Desempenho
            </TabsTrigger>
          </TabsList>

          {activeTab === 'funcionarios' && (
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input className="pl-9 bg-slate-800 border-slate-700 w-56" placeholder="Buscar funcionário..."
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <Select value={filtroSetor} onValueChange={setFiltroSetor}>
                <SelectTrigger className="bg-slate-800 border-slate-700 w-40">
                  <SelectValue placeholder="Setor" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="todos">Todos</SelectItem>
                  {setoresDisponiveis.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* ============ TAB FUNCIONÁRIOS ============ */}
        <TabsContent value="funcionarios" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AnimatePresence>
              {funcFiltrados.map((f) => {
                const iniciais = f.nome.split(' ').map(n => n[0]).join('').substring(0, 2);
                const ef = f.eficiencia || f.metricas?.eficiencia || 0;
                const qual = f.qualidade || f.metricas?.qualidade || 0;
                const pecas = f.pecasMes || f.metricas?.pecasMes || 0;
                return (
                  <motion.div key={f.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4 hover:border-slate-600/50 transition-all group">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14 border-2 border-slate-600">
                        <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white font-bold">{iniciais}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-white">{f.nome}</h3>
                            <p className="text-sm text-slate-400">{f.cargo}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge className={cn("border text-[10px]", getStatusColor(f.status))}>{f.status}</Badge>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleOpenFuncDialog(f)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setConfirmDialog({ type: 'func', id: f.id, nome: f.nome })}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-slate-400 flex items-center gap-1"><Briefcase className="h-3 w-3" /> {f.setor}</span>
                          <span className="text-xs text-slate-400 flex items-center gap-1"><Users className="h-3 w-3" /> {f.equipeNome || f.equipe || '-'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-700/50">
                          <div>
                            <p className="text-[10px] text-slate-500">Produção</p>
                            <p className="text-lg font-bold text-white">{pecas}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500">Eficiência</p>
                            <p className={cn("text-lg font-bold", getEfColor(ef))}>{ef}%</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500">Qualidade</p>
                            <p className="text-lg font-bold text-emerald-400">{qual}%</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          {funcFiltrados.length === 0 && (
            <div className="text-center py-12 text-slate-500">Nenhum funcionário encontrado</div>
          )}
        </TabsContent>

        {/* ============ TAB EQUIPES ============ */}
        <TabsContent value="equipes" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {equipes.map((eq) => {
              const membros = getMembros(eq.id);
              const progPct = eq.metaMes > 0 ? Math.round((eq.producaoMes / eq.metaMes) * 100) : 0;
              return (
                <motion.div key={eq.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5 hover:border-slate-600/50 transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{eq.nome}</h3>
                        <p className="text-sm text-slate-400">Líder: {eq.liderNome || eq.lider || '-'}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="border-slate-600 text-slate-300">{eq.turno || 'Diurno'}</Badge>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleOpenEquipeDialog(eq)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setConfirmDialog({ type: 'equipe', id: eq.id, nome: eq.nome })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Eficiência</span>
                      <span className={cn("font-semibold", getEfColor(eq.eficiencia))}>{eq.eficiencia}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all",
                        eq.eficiencia >= 90 ? "bg-gradient-to-r from-emerald-500 to-green-500" :
                        eq.eficiencia >= 75 ? "bg-gradient-to-r from-blue-500 to-cyan-500" :
                        "bg-gradient-to-r from-amber-500 to-orange-500"
                      )} style={{ width: `${Math.min(progPct, 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">{eq.producaoMes} peças</span>
                      <span className="text-slate-500">Meta: {eq.metaMes}</span>
                    </div>

                    {/* Membros */}
                    <div className="pt-3 border-t border-slate-700/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400"><User className="h-3 w-3 inline mr-1" />{membros.length} membros</span>
                        <span className="text-xs text-slate-500">{eq.setor}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {membros.slice(0, 6).map(m => (
                          <span key={m.id} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                            {m.nome.split(' ')[0]}
                          </span>
                        ))}
                        {membros.length > 6 && <span className="text-[10px] px-2 py-0.5 text-slate-500">+{membros.length - 6}</span>}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* ============ TAB DESEMPENHO ============ */}
        <TabsContent value="desempenho" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardContent className="p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-cyan-400" /> Produção por Funcionário (Top 10)
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={producaoData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#64748b" fontSize={11} />
                    <YAxis type="category" dataKey="nome" stroke="#64748b" fontSize={11} width={120} />
                    <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 8 }} />
                    <Bar dataKey="pecas" fill="#22d3ee" radius={[0, 4, 4, 0]} name="Peças/mês" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardContent className="p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5 text-emerald-400" /> Radar de Performance
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={12} />
                    <PolarRadiusAxis stroke="#475569" fontSize={10} />
                    <Radar name="Performance" dataKey="A" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ============ DIALOG FUNCIONÁRIO ============ */}
      <Dialog open={funcDialog} onOpenChange={setFuncDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{editingFunc ? 'Editar Funcionário' : 'Novo Funcionário'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-slate-300">Nome Completo *</Label>
              <Input className="mt-1 bg-slate-800 border-slate-700" placeholder="Nome" value={funcForm.nome}
                onChange={(e) => setFuncForm({ ...funcForm, nome: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Cargo *</Label>
                <Input className="mt-1 bg-slate-800 border-slate-700" placeholder="Cargo" value={funcForm.cargo}
                  onChange={(e) => setFuncForm({ ...funcForm, cargo: e.target.value })} />
              </div>
              <div>
                <Label className="text-slate-300">Setor *</Label>
                <Select value={funcForm.setor} onValueChange={(v) => setFuncForm({ ...funcForm, setor: v })}>
                  <SelectTrigger className="mt-1 bg-slate-800 border-slate-700"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {SETORES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Equipe</Label>
                <Select value={funcForm.equipeId || 'nenhuma'} onValueChange={(v) => setFuncForm({ ...funcForm, equipeId: v === 'nenhuma' ? '' : v })}>
                  <SelectTrigger className="mt-1 bg-slate-800 border-slate-700"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="nenhuma">Sem equipe</SelectItem>
                    {equipes.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Status</Label>
                <Select value={funcForm.status} onValueChange={(v) => setFuncForm({ ...funcForm, status: v })}>
                  <SelectTrigger className="mt-1 bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="ferias">Férias</SelectItem>
                    <SelectItem value="afastado">Afastado</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Telefone</Label>
                <Input className="mt-1 bg-slate-800 border-slate-700" placeholder="(00) 00000-0000" value={funcForm.telefone}
                  onChange={(e) => setFuncForm({ ...funcForm, telefone: e.target.value })} />
              </div>
              <div>
                <Label className="text-slate-300">Salário</Label>
                <Input className="mt-1 bg-slate-800 border-slate-700" type="number" placeholder="0" value={funcForm.salario}
                  onChange={(e) => setFuncForm({ ...funcForm, salario: e.target.value })} />
              </div>
            </div>
            {editingFunc && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-300">Peças/mês</Label>
                  <Input className="mt-1 bg-slate-800 border-slate-700" type="number" value={funcForm.pecasMes}
                    onChange={(e) => setFuncForm({ ...funcForm, pecasMes: e.target.value })} />
                </div>
                <div>
                  <Label className="text-slate-300">Eficiência %</Label>
                  <Input className="mt-1 bg-slate-800 border-slate-700" type="number" value={funcForm.eficiencia}
                    onChange={(e) => setFuncForm({ ...funcForm, eficiencia: e.target.value })} />
                </div>
                <div>
                  <Label className="text-slate-300">Qualidade %</Label>
                  <Input className="mt-1 bg-slate-800 border-slate-700" type="number" value={funcForm.qualidade}
                    onChange={(e) => setFuncForm({ ...funcForm, qualidade: e.target.value })} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="mt-4">
            <DialogClose asChild><Button variant="outline" className="border-slate-600 text-slate-300">Cancelar</Button></DialogClose>
            <Button onClick={handleSaveFunc} className="bg-gradient-to-r from-cyan-500 to-blue-500">
              <Save className="h-4 w-4 mr-2" /> {editingFunc ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ DIALOG EQUIPE ============ */}
      <Dialog open={equipeDialog} onOpenChange={setEquipeDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{editingEquipe ? 'Editar Equipe' : 'Nova Equipe'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-slate-300">Nome da Equipe *</Label>
              <Input className="mt-1 bg-slate-800 border-slate-700" placeholder="Ex: Equipe Solda A" value={equipeForm.nome}
                onChange={(e) => setEquipeForm({ ...equipeForm, nome: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Tipo *</Label>
                <Select value={equipeForm.tipo} onValueChange={(v) => setEquipeForm({ ...equipeForm, tipo: v })}>
                  <SelectTrigger className="mt-1 bg-slate-800 border-slate-700"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {TIPOS_EQUIPE.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Setor</Label>
                <Select value={equipeForm.setor || 'nenhum'} onValueChange={(v) => setEquipeForm({ ...equipeForm, setor: v === 'nenhum' ? '' : v })}>
                  <SelectTrigger className="mt-1 bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="nenhum">Selecione</SelectItem>
                    {SETORES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Líder</Label>
                <Select value={equipeForm.liderNome || 'nenhum'} onValueChange={(v) => setEquipeForm({ ...equipeForm, liderNome: v === 'nenhum' ? '' : v })}>
                  <SelectTrigger className="mt-1 bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="nenhum">Selecione</SelectItem>
                    {funcionarios.map(f => <SelectItem key={f.id} value={f.nome}>{f.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Turno</Label>
                <Select value={equipeForm.turno} onValueChange={(v) => setEquipeForm({ ...equipeForm, turno: v })}>
                  <SelectTrigger className="mt-1 bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="Diurno">Diurno</SelectItem>
                    <SelectItem value="Noturno">Noturno</SelectItem>
                    <SelectItem value="Revezamento">Revezamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-slate-300">Meta/mês</Label>
                <Input className="mt-1 bg-slate-800 border-slate-700" type="number" value={equipeForm.metaMes}
                  onChange={(e) => setEquipeForm({ ...equipeForm, metaMes: e.target.value })} />
              </div>
              <div>
                <Label className="text-slate-300">Produção/mês</Label>
                <Input className="mt-1 bg-slate-800 border-slate-700" type="number" value={equipeForm.producaoMes}
                  onChange={(e) => setEquipeForm({ ...equipeForm, producaoMes: e.target.value })} />
              </div>
              <div>
                <Label className="text-slate-300">Eficiência %</Label>
                <Input className="mt-1 bg-slate-800 border-slate-700" type="number" value={equipeForm.eficiencia}
                  onChange={(e) => setEquipeForm({ ...equipeForm, eficiencia: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <DialogClose asChild><Button variant="outline" className="border-slate-600 text-slate-300">Cancelar</Button></DialogClose>
            <Button onClick={handleSaveEquipe} className="bg-gradient-to-r from-cyan-500 to-blue-500">
              <Save className="h-4 w-4 mr-2" /> {editingEquipe ? 'Salvar' : 'Criar Equipe'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ DIALOG CONFIRMAÇÃO EXCLUSÃO ============ */}
      <Dialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-slate-300 py-2">
            Tem certeza que deseja excluir <strong className="text-white">{confirmDialog?.nome}</strong>?
            Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" className="border-slate-600 text-slate-300">Cancelar</Button></DialogClose>
            <Button variant="destructive" onClick={confirmDialog?.type === 'func' ? handleDeleteFunc : handleDeleteEquipe}>
              <Trash2 className="h-4 w-4 mr-2" /> Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
