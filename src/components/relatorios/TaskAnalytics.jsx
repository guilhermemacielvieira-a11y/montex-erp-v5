import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  AlertTriangle,
  Clock,
  Target,
  Activity,
  CheckCircle2,
  Loader2,
  BarChart3
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function TaskAnalytics({ tarefas, projetos, usuarios, onGenerateAIReport }) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Produtividade por usuário
  const produtividadePorUsuario = usuarios.map(usuario => {
    const tarefasUsuario = tarefas.filter(t => t.responsavel === usuario.email);
    const concluidas = tarefasUsuario.filter(t => t.status === 'concluida').length;
    const emAndamento = tarefasUsuario.filter(t => t.status === 'em_andamento').length;
    const atrasadas = tarefasUsuario.filter(t => {
      if (!t.data_fim || t.status === 'concluida') return false;
      return new Date(t.data_fim) < new Date();
    }).length;
    const horasTrabalhadas = tarefasUsuario.reduce((acc, t) => acc + (t.horas_trabalhadas || 0), 0);
    const horasEstimadas = tarefasUsuario.reduce((acc, t) => acc + (t.horas_estimadas || 0), 0);
    const taxaConclusao = tarefasUsuario.length > 0 ? (concluidas / tarefasUsuario.length) * 100 : 0;

    return {
      nome: usuario.full_name || usuario.email,
      email: usuario.email,
      total: tarefasUsuario.length,
      concluidas,
      emAndamento,
      atrasadas,
      horasTrabalhadas,
      horasEstimadas,
      taxaConclusao,
      eficiencia: horasEstimadas > 0 ? ((horasEstimadas / horasTrabalhadas) * 100) : 0
    };
  }).filter(u => u.total > 0);

  // Gargalos por projeto
  const gargalosPorProjeto = projetos.map(projeto => {
    const tarefasProjeto = tarefas.filter(t => t.projeto_id === projeto.id);
    const bloqueadas = tarefasProjeto.filter(t => t.status === 'bloqueada').length;
    const atrasadas = tarefasProjeto.filter(t => {
      if (!t.data_fim || t.status === 'concluida') return false;
      return new Date(t.data_fim) < new Date();
    }).length;
    const semResponsavel = tarefasProjeto.filter(t => !t.responsavel).length;
    const progressoMedio = tarefasProjeto.length > 0
      ? tarefasProjeto.reduce((acc, t) => acc + (t.percentual_conclusao || 0), 0) / tarefasProjeto.length
      : 0;

    return {
      nome: projeto.nome,
      id: projeto.id,
      total: tarefasProjeto.length,
      bloqueadas,
      atrasadas,
      semResponsavel,
      progressoMedio,
      indicadorRisco: bloqueadas + atrasadas + (semResponsavel * 0.5)
    };
  }).filter(p => p.total > 0).sort((a, b) => b.indicadorRisco - a.indicadorRisco);

  // Tarefas em risco
  const tarefasEmRisco = tarefas.filter(t => {
    if (t.status === 'concluida') return false;
    const atrasada = t.data_fim && new Date(t.data_fim) < new Date();
    const bloqueada = t.status === 'bloqueada';
    const semProgresso = t.percentual_conclusao < 10 && t.data_inicio && 
      differenceInDays(new Date(), new Date(t.data_inicio)) > 7;
    return atrasada || bloqueada || semProgresso;
  });

  // Previsão de conclusão por projeto
  const previsoesProjeto = projetos.map(projeto => {
    const tarefasProjeto = tarefas.filter(t => t.projeto_id === projeto.id);
    const concluidas = tarefasProjeto.filter(t => t.status === 'concluida').length;
    const total = tarefasProjeto.length;
    const percentualConcluido = total > 0 ? (concluidas / total) * 100 : 0;
    
    const tarefasComPrazo = tarefasProjeto.filter(t => t.data_fim && t.status !== 'concluida');
    const prazoMaisDistante = tarefasComPrazo.length > 0
      ? tarefasComPrazo.reduce((max, t) => {
          const data = new Date(t.data_fim);
          return data > max ? data : max;
        }, new Date())
      : null;

    const diasRestantes = prazoMaisDistante 
      ? differenceInDays(prazoMaisDistante, new Date())
      : null;

    return {
      nome: projeto.nome,
      id: projeto.id,
      percentualConcluido,
      tarefasTotal: total,
      tarefasConcluidas: concluidas,
      tarefasRestantes: total - concluidas,
      prazoEstimado: prazoMaisDistante,
      diasRestantes,
      status: percentualConcluido >= 80 ? 'no_prazo' : percentualConcluido >= 50 ? 'atencao' : 'critico'
    };
  }).filter(p => p.tarefasTotal > 0);

  // Distribuição de status
  const distribuicaoStatus = [
    { name: 'Pendente', value: tarefas.filter(t => t.status === 'pendente').length },
    { name: 'Em Andamento', value: tarefas.filter(t => t.status === 'em_andamento').length },
    { name: 'Concluída', value: tarefas.filter(t => t.status === 'concluida').length },
    { name: 'Bloqueada', value: tarefas.filter(t => t.status === 'bloqueada').length }
  ];

  const handleGenerateAIReport = async () => {
    setIsGenerating(true);
    await onGenerateAIReport({
      produtividade: produtividadePorUsuario,
      gargalos: gargalosPorProjeto,
      tarefasRisco: tarefasEmRisco,
      previsoes: previsoesProjeto
    });
    setIsGenerating(false);
  };

  return (
    <div className="space-y-6">
      {/* Header com ação de gerar relatório IA */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Análise de Tarefas</h2>
          <p className="text-sm text-slate-500">Produtividade, gargalos e previsões</p>
        </div>
        <Button
          onClick={handleGenerateAIReport}
          disabled={isGenerating}
          className="bg-gradient-to-r from-purple-500 to-purple-600"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Gerando Análise IA...
            </>
          ) : (
            <>
              <BarChart3 className="h-4 w-4 mr-2" />
              Gerar Relatório com IA
            </>
          )}
        </Button>
      </div>

      {/* Tarefas em Risco */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Tarefas em Risco ({tarefasEmRisco.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tarefasEmRisco.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              Nenhuma tarefa em risco identificada
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tarefasEmRisco.slice(0, 10).map(tarefa => {
                const atrasada = tarefa.data_fim && new Date(tarefa.data_fim) < new Date();
                const diasAtraso = atrasada 
                  ? Math.abs(differenceInDays(new Date(), new Date(tarefa.data_fim)))
                  : 0;

                return (
                  <div key={tarefa.id} className="p-3 bg-white rounded-lg border border-red-200">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{tarefa.titulo}</h4>
                        <p className="text-xs text-slate-500 mt-1">{tarefa.projeto_nome}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {tarefa.status === 'bloqueada' && (
                          <Badge className="bg-red-100 text-red-700">Bloqueada</Badge>
                        )}
                        {atrasada && (
                          <Badge className="bg-red-100 text-red-700">
                            {diasAtraso}d atrasada
                          </Badge>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produtividade por Usuário */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Produtividade por Usuário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {produtividadePorUsuario.slice(0, 5).map((usuario, idx) => (
                <div key={usuario.email} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-700">
                          {usuario.nome.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{usuario.nome}</p>
                        <p className="text-xs text-slate-500">
                          {usuario.total} tarefas • {usuario.horasTrabalhadas}h trabalhadas
                        </p>
                      </div>
                    </div>
                    <Badge className={
                      usuario.taxaConclusao >= 70 ? 'bg-emerald-100 text-emerald-700' :
                      usuario.taxaConclusao >= 40 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }>
                      {usuario.taxaConclusao.toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" />
                      {usuario.concluidas} concluídas
                    </div>
                    <div className="flex items-center gap-1 text-blue-600">
                      <Activity className="h-3 w-3" />
                      {usuario.emAndamento} ativas
                    </div>
                    {usuario.atrasadas > 0 && (
                      <div className="flex items-center gap-1 text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        {usuario.atrasadas} atrasadas
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Distribuição de Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={distribuicaoStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distribuicaoStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gargalos por Projeto */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-orange-600" />
            Análise de Gargalos por Projeto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {gargalosPorProjeto.slice(0, 5).map(projeto => (
              <div key={projeto.id} className="p-4 bg-slate-50 rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold">{projeto.nome}</h4>
                    <p className="text-xs text-slate-500 mt-1">{projeto.total} tarefas</p>
                  </div>
                  <Badge className={
                    projeto.indicadorRisco > 5 ? 'bg-red-100 text-red-700' :
                    projeto.indicadorRisco > 2 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-emerald-100 text-emerald-700'
                  }>
                    Risco: {projeto.indicadorRisco > 5 ? 'Alto' : projeto.indicadorRisco > 2 ? 'Médio' : 'Baixo'}
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs">Progresso</p>
                    <p className="font-semibold">{projeto.progressoMedio.toFixed(0)}%</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Bloqueadas</p>
                    <p className="font-semibold text-red-600">{projeto.bloqueadas}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Atrasadas</p>
                    <p className="font-semibold text-orange-600">{projeto.atrasadas}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Sem Responsável</p>
                    <p className="font-semibold text-yellow-600">{projeto.semResponsavel}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Previsão de Conclusão */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-600" />
            Previsão de Conclusão de Projetos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {previsoesProjeto.map(projeto => (
              <div key={projeto.id} className="p-4 bg-slate-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold">{projeto.nome}</h4>
                    <p className="text-xs text-slate-500">
                      {projeto.tarefasConcluidas}/{projeto.tarefasTotal} tarefas concluídas
                    </p>
                  </div>
                  {projeto.prazoEstimado && (
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {format(projeto.prazoEstimado, 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                      <p className="text-xs text-slate-500">
                        {projeto.diasRestantes > 0 
                          ? `${projeto.diasRestantes} dias restantes`
                          : 'Prazo vencido'
                        }
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Progresso</span>
                    <span className="font-semibold">{projeto.percentualConcluido.toFixed(0)}%</span>
                  </div>
                  <Progress value={projeto.percentualConcluido} className="h-2" />
                </div>
                <div className="mt-2">
                  <Badge className={
                    projeto.status === 'no_prazo' ? 'bg-emerald-100 text-emerald-700' :
                    projeto.status === 'atencao' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }>
                    {projeto.status === 'no_prazo' ? 'No Prazo' :
                     projeto.status === 'atencao' ? 'Atenção' : 'Crítico'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}