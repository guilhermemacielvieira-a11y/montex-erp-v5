import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Wrench, Loader2, BookOpen, Calculator, Ruler, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import ChatMessage from '@/components/chat/ChatMessage';
import ChatInput from '@/components/chat/ChatInput';
import { motion, AnimatePresence } from 'framer-motion';

const baseConhecimentoTecnico = `
# BASE DE CONHECIMENTO TÉCNICO - ESTRUTURAS METÁLICAS

## NORMAS TÉCNICAS

### NBR 8800:2008 - Projeto de estruturas de aço e de estruturas mistas de aço e concreto de edifícios
- Dimensionamento de elementos estruturais
- Estados limites últimos e de serviço
- Combinações de ações
- Ligações soldadas e parafusadas

### NBR 14762:2010 - Dimensionamento de estruturas de aço constituídas por perfis formados a frio
- Perfis leves formados a frio
- Requisitos de dimensionamento
- Verificações de estabilidade

### NBR 6123:1988 - Forças devidas ao vento em edificações
- Cálculo de cargas de vento
- Coeficientes de pressão
- Rugosidade do terreno

## TABELA DE PERFIS LAMINADOS

### Perfis I e H (ASTM A572 Gr50)
| Perfil | Altura (mm) | Largura (mm) | Peso (kg/m) |
|--------|-------------|--------------|-------------|
| W150x13 | 148 | 100 | 13,0 |
| W200x15 | 200 | 100 | 15,0 |
| W250x25 | 257 | 146 | 25,3 |
| W310x38 | 310 | 165 | 37,7 |
| W360x51 | 353 | 171 | 51,0 |
| W410x60 | 407 | 178 | 60,0 |
| W530x66 | 525 | 165 | 66,0 |
| W610x101| 603 | 228 | 101,0 |

### Perfis U (cantoneiras)
| Perfil | Altura (mm) | Largura (mm) | Peso (kg/m) |
|--------|-------------|--------------|-------------|
| U 100x50 | 100 | 50 | 10,6 |
| U 150x75 | 150 | 75 | 18,0 |
| U 200x75 | 200 | 75 | 22,8 |
| U 250x80 | 250 | 80 | 28,5 |

## ESPECIFICAÇÕES DE SOLDAS

### Eletrodos
- E7018: Eletrodo básico, baixo hidrogênio, alta resistência
- E6013: Eletrodo rutílico, uso geral
- E308L: Para aços inoxidáveis

### Processos de Soldagem
- SMAW (Eletrodo Revestido)
- MIG/MAG (GMAW)
- Arco Submerso (SAW) - para grandes volumes

### Dimensionamento de Soldas de Filete
- Garganta efetiva: a = 0,707 x tamanho do filete
- Resistência: 0,60 x Fy (metal de base)

## TRATAMENTOS DE SUPERFÍCIE

### Preparação
- Sa 2½ - Jateamento ao metal quase branco (padrão para estruturas)
- Sa 3 - Jateamento ao metal branco (para ambientes agressivos)

### Pintura
1. **Primer epóxi rico em zinco**: 50-75μm
2. **Intermediário epóxi**: 100-150μm
3. **Acabamento poliuretano**: 50-60μm
- Espessura total mínima: 200μm

### Galvanização a quente
- Espessura mínima: 85μm (conforme ASTM A123)
- Proteção em ambientes agressivos: até 25 anos

## LIGAÇÕES PARAFUSADAS

### Parafusos Estruturais
| Tipo | Tensão Ruptura (MPa) | Uso |
|------|---------------------|-----|
| ASTM A307 | 415 | Ligações secundárias |
| ASTM A325 | 830 | Ligações estruturais |
| ASTM A490 | 1035 | Alta resistência |

### Furos
- Padrão: d + 2mm (d = diâmetro do parafuso)
- Alargado: d + 4mm
- Mínimo de parafusos: 2 por ligação

## PARÂMETROS DE PROJETO

### Flechas Máximas Admissíveis (NBR 8800)
- Vigas de piso: L/350
- Vigas de cobertura: L/250
- Vigas de mezanino: L/400
- Terças: L/180

### Esbeltez Máxima
- Pilares: 200
- Barras tracionadas: 300
- Barras comprimidas: 200

## CARGAS TÍPICAS

### Sobrecarga em Coberturas
- Cobertura inacessível: 0,25 kN/m²
- Cobertura com acesso: 1,5 kN/m²

### Sobrecarga em Pisos
- Escritórios: 2,0 kN/m²
- Áreas comerciais: 4,0 kN/m²
- Industriais leves: 5,0 kN/m²
- Industriais pesados: 7,5-10,0 kN/m²

### Peso Próprio
- Telha metálica simples: 5-8 kg/m²
- Telha sanduíche PIR: 12-18 kg/m²
- Steel deck + concreto: 200-300 kg/m²
`;

