// Helpers compartilhados da tela Automações (motor real — Fase 3)
import { GATILHOS, TIPOS_ACAO } from '@/api/colaboracaoApi';

export const SEVERIDADES = [
  { valor: 'info', rotulo: 'Informativa', cor: 'text-blue-300 border-blue-500/40 bg-blue-500/10' },
  { valor: 'medio', rotulo: 'Média', cor: 'text-yellow-300 border-yellow-500/40 bg-yellow-500/10' },
  { valor: 'alto', rotulo: 'Alta', cor: 'text-orange-300 border-orange-500/40 bg-orange-500/10' },
  { valor: 'critico', rotulo: 'Crítica', cor: 'text-red-300 border-red-500/40 bg-red-500/10' },
];

export const PRIORIDADE_ROTULO = { baixa: 'Baixa', media: 'Média', alta: 'Alta', urgente: 'Urgente' };

export const ETAPAS_PECA = [
  { valor: 'fabricacao', rotulo: 'Fabricação' },
  { valor: 'solda', rotulo: 'Solda' },
  { valor: 'pintura', rotulo: 'Pintura' },
];

export const ROLES_DESTINO = [
  { valor: 'todos', rotulo: 'Todos os usuários' },
  { valor: 'admin', rotulo: 'Administradores' },
  { valor: 'gerente', rotulo: 'Gerentes' },
  { valor: 'supervisor', rotulo: 'Supervisores (produção / PCP)' },
  { valor: 'operador', rotulo: 'Operadores' },
  { valor: 'financeiro', rotulo: 'Financeiro' },
];

/** Texto legível dos parâmetros: "há 14+ dias", "7 dias antes", etapas etc. */
export function descreverParametros(gatilho, parametros = {}) {
  const def = GATILHOS[gatilho];
  if (!def) return '';
  const dias = Number(parametros?.dias) || def.parametros.find((p) => p.chave === 'dias')?.padrao;
  const partes = [];
  switch (gatilho) {
    case 'conta_vencendo': partes.push(`vence nos próximos ${dias} dias`); break;
    case 'conta_vencida': partes.push('vencimento já passou'); break;
    case 'medicao_sem_recebimento': partes.push(`medição há ${dias}+ dias sem recebimento`); break;
    case 'peca_parada': {
      partes.push(`parada há ${dias}+ dias`);
      const et = Array.isArray(parametros?.etapas) && parametros.etapas.length ? parametros.etapas : ETAPAS_PECA.map((e) => e.valor);
      partes.push(`em ${et.map((v) => ETAPAS_PECA.find((e) => e.valor === v)?.rotulo || v).join(', ')}`);
      break;
    }
    case 'obra_sem_producao': partes.push(`sem movimentação há ${dias}+ dias`); break;
    case 'prazo_obra': partes.push(`prazo final em até ${dias} dias`); break;
    case 'estoque_minimo': partes.push('saldo no mínimo ou abaixo'); break;
    default: if (dias) partes.push(`há ${dias}+ dias`);
  }
  return partes.join(' · ');
}

export function descreverAcao(acao) {
  const base = TIPOS_ACAO[acao?.tipo] || acao?.tipo || 'Ação';
  if (acao?.tipo === 'notificar') {
    const s = SEVERIDADES.find((x) => x.valor === (acao.severidade || 'medio'));
    return `${base} (${s?.rotulo || acao.severidade})`;
  }
  if (acao?.tipo === 'criar_tarefa') {
    const p = PRIORIDADE_ROTULO[acao.prioridade || 'alta'] || acao.prioridade;
    const r = acao.responsavel ? ` → ${acao.responsavel}` : '';
    return `${base} (${p}, ${Number(acao.prazo_dias) || 3}d${r})`;
  }
  if (acao?.tipo === 'push') {
    const r = ROLES_DESTINO.find((x) => x.valor === acao.destino_role);
    return `${base}${acao.destino_role ? ` → ${r?.rotulo || acao.destino_role}` : ''}`;
  }
  return base;
}

/** "há 5 min", "há 3 h", "há 2 dias" */
export function tempoRelativo(iso) {
  if (!iso) return 'nunca';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return 'agora mesmo';
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} dias`;
}

export function dataHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function resumoAcoesFeitas(acoes) {
  if (!acoes || typeof acoes !== 'object') return '';
  const p = [];
  if (acoes.notificacoes) p.push(`${acoes.notificacoes} notificação(ões)`);
  if (acoes.tarefas) p.push(`${acoes.tarefas} tarefa(s)`);
  if (acoes.push !== undefined) p.push(`${acoes.push} push enviado(s)`);
  return p.join(' · ');
}

export function automacaoVazia(obraId = null) {
  return {
    nome: '', descricao: '', gatilho: 'peca_parada', parametros: { dias: 14 },
    acoes: [{ tipo: 'notificar', severidade: 'medio' }], obra_id: obraId || null, ativa: true,
  };
}

export const MODELOS = [
  {
    chave: 'medicao45',
    titulo: 'Tarefa para medição sem recebimento há 45 dias',
    resumo: 'Cria tarefa de cobrança (alta, 5 dias) e avisa o financeiro.',
    dados: {
      nome: 'Cobrar medição sem recebimento (45 dias)',
      descricao: 'Medições emitidas há 45 dias ou mais que ainda não tiveram recebimento viram tarefa de cobrança.',
      gatilho: 'medicao_sem_recebimento', parametros: { dias: 45 },
      acoes: [
        { tipo: 'criar_tarefa', prioridade: 'alta', prazo_dias: 5, responsavel: 'Financeiro' },
        { tipo: 'notificar', severidade: 'alto' },
      ],
      ativa: true,
    },
  },
  {
    chave: 'prazo10',
    titulo: 'Prazo de obra em 10 dias → tarefa para o PCP',
    resumo: 'Quando faltar 10 dias para o fim previsto, cria tarefa urgente ao PCP.',
    dados: {
      nome: 'Prazo da obra em 10 dias',
      descricao: 'Obras com data prevista de término nos próximos 10 dias geram tarefa de revisão do cronograma.',
      gatilho: 'prazo_obra', parametros: { dias: 10 },
      acoes: [
        { tipo: 'criar_tarefa', prioridade: 'urgente', prazo_dias: 2, responsavel: 'PCP' },
        { tipo: 'notificar', severidade: 'critico' },
      ],
      ativa: true,
    },
  },
  {
    chave: 'solda7',
    titulo: 'Peças paradas na solda há 7 dias',
    resumo: 'Avisa a produção quando houver peças na solda há uma semana.',
    dados: {
      nome: 'Peças paradas na solda (7 dias)',
      descricao: 'Agrupa por obra as peças que estão na etapa de solda há 7 dias ou mais.',
      gatilho: 'peca_parada', parametros: { dias: 7, etapas: ['solda'] },
      acoes: [
        { tipo: 'notificar', severidade: 'alto' },
        { tipo: 'criar_tarefa', prioridade: 'alta', prazo_dias: 3, responsavel: 'Encarregado de solda' },
      ],
      ativa: true,
    },
  },
  {
    chave: 'contaVencida',
    titulo: 'Conta vencida → push para o financeiro',
    resumo: 'Notificação crítica e push no celular do financeiro.',
    dados: {
      nome: 'Conta a pagar vencida (push)',
      descricao: 'Avisa imediatamente o financeiro, inclusive no celular, quando uma conta passar do vencimento.',
      gatilho: 'conta_vencida', parametros: {},
      acoes: [
        { tipo: 'notificar', severidade: 'critico' },
        { tipo: 'push', destino_role: 'financeiro' },
      ],
      ativa: true,
    },
  },
];
