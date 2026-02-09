import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const STATUS_CONFIG = {
  prospeccao: { label: 'Prospecção', color: 'bg-slate-500' },
  orcamento: { label: 'Orçamento', color: 'bg-blue-500' },
  negociacao: { label: 'Negociação', color: 'bg-yellow-500' },
  aprovado: { label: 'Aprovado', color: 'bg-green-500' },
  em_fabricacao: { label: 'Fabricação', color: 'bg-orange-500' },
  em_montagem: { label: 'Montagem', color: 'bg-purple-500' },
  concluido: { label: 'Concluído', color: 'bg-emerald-500' },
  cancelado: { label: 'Cancelado', color: 'bg-red-500' }
};

export default function ModernProjectCard({ projeto, relatorios, orcamentos }) {
  const status = STATUS_CONFIG[projeto.status] || STATUS_CONFIG.prospeccao;
  
  const ultimoRelatorio = relatorios
    ?.filter(r => r.projeto_id === projeto.id)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

  const fabricacao = ultimoRelatorio?.percentual_fabricacao || 0;
  const montagem = ultimoRelatorio?.percentual_montagem || 0;
  const progressoGeral = (fabricacao + montagem) / 2;

  const orcamento = orcamentos?.find(o => o.projeto_id === projeto.id);
  
  const hoje = new Date();
  const dataFim = projeto.data_fim_prevista ? new Date(projeto.data_fim_prevista) : null;
  const atrasado = dataFim && dataFim < hoje && projeto.status !== 'concluido';

  return (
    <Link to={createPageUrl('Projetos')}>
      <Card className={cn(
        "group relative overflow-hidden bg-slate-800/50 border-slate-700/50 hover:border-orange-500/50 transition-all duration-300 cursor-pointer",
        atrasado && "border-red-500/50"
      )}>
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <CardContent className="p-5 relative z-10">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-orange-400 transition-colors line-clamp-1">
                    {projeto.nome}
                  </h3>
                  {projeto.cliente_nome && (
                    <p className="text-xs text-slate-400">{projeto.cliente_nome}</p>
                  )}
                </div>
              </div>
              <Badge className={cn(status.color, "text-white border-0 shadow-lg")}>
                {status.label}
              </Badge>
            </div>

            {/* Progress Bars */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Fabricação</span>
                  <span className="font-semibold text-white">{fabricacao.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                    style={{ width: `${fabricacao}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Montagem</span>
                  <span className="font-semibold text-white">{montagem.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                    style={{ width: `${montagem}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
              <div className="flex items-center gap-4 text-xs text-slate-400">
                {projeto.area && (
                  <span>{projeto.area.toLocaleString('pt-BR')} m²</span>
                )}
                {projeto.data_fim_prevista && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(projeto.data_fim_prevista).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
              </div>
              
              {atrasado && (
                <div className="flex items-center gap-1 text-red-400">
                  <AlertCircle className="h-3 w-3" />
                  <span className="text-xs font-medium">Atrasado</span>
                </div>
              )}
              
              {!atrasado && progressoGeral > 0 && (
                <div className="flex items-center gap-1 text-emerald-400">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-xs font-semibold">{progressoGeral.toFixed(0)}%</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>

        {/* Bottom Accent */}
        <div className={cn(
          "absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r transition-opacity",
          status.color,
          "opacity-50 group-hover:opacity-100"
        )} />
      </Card>
    </Link>
  );
}