const topicosRapidos = [
  { icon: BookOpen, label: 'NBR 8800', query: 'Quais são os principais requisitos da NBR 8800?' },
  { icon: Ruler, label: 'Perfis', query: 'Mostre a tabela de perfis laminados I e H' },
  { icon: Calculator, label: 'Soldas', query: 'Como dimensionar soldas de filete?' },
  { icon: Shield, label: 'Pintura', query: 'Qual o esquema de pintura recomendado para estruturas?' }
];

export default function AssistenteTecnico() {
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

    const prompt = `Você é um engenheiro estrutural especialista em estruturas metálicas.

${baseConhecimentoTecnico}

## Histórico da Conversa:
${historyForPrompt}

## Pergunta do Usuário:
${content}

## Instruções:
- Responda com precisão técnica
- Cite normas e referências quando aplicável
- Use tabelas e formatação markdown para facilitar a leitura
- Se não tiver certeza, indique que o usuário deve consultar a norma específica
- Seja didático mas técnico
- Forneça exemplos práticos quando possível`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
    });

    setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    setIsLoading(false);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Assistente Técnico</h1>
          <p className="text-slate-500 mt-1">Consulte normas, especificações e cálculos</p>
        </div>
        <Button variant="outline" onClick={() => setMessages([])}>
          Nova Consulta
        </Button>
      </div>

      {/* Quick Topics */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {topicosRapidos.map((topico, idx) => (
            <Button
              key={idx}
              variant="outline"
              className="gap-2"
              onClick={() => sendMessage(topico.query)}
            >
              <topico.icon className="h-4 w-4" />
              {topico.label}
            </Button>
          ))}
        </div>
      )}

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col border-slate-200 overflow-hidden">
        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center mb-6 shadow-lg shadow-rose-500/30">
                <Wrench className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Assistente Técnico
              </h3>
              <p className="text-slate-500 max-w-md mb-6">
                Tire dúvidas sobre normas técnicas, especificações de materiais, 
                dimensionamento de elementos estruturais e muito mais.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                <Card className="border-slate-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => sendMessage('Quais são os limites de flecha para vigas de piso?')}>
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-slate-900 mb-1">Limites de Flecha</h4>
                    <p className="text-sm text-slate-500">Valores admissíveis conforme NBR 8800</p>
                  </CardContent>
                </Card>
                
                <Card className="border-slate-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => sendMessage('Qual a diferença entre parafusos A325 e A490?')}>
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-slate-900 mb-1">Parafusos Estruturais</h4>
                    <p className="text-sm text-slate-500">ASTM A325 vs A490</p>
                  </CardContent>
                </Card>
                
                <Card className="border-slate-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => sendMessage('Como calcular a área da garganta de solda de filete?')}>
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-slate-900 mb-1">Cálculo de Soldas</h4>
                    <p className="text-sm text-slate-500">Dimensionamento de soldas de filete</p>
                  </CardContent>
                </Card>
                
                <Card className="border-slate-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => sendMessage('Qual o esquema de pintura para ambiente industrial?')}>
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-slate-900 mb-1">Proteção Anticorrosiva</h4>
                    <p className="text-sm text-slate-500">Sistemas de pintura industrial</p>
                  </CardContent>
                </Card>
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
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center">
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
            placeholder="Faça sua pergunta técnica..."
          />
        </div>
      </Card>
    </div>
  );
}