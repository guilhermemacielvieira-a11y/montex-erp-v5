import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  CheckCircle,
  XCircle,
  FileText,
  Building2,
  Calendar,
  DollarSign,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

export default function AprovacaoOrcamento() {
  const [orcamento, setOrcamento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [observacoes, setObservacoes] = useState('');
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const carregarOrcamento = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const orcamentos = await base44.entities.Orcamento.filter({ link_aprovacao: token });
        if (orcamentos.length > 0) {
          setOrcamento(orcamentos[0]);
        }
      } catch (error) {
        console.error('Erro ao carregar orçamento:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarOrcamento();
  }, [location]);

  const processarResposta = async (aprovado) => {
    setProcessando(true);

    try {
      await base44.entities.Orcamento.update(orcamento.id, {
        status: aprovado ? 'aprovado' : 'recusado',
        data_aprovacao: new Date().toISOString(),
        observacoes_aprovacao: observacoes || null
      });

      setResultado(aprovado ? 'aprovado' : 'recusado');
    } catch (error) {
      console.error('Erro ao processar resposta:', error);
      alert('Erro ao processar sua resposta. Tente novamente.');
    } finally {
      setProcessando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!orcamento) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="max-w-md border-slate-200">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Orçamento não encontrado</h2>
            <p className="text-slate-500">
              O link de aprovação é inválido ou expirou.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (resultado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="max-w-lg border-slate-200">
            <CardContent className="p-8 text-center">
              {resultado === 'aprovado' ? (
                <>
                  <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-10 w-10 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Orçamento Aprovado!</h2>
                  <p className="text-slate-600 mb-6">
                    Obrigado por aprovar nosso orçamento. Nossa equipe entrará em contato em breve para dar início ao projeto.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                    <XCircle className="h-10 w-10 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Orçamento Recusado</h2>
                  <p className="text-slate-600 mb-6">
                    Agradecemos sua consideração. Caso tenha dúvidas ou queira negociar, nossa equipe está à disposição.
                  </p>
                </>
              )}
              <div className="text-sm text-slate-500">
                Orçamento #{orcamento.numero}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (orcamento.status === 'aprovado' || orcamento.status === 'recusado') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="max-w-md border-slate-200">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Orçamento já {orcamento.status === 'aprovado' ? 'aprovado' : 'recusado'}
            </h2>
            <p className="text-slate-500">
              Este orçamento já foi processado em {format(new Date(orcamento.data_aprovacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
            <span className="text-white font-bold text-2xl">M</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Grupo Montex</h1>
          <p className="text-slate-500">Estruturas Metálicas</p>
        </div>

        {/* Orçamento Info */}
        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-500" />
              Proposta Comercial #{orcamento.numero}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <p className="text-sm text-slate-500 mb-1">Cliente</p>
                <p className="font-semibold text-slate-900">{orcamento.cliente_nome}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Projeto</p>
                <p className="font-semibold text-slate-900">{orcamento.projeto_nome}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Validade</p>
                <p className="font-semibold text-slate-900">
                  {orcamento.validade ? format(new Date(orcamento.validade), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Building2 className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="text-sm text-slate-500">Peso Estimado</p>
                    <p className="text-xl font-bold text-slate-900">
                      {(orcamento.peso_estimado / 1000).toFixed(1)} ton
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Calendar className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="text-sm text-slate-500">Prazo Total</p>
                    <p className="text-xl font-bold text-slate-900">
                      {(orcamento.prazo_fabricacao || 0) + (orcamento.prazo_montagem || 0)} dias
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="text-sm text-slate-500">Valor Total</p>
                    <p className="text-xl font-bold text-orange-600">
                      R$ {orcamento.valor_venda?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Proposta */}
            <div className="border-t border-slate-100 pt-6">
              <h3 className="font-semibold text-slate-900 mb-3">Detalhes da Proposta</h3>
              <div className="bg-slate-50 rounded-xl p-6 prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-slate-700 text-sm">
                  {orcamento.conteudo_proposta}
                </pre>
              </div>
            </div>

            {/* Itens */}
            {orcamento.itens?.length > 0 && (
              <div className="border-t border-slate-100 pt-6 mt-6">
                <h3 className="font-semibold text-slate-900 mb-3">Composição de Custos</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Valor Unit.</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orcamento.itens.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.descricao}</TableCell>
                        <TableCell>{item.quantidade?.toLocaleString('pt-BR')}</TableCell>
                        <TableCell>{item.unidade}</TableCell>
                        <TableCell>R$ {item.valor_unitario?.toFixed(2)}</TableCell>
                        <TableCell className="font-medium">
                          R$ {item.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-slate-50 font-bold">
                      <TableCell colSpan={4}>VALOR TOTAL</TableCell>
                      <TableCell className="text-orange-600 text-lg">
                        R$ {orcamento.valor_venda?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ações */}
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Sua Resposta</h3>
            
            <div className="space-y-4">
              <div>
                <Label>Observações (opcional)</Label>
                <Textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Comentários, dúvidas ou sugestões..."
                  rows={4}
                  className="mt-2"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => processarResposta(false)}
                  disabled={processando}
                  variant="outline"
                  className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
                >
                  {processando ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Recusar Orçamento
                </Button>
                <Button
                  onClick={() => processarResposta(true)}
                  disabled={processando}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                >
                  {processando ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Aprovar Orçamento
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-slate-500">
          <p>Grupo Montex - Estruturas Metálicas</p>
          <p>São Joaquim de Bicas, MG</p>
        </div>
      </div>
    </div>
  );
}