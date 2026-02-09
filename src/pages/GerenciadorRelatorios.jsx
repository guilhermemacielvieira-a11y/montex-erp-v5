import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import CriadorModeloRelatorio from '@/components/financeiro/CriadorModeloRelatorio';
import AgendadorRelatorios from '@/components/financeiro/AgendadorRelatorios';
import HistoricoRelatorios from '@/components/financeiro/HistoricoRelatorios';
import ListaModelosRelatorio from '@/components/financeiro/ListaModelosRelatorio.jsx';
import { FileText, Clock, History, Settings } from 'lucide-react';

export default function GerenciadorRelatorios() {
  const [abaAtiva, setAbaAtiva] = useState('modelos');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gerenciador de Relatórios</h1>
          <p className="text-slate-600 mt-2">Crie, agende e gerencie relatórios financeiros personalizados</p>
        </div>
      </div>

      <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="modelos" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Modelos</span>
          </TabsTrigger>
          <TabsTrigger value="agendamentos" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Agendamentos</span>
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>
          <TabsTrigger value="info" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Sobre</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="modelos" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Modelos de Relatório</h2>
                  <p className="text-slate-600 mt-1">Crie templates personalizados com filtros, colunas e formatação customizados</p>
                </div>
                <CriadorModeloRelatorio />
              </div>
              <ListaModelosRelatorio />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agendamentos" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <AgendadorRelatorios />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <HistoricoRelatorios />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold mb-2">Como usar o Gerenciador de Relatórios</h3>
                <div className="space-y-4 text-sm text-slate-700">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">1. Criar Modelos</h4>
                    <p>Acesse a aba "Modelos" e clique em "Novo Modelo". Configure:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-xs">
                      <li>Nome e tipo do relatório</li>
                      <li>Colunas a exibir</li>
                      <li>Ordenação padrão</li>
                      <li>Formatos de saída (PDF, Excel, CSV)</li>
                      <li>Incluir gráficos e resumo executivo</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">2. Agendar Relatórios</h4>
                    <p>Acesse a aba "Agendamentos" e clique em "Novo Agendamento" para:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-xs">
                      <li>Selecionar um modelo criado</li>
                      <li>Definir frequência (diária, semanal, mensal)</li>
                      <li>Definir horário da geração</li>
                      <li>Adicionar destinatários de email</li>
                      <li>Personalizar mensagem do email</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">3. Visualizar Histórico</h4>
                    <p>Acompanhe todos os relatórios gerados, status, datas e baixe os arquivos quando necessário.</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-bold mb-3">Recursos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Automação Completa</h4>
                    <p className="text-sm text-blue-800">Gere relatórios automaticamente em intervalos definidos</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-emerald-900 mb-2">Múltiplos Formatos</h4>
                    <p className="text-sm text-emerald-800">Exporte em PDF, Excel ou CSV conforme necessário</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-purple-900 mb-2">Distribuição por Email</h4>
                    <p className="text-sm text-purple-800">Envie automaticamente para múltiplos destinatários</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-orange-900 mb-2">Customização Total</h4>
                    <p className="text-sm text-orange-800">Controle filtros, colunas e layout de cada relatório</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}