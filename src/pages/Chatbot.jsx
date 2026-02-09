import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MessageSquare, Trash2, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import ChatMessage from '@/components/chat/ChatMessage';
import ChatInput from '@/components/chat/ChatInput';
import { motion, AnimatePresence } from 'framer-motion';

const baseConhecimento = `
# BASE DE CONHECIMENTO - GRUPO MONTEX

## Sobre a Empresa
- Nome: Grupo Montex
- Especialidade: Estruturas metálicas para construção civil e industrial
- Localização: São Joaquim de Bicas, Minas Gerais
- Capacidade de produção: ~50 toneladas/mês
- Área de atuação: Minas Gerais e estados vizinhos

## Serviços Oferecidos
1. **Fabricação de Estruturas Metálicas**
   - Galpões industriais
   - Mezaninos
   - Coberturas
   - Estruturas prediais
   - Passarelas

2. **Montagem**
   - Equipe própria especializada
   - Atendimento em todo território mineiro

3. **Projetos**
   - Projetos estruturais
   - Detalhamento para fabricação
   - Consultoria técnica

## Principais Clientes e Projetos
- **My Mall Sete Lagoas**: 450 toneladas, R$ 9,50 milhões (maior projeto)
- **Super Luna Belo Vale**: 90 toneladas, R$ 2,70 milhões (margem 40%)
- **Super Luna Brumadinho**: 100 toneladas, R$ 2,30 milhões (margem 22%)
- Supermercados BH
- Diversas indústrias da região

## Capacidade e Prazos
- Produção média: 50 ton/mês
- Prazo de fabricação: ~1 mês para cada 50 ton
- Prazo de montagem: 15-30 dias conforme complexidade

## Custos Base (2024)
**Custos por kg:**
- Aço: R$ 8,00/kg
- Montagem: R$ 2,50/kg
- Transporte: R$ 0,80/kg (até 500km)
- Pintura industrial: R$ 1,50/kg

**Custos por m²:**
- Telha metálica simples: R$ 90/m²
- Telha PIR 30mm: R$ 160-180/m²
- Steel Deck: R$ 200/m²

**Percentuais adicionais:**
- Calhas e rufos: 3% do valor
- Chumbadores: 2% do valor
- Engenharia: 3% do valor

**Preços médios:**
- Custo total médio: R$ 18,00/kg
- Preço de venda (margem 30%): R$ 25,71/kg
- Margem mínima recomendada: 25%

## Diferenciais
- Qualidade certificada (NBR 8800)
- Equipe técnica especializada
- Atendimento personalizado
- Prazo de entrega confiável
- Suporte pós-venda
- Capacidade para grandes projetos

## Contato
- Sede em São Joaquim de Bicas - MG
- Atendimento comercial de segunda a sexta
`;

const sugestoes = [
  "Qual a capacidade de produção da Montex?",
  "Quais são os principais clientes?",
  "Quanto custa em média o kg da estrutura?",
  "Qual o prazo para fabricar 100 toneladas?",
  "Quais tipos de estruturas vocês fabricam?"
];

export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (content) => {
    const userMessage = { role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const historyForPrompt = messages.slice(-10).map(m => 
      `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`
    ).join('\n');

    const prompt = `Você é o assistente virtual do Grupo Montex, especializado em estruturas metálicas.

${baseConhecimento}

## Histórico da Conversa:
${historyForPrompt}

## Nova Pergunta do Usuário:
${content}

## Instruções:
1. Responda sempre em português brasileiro
2. Seja objetivo e profissional, mas amigável
3. Quando calcular valores, mostre a composição dos custos
4. Compare com projetos históricos quando relevante (My Mall, Super Luna, etc.)
5. Alerte sobre margens abaixo de 25% se aplicável
6. Forneça estimativas de prazo baseadas na capacidade de 50 ton/mês
7. Use formatação markdown (negrito, listas, tabelas)
8. Se não souber algo específico, seja honesto e sugira contato com a equipe comercial
9. Seja conciso mas completo nas respostas`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
    });

    setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    setIsLoading(false);
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Chatbot Montex</h1>
          <p className="text-slate-500 mt-1">Tire dúvidas sobre a empresa e serviços</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearChat} disabled={messages.length === 0}>
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar
          </Button>
        </div>
      </div>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col border-slate-200 overflow-hidden">
        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30">
                <MessageSquare className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Olá! Sou o assistente da Montex
              </h3>
              <p className="text-slate-500 max-w-md mb-8">
                Posso ajudar com informações sobre a empresa, serviços, prazos, preços e muito mais.
              </p>
              
              <div className="w-full max-w-lg">
                <p className="text-sm text-slate-400 mb-3">Sugestões de perguntas:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {sugestoes.map((sugestao, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(sugestao)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-full text-sm text-slate-700 transition-colors"
                    >
                      {sugestao}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <AnimatePresence>
                {messages.map((message, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChatMessage
                      message={message.content}
                      isUser={message.role === 'user'}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <ChatInput
            onSend={sendMessage}
            isLoading={isLoading}
            placeholder="Pergunte sobre a Montex..."
          />
        </div>
      </Card>
    </div>
  );
}