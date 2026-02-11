import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { exportToExcel } from '@/utils/exportUtils';
import { useExpedicao, useObras } from '../contexts/ERPContext';
import {
  Truck, Package, MapPin, Clock, CheckCircle2, AlertCircle,
  Search, Plus, FileText, Download, Edit,
  ChevronDown, Building2, Weight, ArrowRight, Printer, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import * as Select from '@radix-ui/react-select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

// Status de envio
const STATUS_ENVIO = [
  { id: 'PREPARANDO', nome: 'Preparando', cor: '#f59e0b', icon: Package },
  { id: 'AGUARDANDO_TRANSPORTE', nome: 'Aguardando Transporte', cor: '#3b82f6', icon: Clock },
  { id: 'EM_TRANSITO', nome: 'Em Trânsito', cor: '#8b5cf6', icon: Truck },
  { id: 'ENTREGUE', nome: 'Entregue', cor: '#10b981', icon: CheckCircle2 },
  { id: 'PROBLEMA', nome: 'Problema', cor: '#ef4444', icon: AlertCircle },
];

// Categorias de peças
const CATEGORIAS_PECAS = [
  { id: 'VIGAS', nome: 'Vigas', cor: '#3b82f6', icon: '🔩' },
  { id: 'TESOURAS', nome: 'Tesouras', cor: '#8b5cf6', icon: '🏗️' },
  { id: 'TERCAS', nome: 'Terças', cor: '#10b981', icon: '📏' },
  { id: 'VIGAS_TRAV', nome: 'Vigas Trav.', cor: '#f59e0b', icon: '🔗' },
  { id: 'CONTRAV', nome: 'Contrav.', cor: '#ef4444', icon: '⚡' },
  { id: 'TIRANTES', nome: 'Tirantes', cor: '#ec4899', icon: '🔧' },
  { id: 'LANTERNIM', nome: 'Lanternim', cor: '#06b6d4', icon: '💡' },
  { id: 'MAO_FRANCESA', nome: 'Mão Francesa', cor: '#84cc16', icon: '✋' },
  { id: 'PASSARELA', nome: 'Passarela', cor: '#f97316', icon: '🚶' },
  { id: 'OUTROS', nome: 'Outros', cor: '#6366f1', icon: '📦' },
];

export default function EnviosExpedicaoPage() {
  // ERPContext - dados reais
  const { expedicoes } = useExpedicao();
  const { obras } = useObras();

  // Usar dados reais do ERPContext
  const enviosReais = useMemo(() => {
    return expedicoes.map(exp => ({
      ...exp,
      status: exp.status || 'PREPARANDO',
      obraNome: obras.find(o => o.id === exp.obraId)?.nome || exp.obraNome || '-',
    }));
  }, [expedicoes, obras]);

  // Dados para gráficos - derivados dos dados reais
  const enviosPorStatus = useMemo(() => {
    return STATUS_ENVIO.map(s => ({
      name: s.nome,
      value: enviosReais.filter(e => e.status === s.id).length,
      fill: s.cor
    })).filter(d => d.value > 0);
  }, [enviosReais]);

  const enviosPorObra = useMemo(() => {
    const obrasMap = {};
    enviosReais.forEach(e => {
      const nome = e.obraNome || 'Sem Obra';
      obrasMap[nome] = (obrasMap[nome] || 0) + 1;
    });
    return Object.entries(obrasMap).map(([name, value]) => ({ name, value }));
  }, [enviosReais]);

  // envios agora são derivados dos dados reais do Supabase
  const envios = enviosReais;
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [filtroObra, setFiltroObra] = useState('');
  const [busca, setBusca] = useState('');
  const [envioSelecionado, setEnvioSelecionado] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [tabAtiva, setTabAtiva] = useState('lista');

  const getStatusInfo = (status) => STATUS_ENVIO.find(s => s.id === status) || STATUS_ENVIO[0];
  const getCategoriaInfo = (cat) => CATEGORIAS_PECAS.find(c => c.id === cat) || CATEGORIAS_PECAS[9];

  const enviosFiltrados = envios.filter(e => {
    if (filtroStatus !== 'TODOS' && e.status !== filtroStatus) return false;
    if (filtroObra && !(e.obra || e.obraNome || '').toLowerCase().includes(filtroObra.toLowerCase())) return false;
    if (busca && !(e.numero || '').toLowerCase().includes(busca.toLowerCase()) &&
        !(e.cliente || '').toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const totalEnvios = envios.length;
  const emTransito = envios.filter(e => e.status === 'EM_TRANSITO').length;
  const entregues = envios.filter(e => e.status === 'ENTREGUE').length;
  const pesoTotalMes = envios.reduce((a, e) => a + (e.pesoTotal || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Truck className="h-7 w-7 text-emerald-500" />
            Envios & Expedição
          </h1>
          <p className="text-slate-400 mt-1">Controle de remessas e entregas</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => {
              const columns = [
                { header: 'ID', key: 'id' },
                { header: 'Número', key: 'numero' },
                { header: 'Obra', key: 'obra' },
                { header: 'Cliente', key: 'cliente' },
                { header: 'Status', key: 'status' },
                { header: 'Data Envio', key: 'dataEnvio' },
                { header: 'Previsão Entrega', key: 'previsaoEntrega' },
                { header: 'Motorista', key: 'motorista' },
                { header: 'Peso Total (kg)', key: 'pesoTotal' },
                { header: 'Quantidade Peças', key: 'quantidade' },
                { header: 'Valor Frete (R$)', key: 'valorFrete' }
              ];
              const timestamp = new Date().toISOString().split('T')[0];
              exportToExcel(envios, columns, `envios-expedicao-${timestamp}`);
              toast.success('Envios exportados para Excel com sucesso!');
            }}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button
            onClick={() => toast.success('Novo envio em desenvolvimento')}
            className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" />
            Novo Envio
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Envios', value: totalEnvios, icon: Package, cor: 'blue' },
          { label: 'Em Trânsito', value: emTransito, icon: Truck, cor: 'purple' },
          { label: 'Entregues', value: entregues, icon: CheckCircle2, cor: 'green' },
          { label: 'Peso Total', value: `${(pesoTotalMes / 1000).toFixed(1)}t`, icon: Weight, cor: 'orange' },
        ].map((kpi, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">{kpi.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{kpi.value}</p>
              </div>
              <div className={cn(
                "p-3 rounded-lg",
                kpi.cor === 'blue' && "bg-blue-500/20 text-blue-400",
                kpi.cor === 'purple' && "bg-purple-500/20 text-purple-400",
                kpi.cor === 'green' && "bg-green-500/20 text-green-400",
                kpi.cor === 'orange' && "bg-orange-500/20 text-orange-400",
              )}>
                <kpi.icon className="h-6 w-6" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs.Root value={tabAtiva} onValueChange={setTabAtiva}>
        <Tabs.List className="flex gap-2 border-b border-slate-800 pb-2">
          {[
            { id: 'lista', label: 'Lista de Envios', icon: FileText },
            { id: 'mapa', label: 'Visão por Status', icon: BarChart3 },
          ].map(tab => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                tabAtiva === tab.id
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* Lista de Envios */}
        <Tabs.Content value="lista" className="mt-6">
          {/* Filtros */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Buscar por romaneio ou cliente..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10 bg-slate-800/50 border-slate-700 text-white"
              />
            </div>
            <Select.Root value={filtroStatus} onValueChange={setFiltroStatus}>
              <Select.Trigger className="flex items-center justify-between w-48 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white">
                <Select.Value placeholder="Status" />
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                  <Select.Viewport className="p-1">
                    <Select.Item value="TODOS" className="px-3 py-2 text-sm text-white hover:bg-slate-700 rounded cursor-pointer outline-none">
                      <Select.ItemText>Todos</Select.ItemText>
                    </Select.Item>
                    {STATUS_ENVIO.map(s => (
                      <Select.Item key={s.id} value={s.id} className="px-3 py-2 text-sm text-white hover:bg-slate-700 rounded cursor-pointer outline-none">
                        <Select.ItemText>{s.nome}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>

          {/* Lista */}
          <div className="space-y-3">
            {enviosFiltrados.map((envio, idx) => {
              const status = getStatusInfo(envio.status);
              const StatusIcon = status.icon;
              return (
                <motion.div
                  key={envio.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-all cursor-pointer"
                  onClick={() => { setEnvioSelecionado(envio); setModalAberto(true); }}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: `${status.cor}20` }}
                      >
                        <StatusIcon className="h-5 w-5" style={{ color: status.cor }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-white">{envio.numero}</span>
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{ backgroundColor: `${status.cor}20`, color: status.cor }}
                          >
                            {status.nome}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm mt-1">{envio.obra}</p>
                        <p className="text-slate-500 text-xs">{envio.cliente}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Peças</p>
                        <p className="text-white font-semibold">{envio.qtdPecas}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Peso</p>
                        <p className="text-white font-semibold">{(envio.pesoTotal / 1000).toFixed(2)}t</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Previsão</p>
                        <p className="text-white font-semibold">
                          {new Date(envio.previsaoEntrega).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      {envio.motorista && (
                        <div className="hidden lg:block text-right">
                          <p className="text-xs text-slate-500">Motorista</p>
                          <p className="text-white text-sm">{envio.motorista}</p>
                          <p className="text-slate-400 text-xs">{envio.placa}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Tabs.Content>

        {/* Visão por Status */}
        <Tabs.Content value="mapa" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Pizza - Status */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Envios por Status</h3>
              <div className="h-64">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={enviosPorStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {enviosPorStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico de Barras - Por Obra */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Envios por Obra</h3>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={enviosPorObra}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="obra" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="envios" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Timeline de Status */}
            <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Fluxo de Expedição</h3>
              <div className="flex items-center justify-between">
                {STATUS_ENVIO.map((status, idx) => {
                  const count = envios.filter(e => e.status === status.id).length;
                  const StatusIcon = status.icon;
                  return (
                    <React.Fragment key={status.id}>
                      <div className="flex flex-col items-center">
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center mb-2"
                          style={{ backgroundColor: `${status.cor}20` }}
                        >
                          <StatusIcon className="h-7 w-7" style={{ color: status.cor }} />
                        </div>
                        <span className="text-white font-bold text-lg">{count}</span>
                        <span className="text-slate-400 text-xs text-center">{status.nome}</span>
                      </div>
                      {idx < STATUS_ENVIO.length - 1 && (
                        <ArrowRight className="h-6 w-6 text-slate-600" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {/* Modal de Detalhes */}
      <Dialog.Root open={modalAberto} onOpenChange={setModalAberto}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl p-6 z-50">
            {envioSelecionado && (
              <>
                <Dialog.Title className="text-xl font-bold text-white flex items-center justify-between">
                  <span>Romaneio {envioSelecionado.numero}</span>
                  <span
                    className="px-3 py-1 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: `${getStatusInfo(envioSelecionado.status).cor}20`,
                      color: getStatusInfo(envioSelecionado.status).cor
                    }}
                  >
                    {getStatusInfo(envioSelecionado.status).nome}
                  </span>
                </Dialog.Title>

                <div className="mt-6 space-y-6">
                  {/* Info Obra */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                        <Building2 className="h-4 w-4" />
                        Obra
                      </div>
                      <p className="text-white font-medium">{envioSelecionado.obra}</p>
                      <p className="text-slate-400 text-sm">{envioSelecionado.cliente}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                        <MapPin className="h-4 w-4" />
                        Endereço
                      </div>
                      <p className="text-white text-sm">{envioSelecionado.endereco}</p>
                    </div>
                  </div>

                  {/* Info Transporte */}
                  {envioSelecionado.motorista && (
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                        <Truck className="h-4 w-4 text-emerald-400" />
                        Transporte
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-slate-400 text-xs">Motorista</p>
                          <p className="text-white">{envioSelecionado.motorista}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Telefone</p>
                          <p className="text-white">{envioSelecionado.telefoneMotorista}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Placa</p>
                          <p className="text-white font-mono">{envioSelecionado.placa}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Itens do Envio */}
                  <div>
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4 text-emerald-400" />
                      Itens ({envioSelecionado.qtdPecas} peças - {(envioSelecionado.pesoTotal / 1000).toFixed(2)}t)
                    </h4>
                    <div className="bg-slate-800/50 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-700">
                            <th className="px-4 py-2 text-left text-xs text-slate-400 font-medium">Marca</th>
                            <th className="px-4 py-2 text-left text-xs text-slate-400 font-medium">Tipo</th>
                            <th className="px-4 py-2 text-left text-xs text-slate-400 font-medium">Categoria</th>
                            <th className="px-4 py-2 text-right text-xs text-slate-400 font-medium">Qtd</th>
                            <th className="px-4 py-2 text-right text-xs text-slate-400 font-medium">Peso</th>
                          </tr>
                        </thead>
                        <tbody>
                          {envioSelecionado.itens.map((item, idx) => {
                            const cat = getCategoriaInfo(item.categoria);
                            return (
                              <tr key={idx} className="border-b border-slate-700/50">
                                <td className="px-4 py-3 text-white font-mono">{item.marca}</td>
                                <td className="px-4 py-3 text-slate-300">{item.tipo}</td>
                                <td className="px-4 py-3">
                                  <span
                                    className="px-2 py-1 rounded text-xs"
                                    style={{ backgroundColor: `${cat.cor}20`, color: cat.cor }}
                                  >
                                    {cat.icon} {cat.nome}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right text-white">{item.qtd}</td>
                                <td className="px-4 py-3 text-right text-white">{item.peso} kg</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Observações */}
                  {envioSelecionado.observacoes && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                      <p className="text-amber-400 text-sm">
                        <strong>Observações:</strong> {envioSelecionado.observacoes}
                      </p>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                    <Button
                      onClick={() => window.print()}
                      variant="outline"
                      className="border-slate-700 text-slate-300">
                      <Printer className="h-4 w-4 mr-2" />
                      Imprimir
                    </Button>
                    <Button
                      onClick={() => toast.info('Edição em desenvolvimento')}
                      variant="outline"
                      className="border-slate-700 text-slate-300">
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Dialog.Close asChild>
                      <Button className="bg-emerald-600 hover:bg-emerald-700">
                        Fechar
                      </Button>
                    </Dialog.Close>
                  </div>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
