import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Paperclip, User } from 'lucide-react';
import { toast } from 'sonner';

export default function ChatProjeto({ projetoId, projetoNome }) {
  const [mensagem, setMensagem] = useState('');
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: mensagens = [] } = useQuery({
    queryKey: ['mensagens', projetoId],
    queryFn: () => base44.entities.MensagemProjeto.filter({ projeto_id: projetoId }, '-created_date', 100),
    refetchInterval: 5000
  });

  const enviarMensagemMutation = useMutation({
    mutationFn: (data) => base44.entities.MensagemProjeto.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['mensagens', projetoId]);
      setMensagem('');
      scrollToBottom();
    }
  });

  const handleEnviar = (e) => {
    e.preventDefault();
    if (!mensagem.trim() || !user) return;

    enviarMensagemMutation.mutate({
      projeto_id: projetoId,
      projeto_nome: projetoNome,
      usuario_email: user.email,
      usuario_nome: user.full_name,
      mensagem: mensagem.trim(),
      tipo: 'texto',
      data_mensagem: new Date().toISOString()
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      await enviarMensagemMutation.mutateAsync({
        projeto_id: projetoId,
        projeto_nome: projetoNome,
        usuario_email: user.email,
        usuario_nome: user.full_name,
        mensagem: `Arquivo anexado: ${file.name}`,
        tipo: 'arquivo',
        arquivo_url: file_url,
        arquivo_nome: file.name,
        data_mensagem: new Date().toISOString()
      });
      
      toast.success('Arquivo enviado');
    } catch (error) {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  // Realtime subscription
  useEffect(() => {
    const unsubscribe = base44.entities.MensagemProjeto.subscribe((event) => {
      if (event.data.projeto_id === projetoId) {
        queryClient.invalidateQueries(['mensagens', projetoId]);
      }
    });
    return unsubscribe;
  }, [projetoId, queryClient]);

  return (
    <Card className="border-slate-700/50 bg-slate-900/40 backdrop-blur-sm h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl text-white flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-green-500" />
          Chat do Projeto
          <Badge className="ml-auto bg-green-500/20 text-green-400">
            {mensagens.length} mensagens
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {mensagens.reverse().map((msg) => {
            const isOwn = msg.usuario_email === user?.email;
            
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-white" />
                </div>
                
                <div className={`flex-1 max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-400 font-medium">
                      {msg.usuario_nome || msg.usuario_email}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(msg.created_date).toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  
                  <div className={`px-4 py-2 rounded-2xl ${
                    isOwn 
                      ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white' 
                      : 'bg-slate-800 text-slate-100'
                  }`}>
                    {msg.tipo === 'arquivo' ? (
                      <a
                        href={msg.arquivo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 hover:underline"
                      >
                        <Paperclip className="h-4 w-4" />
                        {msg.arquivo_nome}
                      </a>
                    ) : (
                      <p className="text-sm">{msg.mensagem}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleEnviar} className="flex gap-2">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => document.getElementById('file-upload')?.click()}
            disabled={uploading}
            className="bg-slate-800 border-slate-700 hover:bg-slate-700"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <Input
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            disabled={uploading}
          />
          
          <Button
            type="submit"
            size="icon"
            disabled={!mensagem.trim() || uploading}
            className="bg-gradient-to-r from-orange-500 to-orange-600"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}