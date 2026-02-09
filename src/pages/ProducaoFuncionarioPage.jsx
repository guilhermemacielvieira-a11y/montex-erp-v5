// MONTEX ERP Premium - Produção por Funcionário
// Métricas individuais de produção com análise detalhada

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { exportToExcel } from '@/utils/exportUtils';
import {
  User,
  Users,
  TrendingUp,
  TrendingDown,
  Award,
  Clock,
  Package,
  Target,
  Download,
  AlertTriangle,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

// Dados de Funcionários - Será preenchido com dados reais
const mockFuncionarios = [
  { id: 'FUNC002', nome: 'Diego Alves da Silva', cargo: 'Montador I', setor: 'Montagem', turno: 'Diurno', ranking: 8, tendencia: 'alta', foto: null,
    metricas: { pecasMes: 85, metaMes: 100, eficiencia: 88, qualidade: 96, pecasHoje: 5, tempoMedioPeca: 18, horasExtras: 4, retrabalho: 2.1 },
    habilidades: [{ nome: 'Montagem', valor: 88 }, { nome: 'Solda', valor: 45 }, { nome: 'Corte', valor: 60 }, { nome: 'Leitura', valor: 75 }, { nome: 'Segurança', valor: 90 }],
    producaoDiaria: [{ dia: 'Seg', pecas: 18 }, { dia: 'Ter', pecas: 20 }, { dia: 'Qua', pecas: 15 }, { dia: 'Qui', pecas: 17 }, { dia: 'Sex', pecas: 15 }],
    ultimasProducoes: [{ data: '07/02', pecas: 18, eficiencia: 90 }, { data: '06/02', pecas: 20, eficiencia: 95 }, { data: '05/02', pecas: 15, eficiencia: 82 }] },
  { id: 'FUNC004', nome: 'Eder Bruno Silva Ferreira', cargo: 'Montador I', setor: 'Montagem', turno: 'Diurno', ranking: 5, tendencia: 'alta', foto: null,
    metricas: { pecasMes: 92, metaMes: 100, eficiencia: 91, qualidade: 97, pecasHoje: 6, tempoMedioPeca: 16, horasExtras: 6, retrabalho: 1.5 },
    habilidades: [{ nome: 'Montagem', valor: 92 }, { nome: 'Solda', valor: 50 }, { nome: 'Corte', valor: 65 }, { nome: 'Leitura', valor: 80 }, { nome: 'Segurança', valor: 88 }],
    producaoDiaria: [{ dia: 'Seg', pecas: 20 }, { dia: 'Ter', pecas: 22 }, { dia: 'Qua', pecas: 18 }, { dia: 'Qui', pecas: 16 }, { dia: 'Sex', pecas: 16 }],
    ultimasProducoes: [{ data: '07/02', pecas: 20, eficiencia: 93 }, { data: '06/02', pecas: 22, eficiencia: 96 }, { data: '05/02', pecas: 18, eficiencia: 88 }] },
  { id: 'FUNC005', nome: 'Derlei Gobbi', cargo: 'Montador I', setor: 'Montagem', turno: 'Diurno', ranking: 11, tendencia: 'estavel', foto: null,
    metricas: { pecasMes: 78, metaMes: 100, eficiencia: 82, qualidade: 94, pecasHoje: 4, tempoMedioPeca: 20, horasExtras: 2, retrabalho: 3.2 },
    habilidades: [{ nome: 'Montagem', valor: 80 }, { nome: 'Solda', valor: 40 }, { nome: 'Corte', valor: 55 }, { nome: 'Leitura', valor: 70 }, { nome: 'Segurança', valor: 85 }],
    producaoDiaria: [{ dia: 'Seg', pecas: 16 }, { dia: 'Ter', pecas: 17 }, { dia: 'Qua', pecas: 14 }, { dia: 'Qui', pecas: 15 }, { dia: 'Sex', pecas: 16 }],
    ultimasProducoes: [{ data: '07/02', pecas: 16, eficiencia: 82 }, { data: '06/02', pecas: 17, eficiencia: 85 }, { data: '05/02', pecas: 14, eficiencia: 78 }] },
  { id: 'FUNC006', nome: 'Erick Welison Hosni de Paula', cargo: 'Meio Oficial de Montador', setor: 'Montagem', turno: 'Diurno', ranking: 15, tendencia: 'alta', foto: null,
    metricas: { pecasMes: 55, metaMes: 80, eficiencia: 76, qualidade: 92, pecasHoje: 3, tempoMedioPeca: 24, horasExtras: 1, retrabalho: 4.0 },
    habilidades: [{ nome: 'Montagem', valor: 70 }, { nome: 'Solda', valor: 30 }, { nome: 'Corte', valor: 45 }, { nome: 'Leitura', valor: 60 }, { nome: 'Segurança', valor: 82 }],
    producaoDiaria: [{ dia: 'Seg', pecas: 12 }, { dia: 'Ter', pecas: 13 }, { dia: 'Qua', pecas: 10 }, { dia: 'Qui', pecas: 11 }, { dia: 'Sex', pecas: 9 }],
    ultimasProducoes: [{ data: '07/02', pecas: 12, eficiencia: 78 }, { data: '06/02', pecas: 13, eficiencia: 80 }, { data: '05/02', pecas: 10, eficiencia: 72 }] },
  { id: 'FUNC007', nome: 'Flavio da Cruz', cargo: 'Instalador Esquadrias Alumínio', setor: 'Fabricação', turno: 'Diurno', ranking: 7, tendencia: 'estavel', foto: null,
    metricas: { pecasMes: 68, metaMes: 80, eficiencia: 89, qualidade: 98, pecasHoje: 4, tempoMedioPeca: 22, horasExtras: 3, retrabalho: 1.0 },
    habilidades: [{ nome: 'Montagem', valor: 70 }, { nome: 'Solda', valor: 55 }, { nome: 'Corte', valor: 85 }, { nome: 'Leitura', valor: 90 }, { nome: 'Segurança', valor: 92 }],
    producaoDiaria: [{ dia: 'Seg', pecas: 14 }, { dia: 'Ter', pecas: 15 }, { dia: 'Qua', pecas: 13 }, { dia: 'Qui', pecas: 14 }, { dia: 'Sex', pecas: 12 }],
    ultimasProducoes: [{ data: '07/02', pecas: 14, eficiencia: 90 }, { data: '06/02', pecas: 15, eficiencia: 92 }, { data: '05/02', pecas: 13, eficiencia: 86 }] },
  { id: 'FUNC009', nome: 'Gilmar Sousa da Silva', cargo: 'Soldador II', setor: 'Solda', turno: 'Diurno', ranking: 2, tendencia: 'alta', foto: null,
    metricas: { pecasMes: 110, metaMes: 120, eficiencia: 96, qualidade: 98, pecasHoje: 7, tempoMedioPeca: 14, horasExtras: 8, retrabalho: 0.8 },
    habilidades: [{ nome: 'Montagem', valor: 60 }, { nome: 'Solda', valor: 98 }, { nome: 'Corte', valor: 75 }, { nome: 'Leitura', valor: 85 }, { nome: 'Segurança', valor: 95 }],
    producaoDiaria: [{ dia: 'Seg', pecas: 24 }, { dia: 'Ter', pecas: 25 }, { dia: 'Qua', pecas: 22 }, { dia: 'Qui', pecas: 20 }, { dia: 'Sex', pecas: 19 }],
    ultimasProducoes: [{ data: '07/02', pecas: 24, eficiencia: 97 }, { data: '06/02', pecas: 25, eficiencia: 98 }, { data: '05/02', pecas: 22, eficiencia: 94 }] },
  { id: 'FUNC010', nome: 'Gabriel Ferreira Santos', cargo: 'Montador I', setor: 'Montagem', turno: 'Diurno', ranking: 9, tendencia: 'estavel', foto: null,
    metricas: { pecasMes: 82, metaMes: 100, eficiencia: 85, qualidade: 95, pecasHoje: 5, tempoMedioPeca: 19, horasExtras: 3, retrabalho: 2.5 },
    habilidades: [{ nome: 'Montagem', valor: 85 }, { nome: 'Solda', valor: 42 }, { nome: 'Corte', valor: 58 }, { nome: 'Leitura', valor: 72 }, { nome: 'Segurança', valor: 87 }],
    producaoDiaria: [{ dia: 'Seg', pecas: 17 }, { dia: 'Ter', pecas: 18 }, { dia: 'Qua', pecas: 16 }, { dia: 'Qui', pecas: 15 }, { dia: 'Sex', pecas: 16 }],
    ultimasProducoes: [{ data: '07/02', pecas: 17, eficiencia: 86 }, { data: '06/02', pecas: 18, eficiencia: 88 }, { data: '05/02', pecas: 16, eficiencia: 83 }] },
  { id: 'FUNC011', nome: 'Jeferson Bruno de O. Costa', cargo: 'Montador III', setor: 'Montagem', turno: 'Diurno', ranking: 1, tendencia: 'alta', foto: null,
    metricas: { pecasMes: 120, metaMes: 120, eficiencia: 97, qualidade: 99, pecasHoje: 8, tempoMedioPeca: 12, horasExtras: 10, retrabalho: 0.5 },
    habilidades: [{ nome: 'Montagem', valor: 98 }, { nome: 'Solda', valor: 70 }, { nome: 'Corte', valor: 80 }, { nome: 'Leitura', valor: 92 }, { nome: 'Segurança', valor: 96 }],
    producaoDiaria: [{ dia: 'Seg', pecas: 26 }, { dia: 'Ter', pecas: 28 }, { dia: 'Qua', pecas: 24 }, { dia: 'Qui', pecas: 22 }, { dia: 'Sex', pecas: 20 }],
    ultimasProducoes: [{ data: '07/02', pecas: 26, eficiencia: 98 }, { data: '06/02', pecas: 28, eficiencia: 99 }, { data: '05/02', pecas: 24, eficiencia: 95 }] },
  { id: 'FUNC012', nome: 'João Ermelindo Soares', cargo: 'Serralheiro de Alumínio', setor: 'Fabricação', turno: 'Diurno', ranking: 3, tendencia: 'estavel', foto: null,
    metricas: { pecasMes: 95, metaMes: 100, eficiencia: 93, qualidade: 97, pecasHoje: 6, tempoMedioPeca: 15, horasExtras: 5, retrabalho: 1.2 },
    habilidades: [{ nome: 'Montagem', valor: 65 }, { nome: 'Solda', valor: 60 }, { nome: 'Corte', valor: 95 }, { nome: 'Leitura', valor: 88 }, { nome: 'Segurança', valor: 93 }],
    producaoDiaria: [{ dia: 'Seg', pecas: 20 }, { dia: 'Ter', pecas: 22 }, { dia: 'Qua', pecas: 19 }, { dia: 'Qui', pecas: 18 }, { dia: 'Sex', pecas: 16 }],
    ultimasProducoes: [{ data: '07/02', pecas: 20, eficiencia: 94 }, { data: '06/02', pecas: 22, eficiencia: 96 }, { data: '05/02', pecas: 19, eficiencia: 91 }] },
  { id: 'FUNC013', nome: 'João Batista Alves Rodrigues', cargo: 'Ajudante de Montagem', setor: 'Montagem', turno: 'Diurno', ranking: 17, tendencia: 'alta', foto: null,
    metricas: { pecasMes: 40, metaMes: 60, eficiencia: 72, qualidade: 90, pecasHoje: 2, tempoMedioPeca: 28, horasExtras: 0, retrabalho: 5.0 },
    habilidades: [{ nome: 'Montagem', valor: 60 }, { nome: 'Solda', valor: 20 }, { nome: 'Corte', valor: 35 }, { nome: 'Leitura', valor: 50 }, { nome: 'Segurança', valor: 78 }],
    producaoDiaria: [{ dia: 'Seg', pecas: 8 }, { dia: 'Ter', pecas: 9 }, { dia: 'Qua', pecas: 8 }, { dia: 'Qui', pecas: 7 }, { dia: 'Sex', pecas: 8 }],
    ultimasProducoes: [{ data: '07/02', pecas: 8, eficiencia: 73 }, { data: '06/02', pecas: 9, eficiencia: 76 }, { data: '05/02', pecas: 8, eficiencia: 70 }] },
  { id: 'FUNC014', nome: 'José Eduardo Lucas', cargo: 'Meio Oficial de Montador', setor: 'Montagem', turno: 'Diurno', ranking: 14, tendencia: 'estavel', foto: null,
    metricas: { pecasMes: 58, metaMes: 80, eficiencia: 78, qualidade: 93, pecasHoje: 3, tempoMedioPeca: 23, horasExtras: 2, retrabalho: 3.5 },
    habilidades: [{ nome: 'Montagem', valor: 75 }, { nome: 'Solda', valor: 35 }, { nome: 'Corte', valor: 50 }, { nome: 'Leitura', valor: 65 }, { nome: 'Segurança', valor: 85 }],
    producaoDiaria: [{ dia: 'Seg', pecas: 12 }, { dia: 'Ter', pecas: 13 }, { dia: 'Qua', pecas: 11 }, { dia: 'Qui', pecas: 12 }, { dia: 'Sex', pecas: 10 }],
    ultimasProducoes: [{ data: '07/02', pecas: 12, eficiencia: 79 }, { data: '06/02', pecas: 13, eficiencia: 81 }, { data: '05/02', pecas: 11, eficiencia: 75 }] },
  { id: 'FUNC015', nome: 'Juscelio Rodrigues de Souza', cargo: 'Soldador I', setor: 'Solda', turno: 'Diurno', ranking: 6, tendencia: 'estavel', foto: null,
    metricas: { pecasMes: 88, metaMes: 100, eficiencia: 90, qualidade: 96, pecasHoje: 5, tempoMedioPeca: 17, horasExtras: 4, retrabalho: 1.8 },
    habilidades: [{ nome: 'Montagem', valor: 50 }, { nome: 'Solda', valor: 90 }, { nome: 'Corte', valor: 65 }, { nome: 'Leitura', valor: 78 }, { nome: 'Segurança', valor: 90 }],
    producaoDiaria: [{ dia: 'Seg', pecas: 19 }, { dia: 'Ter', pecas: 20 }, { dia: 'Qua', pecas: 17 }, { dia: 'Qui', pecas: 16 }, { dia: 'Sex', pecas: 16 }],
    ultimasProducoes: [{ data: '07/02', pecas: 19, eficiencia: 91 }, { data: '06/02', pecas: 20, eficiencia: 93 }, { data: '05/02', pecas: 17, eficiencia: 87 }] },
  { id: 'FUNC016', nome: 'Juscelio Rodrigues', cargo: 'Montador III', setor: 'Montagem', turno: 'Diurno', ranking: 4, tendencia: 'alta', foto: null,
    metricas: { pecasMes: 115, metaMes: 120, eficiencia: 95, qualidade: 98, pecasHoje: 7, tempoMedioPeca: 13, horasExtras: 8, retrabalho: 0.9 },
    habilidades: [{ nome: 'Montagem', valor: 96 }, { nome: 'Solda', valor: 65 }, { nome: 'Corte', valor: 78 }, { nome: 'Leitura', valor: 88 }, { nome: 'Segurança', valor: 94 }],
    producaoDiaria: [{ dia: 'Seg', pecas: 25 }, { dia: 'Ter', pecas: 26 }, { dia: 'Qua', pecas: 22 }, { dia: 'Qui', pecas: 21 }, { dia: 'Sex', pecas: 21 }],
    ultimasProducoes: [{ data: '07/02', pecas: 25, eficiencia: 96 }, { data: '06/02', pecas: 26, eficiencia: 97 }, { data: '05/02', pecas: 22, eficiencia: 93 }] },
  { id: 'FUNC017', nome: 'Luiz Barbosa Ferrera', cargo: 'Soldador I', setor: 'Solda', turno: 'Diurno', ranking: 10, tendencia: 'estavel', foto: null,
    metricas: { pecasMes: 85, metaMes: 100, eficiencia: 88, qualidade: 95, pecasHoje: 5, tempoMedioPeca: 18, horasExtras: 3, retrabalho: 2.3 },
    habilidades: [{ nome: 'Montagem', valor: 45 }, { nome: 'Solda', valor: 88 }, { nome: 'Corte', valor: 60 }, { nome: 'Leitura', valor: 75 }, { nome: 'Segurança', valor: 88 }],
    producaoDiaria: [{ dia: 'Seg', pecas: 18 }, { dia: 'Ter', pecas: 19 }, { dia: 'Qua', pecas: 16 }, { dia: 'Qui', pecas: 17 }, { dia: 'Sex', pecas: 15 }],
    ultimasProducoes: [{ data: '07/02', pecas: 18, eficiencia: 89 }, { data: '06/02', pecas: 19, eficiencia: 91 }, { data: '05/02', pecas: 16, eficiencia: 84 }] },
  { id: 'FUNC018', nome: 'Ricardo Alves Pereira', cargo: 'Caldeireiro Montador', setor: 'Fabricação', turno: 'Diurno', ranking: 12, tendencia: 'estavel', foto: null,
    metricas: { pecasMes: 72, metaMes: 80, eficiencia: 91, qualidade: 97, pecasHoje: 4, tempoMedioPeca: 20, horasExtras: 5, retrabalho: 1.3 },
    habilidades: [{ nome: 'Montagem', valor: 78 }, { nome: 'Solda', valor: 82 }, { nome: 'Corte', valor: 90 }, { nome: 'Leitura', valor: 85 }, { nome: 'Segurança', valor: 92 }],
    producaoDiaria: [{ dia: 'Seg', pecas: 15 }, { dia: 'Ter', pecas: 16 }, { dia: 'Qua', pecas: 14 }, { dia: 'Qui', pecas: 13 }, { dia: 'Sex', pecas: 14 }],
    ultimasProducoes: [{ data: '07/02', pecas: 15, eficiencia: 92 }, { data: '06/02', pecas: 16, eficiencia: 94 }, { data: '05/02', pecas: 14, eficiencia: 89 }] },
  { id: 'FUNC020', nome: 'Waldercy Miranda', cargo: 'Montador II', setor: 'Montagem', turno: 'Diurno', ranking: 4, tendencia: 'alta', foto: null,
    metricas: { pecasMes: 98, metaMes: 110, eficiencia: 92, qualidade: 96, pecasHoje: 6, tempoMedioPeca: 15, horasExtras: 6, retrabalho: 1.6 },
    habilidades: [{ nome: 'Montagem', valor: 92 }, { nome: 'Solda', valor: 55 }, { nome: 'Corte', valor: 70 }, { nome: 'Leitura', valor: 82 }, { nome: 'Segurança', valor: 90 }],
    producaoDiaria: [{ dia: 'Seg', pecas: 21 }, { dia: 'Ter', pecas: 22 }, { dia: 'Qua', pecas: 19 }, { dia: 'Qui', pecas: 18 }, { dia: 'Sex', pecas: 18 }],
    ultimasProducoes: [{ data: '07/02', pecas: 21, eficiencia: 93 }, { data: '06/02', pecas: 22, eficiencia: 95 }, { data: '05/02', pecas: 19, eficiencia: 90 }] },
  { id: 'FUNC021', nome: 'Wendel Gabriel Alves dos Reis', cargo: 'Meio Oficial de Montador', setor: 'Montagem', turno: 'Diurno', ranking: 16, tendencia: 'alta', foto: null,
    metricas: { pecasMes: 52, metaMes: 80, eficiencia: 75, qualidade: 91, pecasHoje: 3, tempoMedioPeca: 25, horasExtras: 1, retrabalho: 4.2 },
    habilidades: [{ nome: 'Montagem', valor: 68 }, { nome: 'Solda', valor: 28 }, { nome: 'Corte', valor: 42 }, { nome: 'Leitura', valor: 58 }, { nome: 'Segurança', valor: 80 }],
    producaoDiaria: [{ dia: 'Seg', pecas: 11 }, { dia: 'Ter', pecas: 12 }, { dia: 'Qua', pecas: 10 }, { dia: 'Qui', pecas: 10 }, { dia: 'Sex', pecas: 9 }],
    ultimasProducoes: [{ data: '07/02', pecas: 11, eficiencia: 76 }, { data: '06/02', pecas: 12, eficiencia: 78 }, { data: '05/02', pecas: 10, eficiencia: 71 }] },
];

// Dados de Ranking - Será preenchido com dados reais
const rankingGeral = [
  { posicao: 1, nome: 'Jeferson Bruno', pecas: 120, eficiencia: 97 },
  { posicao: 2, nome: 'Gilmar Sousa', pecas: 110, eficiencia: 96 },
  { posicao: 3, nome: 'João Ermelindo', pecas: 95, eficiencia: 93 },
  { posicao: 4, nome: 'Juscelio Rodrigues', pecas: 115, eficiencia: 95 },
  { posicao: 5, nome: 'Waldercy Miranda', pecas: 98, eficiencia: 92 },
];

const getTendenciaIcon = (tendencia) => {
  switch (tendencia) {
    case 'alta': return <TrendingUp className="h-4 w-4 text-emerald-400" />;
    case 'baixa': return <TrendingDown className="h-4 w-4 text-red-400" />;
    default: return <ArrowRight className="h-4 w-4 text-slate-400" />;
  }
};

const getTendenciaColor = (tendencia) => {
  switch (tendencia) {
    case 'alta': return 'text-emerald-400';
    case 'baixa': return 'text-red-400';
    default: return 'text-slate-400';
  }
};

const getEficienciaColor = (eficiencia) => {
  if (eficiencia >= 100) return 'text-emerald-400';
  if (eficiencia >= 85) return 'text-blue-400';
  if (eficiencia >= 70) return 'text-amber-400';
  return 'text-red-400';
};

const getRankingColor = (posicao) => {
  switch (posicao) {
    case 1: return 'from-amber-500 to-yellow-500';
    case 2: return 'from-slate-400 to-slate-500';
    case 3: return 'from-amber-700 to-amber-800';
    default: return 'from-slate-600 to-slate-700';
  }
};

// Componente de Card de Funcionário Detalhado
function FuncionarioDetalhadoCard({ funcionario, onSelect }) {
  const iniciais = funcionario.nome.split(' ').map(n => n[0]).join('').substring(0, 2);
  const progressoMeta = (funcionario.metricas.pecasMes / funcionario.metricas.metaMes) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      onClick={() => onSelect(funcionario)}
      className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5 cursor-pointer hover:border-cyan-500/50 transition-all"
    >
      <div className="flex items-start gap-4">
        {/* Avatar e Ranking */}
        <div className="relative">
          <Avatar className="h-16 w-16 border-2 border-slate-600">
            <AvatarImage src={funcionario.foto} />
            <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white font-bold text-lg">
              {iniciais}
            </AvatarFallback>
          </Avatar>
          <div className={cn(
            "absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br",
            getRankingColor(funcionario.ranking)
          )}>
            #{funcionario.ranking}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">{funcionario.nome}</h3>
            {getTendenciaIcon(funcionario.tendencia)}
          </div>
          <p className="text-sm text-slate-400">{funcionario.cargo}</p>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
              {funcionario.setor}
            </Badge>
            <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
              {funcionario.turno}
            </Badge>
          </div>
        </div>

        {/* Métricas Principais */}
        <div className="text-right">
          <p className="text-2xl font-bold text-white">{funcionario.metricas.pecasMes}</p>
          <p className="text-xs text-slate-500">peças/mês</p>
          <p className={cn("text-sm font-semibold mt-1", getEficienciaColor(funcionario.metricas.eficiencia))}>
            {funcionario.metricas.eficiencia}% efic.
          </p>
        </div>
      </div>

      {/* Progresso da Meta */}
      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-500">Progresso da Meta</span>
          <span className="text-slate-400">{funcionario.metricas.pecasMes}/{funcionario.metricas.metaMes}</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progressoMeta, 100)}%` }}
            transition={{ duration: 0.5 }}
            className={cn(
              "h-full rounded-full",
              progressoMeta >= 100 ? "bg-gradient-to-r from-emerald-500 to-green-500" :
              progressoMeta >= 80 ? "bg-gradient-to-r from-blue-500 to-cyan-500" :
              "bg-gradient-to-r from-amber-500 to-orange-500"
            )}
          />
        </div>
      </div>

      {/* Mini Stats */}
      <div className="grid grid-cols-4 gap-2 mt-4">
        <div className="text-center">
          <p className="text-lg font-bold text-white">{funcionario.metricas.pecasHoje}</p>
          <p className="text-xs text-slate-500">Hoje</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-white">{funcionario.metricas.qualidade}%</p>
          <p className="text-xs text-slate-500">Qualidade</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-white">{funcionario.metricas.tempoMedioPeca}m</p>
          <p className="text-xs text-slate-500">Tempo/Peça</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-amber-400">{funcionario.metricas.horasExtras}h</p>
          <p className="text-xs text-slate-500">Extras</p>
        </div>
      </div>
    </motion.div>
  );
}

// Componente de Detalhes do Funcionário
function DetalhesFuncionario({ funcionario, onClose }) {
  if (!funcionario) return null;

  const radarData = funcionario.habilidades.map(h => ({
    subject: h.nome,
    A: h.nivel,
    fullMark: 100
  }));

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-slate-900/80 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-2 border-cyan-500">
            <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white font-bold text-2xl">
              {funcionario.nome.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold text-white">{funcionario.nome}</h2>
            <p className="text-slate-400">{funcionario.cargo} - {funcionario.setor}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={cn("bg-gradient-to-r text-white", getRankingColor(funcionario.ranking))}>
                <Award className="h-3 w-3 mr-1" />
                #{funcionario.ranking} Ranking
              </Badge>
              <Badge variant="outline" className="border-slate-600 text-slate-300">
                <Clock className="h-3 w-3 mr-1" />
                {funcionario.turno}
              </Badge>
            </div>
          </div>
        </div>
        <Button variant="ghost" onClick={onClose} className="text-slate-400">
          ✕
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4 text-center">
            <Package className="h-6 w-6 text-cyan-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{funcionario.metricas.pecasMes}</p>
            <p className="text-xs text-slate-500">Peças/Mês</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4 text-center">
            <Target className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
            <p className={cn("text-2xl font-bold", getEficienciaColor(funcionario.metricas.eficiencia))}>
              {funcionario.metricas.eficiencia}%
            </p>
            <p className="text-xs text-slate-500">Eficiência</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{funcionario.metricas.qualidade}%</p>
            <p className="text-xs text-slate-500">Qualidade</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-6 w-6 text-amber-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{funcionario.metricas.retrabalho}%</p>
            <p className="text-xs text-slate-500">Retrabalho</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Produção Diária */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Produção Diária</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={funcionario.producaoDiaria}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="dia" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Bar dataKey="pecas" name="Produzido" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="meta" name="Meta" fill="#334155" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Radar de Habilidades */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Habilidades</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={10} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#64748b" fontSize={10} />
                <Radar name="Nível" dataKey="A" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Últimas Produções */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300">Últimas Produções</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {funcionario.ultimasProducoes.map((prod, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono text-cyan-400 border-cyan-500/30">
                    {prod.codigo}
                  </Badge>
                  <span className="text-sm text-white">{prod.descricao}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-slate-400">{prod.quantidade} un.</span>
                  <span className="text-slate-500">{prod.tempo} min</span>
                  <span className="text-slate-500">{prod.data}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function ProducaoFuncionarioPage() {
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState(null);
  const [filtroSetor, setFiltroSetor] = useState('todos');
  const [filtroTurno, setFiltroTurno] = useState('todos');
  const [ordenacao, setOrdenacao] = useState('ranking');

  // Filtrar e ordenar funcionários
  const funcionariosFiltrados = useMemo(() => {
    let lista = [...mockFuncionarios];

    if (filtroSetor !== 'todos') {
      lista = lista.filter(f => f.setor === filtroSetor);
    }
    if (filtroTurno !== 'todos') {
      lista = lista.filter(f => f.turno === filtroTurno);
    }

    switch (ordenacao) {
      case 'ranking':
        lista.sort((a, b) => a.ranking - b.ranking);
        break;
      case 'eficiencia':
        lista.sort((a, b) => b.metricas.eficiencia - a.metricas.eficiencia);
        break;
      case 'producao':
        lista.sort((a, b) => b.metricas.pecasMes - a.metricas.pecasMes);
        break;
    }

    return lista;
  }, [filtroSetor, filtroTurno, ordenacao]);

  // KPIs Gerais
  const kpisGerais = useMemo(() => {
    const total = mockFuncionarios.length;
    const totalPecas = mockFuncionarios.reduce((sum, f) => sum + f.metricas.pecasMes, 0);
    const eficienciaMedia = total > 0 ? mockFuncionarios.reduce((sum, f) => sum + f.metricas.eficiencia, 0) / total : 0;
    const qualidadeMedia = total > 0 ? mockFuncionarios.reduce((sum, f) => sum + f.metricas.qualidade, 0) / total : 0;

    return { total, totalPecas, eficienciaMedia, qualidadeMedia };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            Produção por Funcionário
          </h1>
          <p className="text-slate-400 mt-1">Métricas individuais e análise de desempenho</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={filtroSetor} onValueChange={setFiltroSetor}>
            <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700">
              <SelectValue placeholder="Setor" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="todos">Todos Setores</SelectItem>
              <SelectItem value="Soldagem">Soldagem</SelectItem>
              <SelectItem value="Corte">Corte</SelectItem>
              <SelectItem value="Pintura">Pintura</SelectItem>
              <SelectItem value="Montagem">Montagem</SelectItem>
            </SelectContent>
          </Select>

          <Select value={ordenacao} onValueChange={setOrdenacao}>
            <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="ranking">Ranking</SelectItem>
              <SelectItem value="eficiencia">Eficiência</SelectItem>
              <SelectItem value="producao">Produção</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => {
              const exportData = mockFuncionarios.map(func => ({
                id: func.id,
                nome: func.nome,
                cargo: func.cargo,
                setor: func.setor,
                turno: func.turno,
                status: func.status,
                pecasHoje: func.metricas.pecasHoje,
                pecasSemana: func.metricas.pecasSemana,
                pecasMes: func.metricas.pecasMes,
                metaMes: func.metricas.metaMes,
                eficiencia: `${func.metricas.eficiencia}%`,
                qualidade: `${func.metricas.qualidade}%`,
                pontualidade: `${func.metricas.pontualidade}%`,
                retrabalho: `${func.metricas.retrabalho}%`,
                horasExtras: func.metricas.horasExtras,
                tempoMedioPeca: `${func.metricas.tempoMedioPeca} min`,
                ranking: func.ranking,
                tendencia: func.tendencia
              }));
              const columns = [
                { header: 'ID', key: 'id' },
                { header: 'Nome', key: 'nome' },
                { header: 'Cargo', key: 'cargo' },
                { header: 'Setor', key: 'setor' },
                { header: 'Turno', key: 'turno' },
                { header: 'Status', key: 'status' },
                { header: 'Peças Hoje', key: 'pecasHoje' },
                { header: 'Peças Semana', key: 'pecasSemana' },
                { header: 'Peças Mês', key: 'pecasMes' },
                { header: 'Meta Mês', key: 'metaMes' },
                { header: 'Eficiência', key: 'eficiencia' },
                { header: 'Qualidade', key: 'qualidade' },
                { header: 'Pontualidade', key: 'pontualidade' },
                { header: 'Retrabalho', key: 'retrabalho' },
                { header: 'Horas Extras', key: 'horasExtras' },
                { header: 'Tempo Médio/Peça', key: 'tempoMedioPeca' },
                { header: 'Ranking', key: 'ranking' },
                { header: 'Tendência', key: 'tendencia' }
              ];
              const timestamp = new Date().toISOString().split('T')[0];
              exportToExcel(exportData, columns, `producao-funcionarios-${timestamp}`);
              toast.success('Produção por funcionário exportada para Excel com sucesso!');
            }}
            variant="outline"
            className="border-slate-700 text-slate-300">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Funcionários</p>
                <p className="text-2xl font-bold text-white">{kpisGerais.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Package className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Peças</p>
                <p className="text-2xl font-bold text-white">{kpisGerais.totalPecas.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Target className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Eficiência Média</p>
                <p className="text-2xl font-bold text-white">{kpisGerais.eficienciaMedia.toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Qualidade Média</p>
                <p className="text-2xl font-bold text-white">{kpisGerais.qualidadeMedia.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de Funcionários */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-400" />
            Ranking de Produção ({funcionariosFiltrados.length})
          </h2>
          {funcionariosFiltrados.map(funcionario => (
            <FuncionarioDetalhadoCard
              key={funcionario.id}
              funcionario={funcionario}
              onSelect={setFuncionarioSelecionado}
            />
          ))}
        </div>

        {/* Detalhes do Funcionário Selecionado */}
        <div>
          {funcionarioSelecionado ? (
            <DetalhesFuncionario
              funcionario={funcionarioSelecionado}
              onClose={() => setFuncionarioSelecionado(null)}
            />
          ) : (
            <Card className="bg-slate-900/60 border-slate-700/50 h-full flex items-center justify-center">
              <CardContent className="text-center p-12">
                <User className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-400">Selecione um funcionário</h3>
                <p className="text-sm text-slate-500 mt-1">Clique em um funcionário para ver detalhes</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
