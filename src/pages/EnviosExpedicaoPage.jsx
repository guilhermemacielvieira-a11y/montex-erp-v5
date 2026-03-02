import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { exportToExcel } from '@/utils/exportUtils';
import { useExpedicao, useObras } from '../contexts/ERPContext';
import { useProducaoFabrica } from '../contexts/ProducaoFabricaContext';
import {
  Truck, Package, CheckCircle2, AlertCircle, Search, Plus,
  FileText, Download, ChevronDown, Building2, Weight,
  ArrowRight, Printer, BarChart3, X, SendHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import * as Select from '@radix-ui/react-select';

// ============================================================
// CONSTANTES
// ============================================================

const STATUS_ENVIO = [
  { id: 'PREPARANDO', nome: 'Preparando', cor: '#f59e0b', icon: Package },
  { id: 'AGUARDANDO_TRANSPORTE', nome: 'Aguard. Transporte', cor: '#3b82f6', icon: Package },
  { id: 'EM_TRANSITO', nome: 'Em Trânsito', cor: '#8b5cf6', icon: Truck },
  { id: 'ENTREGUE', nome: 'Entregue', cor: '#10b981', icon: CheckCircle2 },
  { id: 'PROBLEMA', nome: 'Problema', cor: '#ef4444', icon: AlertCircle },
];

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function EnviosExpedicaoPage() {
  // ==== DADOS DO ERP CONTEXT ====
  const { expedicoes, addExpedicao, updateExpedicao } = useExpedicao();
  const { obras } = useObras();

  // ==== DADOS DO KANBAN DE PRODUÇÃO ====
  const { pecasProducao, ETAPAS_PRODUCAO } = useProducaoFabrica();

  // Peças prontas = etapa EXPEDIDO no Kanban de Produção
  // Ainda não vinculadas a nenhum envio
  const pecasProntas = useMemo(() => {
    if (!pecasProducao || !ETAPAS_PRODUCAO) return [];
    const idsJaEnviados = new Set(
      expedicoes.flatMap(e => e.pecas || [])
    );
    return pecasProducao.filter(
      p => p.etapa === ETAPAS_PRODUCAO.EXPEDIDO && !idsJaEnviados.has(p.id)
    );
  }, [pecasProducao, expedicoes, ETAPAS_PRODUCAO]);

  // ==== ESTADOS ====
  const [tabAtiva, setTabAtiva] = useState('fila');
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [envioSelecionado, setEnvioSelecionado] = useState(null);
  const [modalDetalheAberto, setModalDetalheAberto] = useState(false);
  const [modalNovoEnvioAberto, setModalNovoEnvioAberto] = useState(false);

  // Estados do novo envio
  const [novoEnvio, setNovoEnvio] = useState({
    numero: '',
    dataEnvio: new Date().toISOString().split('T')[0],
    transportadora: '',
    motorista: '',
    placa: '',
    observacoes: '',
  });
  const [pecasSelecionadas, setPecasSelecionadas] = useState(new Set());

  // ==== ENVIOS REAIS (Supabase) ====
  const enviosReais = useMemo(() => {
    return expedicoes.map(exp => ({
      ...exp,
      status: exp.status || 'PREPARANDO',
      obraNome: obras.find(o => o.id === exp.obraId)?.nome || exp.obraNome || '-',
    }));
  }, [expedicoes, obras]);

  // ==== FILTROS ====
  const enviosFiltrados = useMemo(() => {
    return enviosReais.filter(e => {
      if (filtroStatus !== 'TODOS' && e.status !== filtroStatus) return false;
      if (busca) {
        const q = busca.toLowerCase();
        const num = (e.numero || '').toLowerCase();
        const obra = (e.obraNome || e.obra || '').toLowerCase();
        if (!num.includes(q) && !obra.includes(q)) return false;
      }
      return true;
    });
  }, [enviosReais, filtroStatus, busca]);

  // ==== KPIs ====
  const totalEnvios = enviosReais.length;
  const emTransito = enviosReais.filter(e => e.status === 'EM_TRANSITO').length;
  const entregues = enviosReais.filter(e => e.status === 'ENTREGUE').length;
  const pesoTotalKg = enviosReais.reduce((a, e) => a + (e.pesoTotal || 0), 0);
  const qtdProntasEmbarque = pecasProntas.length;

  // ==== HELPERS ====
  const getStatusInfo = (status) => STATUS_ENVIO.find(s => s.id === status) || STATUS_ENVIO[0];

  // ==== SELEÇÃO DE PEÇAS ====
  const togglePeca = useCallback((id) => {
    setPecasSelecionadas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleTodas = useCallback(() => {
    if (pecasSelecionadas.size === pecasProntas.length) {
      setPecasSelecionadas(new Set());
    } else {
      setPecasSelecionadas(new Set(pecasProntas.map(p => p.id)));
    }
  }, [pecasProntas, pecasSelecionadas]);

  // Peso total das peças selecionadas
  const pesoSelecionado = useMemo(() => {
    return pecasProntas
      .filter(p => pecasSelecionadas.has(p.id))
      .reduce((acc, p) => acc + (p.pesoTotal || p.peso || 0), 0);
  }, [pecasProntas, pecasSelecionadas]);

  // ==== CRIAR NOVO ENVIO ====
  const handleCriarEnvio = useCallback(async () => {
    if (pecasSelecionadas.size === 0) {
      toast.error('Selecione pelo menos uma peça para o envio');
      return;
    }
    if (!novoEnvio.dataEnvio) {
      toast.error('Informe a data do envio');
      return;
    }

    const pecasDoEnvio = pecasProntas.filter(p => pecasSelecionadas.has(p.id));
    const obraId = pecasDoEnvio[0]?.obraId || '';
    const obraNome = pecasDoEnvio[0]?.obraNome || '';
    const numero = novoEnvio.numero || `ENV-${Date.now().toString().slice(-6)}`;

    const envioPayload = {
      id: `EXP-${Date.now()}`,
      numero,
      obraId,
      obraNome,
      obra: obraNome,
      cliente: obras.find(o => o.id === obraId)?.cliente || '',
      dataEnvio: novoEnvio.dataEnvio,
      transportadora: novoEnvio.transportadora,
      motorista: novoEnvio.motorista,
      placa: novoEnvio.placa,
      observacoes: novoEnvio.observacoes,
      status: 'PREPARANDO',
      pecas: pecasDoEnvio.map(p => p.id),
      itens: pecasDoEnvio.map(p => ({
        id: p.id,
        marca: p.conjunto || p.marca || p.id,
        tipo: p.tipo || '',
        descricao: p.descricao || '',
        quantidade: p.quantidade || 1,
        peso: p.pesoTotal || p.peso || 0,
      })),
      qtdPecas: pecasDoEnvio.length,
      pesoTotal: pesoSelecionado,
      createdAt: new Date().toISOString(),
    };

    try {
      await addExpedicao(envioPayload);
      toast.success(`Envio ${numero} criado com ${pecasDoEnvio.length} peça(s)!`);
      setModalNovoEnvioAberto(false);
      setPecasSelecionadas(new Set());
      setNovoEnvio({
        numero: '', dataEnvio: new Date().toISOString().split('T')[0],
        transportadora: '', motorista: '', placa: '', observacoes: '',
      });
      setTabAtiva('lista');
    } catch (err) {
      toast.error('Erro ao criar envio: ' + err.message);
    }
  }, [pecasSelecionadas, novoEnvio, pecasProntas, pesoSelecionado, addExpedicao, obras]);

  // ==== GERAR ROMANEIO (PDF) ====
  const handleImprimirRomaneio = useCallback((envio) => {
    const pecasEnvio = envio.itens || [];
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Romaneio - ${envio.numero}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 20px; color: #000; }
  .header { text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { color: #1e40af; margin: 0; font-size: 18px; }
  .header h2 { margin: 4px 0; font-size: 14px; color: #374151; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px; }
  .info-box { border: 1px solid #d1d5db; border-radius: 6px; padding: 8px; }
  .info-label { font-size: 10px; color: #6b7280; text-transform: uppercase; }
  .info-value { font-size: 13px; font-weight: bold; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #1e40af; color: white; padding: 8px; text-align: left; }
  td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
  tr:nth-child(even) { background: #f9fafb; }
  .total { font-weight: bold; background: #dbeafe; }
  .footer { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
  .assinatura { border-top: 1px solid #000; padding-top: 4px; text-align: center; font-size: 11px; }
</style>
</head>
<body>
<div class="header">
  <h1>GRUPO MONTEX</h1>
  <h2>ROMANEIO DE EXPEDIÇÃO</h2>
  <small>Sistema de Controle de Produção</small>
</div>
<div class="info-grid">
  <div class="info-box">
    <div class="info-label">Romaneio / Carga</div>
    <div class="info-value">${envio.numero}</div>
  </div>
  <div class="info-box">
    <div class="info-label">Obra / Cliente</div>
    <div class="info-value">${envio.obraNome || envio.obra || '-'}</div>
  </div>
  <div class="info-box">
    <div class="info-label">Data de Envio</div>
    <div class="info-value">${envio.dataEnvio ? new Date(envio.dataEnvio + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</div>
  </div>
  <div class="info-box">
    <div class="info-label">Transportadora</div>
    <div class="info-value">${envio.transportadora || '-'}</div>
  </div>
  <div class="info-box">
    <div class="info-label">Motorista / Placa</div>
    <div class="info-value">${envio.motorista || '-'} ${envio.placa ? '/ ' + envio.placa : ''}</div>
  </div>
  <div class="info-box">
    <div class="info-label">Gerado em</div>
    <div class="info-value">${new Date().toLocaleString('pt-BR')}</div>
  </div>
</div>
<table>
  <thead><tr><th>#</th><th>Conjunto</th><th>Descrição</th><th>Qtd</th><th>Peso (kg)</th><th>Peso (t)</th></tr></thead>
  <tbody>
    ${pecasEnvio.map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><b>${item.marca || item.conjunto || '-'}</b></td>
      <td>${item.descricao || item.tipo || '-'}</td>
      <td>${item.quantidade || 1}</td>
      <td>${(item.peso || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
      <td>${((item.peso || 0) / 1000).toFixed(3)}</td>
    </tr>`).join('')}
    <tr class="total">
      <td colspan="3"><b>Total de Itens: ${pecasEnvio.length}</b></td>
      <td><b>${pecasEnvio.reduce((a, p) => a + (p.quantidade || 1), 0)}</b></td>
      <td colspan="2"><b>${(envio.pesoTotal / 1000).toFixed(3)} t</b></td>
    </tr>
  </tbody>
</table>
<div class="footer">
  <div class="assinatura">Responsável pela Expedição</div>
  <div class="assinatura">Responsável pelo Recebimento</div>
</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    setTimeout(() => { if (win) win.print(); }, 500);
  }, []);

  // ==== RENDER ====
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Truck className="h-7 w-7 text-emerald-500" />
            Envios &amp; Expedição
          </h1>
          <p className="text-slate-400 mt-1">Controle de remessas e entregas</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => {
              const cols = [
                { header: 'Número', key: 'numero' },
                { header: 'Obra', key: 'obraNome' },
                { header: 'Status', key: 'status' },
                { header: 'Data Envio', key: 'dataEnvio' },
                { header: 'Transportadora', key: 'transportadora' },
                { header: 'Peso Total (kg)', key: 'pesoTotal' },
              ];
              exportToExcel(enviosReais, cols, `envios-${new Date().toISOString().split('T')[0]}`);
              toast.success('Exportado com sucesso!');
            }}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <Download className="h-4 w-4 mr-2" /> Exportar
          </Button>
          <Button
            onClick={() => setModalNovoEnvioAberto(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4 mr-2" /> Novo Envio
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Envios', value: totalEnvios, icon: Package, cor: 'blue' },
          { label: 'Em Trânsito', value: emTransito, icon: Truck, cor: 'purple' },
          { label: 'Entregues', value: entregues, icon: CheckCircle2, cor: 'green' },
          { label: 'Peso Total', value: `${(pesoTotalKg / 1000).toFixed(1)}t`, icon: Weight, cor: 'orange' },
          { label: 'Prontas p/ Embarque', value: qtdProntasEmbarque, icon: SendHorizontal, cor: 'emerald' },
        ].map((kpi, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            className={cn(
              "bg-slate-800/50 border rounded-xl p-4",
              kpi.cor === 'emerald' && qtdProntasEmbarque > 0
                ? "border-emerald-500/50 ring-1 ring-emerald-500/30"
                : "border-slate-700"
            )}
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
                kpi.cor === 'emerald' && "bg-emerald-500/20 text-emerald-400",
              )}>
                <kpi.icon className="h-6 w-6" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* TABS */}
      <Tabs.Root value={tabAtiva} onValueChange={setTabAtiva}>
        <Tabs.List className="flex gap-2 border-b border-slate-800 pb-2">
          {[
            { id: 'fila', label: 'Fila de Embarque', icon: SendHorizontal, badge: qtdProntasEmbarque },
            { id: 'lista', label: 'Lista de Envios', icon: FileText },
            { id: 'status', label: 'Visão por Status', icon: BarChart3 },
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
              {tab.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-emerald-500 text-white font-bold">
                  {tab.badge}
                </span>
              )}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* ==== ABA: FILA DE EMBARQUE ==== */}
        <Tabs.Content value="fila" className="mt-6">
          <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-white font-semibold text-lg flex items-center gap-2">
                  <SendHorizontal className="h-5 w-5 text-emerald-400" />
                  Peças Prontas para Embarque
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Peças que concluíram pintura no Kanban e aguardam carregamento
                </p>
              </div>
              {pecasProntas.length > 0 && (
                <Button
                  onClick={() => setModalNovoEnvioAberto(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Carga com Seleção
                </Button>
              )}
            </div>

            {pecasProntas.length === 0 ? (
              <div className="text-center py-16">
                <CheckCircle2 className="h-16 w-16 text-emerald-500/30 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">Nenhuma peça aguardando embarque</p>
                <p className="text-slate-500 text-sm mt-2">
                  Quando peças concluírem o processo no Kanban de Produção, aparecerão aqui automaticamente
                </p>
              </div>
            ) : (
              <>
                {/* Resumo */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                    <p className="text-slate-400 text-sm">Total de Conjuntos</p>
                    <p className="text-2xl font-bold text-white">{pecasProntas.length}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                    <p className="text-slate-400 text-sm">Peso Total Disponível</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {(pecasProntas.reduce((a, p) => a + (p.pesoTotal || p.peso || 0), 0) / 1000).toFixed(2)}t
                    </p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                    <p className="text-slate-400 text-sm">Quantidade Total</p>
                    <p className="text-2xl font-bold text-white">
                      {pecasProntas.reduce((a, p) => a + (p.quantidade || 1), 0)} pcs
                    </p>
                  </div>
                </div>

                {/* Lista de peças prontas */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="px-3 py-2 text-left text-xs text-slate-400 font-medium">Conjunto</th>
                        <th className="px-3 py-2 text-left text-xs text-slate-400 font-medium">Tipo / Perfil</th>
                        <th className="px-3 py-2 text-center text-xs text-slate-400 font-medium">Qtd</th>
                        <th className="px-3 py-2 text-right text-xs text-slate-400 font-medium">Peso (kg)</th>
                        <th className="px-3 py-2 text-right text-xs text-slate-400 font-medium">Peso (t)</th>
                        <th className="px-3 py-2 text-center text-xs text-slate-400 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pecasProntas.map((peca, idx) => (
                        <motion.tr
                          key={peca.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="border-b border-slate-700/50 hover:bg-slate-800/30"
                        >
                          <td className="px-3 py-2 font-mono font-bold text-white">
                            {peca.conjunto || peca.marca || peca.id}
                          </td>
                          <td className="px-3 py-2 text-slate-300">
                            {peca.tipo || '-'}
                            {peca.material && <span className="text-slate-500 text-xs ml-1">({peca.material})</span>}
                          </td>
                          <td className="px-3 py-2 text-center text-white">{peca.quantidade || 1}</td>
                          <td className="px-3 py-2 text-right text-white">
                            {(peca.pesoTotal || peca.peso || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-300">
                            {((peca.pesoTotal || peca.peso || 0) / 1000).toFixed(3)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                              ✅ Pronto
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-emerald-500/10 border-t-2 border-emerald-500/30">
                        <td colSpan={2} className="px-3 py-3 font-bold text-white text-sm">
                          Total — {pecasProntas.length} conjuntos
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-white">
                          {pecasProntas.reduce((a, p) => a + (p.quantidade || 1), 0)}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-emerald-400">
                          {pecasProntas.reduce((a, p) => a + (p.pesoTotal || p.peso || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-emerald-400">
                          {(pecasProntas.reduce((a, p) => a + (p.pesoTotal || p.peso || 0), 0) / 1000).toFixed(3)} t
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        </Tabs.Content>

        {/* ==== ABA: LISTA DE ENVIOS ==== */}
        <Tabs.Content value="lista" className="mt-6">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Buscar por romaneio ou obra..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="pl-10 bg-slate-800/50 border-slate-700 text-white"
              />
            </div>
            <Select.Root value={filtroStatus} onValueChange={setFiltroStatus}>
              <Select.Trigger className="flex items-center justify-between w-52 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white">
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

          <div className="space-y-3">
            {enviosFiltrados.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Nenhum envio encontrado</p>
              </div>
            ) : (
              enviosFiltrados.map((envio, idx) => {
                const status = getStatusInfo(envio.status);
                const StatusIcon = status.icon;
                return (
                  <motion.div
                    key={envio.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-all cursor-pointer"
                    onClick={() => { setEnvioSelecionado(envio); setModalDetalheAberto(true); }}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg" style={{ backgroundColor: status.cor + '20' }}>
                          <StatusIcon className="h-5 w-5" style={{ color: status.cor }} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-white">{envio.numero}</span>
                            <span
                              className="px-2 py-0.5 rounded text-xs font-medium"
                              style={{ backgroundColor: status.cor + '20', color: status.cor }}
                            >
                              {status.nome}
                            </span>
                          </div>
                          <p className="text-slate-400 text-sm mt-1">{envio.obraNome || envio.obra}</p>
                          {envio.transportadora && (
                            <p className="text-slate-500 text-xs">{envio.transportadora}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Peças</p>
                          <p className="text-white font-semibold">{envio.qtdPecas || (envio.itens || []).length}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Peso</p>
                          <p className="text-white font-semibold">{((envio.pesoTotal || 0) / 1000).toFixed(2)}t</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Data Envio</p>
                          <p className="text-white font-semibold text-sm">
                            {envio.dataEnvio ? new Date(envio.dataEnvio + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-600 text-slate-300 hidden lg:flex"
                          onClick={e => { e.stopPropagation(); handleImprimirRomaneio(envio); }}
                        >
                          <Printer className="h-4 w-4 mr-1" /> Romaneio
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </Tabs.Content>

        {/* ==== ABA: VISÃO POR STATUS ==== */}
        <Tabs.Content value="status" className="mt-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-400" />
              Fluxo de Expedição
            </h3>
            <div className="flex items-center justify-between flex-wrap gap-4">
              {STATUS_ENVIO.map((status, idx) => {
                const count = enviosReais.filter(e => e.status === status.id).length;
                const StatusIcon = status.icon;
                return (
                  <React.Fragment key={status.id}>
                    <div className="flex flex-col items-center min-w-[80px]">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center mb-2"
                        style={{ backgroundColor: status.cor + '20' }}
                      >
                        <StatusIcon className="h-7 w-7" style={{ color: status.cor }} />
                      </div>
                      <span className="text-white font-bold text-xl">{count}</span>
                      <span className="text-slate-400 text-xs text-center mt-1">{status.nome}</span>
                    </div>
                    {idx < STATUS_ENVIO.length - 1 && (
                      <ArrowRight className="h-6 w-6 text-slate-600 flex-shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {/* ==== MODAL: NOVO ENVIO ==== */}
      <Dialog.Root open={modalNovoEnvioAberto} onOpenChange={setModalNovoEnvioAberto}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl p-6 z-50">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-bold text-white flex items-center gap-3">
                <SendHorizontal className="h-6 w-6 text-emerald-400" />
                Nova Carga de Expedição
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </Button>
              </Dialog.Close>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Coluna esquerda - dados do envio */}
              <div className="space-y-4">
                <h3 className="text-slate-300 font-semibold text-sm uppercase tracking-wide flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Dados do Envio
                </h3>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Número do Romaneio</label>
                  <Input
                    placeholder="Ex: ENV-001 (auto se vazio)"
                    value={novoEnvio.numero}
                    onChange={e => setNovoEnvio(p => ({ ...p, numero: e.target.value }))}
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Data de Envio *</label>
                  <Input
                    type="date"
                    value={novoEnvio.dataEnvio}
                    onChange={e => setNovoEnvio(p => ({ ...p, dataEnvio: e.target.value }))}
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Transportadora</label>
                  <Input
                    placeholder="Nome da transportadora"
                    value={novoEnvio.transportadora}
                    onChange={e => setNovoEnvio(p => ({ ...p, transportadora: e.target.value }))}
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Motorista</label>
                    <Input
                      placeholder="Nome do motorista"
                      value={novoEnvio.motorista}
                      onChange={e => setNovoEnvio(p => ({ ...p, motorista: e.target.value }))}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Placa</label>
                    <Input
                      placeholder="ABC-1234"
                      value={novoEnvio.placa}
                      onChange={e => setNovoEnvio(p => ({ ...p, placa: e.target.value }))}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Observações</label>
                  <textarea
                    rows={3}
                    placeholder="Informações adicionais..."
                    value={novoEnvio.observacoes}
                    onChange={e => setNovoEnvio(p => ({ ...p, observacoes: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm resize-none focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Resumo da seleção */}
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                  <p className="text-emerald-400 font-semibold text-sm">Resumo da Carga</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <p className="text-xs text-slate-400">Peças selecionadas</p>
                      <p className="text-white font-bold">{pecasSelecionadas.size}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Peso total</p>
                      <p className="text-emerald-400 font-bold">{(pesoSelecionado / 1000).toFixed(3)}t</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coluna direita - seleção de peças */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-slate-300 font-semibold text-sm uppercase tracking-wide flex items-center gap-2">
                    <Package className="h-4 w-4" /> Selecionar Peças
                  </h3>
                  {pecasProntas.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={toggleTodas}
                      className="border-slate-600 text-slate-300 text-xs h-7"
                    >
                      {pecasSelecionadas.size === pecasProntas.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                    </Button>
                  )}
                </div>

                {pecasProntas.length === 0 ? (
                  <div className="text-center py-12 bg-slate-800/30 rounded-lg border border-slate-700">
                    <Package className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Nenhuma peça disponível</p>
                    <p className="text-slate-500 text-xs mt-1">
                      Mova peças para "Expedido" no Kanban de Produção
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-800/30 rounded-lg border border-slate-700 overflow-hidden max-h-[400px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-slate-900">
                        <tr className="border-b border-slate-700">
                          <th className="px-2 py-2 text-left">
                            <input
                              type="checkbox"
                              checked={pecasSelecionadas.size === pecasProntas.length && pecasProntas.length > 0}
                              onChange={toggleTodas}
                              className="accent-emerald-500"
                            />
                          </th>
                          <th className="px-2 py-2 text-left text-slate-400">Conjunto</th>
                          <th className="px-2 py-2 text-left text-slate-400">Tipo</th>
                          <th className="px-2 py-2 text-center text-slate-400">Qtd</th>
                          <th className="px-2 py-2 text-right text-slate-400">Peso (kg)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pecasProntas.map(peca => (
                          <tr
                            key={peca.id}
                            onClick={() => togglePeca(peca.id)}
                            className={cn(
                              "border-b border-slate-700/50 cursor-pointer transition-colors",
                              pecasSelecionadas.has(peca.id)
                                ? "bg-emerald-500/10 hover:bg-emerald-500/15"
                                : "hover:bg-slate-700/30"
                            )}
                          >
                            <td className="px-2 py-2">
                              <input
                                type="checkbox"
                                checked={pecasSelecionadas.has(peca.id)}
                                onChange={() => togglePeca(peca.id)}
                                onClick={e => e.stopPropagation()}
                                className="accent-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2 font-mono font-bold text-white">
                              {peca.conjunto || peca.marca || peca.id}
                            </td>
                            <td className="px-2 py-2 text-slate-300">{peca.tipo || '-'}</td>
                            <td className="px-2 py-2 text-center text-white">{peca.quantidade || 1}</td>
                            <td className="px-2 py-2 text-right text-white">
                              {(peca.pesoTotal || peca.peso || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-700">
              <Dialog.Close asChild>
                <Button variant="outline" className="border-slate-700 text-slate-300">
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button
                onClick={handleCriarEnvio}
                disabled={pecasSelecionadas.size === 0}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
              >
                <SendHorizontal className="h-4 w-4 mr-2" />
                Criar Envio ({pecasSelecionadas.size} peça{pecasSelecionadas.size !== 1 ? 's' : ''})
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ==== MODAL: DETALHE DO ENVIO ==== */}
      <Dialog.Root open={modalDetalheAberto} onOpenChange={setModalDetalheAberto}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl p-6 z-50">
            {envioSelecionado && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-xl font-bold text-white flex items-center gap-3">
                    <FileText className="h-5 w-5 text-emerald-400" />
                    Romaneio {envioSelecionado.numero}
                  </Dialog.Title>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-3 py-1 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: getStatusInfo(envioSelecionado.status).cor + '20',
                        color: getStatusInfo(envioSelecionado.status).cor
                      }}
                    >
                      {getStatusInfo(envioSelecionado.status).nome}
                    </span>
                    <Dialog.Close asChild>
                      <Button variant="ghost" size="sm" className="text-slate-400">
                        <X className="h-4 w-4" />
                      </Button>
                    </Dialog.Close>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Info */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400">Obra</p>
                      <p className="text-white font-medium">{envioSelecionado.obraNome || envioSelecionado.obra}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400">Data Envio</p>
                      <p className="text-white font-medium">
                        {envioSelecionado.dataEnvio ? new Date(envioSelecionado.dataEnvio + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                      </p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400">Transportadora</p>
                      <p className="text-white font-medium">{envioSelecionado.transportadora || '-'}</p>
                    </div>
                  </div>

                  {/* Itens */}
                  <div className="bg-slate-800/50 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700 bg-slate-900/50">
                          <th className="px-4 py-2 text-left text-xs text-slate-400">#</th>
                          <th className="px-4 py-2 text-left text-xs text-slate-400">Conjunto</th>
                          <th className="px-4 py-2 text-left text-xs text-slate-400">Tipo</th>
                          <th className="px-4 py-2 text-center text-xs text-slate-400">Qtd</th>
                          <th className="px-4 py-2 text-right text-xs text-slate-400">Peso (kg)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(envioSelecionado.itens || []).map((item, idx) => (
                          <tr key={idx} className="border-b border-slate-700/50">
                            <td className="px-4 py-2 text-slate-500 text-xs">{idx + 1}</td>
                            <td className="px-4 py-2 font-mono font-bold text-white">{item.marca || item.conjunto}</td>
                            <td className="px-4 py-2 text-slate-300">{item.tipo || item.descricao || '-'}</td>
                            <td className="px-4 py-2 text-center text-white">{item.quantidade || 1}</td>
                            <td className="px-4 py-2 text-right text-white">
                              {(item.peso || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-900/50 border-t border-slate-600">
                          <td colSpan={3} className="px-4 py-2 font-bold text-white text-sm">
                            Total — {(envioSelecionado.itens || []).length} itens
                          </td>
                          <td className="px-4 py-2 text-center font-bold text-white">
                            {(envioSelecionado.itens || []).reduce((a, i) => a + (i.quantidade || 1), 0)}
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-emerald-400">
                            {((envioSelecionado.pesoTotal || 0) / 1000).toFixed(3)}t
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-700 mt-4">
                  <Button
                    onClick={() => handleImprimirRomaneio(envioSelecionado)}
                    variant="outline"
                    className="border-slate-700 text-slate-300"
                  >
                    <Printer className="h-4 w-4 mr-2" /> Imprimir Romaneio
                  </Button>
                  <Dialog.Close asChild>
                    <Button className="bg-emerald-600 hover:bg-emerald-700">Fechar</Button>
                  </Dialog.Close>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
