import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { AlertCircle, Maximize2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import FiltrosDinamicosIA from './FiltrosDinamicosIA';
import ComparadorPeriodos from './ComparadorPeriodos';

const COLORS = ['#1e3a5f', '#f97316', '#22c55e', '#eab308', '#ef4444'];

export default function AnalisePreditivaComportamentoCliente({ parametros, clientes }) {
  const [filtros, setFiltros] = useState({});
  const [zoomAtivo, setZoomAtivo] = useState({});

  const analise = useMemo(() => {
    if (!clientes.length) return null;

    // Segmentação de clientes
    const segmentos = {};
    clientes.forEach(c => {
      const seg = c.segmento || 'outro';
      if (!segmentos[seg]) {
        segmentos[seg] = 0;
      }
      segmentos[seg]++;
    });

    const dadosSegmentacao = Object.entries(segmentos).map(([nome, valor]) => ({
      nome: nome.charAt(0).toUpperCase() + nome.slice(1),
      value: valor
    }));

    // Clientes por valor (simulado)
    const clientesValor = clientes.map(c => ({
      nome: c.nome,
      segmento: c.segmento || 'outro',
      valor: Math.random() * 500000 + 50000, // Simulado
      frequencia: Math.round(Math.random() * 10 + 1),
      ultimaCompra: Math.round(Math.random() * 180) // dias
    })).sort((a, b) => b.valor - a.valor).slice(0, 10);

    // Análise de retenção
    const dadosRetencao = Array.from({ length: parametros.periodo / 30 }, (_, i) => {
      const mes = i + 1;
      return {
        mes: `Mês ${mes}`,
        retencao: Math.round(95 - mes * 2 + Math.random() * 5),
        churn: Math.round(5 + mes * 2 - Math.random() * 5),
        novosClientes: Math.round(Math.random() * 5 + 1)
      };
    });

    // Score de lealdade
    const scoresPorSegmento = Object.keys(segmentos).map(seg => ({
      segmento: seg.charAt(0).toUpperCase() + seg.slice(1),
      score: Math.round(Math.random() * 40 + 60) // 60-100
    }));

    const scoreMedia = scoresPorSegmento.reduce((sum, s) => sum + s.score, 0) / scoresPorSegmento.length;
    const clientesAltoValor = clientesValor.filter(c => c.valor > 200000).length;
    const taxaChurn = Math.round(Math.random() * 5 + 2);
    const clientes_em_risco = clientesValor.filter(c => c.ultimaCompra > 90).length;

    return {
      totalClientes: clientes.length,
      clientesAltoValor,
      scoreMedia: Math.round(scoreMedia),
      taxaChurn,
      clientesRisco: clientes_em_risco,
      dadosSegmentacao,
      clientesValor,
      dadosRetencao,
      scoresPorSegmento
    };
  }, [clientes, parametros]);

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
    segmento: {
      label: 'Segmento de Cliente',
      tipo: 'multi',
      opcoes: [
        { id: 'industria', label: 'Indústria' },
        { id: 'comercio', label: 'Comércio' },
        { id: 'logistica', label: 'Logística' },
        { id: 'agronegocio', label: 'Agronegócio' }
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
        metricaChave="totalClientes"
        metricaLabel="Total de Clientes"
      />

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{analise.totalClientes}</div>
            <p className="text-xs text-slate-600 mt-1">Cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Alto Valor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analise.clientesAltoValor}</div>
            <p className="text-xs text-slate-600 mt-1">&gt; R$ 200k anuais</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Score Lealdade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{analise.scoreMedia}/100</div>
            <p className="text-xs text-slate-600 mt-1">Média de retenção</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Taxa Churn</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{analise.taxaChurn}%</div>
            <p className="text-xs text-slate-600 mt-1">Próximos 90 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Em Risco</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{analise.clientesRisco}</div>
            <p className="text-xs text-slate-600 mt-1">Sem contato &gt; 90 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Segmento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analise.dadosSegmentacao}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name} (${value})`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analise.dadosSegmentacao.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <CardTitle>Score de Lealdade por Segmento</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setZoomAtivo({ ...zoomAtivo, loyalty: !zoomAtivo.loyalty })}
              className="gap-2"
            >
              <Maximize2 className="h-4 w-4" />
              Zoom
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={zoomAtivo.loyalty ? 400 : 250}>
              <BarChart data={analise.scoresPorSegmento} height={zoomAtivo.loyalty ? 400 : 250}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="segmento" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" fill="#1e3a5f" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Tendência de Retenção vs Churn</CardTitle>
            <CardDescription>Projeção de retenção de clientes nos próximos meses</CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoomAtivo({ ...zoomAtivo, retencao: !zoomAtivo.retencao })}
            className="gap-2"
          >
            <Maximize2 className="h-4 w-4" />
            Zoom
          </Button>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={zoomAtivo.retencao ? 400 : 300}>
            <LineChart data={analise.dadosRetencao}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="retencao" stroke="#22c55e" name="Taxa de Retenção (%)" strokeWidth={2} />
              <Line yAxisId="left" type="monotone" dataKey="churn" stroke="#ef4444" name="Churn (%)" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="novosClientes" stroke="#f97316" name="Novos Clientes" strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top 10 Clientes por Valor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {analise.clientesValor.map((c, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 border rounded hover:bg-slate-50">
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{idx + 1}. {c.nome}</p>
                  <p className="text-xs text-slate-600">
                    {c.segmento} • {c.frequencia} compras • Última: há {c.ultimaCompra} dias
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-900">R$ {(c.valor / 1000).toFixed(0)}k</p>
                  {c.ultimaCompra > 90 && (
                    <Badge className="bg-red-100 text-red-800 mt-1">Em Risco</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}