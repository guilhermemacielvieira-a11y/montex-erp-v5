import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, MessageSquare, Users } from 'lucide-react';
import GanttChart from '@/components/projetos/GanttChart';
import ChatProjeto from '@/components/projetos/ChatProjeto';
import GerenciadorRecursos from '@/components/projetos/GerenciadorRecursos';
import { motion } from 'framer-motion';

export default function ColaboracaoProjetosPage() {
  const [projetoSelecionado, setProjetoSelecionado] = useState('');

  const { data: projetos = [] } = useQuery({
    queryKey: ['projetos'],
    queryFn: () => base44.entities.Projeto.list('-created_date', 100)
  });

  const { data: tarefas = [] } = useQuery({
    queryKey: ['tarefas'],
    queryFn: () => base44.entities.Tarefa.list('-created_date', 500)
  });

  const tarefasFiltradas = projetoSelecionado
    ? tarefas.filter(t => t.projeto_id === projetoSelecionado)
    : tarefas;

  const projeto = projetos.find(p => p.id === projetoSelecionado);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 space-y-8 p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              Colaboração de Projetos
            </h1>
            <p className="text-slate-400 text-lg">Cronograma, chat e gestão de recursos</p>
          </div>

          <Select value={projetoSelecionado} onValueChange={setProjetoSelecionado}>
            <SelectTrigger className="w-64 bg-slate-800/50 border-slate-700 text-white backdrop-blur-sm">
              <SelectValue placeholder="Todos os Projetos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todos os Projetos</SelectItem>
              {projetos.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="gantt" className="space-y-6">
            <TabsList className="bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
              <TabsTrigger value="gantt" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
                <Calendar className="h-4 w-4 mr-2" />
                Cronograma Gantt
              </TabsTrigger>
              <TabsTrigger value="chat" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400" disabled={!projetoSelecionado}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat do Projeto
              </TabsTrigger>
              <TabsTrigger value="recursos" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                <Users className="h-4 w-4 mr-2" />
                Gestão de Recursos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gantt">
              <GanttChart tarefas={tarefasFiltradas} projetos={projetos} />
            </TabsContent>

            <TabsContent value="chat">
              {projetoSelecionado && projeto ? (
                <ChatProjeto projetoId={projetoSelecionado} projetoNome={projeto.nome} />
              ) : (
                <div className="text-center text-slate-400 py-12">
                  Selecione um projeto para acessar o chat
                </div>
              )}
            </TabsContent>

            <TabsContent value="recursos">
              <GerenciadorRecursos projetos={projetos} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}