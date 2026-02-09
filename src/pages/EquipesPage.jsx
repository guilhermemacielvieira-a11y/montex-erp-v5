// MONTEX ERP Premium - Módulo de Gestão de Equipes
// Gestão de funcionários, equipes e atribuição de produção

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Users,
  UserPlus,
  User,
  Briefcase,
  Award,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  Search,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

// Dados de Funcionários - Será preenchido com dados reais
const mockFuncionarios = [
  { id: 'FUNC001', nome: 'Cristiane Vieira', cargo: 'Auxiliar de Serviços Gerais', setor: 'Geral', equipe: '-', status: 'ativo', foto: null, metricas: { pecasMes: 0, eficiencia: 0, qualidade: 0 } },
  { id: 'FUNC002', nome: 'Diego Alves da Silva', cargo: 'Montador I', setor: 'Montagem', equipe: 'Equipe Montagem Campo', status: 'ativo', foto: null, metricas: { pecasMes: 85, eficiencia: 88, qualidade: 96 } },
  { id: 'FUNC003', nome: 'David Barbosa de Souza', cargo: 'Coordenador de Produção', setor: 'Produção', equipe: 'Equipe Fábrica', status: 'ativo', foto: null, metricas: { pecasMes: 0, eficiencia: 0, qualidade: 0 } },
  { id: 'FUNC004', nome: 'Eder Bruno Silva Ferreira', cargo: 'Montador I', setor: 'Montagem', equipe: 'Equipe Montagem Campo', status: 'ativo', foto: null, metricas: { pecasMes: 92, eficiencia: 91, qualidade: 97 } },
  { id: 'FUNC005', nome: 'Derlei Gobbi', cargo: 'Montador I', setor: 'Montagem', equipe: 'Equipe Montagem Campo', status: 'ativo', foto: null, metricas: { pecasMes: 78, eficiencia: 82, qualidade: 94 } },
  { id: 'FUNC006', nome: 'Erick Welison Hosni de Paula', cargo: 'Meio Oficial de Montador', setor: 'Montagem', equipe: 'Equipe Montagem Campo', status: 'ativo', foto: null, metricas: { pecasMes: 55, eficiencia: 76, qualidade: 92 } },
  { id: 'FUNC007', nome: 'Flavio da Cruz', cargo: 'Instalador Esquadrias Alumínio', setor: 'Fabricação', equipe: 'Equipe Fábrica', status: 'ativo', foto: null, metricas: { pecasMes: 68, eficiencia: 89, qualidade: 98 } },
  { id: 'FUNC008', nome: 'Flavio de Jesus Santos', cargo: 'Líder de Produção', setor: 'Produção', equipe: 'Equipe Fábrica', status: 'ativo', foto: null, metricas: { pecasMes: 45, eficiencia: 94, qualidade: 99 } },
  { id: 'FUNC009', nome: 'Gilmar Sousa da Silva', cargo: 'Soldador II', setor: 'Solda', equipe: 'Equipe Fábrica', status: 'ativo', foto: null, metricas: { pecasMes: 110, eficiencia: 96, qualidade: 98 } },
  { id: 'FUNC010', nome: 'Gabriel Ferreira Santos', cargo: 'Montador I', setor: 'Montagem', equipe: 'Equipe Montagem Campo', status: 'ativo', foto: null, metricas: { pecasMes: 82, eficiencia: 85, qualidade: 95 } },
  { id: 'FUNC011', nome: 'Jeferson Bruno de O. Costa', cargo: 'Montador III', setor: 'Montagem', equipe: 'Equipe Montagem Campo', status: 'ativo', foto: null, metricas: { pecasMes: 120, eficiencia: 97, qualidade: 99 } },
  { id: 'FUNC012', nome: 'João Ermelindo Soares', cargo: 'Serralheiro de Alumínio', setor: 'Fabricação', equipe: 'Equipe Fábrica', status: 'ativo', foto: null, metricas: { pecasMes: 95, eficiencia: 93, qualidade: 97 } },
  { id: 'FUNC013', nome: 'João Batista Alves Rodrigues', cargo: 'Ajudante de Montagem', setor: 'Montagem', equipe: 'Equipe Montagem Campo', status: 'ativo', foto: null, metricas: { pecasMes: 40, eficiencia: 72, qualidade: 90 } },
  { id: 'FUNC014', nome: 'José Eduardo Lucas', cargo: 'Meio Oficial de Montador', setor: 'Montagem', equipe: 'Equipe Montagem Interior', status: 'ativo', foto: null, metricas: { pecasMes: 58, eficiencia: 78, qualidade: 93 } },
  { id: 'FUNC015', nome: 'Juscelio Rodrigues de Souza', cargo: 'Soldador I', setor: 'Solda', equipe: 'Equipe Fábrica', status: 'ativo', foto: null, metricas: { pecasMes: 88, eficiencia: 90, qualidade: 96 } },
  { id: 'FUNC016', nome: 'Juscelio Rodrigues', cargo: 'Montador III', setor: 'Montagem', equipe: 'Equipe Montagem Campo', status: 'ativo', foto: null, metricas: { pecasMes: 115, eficiencia: 95, qualidade: 98 } },
  { id: 'FUNC017', nome: 'Luiz Barbosa Ferrera', cargo: 'Soldador I', setor: 'Solda', equipe: 'Equipe Fábrica', status: 'ativo', foto: null, metricas: { pecasMes: 85, eficiencia: 88, qualidade: 95 } },
  { id: 'FUNC018', nome: 'Ricardo Alves Pereira', cargo: 'Caldeireiro Montador', setor: 'Fabricação', equipe: 'Equipe Fábrica', status: 'ativo', foto: null, metricas: { pecasMes: 72, eficiencia: 91, qualidade: 97 } },
  { id: 'FUNC019', nome: 'Tarcísio Vieira de Almeida', cargo: 'Almoxarife', setor: 'Geral', equipe: '-', status: 'ativo', foto: null, metricas: { pecasMes: 0, eficiencia: 0, qualidade: 0 } },
  { id: 'FUNC020', nome: 'Waldercy Miranda', cargo: 'Montador II', setor: 'Montagem', equipe: 'Equipe Montagem Campo', status: 'ativo', foto: null, metricas: { pecasMes: 98, eficiencia: 92, qualidade: 96 } },
  { id: 'FUNC021', nome: 'Wendel Gabriel Alves dos Reis', cargo: 'Meio Oficial de Montador', setor: 'Montagem', equipe: 'Equipe Montagem Interior', status: 'ativo', foto: null, metricas: { pecasMes: 52, eficiencia: 75, qualidade: 91 } },
  { id: 'FUNC022', nome: 'Whashington de Oliveira', cargo: 'Encarregado de Campo II', setor: 'Produção', equipe: 'Equipe Montagem Campo', status: 'ativo', foto: null, metricas: { pecasMes: 35, eficiencia: 93, qualidade: 99 } },
];

