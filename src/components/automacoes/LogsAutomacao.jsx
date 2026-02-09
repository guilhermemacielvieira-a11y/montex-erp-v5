import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LogsAutomacao() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['logs_automacao'],
    queryFn: () => base44.entities.LogAutomacao.list('-data_execucao', 50)
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Clock className="h-8 w-8 mx-auto text-slate-300 mb-2 animate-spin" />
          <p className="text-slate-500">Carregando logs...</p>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = {
    sucesso: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', badge: 'bg-green-500' },
    erro_parcial: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', badge: 'bg-orange-500' },
    erro: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', badge: 'bg-red-500' }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Logs de Execução</h2>
        <Badge variant="outline">{logs.length} registros</Badge>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Clock className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">Nenhum log de execução ainda</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const config = statusConfig[log.status] || statusConfig.erro;
            const Icon = config.icon;

            return (
              <Card key={log.id} className={cn("border-l-4", config.bg)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={cn("p-2 rounded-lg", config.bg)}>
                      <Icon className={cn("h-5 w-5", config.color)} />
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-slate-900">{log.automacao_nome}</h3>
                          <p className="text-sm text-slate-500">
                            {log.documento_referencia || log.documento_id}
                          </p>
                        </div>
                        <Badge className={config.badge}>
                          {log.status === 'sucesso' ? 'Sucesso' : 
                           log.status === 'erro_parcial' ? 'Parcial' : 'Erro'}
                        </Badge>
                      </div>

                      {log.acoes_executadas && log.acoes_executadas.length > 0 && (
                        <div className="bg-white rounded-lg p-3 space-y-1">
                          {log.acoes_executadas.map((acao, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              {acao.sucesso ? (
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-600" />
                              )}
                              <span className="text-slate-600 capitalize">
                                {acao.tipo.replace(/_/g, ' ')}
                              </span>
                              {acao.mensagem && (
                                <span className="text-slate-400 text-xs">- {acao.mensagem}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {log.erro && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                          <p className="text-sm text-red-700">{log.erro}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>{new Date(log.data_execucao).toLocaleString('pt-BR')}</span>
                        <span>•</span>
                        <span className="capitalize">{log.tipo_gatilho.replace(/_/g, ' ')}</span>
                        <span>•</span>
                        <span>{log.entidade_alvo}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}