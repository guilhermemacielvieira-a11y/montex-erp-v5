import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Download, Clock, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function HistoricoRelatorios() {
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');

  const { data: historico = [], isLoading } = useQuery({
    queryKey: ['historico-relatorios'],
    queryFn: () => base44.entities.HistoricoRelatorio.list('-data_geracao', 100),
  });

  const getStatusColor = (status) => {
    if (status === 'sucesso') return 'bg-emerald-100 text-emerald-700';
    if (status === 'erro') return 'bg-red-100 text-red-700';
    if (status === 'processando') return 'bg-blue-100 text-blue-700';
  };

  const getStatusIcon = (status) => {
    if (status === 'sucesso') return <CheckCircle2 className="h-4 w-4" />;
    if (status === 'erro') return <AlertCircle className="h-4 w-4" />;
    if (status === 'processando') return <Clock className="h-4 w-4 animate-spin" />;
  };

  const handleDownload = async (relatorio) => {
    if (!relatorio.arquivo_url) {
      toast.error('Arquivo não disponível');
      return;
    }

    try {
      window.open(relatorio.arquivo_url, '_blank');
    } catch (error) {
      toast.error('Erro ao baixar arquivo');
    }
  };

  const historicoFiltrado = historico.filter(rel => {
    if (filtroStatus !== 'todos' && rel.status !== filtroStatus) return false;
    if (filtroTipo !== 'todos' && rel.tipo_geracao !== filtroTipo) return false;
    return true;
  });

  const stats = {
    total: historico.length,
    sucesso: historico.filter(r => r.status === 'sucesso').length,
    erro: historico.filter(r => r.status === 'erro').length,
    processando: historico.filter(r => r.status === 'processando').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Histórico de Relatórios</h2>
        <p className="text-sm text-slate-600 mt-1">Visualize todos os relatórios gerados</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="p-4">
            <p className="text-xs text-slate-600 font-medium">Total Gerado</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4">
            <p className="text-xs text-emerald-600 font-medium">Sucesso</p>
            <p className="text-2xl font-bold text-emerald-900 mt-1">{stats.sucesso}</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-xs text-red-600 font-medium">Erros</p>
            <p className="text-2xl font-bold text-red-900 mt-1">{stats.erro}</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-xs text-blue-600 font-medium">Processando</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">{stats.processando}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 max-w-xs">
          <Label className="text-sm mb-2 block">Status</Label>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="sucesso">Sucesso</SelectItem>
              <SelectItem value="erro">Erro</SelectItem>
              <SelectItem value="processando">Processando</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 max-w-xs">
          <Label className="text-sm mb-2 block">Tipo de Geração</Label>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="agendada">Agendada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Relatórios ({historicoFiltrado.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-600">Carregando histórico...</p>
            </div>
          ) : historicoFiltrado.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">Nenhum relatório encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Modelo</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Formato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Tamanho</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historicoFiltrado.map(rel => (
                    <TableRow key={rel.id}>
                      <TableCell className="font-medium text-sm">{rel.modelo_relatorio_nome}</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {new Date(rel.data_geracao).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-slate-100 text-slate-700">
                          {rel.tipo_geracao === 'manual' ? 'Manual' : 'Agendada'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="uppercase text-xs">{rel.formato}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(rel.status)} variant="outline">
                          <span className="flex items-center gap-1">
                            {getStatusIcon(rel.status)}
                            {rel.status === 'sucesso' ? 'Sucesso' : rel.status === 'erro' ? 'Erro' : 'Processando'}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-slate-600">
                        {rel.tamanho_arquivo ? (rel.tamanho_arquivo / 1024 / 1024).toFixed(2) + ' MB' : '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownload(rel)}
                          disabled={!rel.arquivo_url || rel.status !== 'sucesso'}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalhes de Erros */}
      {historico.filter(r => r.status === 'erro').length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              Últimos Erros
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {historico
                .filter(r => r.status === 'erro')
                .slice(0, 5)
                .map(rel => (
                  <div key={rel.id} className="text-sm text-red-700">
                    <p className="font-medium">{rel.modelo_relatorio_nome}</p>
                    <p className="text-xs text-red-600">{rel.mensagem_erro}</p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}