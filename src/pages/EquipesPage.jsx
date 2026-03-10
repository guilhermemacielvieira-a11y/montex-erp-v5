// MONTEX ERP Premium - Módulo de Gestão de Equipes
// CRUD completo: Criar, Editar, Excluir funcionários e equipes
// Persistência automática via Supabase + ERPContext

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Users, UserPlus, User, Briefcase, Award, TrendingUp, BarChart3,
  Search, Pencil, Trash2, Save,
  Plus, Shield, UserCheck, GripVertical, ArrowLeftRight
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
import { DndContext, DragOverlay, rectIntersection, pointerWithin, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ERPContext - dados reais com CRUD
import { useEquipes } from '@/contexts/ERPContext';

// Setores disponíveis
const SETORES = ['Pintura', 'Solda', 'Montagem de Campo', 'Fabricação', 'Administrativo Produção', 'Administrativo Geral'];
const TIPOS_EQUIPE = [
  { value: 'pintura', label: 'Pintura' },
  { value: 'solda', label: 'Solda' },
  { value: 'montagem_campo', label: 'Montagem de Campo' },
  { value: 'fabricacao', label: 'Fabricação' },
  { value: 'adm_producao', label: 'Administrativo Produção' },
  { value: 'adm_geral', label: 'Administrativo Geral' },
];

// Equipe virtual para funcionários sem equipe
const SEM_EQUIPE = { id: 'SEM_EQUIPE', nome: 'Sem Equipe', tipo: 'none', liderNome: '', turno: '', setor: '' };

// Dados mock fallback caso ERPContext não tenha dados
const mockFuncionarios = [
  // === EQUIPE PINTURA ===
  { id: 'FUNC301', nome: 'Anderson Marçal Silva', cargo: 'Pintor', setor: 'Pintura', equipeId: 'EQP001', equipeNome: 'Equipe Pintura', status: 'ativo', ativo: true, pecasMes: 0, eficiencia: 85, qualidade: 92, salario: 6000 },
  { id: 'FUNC302', nome: 'Flávio Pereira Miranda', cargo: 'Pintor', setor: 'Pintura', equipeId: 'EQP001', equipeNome: 'Equipe Pintura', status: 'ativo', ativo: true, pecasMes: 0, eficiencia: 83, qualidade: 90, salario: 5600 },
  { id: 'FUNC303', nome: 'José Elvécio Mariano', cargo: 'Pintor', setor: 'Pintura', equipeId: 'EQP001', equipeNome: 'Equipe Pintura', status: 'ativo', ativo: true, pecasMes: 0, eficiencia: 80, qualidade: 88, salario: 5000 },
  // === EQUIPE SOLDA ===
  { id: 'FUNC109', nome: 'Gilmar Sousa da Silva', cargo: 'Soldador II', setor: 'Solda', equipeId: 'EQP002', equipeNome: 'Equipe Solda', status: 'ativo', ativo: true, pecasMes: 110, eficiencia: 96, qualidade: 98, salario: 3368.98 },
  { id: 'FUNC124', nome: 'Juscélio Rodrigues de Souza', cargo: 'Soldador', setor: 'Solda', equipeId: 'EQP002', equipeNome: 'Equipe Solda', status: 'ativo', ativo: true, pecasMes: 88, eficiencia: 90, qualidade: 96, salario: 2859.14 },
  { id: 'FUNC170', nome: 'Luiz Barbosa Ferreira', cargo: 'Soldador', setor: 'Solda', equipeId: 'EQP002', equipeNome: 'Equipe Solda', status: 'ativo', ativo: true, pecasMes: 85, eficiencia: 88, qualidade: 95, salario: 2859.14 },
  { id: 'FUNC203', nome: 'Daniel Vinícius de Souza Silva', cargo: 'Soldador I', setor: 'Solda', equipeId: 'EQP002', equipeNome: 'Equipe Solda', status: 'ativo', ativo: true, pecasMes: 75, eficiencia: 84, qualidade: 93, salario: 2859.14 },
  // === EQUIPE MONTAGEM DE CAMPO ===
  { id: 'FUNC117', nome: 'Washington de Oliveira', cargo: 'Encarregado de Campo II', setor: 'Montagem de Campo', equipeId: 'EQP003', equipeNome: 'Equipe Montagem de Campo', status: 'ativo', ativo: true, pecasMes: 35, eficiencia: 93, qualidade: 99, salario: 4133.86 },
  { id: 'FUNC100', nome: 'Jeferson Bruno de Oliveira Costa', cargo: 'Montador Estrut Metal III', setor: 'Montagem de Campo', equipeId: 'EQP003', equipeNome: 'Equipe Montagem de Campo', status: 'ativo', ativo: true, pecasMes: 120, eficiencia: 97, qualidade: 99, salario: 3591.01 },
  { id: 'FUNC112', nome: 'Waldercy Miranda', cargo: 'Montador de Estrut Met II', setor: 'Montagem de Campo', equipeId: 'EQP003', equipeNome: 'Equipe Montagem de Campo', status: 'ativo', ativo: true, pecasMes: 98, eficiencia: 92, qualidade: 96, salario: 3281.80 },
  { id: 'FUNC166', nome: 'Juscélio Rodrigues', cargo: 'Montador Estrut Metal III', setor: 'Montagem de Campo', equipeId: 'EQP003', equipeNome: 'Equipe Montagem de Campo', status: 'ativo', ativo: true, pecasMes: 115, eficiencia: 95, qualidade: 98, salario: 3591.01 },
  { id: 'FUNC191', nome: 'Derlei Gobbi', cargo: 'Montador Estrut Metal III', setor: 'Montagem de Campo', equipeId: 'EQP003', equipeNome: 'Equipe Montagem de Campo', status: 'ativo', ativo: true, pecasMes: 78, eficiencia: 82, qualidade: 94, salario: 3591.01 },
  { id: 'FUNC151', nome: 'Eder Bruno Silva Ferreira', cargo: 'Montador I', setor: 'Montagem de Campo', equipeId: 'EQP003', equipeNome: 'Equipe Montagem de Campo', status: 'ativo', ativo: true, pecasMes: 92, eficiencia: 91, qualidade: 97, salario: 2741.86 },
  { id: 'FUNC152', nome: 'Gabriel Ferreira Santos', cargo: 'Montador I', setor: 'Montagem de Campo', equipeId: 'EQP003', equipeNome: 'Equipe Montagem de Campo', status: 'ativo', ativo: true, pecasMes: 82, eficiencia: 85, qualidade: 95, salario: 2741.86 },
  { id: 'FUNC169', nome: 'Diego Alves da Silva', cargo: 'Montador I', setor: 'Montagem de Campo', equipeId: 'EQP003', equipeNome: 'Equipe Montagem de Campo', status: 'ativo', ativo: true, pecasMes: 85, eficiencia: 88, qualidade: 96, salario: 2741.86 },
  { id: 'FUNC162', nome: 'José Eduardo Lucas', cargo: 'Meio Oficial de Montador', setor: 'Montagem de Campo', equipeId: 'EQP003', equipeNome: 'Equipe Montagem de Campo', status: 'ativo', ativo: true, pecasMes: 58, eficiencia: 78, qualidade: 93, salario: 2432.14 },
  { id: 'FUNC190', nome: 'Erick Welison Hosni de Paula', cargo: 'Meio Oficial de Montador', setor: 'Montagem de Campo', equipeId: 'EQP003', equipeNome: 'Equipe Montagem de Campo', status: 'ativo', ativo: true, pecasMes: 55, eficiencia: 76, qualidade: 92, salario: 2432.01 },
  { id: 'FUNC175', nome: 'Wendel Gabriel Alves dos Reis', cargo: 'Meio Oficial de Montador', setor: 'Montagem de Campo', equipeId: 'EQP003', equipeNome: 'Equipe Montagem de Campo', status: 'ferias', ativo: true, pecasMes: 52, eficiencia: 75, qualidade: 91, salario: 2432.14 },
  { id: 'FUNC188', nome: 'João Batista Alves Rodrigues', cargo: 'Ajudante de Montagem', setor: 'Montagem de Campo', equipeId: 'EQP003', equipeNome: 'Equipe Montagem de Campo', status: 'ativo', ativo: true, pecasMes: 40, eficiencia: 72, qualidade: 90, salario: 1837.63 },
  { id: 'FUNC204', nome: 'Arquiris Junior Rodrigues', cargo: 'Ajudante de Montagem', setor: 'Montagem de Campo', equipeId: 'EQP003', equipeNome: 'Equipe Montagem de Campo', status: 'ativo', ativo: true, pecasMes: 38, eficiencia: 70, qualidade: 89, salario: 1837.63 },
  { id: 'FUNC208', nome: 'Matheus André Celestino dos Santos', cargo: 'Ajudante de Montagem', setor: 'Montagem de Campo', equipeId: 'EQP003', equipeNome: 'Equipe Montagem de Campo', status: 'ativo', ativo: true, pecasMes: 36, eficiencia: 68, qualidade: 88, salario: 1837.63 },
  // === EQUIPE FABRICAÇÃO ===
  { id: 'FUNC110', nome: 'João Ermelindo Soares', cargo: 'Serralheiro de Alumínio', setor: 'Fabricação', equipeId: 'EQP004', equipeNome: 'Equipe Fabricação', status: 'ativo', ativo: true, pecasMes: 95, eficiencia: 93, qualidade: 97, salario: 5137.71 },
  { id: 'FUNC153', nome: 'Flávio da Cruz', cargo: 'Instalador Esquadrias Alumínio', setor: 'Fabricação', equipeId: 'EQP004', equipeNome: 'Equipe Fabricação', status: 'ativo', ativo: true, pecasMes: 68, eficiencia: 89, qualidade: 98, salario: 3480.70 },
  { id: 'FUNC140', nome: 'Ricardo Alves Pereira', cargo: 'Caldeireiro Montador', setor: 'Fabricação', equipeId: 'EQP004', equipeNome: 'Equipe Fabricação', status: 'ativo', ativo: true, pecasMes: 72, eficiencia: 91, qualidade: 97, salario: 4141.86 },
  // === EQUIPE ADMINISTRATIVO PRODUÇÃO ===
  { id: 'FUNC126', nome: 'Flávio de Jesus Santos', cargo: 'Líder de Produção', setor: 'Administrativo Produção', equipeId: 'EQP005', equipeNome: 'Administrativo Produção', status: 'ativo', ativo: true, pecasMes: 45, eficiencia: 94, qualidade: 99, salario: 3587.32 },
  { id: 'FUNC148', nome: 'David Barboza de Sousa', cargo: 'Coordenador de Produção', setor: 'Administrativo Produção', equipeId: 'EQP005', equipeNome: 'Administrativo Produção', status: 'ativo', ativo: true, pecasMes: 0, eficiencia: 0, qualidade: 0, salario: 2700.00 },
  { id: 'FUNC207', nome: 'Letícia Fonseca Soares', cargo: 'Técnico em Segurança do Trabalho', setor: 'Administrativo Produção', equipeId: 'EQP005', equipeNome: 'Administrativo Produção', status: 'ativo', ativo: true, pecasMes: 0, eficiencia: 0, qualidade: 0, salario: 3783.60 },
  // === EQUIPE ADMINISTRATIVO GERAL ===
  { id: 'FUNC136', nome: 'Cristiane Vieira', cargo: 'Auxiliar de Serviços Gerais', setor: 'Administrativo Geral', equipeId: 'EQP006', equipeNome: 'Administrativo Geral', status: 'ferias', ativo: true, pecasMes: 0, eficiencia: 0, qualidade: 0, salario: 1837.63 },
  { id: 'FUNC102', nome: 'Tarcísio Vieira de Almeida', cargo: 'Almoxarife', setor: 'Administrativo Geral', equipeId: 'EQP006', equipeNome: 'Administrativo Geral', status: 'ativo', ativo: true, pecasMes: 0, eficiencia: 0, qualidade: 0, salario: 1900.00 },
];

const mockEquipes = [
  { id: 'EQP001', nome: 'Equipe Pintura', tipo: 'pintura', liderId: 'FUNC301', liderNome: 'Anderson Marçal Silva', turno: 'Diurno', setor: 'Pintura', metaMes: 140, producaoMes: 120, eficiencia: 85, ativa: true },
  { id: 'EQP002', nome: 'Equipe Solda', tipo: 'solda', liderId: 'FUNC109', liderNome: 'Gilmar Sousa da Silva', turno: 'Diurno', setor: 'Solda', metaMes: 400, producaoMes: 358, eficiencia: 90, ativa: true },
  { id: 'EQP003', nome: 'Equipe Montagem de Campo', tipo: 'montagem_campo', liderId: 'FUNC117', liderNome: 'Washington de Oliveira', turno: 'Diurno', setor: 'Montagem de Campo', metaMes: 900, producaoMes: 784, eficiencia: 87, ativa: true },
  { id: 'EQP004', nome: 'Equipe Fabricação', tipo: 'fabricacao', liderId: 'FUNC110', liderNome: 'João Ermelindo Soares', turno: 'Diurno', setor: 'Fabricação', metaMes: 280, producaoMes: 235, eficiencia: 91, ativa: true },
  { id: 'EQP005', nome: 'Administrativo Produção', tipo: 'adm_producao', liderId: 'FUNC126', liderNome: 'Flávio de Jesus Santos', turno: 'Diurno', setor: 'Administrativo Produção', metaMes: 0, producaoMes: 0, eficiencia: 94, ativa: true },
  { id: 'EQP006', nome: 'Administrativo Geral', tipo: 'adm_geral', liderId: 'FUNC102', liderNome: 'Tarcísio Vieira de Almeida', turno: 'Diurno', setor: 'Administrativo Geral', metaMes: 0, producaoMes: 0, eficiencia: 0, ativa: true },
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
// COMPONENTS KANBAN
// ======================================================
function SortableEmployeeCard({ func, getStatusColor }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: func.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const iniciais = func.nome.split(' ').map(n => n[0]).join('').substring(0, 2);
  return (
    <div ref={setNodeRef} style={style} {...attributes}
      className={`bg-slate-800/80 rounded-lg border border-slate-700/50 p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing hover:border-cyan-500/30 transition-all ${isDragging ? 'shadow-lg shadow-cyan-500/20 z-50' : ''}`}>
      <div {...listeners} className="text-slate-600 hover:text-slate-400">
        <GripVertical className="h-4 w-4" />
      </div>
      <Avatar className="h-8 w-8 border border-slate-600">
        <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white text-xs font-bold">{iniciais}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{func.nome}</p>
        <p className="text-xs text-slate-400 truncate">{func.cargo}</p>
      </div>
      <Badge className={cn("border text-[9px] shrink-0", getStatusColor(func.status))}>{func.status}</Badge>
    </div>
  );
}

function KanbanColumn({ equipe, membros, getStatusColor, colorClass }) {
  const memberIds = membros.map(m => m.id);
  // useDroppable makes the entire column a valid drop target (even when empty)
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${equipe.id}`,
    data: { type: 'column', equipeId: equipe.id },
  });
  return (
    <div className={cn(
      "bg-slate-900/60 backdrop-blur-xl rounded-xl border flex flex-col min-w-[280px] max-w-[320px] transition-all",
      isOver ? "border-cyan-500/60 ring-2 ring-cyan-500/20 shadow-lg shadow-cyan-500/10" : "border-slate-700/50"
    )}>
      <div className={`p-3 border-b border-slate-700/50 rounded-t-xl bg-gradient-to-r ${colorClass} bg-opacity-10`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm">{equipe.nome}</h3>
          <Badge variant="outline" className="border-slate-500 text-slate-300 text-xs">{membros.length}</Badge>
        </div>
        {equipe.liderNome && <p className="text-xs text-slate-400 mt-1">Líder: {equipe.liderNome}</p>}
      </div>
      <div ref={setNodeRef} className="p-2 flex-1 space-y-2 min-h-[100px] overflow-y-auto max-h-[60vh]">
        <SortableContext items={memberIds} strategy={verticalListSortingStrategy}>
          {membros.map(func => (
            <SortableEmployeeCard key={func.id} func={func} getStatusColor={getStatusColor} />
          ))}
        </SortableContext>
        {membros.length === 0 && (
          <div className={cn(
            "flex items-center justify-center h-20 text-xs border-2 border-dashed rounded-lg transition-colors",
            isOver ? "border-cyan-500/50 text-cyan-400 bg-cyan-500/5" : "border-slate-700 text-slate-600"
          )}>
            {isOver ? "Solte aqui para mover" : "Arraste funcionários aqui"}
          </div>
        )}
      </div>
    </div>
  );
}

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

  // Kanban state
  const [activeId, setActiveId] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

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

  // ========== KANBAN HANDLERS ==========
  const equipeColors = {
    'EQP001': 'from-orange-500/20 to-amber-500/20',
    'EQP002': 'from-red-500/20 to-rose-500/20',
    'EQP003': 'from-blue-500/20 to-cyan-500/20',
    'EQP004': 'from-purple-500/20 to-indigo-500/20',
    'EQP005': 'from-emerald-500/20 to-green-500/20',
    'EQP006': 'from-slate-500/20 to-gray-500/20',
    'SEM_EQUIPE': 'from-slate-700/20 to-slate-600/20',
  };

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeFunc = funcionarios.find(f => f.id === active.id);
    if (!activeFunc) return;

    // Find which equipe the item was dropped over
    let targetEquipeId = null;

    // Check if dropped over a column container (useDroppable id = "column-{equipeId}")
    const overId = String(over.id);
    if (overId.startsWith('column-')) {
      targetEquipeId = overId.replace('column-', '');
    } else {
      // Check if dropped over another funcionario
      const overFunc = funcionarios.find(f => f.id === over.id);
      if (overFunc) {
        targetEquipeId = overFunc.equipeId || 'SEM_EQUIPE';
      }
    }

    if (!targetEquipeId) return;

    // If dropped on same equipe, do nothing
    const currentEquipeId = activeFunc.equipeId || 'SEM_EQUIPE';
    if (targetEquipeId !== currentEquipeId) {
      const newEquipeId = targetEquipeId === 'SEM_EQUIPE' ? '' : targetEquipeId;
      const targetEquipe = equipes.find(e => e.id === targetEquipeId);
      const newEquipeNome = targetEquipeId === 'SEM_EQUIPE' ? 'Sem Equipe' : (targetEquipe?.nome || '-');
      const newSetor = targetEquipe?.setor || activeFunc.setor;

      updateFuncionario(activeFunc.id, {
        ...activeFunc,
        equipeId: newEquipeId,
        equipeNome: newEquipeNome,
        setor: newSetor,
      });
      toast.success(`${activeFunc.nome.split(' ')[0]} movido para ${newEquipeNome}`);
    }
  }, [funcionarios, equipes, updateFuncionario]);

  const handleDragOver = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
  }, []);

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
            <TabsTrigger value="kanban" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              <ArrowLeftRight className="h-4 w-4 mr-2" /> Organizar
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

        {/* ============ TAB KANBAN ============ */}
        <TabsContent value="kanban" className="mt-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex items-center gap-2 text-slate-400">
              <ArrowLeftRight className="h-5 w-5 text-cyan-400" />
              <span className="text-sm">Arraste os funcionários entre as equipes para reorganizar</span>
            </div>
          </div>
          <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={handleDragOver}>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {[...equipes, SEM_EQUIPE].map((eq) => {
                const membros = funcionarios.filter(f => {
                  if (eq.id === 'SEM_EQUIPE') return !f.equipeId;
                  return f.equipeId === eq.id;
                });
                return (
                  <KanbanColumn
                    key={eq.id}
                    equipe={eq}
                    membros={membros}
                    getStatusColor={getStatusColor}
                    colorClass={equipeColors[eq.id] || 'from-slate-500/20 to-gray-500/20'}
                  />
                );
              })}
            </div>
            <DragOverlay>
              {activeId ? (() => {
                const func = funcionarios.find(f => f.id === activeId);
                if (!func) return null;
                const iniciais = func.nome.split(' ').map(n => n[0]).join('').substring(0, 2);
                return (
                  <div className="bg-slate-800 rounded-lg border-2 border-cyan-500 p-3 flex items-center gap-3 shadow-2xl shadow-cyan-500/30 w-[280px]">
                    <GripVertical className="h-4 w-4 text-cyan-400" />
                    <Avatar className="h-8 w-8 border border-cyan-500">
                      <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white text-xs font-bold">{iniciais}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{func.nome}</p>
                      <p className="text-xs text-cyan-400 truncate">{func.cargo}</p>
                    </div>
                  </div>
                );
              })() : null}
            </DragOverlay>
          </DndContext>
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
