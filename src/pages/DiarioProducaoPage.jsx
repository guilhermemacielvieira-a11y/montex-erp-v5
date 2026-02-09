// MONTEX ERP Premium - Módulo de Diário de Produção
// Registro diário de atividades, ocorrências e progresso

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  BookOpen,
  Clock,
  User,
  Plus,
  Edit,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Camera,
  MessageSquare,
  Download,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  CloudRain
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Dados do Diário - Será preenchido com dados reais
const mockRegistros = [
  {
    id: 'REG-001',
    data: '2026-02-09',
    obra: 'SUPER LUNA - BELO VALE',
    turno: 'Diurno',
    encarregado: 'José Ferreira',
    pecasProduzidas: 36,
    horasTrabalhadas: 8.5,
    eficiencia: 88,
    atividades: [
      { descricao: 'Corte de perfis H 250x25', quantidade: 24, unidade: 'pç', peso: 1850 },
      { descricao: 'Furação de chapas base', quantidade: 12, unidade: 'pç', peso: 420 },
    ],
    ocorrencias: ['Chuva forte no período da tarde - parada de 1h30'],
    observacoes: 'Produção dentro do previsto. Material para POSTO em dia.',
    clima: 'Parcialmente nublado',
    equipamentos: ['Policorte', 'Furadeira de bancada', 'Ponte rolante 5t'],
    fotosAntes: 2,
    fotosDepois: 3,
  },
  {
    id: 'REG-002',
    data: '2026-02-08',
    obra: 'SUPER LUNA - BELO VALE',
    turno: 'Diurno',
    encarregado: 'Marcos Santos',
    pecasProduzidas: 50,
    horasTrabalhadas: 9,
    eficiencia: 94,
    atividades: [
      { descricao: 'Soldagem de ligações viga-pilar', quantidade: 18, unidade: 'pç', peso: 2100 },
      { descricao: 'Pintura primer Zarcão', quantidade: 32, unidade: 'm²', peso: 0 },
    ],
    ocorrencias: [],
    observacoes: 'Soldas de primeira qualidade. Inspeção visual OK.',
    clima: 'Ensolarado',
    equipamentos: ['Máquina MIG 400A', 'Pistola airless', 'Ponte rolante 10t'],
    fotosAntes: 1,
    fotosDepois: 2,
  },
  {
    id: 'REG-003',
    data: '2026-02-07',
    obra: 'SUPER LUNA - BELO VALE',
    turno: 'Diurno',
    encarregado: 'Ricardo Lima',
    pecasProduzidas: 44,
    horasTrabalhadas: 8,
    eficiencia: 91,
    atividades: [
      { descricao: 'Montagem de terças U 150x12', quantidade: 36, unidade: 'pç', peso: 1200 },
      { descricao: 'Instalação de contraventamentos', quantidade: 8, unidade: 'pç', peso: 340 },
    ],
    ocorrencias: ['Falta de parafusos ASTM A325 3/4" - solicitado compra urgente'],
    observacoes: 'Ritmo bom. Pendência de material para amanhã.',
    clima: 'Ensolarado',
    equipamentos: ['Caminhão Munck', 'Chaves de torque', 'Nível laser'],
    fotosAntes: 2,
    fotosDepois: 4,
  },
  {
    id: 'REG-004',
    data: '2026-02-06',
    obra: 'SUPER LUNA - BELO VALE',
    turno: 'Diurno',
    encarregado: 'José Ferreira',
    pecasProduzidas: 28,
    horasTrabalhadas: 7.5,
    eficiencia: 82,
    atividades: [
      { descricao: 'Corte de perfis U 200x20', quantidade: 16, unidade: 'pç', peso: 980 },
      { descricao: 'Preparação de juntas para solda', quantidade: 12, unidade: 'pç', peso: 0 },
    ],
    ocorrencias: ['Manutenção preventiva na policorte - parada de 2h'],
    observacoes: 'Produção reduzida por manutenção. Equipamento normalizado ao final do turno.',
    clima: 'Ensolarado',
    equipamentos: ['Policorte', 'Esmerilhadeira angular', 'Ponte rolante 5t'],
    fotosAntes: 1,
    fotosDepois: 2,
  },
];

// Dados de Obras - Será preenchido com dados reais
const mockObras = [
  { id: 'super-luna', nome: 'SUPER LUNA - BELO VALE', codigo: '2026-01', status: 'Em Andamento' },
];

const formatDate = (dateStr) => {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
};

const getClimaIcon = (clima) => {
  switch (clima) {
    case 'ensolarado': return <Sun className="h-4 w-4 text-amber-400" />;
    case 'nublado': return <Moon className="h-4 w-4 text-slate-400" />;
    case 'chuvoso': return <CloudRain className="h-4 w-4 text-blue-400" />;
    default: return <Sun className="h-4 w-4 text-amber-400" />;
  }
};

