import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, AlertTriangle, Maximize2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import FiltrosDinamicosIA from './FiltrosDinamicosIA';
import ComparadorPeriodos from './ComparadorPeriodos';

export default function AnalisePreditivaProjetosDesempenho({ parametros, projetos }) {
  const [filtros, setFiltros] = useState({});
  const [zoomAtivo, setZoomAtivo] = useState({});

  const analise = useMemo(() => {
    if (!projetos.length) return null;

    const projetosAtivos = projetos.filter(p => 
      p.status === 'em_fabricacao' || p.status === 'em_montagem' || p.status === 'aprovado'
    );

    // Análise de atrasos potenciais
    const hoje = new Date();
    const projetosComRisco = projetosAtivos.map(p => {
      const dataFimPrevista = new Date(p.data_fim_prevista);
      const diasRestantes = Math.floor((dataFimPrevista - hoje) / (1000 * 60 * 60 * 24));
      const progresso = Math.random() * 100; // Simulado para demo
      const velocidadeEsperada = (diasRestantes > 0) ? (100 - progresso) / diasRestantes : 0;
      const velocidadeReal = Math.random() * 3; // Simulado para demo
      const risco = velocidadeReal < velocidadeEsperada ? 'alto' : velocidadeReal < velocidadeEsperada * 0.8 ? 'médio' : 'baixo';

      return {
        nome: p.nome,
        status: p.status,
        progresso: Math.round(progresso),
        diasRestantes,
        risco,
        custoEstimado: p.valor_contrato || 0,
        pesoEstimado: p.peso_estimado || 0
      };
    });

    // Dados de timeline
    const dadosTimeline = Array.from({ length: parametros.periodo / 30 }, (_, i) => {
      const mes = i + 1;
      return {
        mes: `Mês ${mes}`,
        projetosAtivos: Math.max(1, Math.round(projetosAtivos.length - (mes * 0.5))),
        projetosAtrasados: Math.round(projetosAtivos.length * 0.1 + mes * 0.2),
        projetosNosPrazo: Math.max(1, Math.round(projetosAtivos.length * 0.9 - mes * 0.2))
      };
    });

    // Análise de custo vs progresso
    const scatter = projetosComRisco.map(p => ({
      x: p.progresso,
      y: p.custoEstimado,
      nome: p.nome,
      risco: p.risco
    }));

    const taxaAtraso = projetosComRisco.filter(p => p.risco !== 'baixo').length / projetosComRisco.length * 100;
    const projetosCriticos = projetosComRisco.filter(p => p.risco === 'alto');

    return {
      projetosAtivos: projetosAtivos.length,
      projetosComRisco: projetosComRisco.filter(p => p.risco !== 'baixo').length,
      taxaAtraso: Math.round(taxaAtraso),
      projetosCriticos,
      dadosTimeline,
      scatter,
      todos: projetosComRisco
    };
  }, [projetos, parametros]);

  if (!analise) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-slate-600">
            <AlertCircle className="h-4 w-4" />
            Dados insuficientes para análise
          </div>
        </CardContent>
      </Card>
    );
  }

  const filtrosDisponiveis = {
    risco: {
      label: 'Nível de Risco',
      tipo: 'multi',
      opcoes: [
        { id: 'alto', label: 'Alto Risco' },
        { id: 'medio', label: 'Médio Risco' },
        { id: 'baixo', label: 'Baixo Risco' }
      ]
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtros e Comparação */}
      <FiltrosDinamicosIA
        filtrosDisponiveis={filtrosDisponiveis}
        filtrosAtuais={filtros}
        onFiltrosChange={setFiltros}
      />

      <ComparadorPeriodos
        dados={analise}
        metricaChave="projetosAtivos"
        metricaLabel="Projetos Ativos"
      />

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Projetos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{analise.projetosAtivos}</div>
            <p className="text-xs text-slate-600 mt-1">Em fabricação ou montagem</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Com Risco de Atraso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{analise.projetosComRisco}</div>
            <p className="text-xs text-slate-600 mt-1">{analise.taxaAtraso}% de risco</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Críticos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{analise.projetosCriticos.length}</div>
            <p className="text-xs text-slate-600 mt-1">Requer atenção imediata</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Saúde Média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{100 - analise.taxaAtraso}%</div>
            <p className="text-xs text-slate-600 mt-1">Projetos no prazo</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas Críticos */}
      {analise.projetosCriticos.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertTriangle className="h-5 w-5" />
              Projetos Críticos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analise.projetosCriticos.map((p, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-white rounded border border-red-100">
                <div>
                  <p className="font-medium text-slate-900">{p.nome}</p>
                  <p className="text-xs text-slate-600">{p.diasRestantes} dias restantes • Progresso: {p.progresso}%</p>
                </div>
                <Badge className="bg-red-600">Crítico</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Gráficos */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Saúde dos Projetos ao Longo do Tempo</CardTitle>
            <CardDescription>Projeção de projetos ativos, no prazo e atrasados</CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoomAtivo({ ...zoomAtivo, timeline: !zoomAtivo.timeline })}
            className="gap-2"
          >
            <Maximize2 className="h-4 w-4" />
            Zoom
          </Button>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={zoomAtivo.timeline ? 400 : 300}>
            <LineChart data={analise.dadosTimeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="projetosAtivos" stroke="#1e3a5f" name="Ativos" strokeWidth={2} />
              <Line type="monotone" dataKey="projetosNosPrazo" stroke="#22c55e" name="No Prazo" strokeWidth={2} />
              <Line type="monotone" dataKey="projetosAtrasados" stroke="#ef4444" name="Atrasados" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Análise Custo vs Progresso</CardTitle>
            <CardDescription>Posicionamento dos projetos por custo estimado e progresso atual</CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoomAtivo({ ...zoomAtivo, scatter: !zoomAtivo.scatter })}
            className="gap-2"
          >
            <Maximize2 className="h-4 w-4" />
            Zoom
          </Button>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={zoomAtivo.scatter ? 400 : 300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" name="Progresso (%)" type="number" />
              <YAxis dataKey="y" name="Custo (R$)" type="number" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Baixo Risco" data={analise.scatter.filter(s => s.risco === 'baixo')} fill="#22c55e" />
              <Scatter name="Médio Risco" data={analise.scatter.filter(s => s.risco === 'médio')} fill="#eab308" />
              <Scatter name="Alto Risco" data={analise.scatter.filter(s => s.risco === 'alto')} fill="#ef4444" />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Lista de Projetos */}
      <Card>
        <CardHeader>
          <CardTitle>Todos os Projetos Analisados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {analise.todos.map((p, idx) => {
              const riscoCor = p.risco === 'alto' ? 'bg-red-100 text-red-800' : p.risco === 'médio' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
              return (
                <div key={idx} className="flex justify-between items-center p-2 border rounded hover:bg-slate-50">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{p.nome}</p>
                    <p className="text-xs text-slate-600">{p.diasRestantes} dias restantes</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">{p.progresso}%</p>
                      <p className="text-xs text-slate-600">Progresso</p>
                    </div>
                    <Badge className={riscoCor}>{p.risco}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}