// Dados de Equipes - Será preenchido com dados reais
const mockEquipes = [
  { id: 'EQP001', nome: 'Equipe Fábrica', lider: 'David Barbosa de Souza', turno: 'Diurno', eficiencia: 92, producaoMes: 563, metaMes: 600, membros: 8 },
  { id: 'EQP002', nome: 'Equipe Pintura', lider: 'Flavio de Jesus Santos', turno: 'Diurno', eficiencia: 85, producaoMes: 120, metaMes: 140, membros: 2 },
  { id: 'EQP003', nome: 'Equipe Montagem Campo', lider: 'Whashington de Oliveira', turno: 'Diurno', eficiencia: 89, producaoMes: 745, metaMes: 850, membros: 10 },
  { id: 'EQP004', nome: 'Equipe Montagem Interior', lider: 'Jeferson Bruno de O. Costa', turno: 'Diurno', eficiencia: 77, producaoMes: 110, metaMes: 150, membros: 2 },
];

// Dados de Produção por Funcionário - Será preenchido com dados reais
const producaoHistorico = [
  { mes: 'Set', equipe1: 520, equipe2: 105, equipe3: 680, equipe4: 95 },
  { mes: 'Out', equipe1: 545, equipe2: 112, equipe3: 710, equipe4: 100 },
  { mes: 'Nov', equipe1: 530, equipe2: 118, equipe3: 725, equipe4: 105 },
  { mes: 'Dez', equipe1: 510, equipe2: 95, equipe3: 690, equipe4: 88 },
  { mes: 'Jan', equipe1: 555, equipe2: 115, equipe3: 735, equipe4: 108 },
  { mes: 'Fev', equipe1: 563, equipe2: 120, equipe3: 745, equipe4: 110 },
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

const getEficienciaColor = (eficiencia) => {
  if (eficiencia >= 100) return 'text-emerald-400';
  if (eficiencia >= 85) return 'text-blue-400';
  if (eficiencia >= 70) return 'text-amber-400';
  return 'text-red-400';
};

// Componente de Card de Funcionário
function FuncionarioCard({ funcionario }) {
  const iniciais = funcionario.nome.split(' ').map(n => n[0]).join('').substring(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4 hover:border-slate-600/50 transition-all"
    >
      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14 border-2 border-slate-600">
          <AvatarImage src={funcionario.foto} />
          <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white font-bold">
            {iniciais}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-white">{funcionario.nome}</h3>
              <p className="text-sm text-slate-400">{funcionario.cargo}</p>
            </div>
            <Badge className={cn("border", getStatusColor(funcionario.status))}>
              {funcionario.status}
            </Badge>
          </div>

          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1 text-sm text-slate-400">
              <Briefcase className="h-3 w-3" />
              {funcionario.setor}
            </div>
            <div className="flex items-center gap-1 text-sm text-slate-400">
              <Users className="h-3 w-3" />
              {funcionario.equipe}
            </div>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-700/50">
            <div>
              <p className="text-xs text-slate-500">Produção</p>
              <p className="text-lg font-bold text-white">{funcionario.metricas.pecasMes}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Eficiência</p>
              <p className={cn("text-lg font-bold", getEficienciaColor(funcionario.metricas.eficiencia))}>
                {funcionario.metricas.eficiencia}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Qualidade</p>
              <p className="text-lg font-bold text-emerald-400">{funcionario.metricas.qualidade}%</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Componente de Card de Equipe
function EquipeCard({ equipe, onVerDetalhes }) {
  const progressPercent = (equipe.producaoMes / equipe.metaMes) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5 hover:border-slate-600/50 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{equipe.nome}</h3>
            <p className="text-sm text-slate-400">Líder: {equipe.lider}</p>
          </div>
        </div>
        <Badge variant="outline" className="border-slate-600 text-slate-300">
          {equipe.turno}
        </Badge>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Produção do Mês</span>
          <span className={cn("font-semibold", getEficienciaColor(equipe.eficiencia))}>
            {equipe.eficiencia}%
          </span>
        </div>

        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              equipe.eficiencia >= 95 ? "bg-gradient-to-r from-emerald-500 to-green-500" :
              equipe.eficiencia >= 80 ? "bg-gradient-to-r from-blue-500 to-cyan-500" :
              "bg-gradient-to-r from-amber-500 to-orange-500"
            )}
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-slate-500">{equipe.producaoMes} peças</span>
          <span className="text-slate-500">Meta: {equipe.metaMes}</span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-slate-500" />
            <span className="text-sm text-slate-400">{equipe.membros} membros</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-cyan-400 hover:text-cyan-300"
            onClick={() => onVerDetalhes(equipe)}
          >
            Ver detalhes
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function EquipesPage() {
  const [activeTab, setActiveTab] = useState('funcionarios');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroSetor, setFiltroSetor] = useState('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [funcionarios, setFuncionarios] = useState(mockFuncionarios);
  const [selectedEquipe, setSelectedEquipe] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    cargo: '',
    setor: '',
    telefone: '',
    equipe: ''
  });

  // KPIs
  const kpis = useMemo(() => {
    const ativos = mockFuncionarios.filter(f => f.status === 'ativo').length;
    const totalProducao = mockFuncionarios.reduce((sum, f) => sum + f.metricas.pecasMes, 0);
    const eficienciaMedia = mockFuncionarios.length > 0 ? mockFuncionarios.reduce((sum, f) => sum + f.metricas.eficiencia, 0) / mockFuncionarios.length : 0;

    return { ativos, totalProducao, eficienciaMedia };
  }, []);

  // Filtrar funcionários
  const funcionariosFiltrados = useMemo(() => {
    return funcionarios.filter(f => {
      if (searchTerm && !f.nome.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filtroSetor !== 'todos' && f.setor !== filtroSetor) return false;
      return true;
    });
  }, [funcionarios, searchTerm, filtroSetor]);

  const handleSaveFuncionario = () => {
    if (!formData.nome || !formData.cargo || !formData.setor || !formData.telefone || !formData.equipe) {
      toast.error('Preencher todos os campos');
      return;
    }

    const novoFuncionario = {
      id: Date.now(),
      nome: formData.nome,
      cargo: formData.cargo,
      setor: formData.setor,
      equipe: formData.equipe,
      dataAdmissao: new Date().toISOString().split('T')[0],
      status: 'ativo',
      telefone: formData.telefone,
      email: `${formData.nome.toLowerCase().replace(/\s+/g, '.')}@montex.com`,
      foto: null,
      metricas: {
        pecasMes: 0,
        metaMes: 450,
        eficiencia: 100,
        qualidade: 100,
        pontualidade: 100,
        horasExtras: 0
      },
      habilidades: []
    };

    setFuncionarios([...funcionarios, novoFuncionario]);
    toast.success('Funcionário cadastrado com sucesso!');
    setDialogOpen(false);
    setFormData({
      nome: '',
      cargo: '',
      setor: '',
      telefone: '',
      equipe: ''
    });
  };

  const handleVerDetalhes = (equipe) => {
    setSelectedEquipe(equipe);
    toast.success(`Detalhes da ${equipe.nome} carregados!`);
  };

  // Dados para gráfico radar
  const radarData = [
    { subject: 'Produção', A: 95, fullMark: 100 },
    { subject: 'Qualidade', A: 97, fullMark: 100 },
    { subject: 'Pontualidade', A: 96, fullMark: 100 },
    { subject: 'Eficiência', A: 98, fullMark: 100 },
    { subject: 'Segurança', A: 100, fullMark: 100 },
  ];

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
          <p className="text-slate-400 mt-1">Funcionários, equipes e métricas de produção</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Funcionário
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">Cadastrar Funcionário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label className="text-slate-300">Nome Completo</Label>
                <Input
                  className="mt-1 bg-slate-800 border-slate-700"
                  placeholder="Nome do funcionário"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Cargo</Label>
                  <Input
                    className="mt-1 bg-slate-800 border-slate-700"
                    placeholder="Cargo"
                    value={formData.cargo}
                    onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Setor</Label>
                  <Select value={formData.setor} onValueChange={(value) => setFormData({...formData, setor: value})}>
                    <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="Soldagem">Soldagem</SelectItem>
                      <SelectItem value="Corte">Corte</SelectItem>
                      <SelectItem value="Pintura">Pintura</SelectItem>
                      <SelectItem value="Montagem">Montagem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Telefone</Label>
                  <Input
                    className="mt-1 bg-slate-800 border-slate-700"
                    placeholder="(65) 99999-0000"
                    value={formData.telefone}
                    onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Equipe</Label>
                  <Select value={formData.equipe} onValueChange={(value) => setFormData({...formData, equipe: value})}>
                    <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {mockEquipes.map(e => (
                        <SelectItem key={e.id} value={e.nome}>{e.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500"
                onClick={handleSaveFuncionario}
              >
                Cadastrar Funcionário
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Funcionários Ativos</p>
                <p className="text-2xl font-bold text-white">{kpis.ativos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Produção Total</p>
                <p className="text-2xl font-bold text-white">{kpis.totalProducao}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Eficiência Média</p>
                <p className="text-2xl font-bold text-white">{kpis.eficienciaMedia.toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Award className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Equipes</p>
                <p className="text-2xl font-bold text-white">{mockEquipes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList className="bg-slate-800/50 border border-slate-700/50">
            <TabsTrigger value="funcionarios" className="data-[state=active]:bg-cyan-500">
              <User className="h-4 w-4 mr-2" />
              Funcionários
            </TabsTrigger>
            <TabsTrigger value="equipes" className="data-[state=active]:bg-cyan-500">
              <Users className="h-4 w-4 mr-2" />
              Equipes
            </TabsTrigger>
            <TabsTrigger value="desempenho" className="data-[state=active]:bg-cyan-500">
              <BarChart3 className="h-4 w-4 mr-2" />
              Desempenho
            </TabsTrigger>
          </TabsList>

          {activeTab === 'funcionarios' && (
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Buscar funcionário..."
                  className="pl-10 w-[200px] bg-slate-800 border-slate-700"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filtroSetor} onValueChange={setFiltroSetor}>
                <SelectTrigger className="w-[150px] bg-slate-800 border-slate-700">
                  <SelectValue placeholder="Setor" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Soldagem">Soldagem</SelectItem>
                  <SelectItem value="Corte">Corte</SelectItem>
                  <SelectItem value="Pintura">Pintura</SelectItem>
                  <SelectItem value="Montagem">Montagem</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Funcionários */}
        <TabsContent value="funcionarios" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {funcionariosFiltrados.map(funcionario => (
              <div key={funcionario.id} onClick={() => {
                setSelectedEquipe(funcionario);
                toast.success(`${funcionario.nome} selecionado!`);
              }} style={{cursor: 'pointer'}}>
                <FuncionarioCard funcionario={funcionario} />
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Equipes */}
        <TabsContent value="equipes" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockEquipes.map(equipe => (
              <EquipeCard key={equipe.id} equipe={equipe} onVerDetalhes={handleVerDetalhes} />
            ))}
          </div>
        </TabsContent>

        {/* Desempenho */}
        <TabsContent value="desempenho" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Produção */}
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-cyan-400" />
                  Produção por Funcionário
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={producaoHistorico}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="mes" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    />
                    <Bar dataKey="joao" name="João" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="carlos" name="Carlos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="maria" name="Maria" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pedro" name="Pedro" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfico Radar */}
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-400" />
                  Indicadores da Equipe A
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" stroke="#64748b" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#64748b" />
                    <Radar
                      name="Equipe A"
                      dataKey="A"
                      stroke="#06b6d4"
                      fill="#06b6d4"
                      fillOpacity={0.3}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
