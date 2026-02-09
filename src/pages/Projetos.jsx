import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DocumentGenerator from '../components/projetos/DocumentGenerator';
import EstoqueMateriaisCard from '@/components/estoque/EstoqueMateriaisCard';
import AlertasEstoqueBaixo from '@/components/estoque/AlertasEstoqueBaixo';
import {
  PrevisaoPrazosCustos,
  IdentificacaoGargalosRiscos,
  GeracaoResumoStatus
} from '../components/projetos/ProjetoIAGestao';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Loader2,
  MapPin,
  Weight,
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  FileText,
  Brain
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

const tiposEstrutura = [
  { value: 'galpao_industrial', label: 'Galpão Industrial' },
  { value: 'mezanino', label: 'Mezanino' },
  { value: 'cobertura', label: 'Cobertura' },
  { value: 'estrutura_predial', label: 'Estrutura Predial' },
  { value: 'passarela', label: 'Passarela' },
  { value: 'outro', label: 'Outro' }
];

const statusOptions = [
  { value: 'prospeccao', label: 'Prospecção', color: 'bg-slate-100 text-slate-700' },
  { value: 'orcamento', label: 'Orçamento', color: 'bg-blue-100 text-blue-700' },
  { value: 'negociacao', label: 'Negociação', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'aprovado', label: 'Aprovado', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'em_fabricacao', label: 'Em Fabricação', color: 'bg-purple-100 text-purple-700' },
  { value: 'em_montagem', label: 'Em Montagem', color: 'bg-orange-100 text-orange-700' },
  { value: 'concluido', label: 'Concluído', color: 'bg-green-100 text-green-700' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-100 text-red-700' }
];

export default function Projetos() {
  const [showModal, setShowModal] = useState(false);
  const [editingProjeto, setEditingProjeto] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showDocGenerator, setShowDocGenerator] = useState(false);
  const [projetoParaDocumento, setProjetoParaDocumento] = useState(null);
  const [mostrarIAGestao, setMostrarIAGestao] = useState(false);
  const [abaIA, setAbaIA] = useState('previsao');
  const [projetoSelecionadoEstoque, setProjetoSelecionadoEstoque] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    cliente_nome: '',
    tipo: 'galpao_industrial',
    area: '',
    peso_estimado: '',
    localizacao: '',
    status: 'prospeccao',
    data_inicio: '',
    data_fim_prevista: '',
    valor_contrato: '',
    observacoes: ''
  });

  const queryClient = useQueryClient();

  const { data: projetos = [], isLoading } = useQuery({
    queryKey: ['projetos'],
    queryFn: () => base44.entities.Projeto.list('-created_date', 100)
  });

  const { data: relatorios = [] } = useQuery({
    queryKey: ['relatorios'],
    queryFn: () => base44.entities.Relatorio.list('-created_date', 100)
  });

  const { data: tarefas = [] } = useQuery({
    queryKey: ['tarefas'],
    queryFn: () => base44.entities.Tarefa.list('-created_date', 200)
  });

  const { data: movimentacoes = [] } = useQuery({
    queryKey: ['movimentacoes'],
    queryFn: () => base44.entities.MovimentacaoFinanceira.list('-created_date', 200)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Projeto.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projetos'] });
      closeModal();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Projeto.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projetos'] });
      closeModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Projeto.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projetos'] });
    }
  });

  const closeModal = () => {
    setShowModal(false);
    setEditingProjeto(null);
    setFormData({
      nome: '',
      cliente_nome: '',
      tipo: 'galpao_industrial',
      area: '',
      peso_estimado: '',
      localizacao: '',
      status: 'prospeccao',
      data_inicio: '',
      data_fim_prevista: '',
      valor_contrato: '',
      observacoes: ''
    });
  };

  const openEditModal = (projeto) => {
    setEditingProjeto(projeto);
    setFormData({
      nome: projeto.nome || '',
      cliente_nome: projeto.cliente_nome || '',
      tipo: projeto.tipo || 'galpao_industrial',
      area: projeto.area || '',
      peso_estimado: projeto.peso_estimado || '',
      localizacao: projeto.localizacao || '',
      status: projeto.status || 'prospeccao',
      data_inicio: projeto.data_inicio || '',
      data_fim_prevista: projeto.data_fim_prevista || '',
      valor_contrato: projeto.valor_contrato || '',
      observacoes: projeto.observacoes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    const data = {
      ...formData,
      area: formData.area ? parseFloat(formData.area) : null,
      peso_estimado: formData.peso_estimado ? parseFloat(formData.peso_estimado) : null,
      valor_contrato: formData.valor_contrato ? parseFloat(formData.valor_contrato) : null
    };

    if (editingProjeto) {
      updateMutation.mutate({ id: editingProjeto.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getStatusBadge = (status) => {
    const config = statusOptions.find(s => s.value === status);
    return config || statusOptions[0];
  };

  const filteredProjetos = projetos.filter(projeto => {
    const matchesSearch = projeto.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         projeto.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || projeto.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Projetos</h1>
          <p className="text-slate-500 mt-1">Gerencie todos os projetos da empresa</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => setMostrarIAGestao(!mostrarIAGestao)}
            variant={mostrarIAGestao ? "default" : "outline"}
            className={mostrarIAGestao ? "bg-gradient-to-r from-purple-500 to-purple-600" : "border-purple-300 text-purple-700"}
          >
            <Brain className="h-4 w-4 mr-2" />
            IA de Gestão
          </Button>
          <Button 
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Projeto
          </Button>
        </div>
      </div>

      {/* Alertas de Estoque */}
      <AlertasEstoqueBaixo />

      {/* IA de Gestão de Projetos */}
       {mostrarIAGestao && (
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">IA de Gestão de Projetos</h2>
                <p className="text-sm text-slate-600">
                  Previsões, identificação de riscos e resumos automáticos
                </p>
              </div>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              <Button
                variant={abaIA === 'previsao' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAbaIA('previsao')}
                className={abaIA === 'previsao' ? 'bg-blue-600' : ''}
              >
                <Target className="h-4 w-4 mr-2" />
                Previsão
              </Button>
              <Button
                variant={abaIA === 'gargalos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAbaIA('gargalos')}
                className={abaIA === 'gargalos' ? 'bg-orange-600' : ''}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Gargalos
              </Button>
              <Button
                variant={abaIA === 'resumo' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAbaIA('resumo')}
                className={abaIA === 'resumo' ? 'bg-purple-600' : ''}
              >
                <FileText className="h-4 w-4 mr-2" />
                Resumos
              </Button>
            </div>

            {abaIA === 'previsao' && (
              <PrevisaoPrazosCustos
                novoProjeto={projetos.find(p => ['aprovado', 'em_fabricacao'].includes(p.status)) || projetos[0]}
                projetosHistorico={projetos}
                movimentacoes={movimentacoes}
              />
            )}

            {abaIA === 'gargalos' && (
              <IdentificacaoGargalosRiscos
                projetosAtivos={projetos.filter(p => ['em_fabricacao', 'em_montagem'].includes(p.status))}
                tarefas={tarefas}
                relatorios={relatorios}
              />
            )}

            {abaIA === 'resumo' && (
              <GeracaoResumoStatus
                projetos={projetos}
                relatorios={relatorios}
                tarefas={tarefas}
                movimentacoes={movimentacoes}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar projetos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {statusOptions.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : filteredProjetos.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum projeto encontrado</h3>
            <p className="text-slate-500 mb-4">
              {searchTerm || filterStatus !== 'all' 
                ? 'Tente ajustar os filtros de busca' 
                : 'Comece cadastrando seu primeiro projeto'}
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <Button onClick={() => setShowModal(true)} className="bg-gradient-to-r from-orange-500 to-orange-600">
                <Plus className="h-4 w-4 mr-2" />
                Criar Projeto
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjetos.map((projeto, index) => {
            const statusConfig = getStatusBadge(projeto.status);
            return (
              <motion.div
                key={projeto.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-slate-100 hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate">{projeto.nome}</h3>
                        <p className="text-sm text-slate-500 truncate">{projeto.cliente_nome || 'Cliente não definido'}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="flex-shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(projeto)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setProjetoParaDocumento(projeto);
                            setShowDocGenerator(true);
                          }}>
                            <FileText className="h-4 w-4 mr-2" />
                            Gerar Documentação
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => deleteMutation.mutate(projeto.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <Badge className={statusConfig.color}>{statusConfig.label}</Badge>

                    <div className="mt-4 space-y-2">
                      {projeto.localizacao && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span className="truncate">{projeto.localizacao}</span>
                        </div>
                      )}
                      {projeto.area && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          <span>{projeto.area.toLocaleString('pt-BR')} m²</span>
                        </div>
                      )}
                      {projeto.peso_estimado && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Weight className="h-4 w-4 text-slate-400" />
                          <span>{(projeto.peso_estimado / 1000).toFixed(1)} ton</span>
                        </div>
                      )}
                      {projeto.data_fim_prevista && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span>Previsão: {format(new Date(projeto.data_fim_prevista), 'dd/MM/yyyy', { locale: ptBR })}</span>
                        </div>
                      )}
                    </div>

                    {projeto.valor_contrato && (
                       <div className="mt-4 pt-4 border-t border-slate-100">
                         <p className="text-lg font-bold text-slate-900">
                           R$ {projeto.valor_contrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                         </p>
                       </div>
                     )}

                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => setProjetoSelecionadoEstoque(projeto.id)}
                        className="w-full"
                      >
                        Ver Estoque
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={closeModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProjeto ? 'Editar Projeto' : 'Novo Projeto'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Projeto *</Label>
                <Input
                  placeholder="Ex: Galpão Industrial XYZ"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Input
                  placeholder="Nome do cliente"
                  value={formData.cliente_nome}
                  onChange={(e) => setFormData({ ...formData, cliente_nome: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Estrutura</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposEstrutura.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Área (m²)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 1500"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Peso Estimado (kg)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 50000"
                  value={formData.peso_estimado}
                  onChange={(e) => setFormData({ ...formData, peso_estimado: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor do Contrato (R$)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 500000"
                  value={formData.valor_contrato}
                  onChange={(e) => setFormData({ ...formData, valor_contrato: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Localização</Label>
              <Input
                placeholder="Cidade, Estado"
                value={formData.localizacao}
                onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Início</Label>
                <Input
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Previsão de Conclusão</Label>
                <Input
                  type="date"
                  value={formData.data_fim_prevista}
                  onChange={(e) => setFormData({ ...formData, data_fim_prevista: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Informações adicionais sobre o projeto..."
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.nome || createMutation.isPending || updateMutation.isPending}
                className="bg-gradient-to-r from-orange-500 to-orange-600"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingProjeto ? 'Salvar Alterações' : 'Criar Projeto'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Generator Modal */}
      {projetoParaDocumento && (
        <DocumentGenerator
          open={showDocGenerator}
          onClose={() => {
            setShowDocGenerator(false);
            setProjetoParaDocumento(null);
          }}
          projeto={projetoParaDocumento}
        />
      )}

      {/* Estoque Modal */}
      <Dialog open={!!projetoSelecionadoEstoque} onOpenChange={() => setProjetoSelecionadoEstoque(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Estoque de Materiais</DialogTitle>
          </DialogHeader>
          {projetoSelecionadoEstoque && (
            <EstoqueMateriaisCard projetoId={projetoSelecionadoEstoque} />
          )}
        </DialogContent>
      </Dialog>
      </div>
      );
      }