const getTurnoColor = (turno) => {
  switch (turno) {
    case 'manhã': return 'from-amber-500 to-orange-500';
    case 'tarde': return 'from-blue-500 to-cyan-500';
    case 'noite': return 'from-purple-500 to-indigo-500';
    default: return 'from-slate-500 to-slate-600';
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'concluido': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'em_andamento': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'pendente': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
};

const getImpactoColor = (impacto) => {
  switch (impacto) {
    case 'alto': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'medio': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'baixo': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
};

// Componente de Card do Registro
function RegistroCard({ registro }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden"
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br",
              getTurnoColor(registro.turno)
            )}>
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white capitalize">Turno {registro.turno}</h3>
                <Badge variant="outline" className="text-xs text-slate-400 border-slate-600">
                  {registro.horaInicio} - {registro.horaFim}
                </Badge>
              </div>
              <p className="text-sm text-slate-400">{registro.obra}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Clima */}
            <div className="flex items-center gap-2 text-sm text-slate-400">
              {getClimaIcon(registro.clima)}
              <span>{registro.temperatura}°C</span>
            </div>

            {/* Eficiência */}
            <div className={cn(
              "px-3 py-1 rounded-lg text-sm font-semibold",
              registro.eficiencia >= 90 ? "bg-emerald-500/20 text-emerald-400" :
              registro.eficiencia >= 70 ? "bg-amber-500/20 text-amber-400" :
              "bg-red-500/20 text-red-400"
            )}>
              {registro.eficiencia}% efic.
            </div>

            {/* Peças */}
            <div className="text-right">
              <p className="text-lg font-bold text-white">{registro.pecasProduzidas}</p>
              <p className="text-xs text-slate-500">peças</p>
            </div>
          </div>
        </div>

        {/* Responsável */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/50">
          <User className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-400">{registro.responsavel}</span>
          {registro.ocorrencias.length > 0 && (
            <Badge className={cn("ml-auto", getImpactoColor(registro.ocorrencias[0].impacto))}>
              <AlertTriangle className="h-3 w-3 mr-1" />
              {registro.ocorrencias.length} ocorrência(s)
            </Badge>
          )}
        </div>
      </div>

      {/* Conteúdo Expandido */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-700/50"
          >
            <div className="p-4 space-y-4">
              {/* Atividades */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Atividades Realizadas
                </h4>
                <div className="space-y-2">
                  {registro.atividades.map((atividade, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs capitalize border-slate-600 text-slate-400">
                          {atividade.tipo}
                        </Badge>
                        <span className="text-sm text-white">{atividade.descricao}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-400">{atividade.quantidade} un.</span>
                        <Badge className={cn("text-xs border", getStatusColor(atividade.status))}>
                          {atividade.status === 'concluido' ? 'Concluído' : 'Em andamento'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ocorrências */}
              {registro.ocorrencias.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    Ocorrências
                  </h4>
                  <div className="space-y-2">
                    {registro.ocorrencias.map((ocorrencia, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs capitalize border-slate-600 text-slate-400">
                            {ocorrencia.tipo}
                          </Badge>
                          <span className="text-sm text-white">{ocorrencia.descricao}</span>
                        </div>
                        <Badge className={cn("text-xs border", getImpactoColor(ocorrencia.impacto))}>
                          Impacto {ocorrencia.impacto}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Observações */}
              {registro.observacoes && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-400" />
                    Observações
                  </h4>
                  <p className="text-sm text-slate-400 bg-slate-800/50 rounded-lg p-3">
                    {registro.observacoes}
                  </p>
                </div>
              )}

              {/* Ações */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700 text-slate-300"
                  onClick={() => handleEditarRegistro(registro)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700 text-slate-300"
                  onClick={() => handleFotos(registro)}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Fotos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700 text-slate-300"
                  onClick={() => handleExportarRegistro(registro)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function DiarioProducaoPage() {
  const [dataAtual, setDataAtual] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
  });
  const [obraFiltro, setObraFiltro] = useState('todas');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [registros, setRegistros] = useState(mockRegistros);
  const [selectedRegistro, setSelectedRegistro] = useState(null);
  const [formData, setFormData] = useState({
    data: '',
    turno: '',
    obra: '',
    atividades: '',
    observacoes: ''
  });

  // Filtrar registros por data e obra
  const registrosFiltrados = useMemo(() => {
    return registros.filter(r => {
      if (r.data !== dataAtual) return false;
      if (obraFiltro !== 'todas' && r.obra !== obraFiltro) return false;
      return true;
    });
  }, [registros, dataAtual, obraFiltro]);

  // KPIs do dia
  const kpisDia = useMemo(() => {
    const registrosDia = registros.filter(r => r.data === dataAtual);
    return {
      totalPecas: registrosDia.reduce((sum, r) => sum + r.pecasProduzidas, 0),
      totalHoras: registrosDia.reduce((sum, r) => sum + r.horasTrabalhadas, 0),
      eficienciaMedia: registrosDia.length > 0
        ? registrosDia.reduce((sum, r) => sum + r.eficiencia, 0) / registrosDia.length
        : 0,
      totalOcorrencias: registrosDia.reduce((sum, r) => sum + r.ocorrencias.length, 0)
    };
  }, [registros, dataAtual]);

  const navegarData = (direcao) => {
    const data = new Date(dataAtual + 'T00:00:00');
    data.setDate(data.getDate() + direcao);
    setDataAtual(data.toISOString().split('T')[0]);
  };

  const handleSaveRegistro = () => {
    if (!formData.data || !formData.turno || !formData.obra || !formData.atividades) {
      toast.error('Preencher todos os campos obrigatórios');
      return;
    }

    const novoRegistro = {
      id: Date.now(),
      data: formData.data,
      turno: formData.turno,
      responsavel: 'Usuário',
      clima: 'ensolarado',
      temperatura: 25,
      horaInicio: '07:00',
      horaFim: '12:00',
      obra: formData.obra,
      atividades: [{
        tipo: 'producao',
        descricao: formData.atividades,
        quantidade: 0,
        status: 'em_andamento'
      }],
      ocorrencias: [],
      observacoes: formData.observacoes,
      pecasProduzidas: 0,
      horasTrabalhadas: 5,
      eficiencia: 90
    };

    setRegistros([...registros, novoRegistro]);
    toast.success('Registro salvo com sucesso!');
    setDialogOpen(false);
    setFormData({
      data: '',
      turno: '',
      obra: '',
      atividades: '',
      observacoes: ''
    });
  };

  const handleEditarRegistro = (registro) => {
    setSelectedRegistro(registro);
    toast.success('Registro aberto para edição!');
  };

  const handleFotos = (registro) => {
    toast.success('Abrir galeria de fotos do registro!');
  };

  const handleExportarRegistro = (registro) => {
    const csv = `Data,Turno,Obra,Responsável,Peças,Eficiência\n${registro.data},${registro.turno},${registro.obra},${registro.responsavel},${registro.pecasProduzidas},${registro.eficiencia}%`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registro-${registro.id}.csv`;
    a.click();
    toast.success('Registro exportado com sucesso!');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            Diário de Produção
          </h1>
          <p className="text-slate-400 mt-1">Registro diário de atividades e ocorrências</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Navegação de Data */}
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navegarData(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 py-1">
              <p className="text-sm font-medium text-white capitalize">
                {formatDate(dataAtual)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navegarData(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Select value={obraFiltro} onValueChange={setObraFiltro}>
            <SelectTrigger className="w-[200px] bg-slate-800 border-slate-700">
              <SelectValue placeholder="Filtrar por obra" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="todas">Todas as Obras</SelectItem>
              {mockObras.map(obra => (
                <SelectItem key={obra.id} value={obra.nome}>{obra.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600">
                <Plus className="h-4 w-4 mr-2" />
                Novo Registro
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">Novo Registro do Diário</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-slate-300">Data</Label>
                    <Input
                      type="date"
                      className="mt-1 bg-slate-800 border-slate-700"
                      value={formData.data || dataAtual}
                      onChange={(e) => setFormData({...formData, data: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Turno</Label>
                    <Select value={formData.turno} onValueChange={(value) => setFormData({...formData, turno: value})}>
                      <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="manhã">Manhã</SelectItem>
                        <SelectItem value="tarde">Tarde</SelectItem>
                        <SelectItem value="noite">Noite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-300">Obra</Label>
                    <Select value={formData.obra} onValueChange={(value) => setFormData({...formData, obra: value})}>
                      <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {mockObras.map(obra => (
                          <SelectItem key={obra.id} value={obra.nome}>{obra.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-slate-300">Atividades Realizadas</Label>
                  <Textarea
                    className="mt-1 bg-slate-800 border-slate-700 min-h-[100px]"
                    placeholder="Descreva as atividades realizadas no turno..."
                    value={formData.atividades}
                    onChange={(e) => setFormData({...formData, atividades: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Observações</Label>
                  <Textarea
                    className="mt-1 bg-slate-800 border-slate-700"
                    placeholder="Observações gerais..."
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  />
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-500"
                  onClick={handleSaveRegistro}
                >
                  Salvar Registro
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPIs do Dia */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Peças Produzidas</p>
                <p className="text-2xl font-bold text-white">{kpisDia.totalPecas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Horas Trabalhadas</p>
                <p className="text-2xl font-bold text-white">{kpisDia.totalHoras}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Wrench className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Eficiência Média</p>
                <p className="text-2xl font-bold text-white">{kpisDia.eficienciaMedia.toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Ocorrências</p>
                <p className="text-2xl font-bold text-white">{kpisDia.totalOcorrencias}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Registros */}
      <div className="space-y-4">
        {registrosFiltrados.length > 0 ? (
          registrosFiltrados.map(registro => (
            <RegistroCard key={registro.id} registro={registro} />
          ))
        ) : (
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardContent className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-300">Nenhum registro encontrado</h3>
              <p className="text-slate-500 mt-1">Não há registros para esta data e filtros selecionados.</p>
              <Button
                className="mt-4 bg-gradient-to-r from-indigo-500 to-purple-500"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Registro
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
