import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ProjectCard({ projeto, relatorios, orcamentos }) {
  const statusConfig = {
    prospeccao: { label: 'Prospecção', color: 'bg-slate-100 text-slate-700' },
    orcamento: { label: 'Orçamento', color: 'bg-blue-100 text-blue-700' },
    negociacao: { label: 'Negociação', color: 'bg-yellow-100 text-yellow-700' },
    aprovado: { label: 'Aprovado', color: 'bg-emerald-100 text-emerald-700' },
    em_fabricacao: { label: 'Fabricação', color: 'bg-orange-100 text-orange-700' },
    em_montagem: { label: 'Montagem', color: 'bg-purple-100 text-purple-700' },
    concluido: { label: 'Concluído', color: 'bg-green-100 text-green-700' },
    cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-700' }
  };

  const ultimoRelatorio = relatorios
    .filter(r => r.projeto_id === projeto.id)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

  const orcamentoProjeto = orcamentos.find(o => 
    o.projeto_nome === projeto.nome && o.status === 'aprovado'
  );

  const calcularAtraso = () => {
    if (!projeto.data_inicio || !ultimoRelatorio) return null;
    const diasDecorridos = Math.floor(
      (new Date() - new Date(projeto.data_inicio)) / (1000 * 60 * 60 * 24)
    );
    const prazoTotal = projeto.data_fim_prevista
      ? Math.floor(
          (new Date(projeto.data_fim_prevista) - new Date(projeto.data_inicio)) / 
          (1000 * 60 * 60 * 24)
        )
      : 120;
    const percentualTempo = (diasDecorridos / prazoTotal) * 100;
    const percentualProgresso = (
      (ultimoRelatorio.percentual_fabricacao || 0) + 
      (ultimoRelatorio.percentual_montagem || 0)
    ) / 2;
    
    return percentualProgresso - percentualTempo;
  };

  const atraso = calcularAtraso();
  const temAlerta = atraso !== null && atraso < -10;

  return (
    <Card className={`hover:shadow-lg transition-all duration-200 ${
      temAlerta ? 'border-2 border-red-200' : 'border-slate-100'
    }`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-orange-500" />
              <h3 className="font-semibold text-slate-900">{projeto.nome}</h3>
            </div>
            <p className="text-sm text-slate-500">{projeto.cliente_nome}</p>
          </div>
          <Badge className={statusConfig[projeto.status]?.color || statusConfig.prospeccao.color}>
            {statusConfig[projeto.status]?.label || projeto.status}
          </Badge>
        </div>

        {/* Progress Bars */}
        {ultimoRelatorio && (
          <div className="space-y-3 mb-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-600">Fabricação</span>
                <span className="text-xs font-bold text-slate-900">
                  {ultimoRelatorio.percentual_fabricacao || 0}%
                </span>
              </div>
              <Progress 
                value={ultimoRelatorio.percentual_fabricacao || 0} 
                className="h-2"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-600">Montagem</span>
                <span className="text-xs font-bold text-slate-900">
                  {ultimoRelatorio.percentual_montagem || 0}%
                </span>
              </div>
              <Progress 
                value={ultimoRelatorio.percentual_montagem || 0} 
                className="h-2"
              />
            </div>
          </div>
        )}

        {/* Key Info */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-slate-600" />
            </div>
            <div>
              <p className="text-slate-500">Área</p>
              <p className="font-semibold text-slate-900">{projeto.area?.toFixed(0) || '-'} m²</p>
            </div>
          </div>
          
          {projeto.data_fim_prevista && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <p className="text-slate-500">Previsão</p>
                <p className="font-semibold text-slate-900">
                  {format(new Date(projeto.data_fim_prevista), 'dd/MM/yy', { locale: ptBR })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Alerts */}
        {temAlerta && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-red-900">Atenção: Atraso Detectado</p>
              <p className="text-red-700">Progresso {Math.abs(atraso).toFixed(0)}% abaixo do planejado</p>
            </div>
          </div>
        )}

        {/* Budget Status */}
        {orcamentoProjeto && projeto.valor_contrato && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Orçamento</span>
              <div className="flex items-center gap-1">
                {orcamentoProjeto.custo_total && projeto.valor_contrato && (
                  <>
                    {orcamentoProjeto.custo_total <= projeto.valor_contrato ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <TrendingUp className="h-3 w-3 text-orange-600" />
                    )}
                  </>
                )}
                <span className="font-semibold text-slate-900">
                  R$ {projeto.valor_contrato?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}