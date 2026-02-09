import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AlertsPanel({ projetos, relatorios, orcamentos }) {
  const alertas = [];

  projetos.forEach(projeto => {
    if (!['aprovado', 'em_fabricacao', 'em_montagem'].includes(projeto.status)) return;

    const ultimoRelatorio = relatorios
      .filter(r => r.projeto_id === projeto.id)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

    if (!ultimoRelatorio || !projeto.data_inicio) return;

    // Verificar atraso
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
    
    const desvio = percentualProgresso - percentualTempo;

    if (desvio < -10) {
      alertas.push({
        tipo: 'atraso',
        prioridade: desvio < -20 ? 'alta' : 'media',
        projeto: projeto.nome,
        mensagem: `Projeto atrasado em ${Math.abs(desvio).toFixed(0)}%`,
        data: ultimoRelatorio.created_date,
        icon: AlertTriangle,
        color: desvio < -20 ? 'text-red-600' : 'text-orange-600',
        bgColor: desvio < -20 ? 'bg-red-50' : 'bg-orange-50'
      });
    }

    // Verificar prazo próximo
    if (projeto.data_fim_prevista) {
      const diasRestantes = Math.floor(
        (new Date(projeto.data_fim_prevista) - new Date()) / (1000 * 60 * 60 * 24)
      );
      if (diasRestantes > 0 && diasRestantes <= 15 && percentualProgresso < 80) {
        alertas.push({
          tipo: 'prazo',
          prioridade: diasRestantes <= 7 ? 'alta' : 'media',
          projeto: projeto.nome,
          mensagem: `Prazo em ${diasRestantes} dias - ${percentualProgresso.toFixed(0)}% concluído`,
          data: projeto.data_fim_prevista,
          icon: Clock,
          color: diasRestantes <= 7 ? 'text-red-600' : 'text-yellow-600',
          bgColor: diasRestantes <= 7 ? 'bg-red-50' : 'bg-yellow-50'
        });
      }
    }

    // Verificar eficiência baixa
    if (ultimoRelatorio.percentual_fabricacao < 20 && diasDecorridos > 30) {
      alertas.push({
        tipo: 'eficiencia',
        prioridade: 'media',
        projeto: projeto.nome,
        mensagem: `Baixa eficiência de fabricação (${ultimoRelatorio.percentual_fabricacao}%)`,
        data: ultimoRelatorio.created_date,
        icon: TrendingDown,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50'
      });
    }
  });

  // Ordenar por prioridade
  alertas.sort((a, b) => {
    const prioridadeMap = { alta: 0, media: 1, baixa: 2 };
    return prioridadeMap[a.prioridade] - prioridadeMap[b.prioridade];
  });

  return (
    <Card className="border-slate-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Alertas Ativos</CardTitle>
          {alertas.length > 0 && (
            <Badge className="bg-red-100 text-red-700">
              {alertas.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {alertas.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-sm text-slate-500">Nenhum alerta ativo</p>
            <p className="text-xs text-slate-400 mt-1">Todos os projetos no prazo</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {alertas.map((alerta, idx) => {
              const Icon = alerta.icon;
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${alerta.bgColor} border-slate-200`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-white`}>
                      <Icon className={`h-4 w-4 ${alerta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm text-slate-900 truncate">
                          {alerta.projeto}
                        </p>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            alerta.prioridade === 'alta' 
                              ? 'border-red-300 text-red-700' 
                              : 'border-orange-300 text-orange-700'
                          }`}
                        >
                          {alerta.prioridade === 'alta' ? 'Alta' : 'Média'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600">{alerta.mensagem}</p>
                      {alerta.data && (
                        <p className="text-xs text-slate-400 mt-1">
                          {format(new Date(alerta.data), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}