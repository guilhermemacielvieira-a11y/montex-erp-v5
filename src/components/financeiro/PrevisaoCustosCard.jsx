import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function PrevisaoCustosCard({ projetoId }) {
  const { data: itemsProducao = [] } = useQuery({
    queryKey: ['items-producao', projetoId],
    queryFn: () => {
      if (!projetoId || projetoId === 'todos') return [];
      return base44.entities.ItemProducao.filter({ projeto_id: projetoId }, '-created_date', 500);
    },
    enabled: projetoId && projetoId !== 'todos'
  });

  const { data: lancamentos = [] } = useQuery({
    queryKey: ['lancamentos-producao', projetoId],
    queryFn: () => {
      if (!projetoId || projetoId === 'todos') return [];
      return base44.entities.LancamentoProducao.filter({ projeto_id: projetoId }, '-data_lancamento', 500);
    },
    enabled: projetoId && projetoId !== 'todos'
  });

  const { data: projeto, isLoading } = useQuery({
    queryKey: ['projeto-detail', projetoId],
    queryFn: () => {
      if (!projetoId || projetoId === 'todos') return null;
      return base44.entities.Projeto.read(projetoId);
    },
    enabled: projetoId && projetoId !== 'todos'
  });

  const previsao = useMemo(() => {
    if (!projeto || projetoId === 'todos') return null;

    // Calcular custos de fabricação
    const itensFab = itemsProducao.filter(i => i.etapa === 'fabricacao');
    const lancsFab = lancamentos.filter(l => l.etapa === 'fabricacao');
    const pesoTotalFab = itensFab.reduce((acc, item) => 
      acc + ((item.peso_unitario || 0) * (item.quantidade || 0)), 0
    );
    const pesoFabricado = lancsFab.reduce((acc, lanc) => 
      acc + (lanc.peso_realizado || 0), 0
    );
    const custoRealizadoFab = pesoFabricado * (projeto.custo_por_kg_fabricacao || 0);
    const pesoPendenteFab = pesoTotalFab - pesoFabricado;
    const custoEstimadoFab = pesoPendenteFab * (projeto.custo_por_kg_fabricacao || 0);

    // Calcular custos de montagem
    const itensMont = itemsProducao.filter(i => i.etapa === 'montagem');
    const lancsMont = lancamentos.filter(l => l.etapa === 'montagem');
    const pesoTotalMont = itensMont.reduce((acc, item) => 
      acc + ((item.peso_unitario || 0) * (item.quantidade || 0)), 0
    );
    const pesoMontado = lancsMont.reduce((acc, lanc) => 
      acc + (lanc.peso_realizado || 0), 0
    );
    const custoRealizadoMont = pesoMontado * (projeto.custo_por_kg_montagem || 0);
    const pesoPendenteMont = pesoTotalMont - pesoMontado;
    const custoEstimadoMont = pesoPendenteMont * (projeto.custo_por_kg_montagem || 0);

    const custosRealizados = custoRealizadoFab + custoRealizadoMont;
    const custosEstimados = custoEstimadoFab + custoEstimadoMont;
    const custoTotalFuturo = custosEstimados;

    return {
      custosRealizados,
      custosEstimados,
      custoTotalFuturo,
      valorContrato: projeto.valor_contrato || 0,
      lucroEstimado: (projeto.valor_contrato || 0) - custosRealizados - custoTotalFuturo
    };
  }, [projeto, itemsProducao, lancamentos]);

  if (!projeto || isLoading) return (
    <div className="h-48 bg-slate-100 rounded-lg animate-pulse" />
  );

  const formatarNumero = (valor) => {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  };

  const percentualGasto = previsao.valorContrato > 0 
    ? ((previsao.custosRealizados + previsao.custosEstimados) / previsao.valorContrato) * 100 
    : 0;

  const statusLucro = previsao.lucroEstimado >= 0;

  return (
    <Card className={`border-2 ${statusLucro ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-100' : 'border-red-300 bg-gradient-to-br from-red-50 to-red-100'}`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium uppercase tracking-wide ${statusLucro ? 'text-emerald-700' : 'text-red-700'}`}>
                Previsão Financeira do Projeto
              </p>
              <p className={`text-lg font-bold mt-1 ${statusLucro ? 'text-emerald-900' : 'text-red-900'}`}>
                {projeto.nome}
              </p>
            </div>
            {statusLucro ? (
              <TrendingUp className="h-8 w-8 text-emerald-500" />
            ) : (
              <AlertCircle className="h-8 w-8 text-red-500" />
            )}
          </div>

          {/* Grid de Valores */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-current border-opacity-20">
            {/* Despesas Lançadas */}
            <div>
              <p className={`text-xs font-medium uppercase ${statusLucro ? 'text-emerald-600' : 'text-red-600'}`}>
                Despesas Lançadas
              </p>
              <p className={`text-base font-bold mt-1 ${statusLucro ? 'text-emerald-900' : 'text-red-900'}`}>
                R$ {formatarNumero(previsao.custosRealizados)}
              </p>
              <p className={`text-xs mt-1 ${statusLucro ? 'text-emerald-700' : 'text-red-700'}`}>
                {((previsao.custosRealizados / previsao.valorContrato) * 100).toFixed(1)}%
              </p>
            </div>

            {/* Receitas Previstas */}
            <div>
              <p className={`text-xs font-medium uppercase ${statusLucro ? 'text-emerald-600' : 'text-red-600'}`}>
                Receitas Futuras Estimadas
              </p>
              <p className={`text-base font-bold mt-1 ${statusLucro ? 'text-emerald-900' : 'text-red-900'}`}>
                R$ {formatarNumero(previsao.custoTotalFuturo)}
              </p>
              <p className={`text-xs mt-1 ${statusLucro ? 'text-emerald-700' : 'text-red-700'}`}>
                {((previsao.custoTotalFuturo / previsao.valorContrato) * 100).toFixed(1)}%
              </p>
            </div>

            {/* Valor do Contrato */}
            <div>
              <p className={`text-xs font-medium uppercase ${statusLucro ? 'text-emerald-600' : 'text-red-600'}`}>
                Valor do Contrato
              </p>
              <p className={`text-base font-bold mt-1 ${statusLucro ? 'text-emerald-900' : 'text-red-900'}`}>
                R$ {formatarNumero(previsao.valorContrato)}
              </p>
              <p className={`text-xs mt-1 ${statusLucro ? 'text-emerald-700' : 'text-red-700'}`}>
                100%
              </p>
            </div>

            {/* Total de Custos */}
            <div>
              <p className={`text-xs font-medium uppercase ${statusLucro ? 'text-emerald-600' : 'text-red-600'}`}>
                Total de Custos
              </p>
              <p className={`text-base font-bold mt-1 ${statusLucro ? 'text-emerald-900' : 'text-red-900'}`}>
                R$ {formatarNumero(previsao.custosRealizados + previsao.custoTotalFuturo)}
              </p>
              <p className={`text-xs mt-1 ${statusLucro ? 'text-emerald-700' : 'text-red-700'}`}>
                {percentualGasto.toFixed(1)}%
              </p>
            </div>

            {/* Lucro Estimado */}
            <div>
              <p className={`text-xs font-medium uppercase ${statusLucro ? 'text-emerald-600' : 'text-red-600'}`}>
                Lucro Estimado
              </p>
              <p className={`text-base font-bold mt-1 ${statusLucro ? 'text-emerald-900' : 'text-red-900'}`}>
                R$ {formatarNumero(Math.abs(previsao.lucroEstimado))}
              </p>
              <p className={`text-xs mt-1 ${statusLucro ? 'text-emerald-700' : 'text-red-700'}`}>
                {statusLucro ? '+' : '-'}{((Math.abs(previsao.lucroEstimado) / previsao.valorContrato) * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="pt-2 border-t border-current border-opacity-20">
            <div className="flex items-center justify-between mb-2">
              <p className={`text-xs font-medium ${statusLucro ? 'text-emerald-600' : 'text-red-600'}`}>
                Consumo do Orçamento
              </p>
              <p className={`text-xs font-bold ${statusLucro ? 'text-emerald-900' : 'text-red-900'}`}>
                {percentualGasto.toFixed(1)}%
              </p>
            </div>
            <div className={`w-full h-2 rounded-full ${statusLucro ? 'bg-emerald-200' : 'bg-red-200'}`}>
              <div
                className={`h-full rounded-full transition-all ${statusLucro ? 'bg-emerald-600' : 'bg-red-600'}`}
                style={{ width: `${Math.min(percentualGasto, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}