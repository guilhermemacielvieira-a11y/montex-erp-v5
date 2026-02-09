import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';
import { TrendingUp, Activity, Target, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export function ProgressoFisicoFinanceiro({ relatorios, projetos }) {
  // Agrupar relatórios por projeto e ordenar por data
  const projetosData = projetos
    .filter(p => ['aprovado', 'em_fabricacao', 'em_montagem'].includes(p.status))
    .slice(0, 5) // Top 5 projetos ativos
    .map(projeto => {
      const relatoriosProjeto = relatorios
        .filter(r => r.projeto_id === projeto.id)
        .sort((a, b) => new Date(a.periodo_fim) - new Date(b.periodo_fim));

      const progressoData = relatoriosProjeto.map(rel => ({
        data: rel.periodo_fim ? format(new Date(rel.periodo_fim), 'dd/MM') : '-',
        fabricacao: rel.percentual_fabricacao || 0,
        montagem: rel.percentual_montagem || 0,
        progresso: ((rel.percentual_fabricacao || 0) + (rel.percentual_montagem || 0)) / 2
      }));

      return {
        projeto: projeto.nome,
        data: progressoData
      };
    })
    .filter(p => p.data.length > 0);

  if (projetosData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-blue-600" />
            Progresso Físico ao Longo do Tempo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-slate-500 py-8">
            Nenhum relatório disponível ainda
          </p>
        </CardContent>
      </Card>
    );
  }

  // Usar o primeiro projeto como exemplo principal
  const mainProject = projetosData[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5 text-blue-600" />
          Progresso Físico - {mainProject.projeto}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={mainProject.data}>
            <defs>
              <linearGradient id="colorFabricacao" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorMontagem" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="data" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
            <Tooltip 
              formatter={(value) => `${value}%`}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="fabricacao" 
              name="Fabricação"
              stroke="#3b82f6" 
              fillOpacity={1}
              fill="url(#colorFabricacao)"
            />
            <Area 
              type="monotone" 
              dataKey="montagem" 
              name="Montagem"
              stroke="#10b981" 
              fillOpacity={1}
              fill="url(#colorMontagem)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ComparacaoProjetosProgresso({ relatorios, projetos }) {
  const projetosData = projetos
    .filter(p => ['aprovado', 'em_fabricacao', 'em_montagem'].includes(p.status))
    .map(projeto => {
      const ultimoRelatorio = relatorios
        .filter(r => r.projeto_id === projeto.id)
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

      if (!ultimoRelatorio) return null;

      const progressoMedio = ((ultimoRelatorio.percentual_fabricacao || 0) + 
                             (ultimoRelatorio.percentual_montagem || 0)) / 2;

      const diasDecorridos = projeto.data_inicio 
        ? Math.floor((new Date() - new Date(projeto.data_inicio)) / (1000 * 60 * 60 * 24))
        : 0;

      const prazoTotal = projeto.data_fim_prevista && projeto.data_inicio
        ? Math.floor((new Date(projeto.data_fim_prevista) - new Date(projeto.data_inicio)) / (1000 * 60 * 60 * 24))
        : 120;

      const progressoEsperado = diasDecorridos > 0 ? (diasDecorridos / prazoTotal) * 100 : 0;
      const desvio = progressoMedio - progressoEsperado;

      return {
        projeto: projeto.nome.length > 20 ? projeto.nome.substring(0, 17) + '...' : projeto.nome,
        fabricacao: ultimoRelatorio.percentual_fabricacao || 0,
        montagem: ultimoRelatorio.percentual_montagem || 0,
        esperado: progressoEsperado.toFixed(1),
        real: progressoMedio.toFixed(1),
        desvio: desvio.toFixed(1)
      };
    })
    .filter(p => p !== null)
    .slice(0, 8);

  if (projetosData.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-purple-600" />
          Comparação de Progresso entre Projetos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={projetosData} layout="vertical" margin={{ left: 100 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
            <YAxis dataKey="projeto" type="category" tick={{ fontSize: 11 }} width={95} />
            <Tooltip 
              formatter={(value) => `${value}%`}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <Legend />
            <Bar dataKey="fabricacao" name="Fabricação" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            <Bar dataKey="montagem" name="Montagem" fill="#10b981" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function DesempenhoCustosVsPlanejado({ relatorios, projetos, orcamentos = [] }) {
  const custosData = projetos
    .filter(p => p.valor_contrato && ['aprovado', 'em_fabricacao', 'em_montagem'].includes(p.status))
    .map(projeto => {
      const ultimoRelatorio = relatorios
        .filter(r => r.projeto_id === projeto.id)
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

      if (!ultimoRelatorio) return null;

      const orcamento = orcamentos.find(o => 
        o.projeto_nome === projeto.nome && o.status === 'aprovado'
      );

      const custoEstimado = orcamento?.custo_total || (projeto.valor_contrato * 0.7);
      const custoRealizado = ultimoRelatorio.tonelagem_fabricada 
        ? (ultimoRelatorio.tonelagem_fabricada * 8.5) + ((ultimoRelatorio.tonelagem_montada || 0) * 12.0)
        : 0;

      const progressoMedio = ((ultimoRelatorio.percentual_fabricacao || 0) + 
                             (ultimoRelatorio.percentual_montagem || 0)) / 2;

      const custoEsperado = custoEstimado * (progressoMedio / 100);
      const desvio = ((custoRealizado - custoEsperado) / custoEsperado) * 100;

      return {
        projeto: projeto.nome.length > 20 ? projeto.nome.substring(0, 17) + '...' : projeto.nome,
        custoEstimado: custoEsperado / 1000, // em milhares
        custoReal: custoRealizado / 1000,
        desvio: desvio.toFixed(1),
        progresso: progressoMedio.toFixed(1)
      };
    })
    .filter(p => p !== null && p.custoReal > 0)
    .slice(0, 8);

  if (custosData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            Desempenho de Custos vs Planejado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-slate-500 py-8">
            Dados insuficientes para análise de custos
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          Custos Realizados vs Planejados (milhares R$)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={custosData} layout="vertical" margin={{ left: 100 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis dataKey="projeto" type="category" tick={{ fontSize: 11 }} width={95} />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'desvio') return `${value}%`;
                return `R$ ${(value * 1000).toLocaleString('pt-BR')}`;
              }}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <Legend />
            <Bar dataKey="custoEstimado" name="Previsto" fill="#94a3b8" radius={[0, 4, 4, 0]} />
            <Bar dataKey="custoReal" name="Realizado" fill="#f97316" radius={[0, 4, 4, 0]} />
            <Line type="monotone" dataKey="progresso" name="Progresso (%)" stroke="#10b981" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function EvolutionTonelagem({ relatorios, projetos }) {
  const projetosComHistorico = projetos
    .filter(p => ['aprovado', 'em_fabricacao', 'em_montagem'].includes(p.status))
    .slice(0, 3)
    .map(projeto => {
      const historicoRelatorios = relatorios
        .filter(r => r.projeto_id === projeto.id)
        .sort((a, b) => new Date(a.periodo_fim) - new Date(b.periodo_fim))
        .map(rel => ({
          data: rel.periodo_fim ? format(new Date(rel.periodo_fim), 'dd/MM') : '-',
          fabricada: (rel.tonelagem_fabricada || 0) / 1000,
          montada: (rel.tonelagem_montada || 0) / 1000
        }));

      return {
        projeto: projeto.nome,
        historico: historicoRelatorios
      };
    })
    .filter(p => p.historico.length > 0);

  if (projetosComHistorico.length === 0) {
    return null;
  }

  const mainProject = projetosComHistorico[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          Evolução da Tonelagem - {mainProject.projeto}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mainProject.historico}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="data" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              formatter={(value) => `${value.toFixed(2)} ton`}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="fabricada" 
              name="Fabricada (ton)"
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={{ r: 5 }}
            />
            <Line 
              type="monotone" 
              dataKey="montada" 
              name="Montada (ton)"
              stroke="#10b981" 
              strokeWidth={3}
              dot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}