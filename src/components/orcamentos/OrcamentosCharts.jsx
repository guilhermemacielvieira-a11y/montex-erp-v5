import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, DollarSign, Target, BarChart3 } from 'lucide-react';

const COLORS = {
  rascunho: '#94a3b8',
  enviado: '#3b82f6',
  em_negociacao: '#f59e0b',
  aprovado: '#10b981',
  recusado: '#ef4444',
  expirado: '#64748b'
};

const STATUS_LABELS = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  em_negociacao: 'Em Negociação',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  expirado: 'Expirado'
};

export function EvolucaoPorStatus({ orcamentos }) {
  // Agrupar por status
  const statusData = Object.entries(
    orcamentos.reduce((acc, orc) => {
      const status = orc.status || 'rascunho';
      if (!acc[status]) acc[status] = { count: 0, valor: 0 };
      acc[status].count++;
      acc[status].valor += orc.valor_venda || 0;
      return acc;
    }, {})
  ).map(([status, data]) => ({
    status: STATUS_LABELS[status] || status,
    quantidade: data.count,
    valor: data.valor,
    fill: COLORS[status] || '#64748b'
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          Distribuição de Orçamentos por Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={statusData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="status" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'valor') return `R$ ${value.toLocaleString('pt-BR')}`;
                return value;
              }}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <Legend />
            <Bar dataKey="quantidade" name="Quantidade" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ValorPorStatus({ orcamentos }) {
  const statusData = Object.entries(
    orcamentos.reduce((acc, orc) => {
      const status = orc.status || 'rascunho';
      if (!acc[status]) acc[status] = 0;
      acc[status] += orc.valor_venda || 0;
      return acc;
    }, {})
  ).map(([status, valor]) => ({
    name: STATUS_LABELS[status] || status,
    value: valor,
    fill: COLORS[status] || '#64748b'
  }));

  const total = statusData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-emerald-600" />
          Valor Total por Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              dataKey="value"
            >
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="text-center mt-4">
          <p className="text-sm text-slate-500">Valor Total</p>
          <p className="text-2xl font-bold text-slate-900">
            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function DistribuicaoCustos({ orcamentos }) {
  // Agregar todos os itens de todos os orçamentos
  const custosData = orcamentos
    .filter(orc => orc.itens && orc.itens.length > 0)
    .flatMap(orc => orc.itens)
    .reduce((acc, item) => {
      const desc = item.descricao || 'Sem descrição';
      if (!acc[desc]) {
        acc[desc] = { valor: 0, quantidade: 0 };
      }
      acc[desc].valor += item.valor_total || 0;
      acc[desc].quantidade += item.quantidade || 0;
      return acc;
    }, {});

  const chartData = Object.entries(custosData)
    .map(([descricao, data]) => ({
      descricao: descricao.length > 30 ? descricao.substring(0, 27) + '...' : descricao,
      valor: data.valor,
      quantidade: data.quantidade
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10); // Top 10 itens

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-orange-600" />
            Distribuição de Custos por Item
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-slate-500 py-8">
            Nenhum orçamento com itens detalhados ainda
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5 text-orange-600" />
          Top 10 Itens por Custo Total
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 120 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis dataKey="descricao" type="category" tick={{ fontSize: 11 }} width={110} />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'valor') return `R$ ${value.toLocaleString('pt-BR')}`;
                return value;
              }}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <Legend />
            <Bar dataKey="valor" name="Valor Total" fill="#f97316" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function EvolucaoTemporal({ orcamentos }) {
  // Agrupar por mês
  const orcamentosPorMes = orcamentos.reduce((acc, orc) => {
    const date = new Date(orc.created_date);
    const mes = `${date.getMonth() + 1}/${date.getFullYear()}`;
    
    if (!acc[mes]) {
      acc[mes] = {
        total: 0,
        aprovados: 0,
        valorTotal: 0,
        valorAprovado: 0
      };
    }
    
    acc[mes].total++;
    acc[mes].valorTotal += orc.valor_venda || 0;
    
    if (orc.status === 'aprovado') {
      acc[mes].aprovados++;
      acc[mes].valorAprovado += orc.valor_venda || 0;
    }
    
    return acc;
  }, {});

  const chartData = Object.entries(orcamentosPorMes)
    .map(([mes, data]) => ({
      mes,
      total: data.total,
      aprovados: data.aprovados,
      valorTotal: data.valorTotal,
      valorAprovado: data.valorAprovado,
      taxaAprovacao: data.total > 0 ? ((data.aprovados / data.total) * 100).toFixed(1) : 0
    }))
    .sort((a, b) => {
      const [mesA, anoA] = a.mes.split('/').map(Number);
      const [mesB, anoB] = b.mes.split('/').map(Number);
      return anoA - anoB || mesA - mesB;
    })
    .slice(-6); // Últimos 6 meses

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-purple-600" />
          Evolução Temporal de Orçamentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              formatter={(value, name) => {
                if (name.includes('valor')) return `R$ ${value.toLocaleString('pt-BR')}`;
                if (name === 'taxaAprovacao') return `${value}%`;
                return value;
              }}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="total" 
              name="Total Orçamentos"
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="aprovados" 
              name="Aprovados"
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}