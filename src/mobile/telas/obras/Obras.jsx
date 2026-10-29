// ============================================================
// Obras — carteira da empresa (app da diretoria, rota /m/obras)
// ============================================================
// Fonte: useBIData().obras.indicadores (avanço físico × financeiro, atraso,
// saldo a medir, previsão de término — motor services/bi/biObras) e
// useObras() só para o nome do cliente. O app da diretoria olha a empresa
// toda: NÃO chama setObraAtual (o detalhe filtra pelo id da URL).
// ============================================================
import { parseLocalDate } from '@/utils/financeiroCalc';
import React, { useMemo, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, Building2 } from 'lucide-react';
import { useObras, useERP } from '@/contexts/ERPContext';
import { useBIData } from '@/hooks/useBIData';
import { cn } from '@/lib/utils';
import { Tela, Grupo, Status, Abas, Busca, Vazio, Erro, Esqueleto, Barra } from '../../kit';
import { brlc, pct } from '../../kit/fmt';

const FILTROS = ['ativas', 'atraso', 'sem-contrato', 'concluidas'];

/** Nome do cliente da obra (string, objeto ou id do cadastro). */
export function clienteDaObra(obra, clientes = []) {
  if (!obra) return '';
  const c = obra.cliente;
  if (c && typeof c === 'object') return c.nome || c.razaoSocial || '';
  if (typeof c === 'string' && c.trim()) return c.trim();
  const id = obra.clienteId ?? obra.cliente_id;
  if (id) {
    const cad = (clientes || []).find((x) => x.id === id);
    return cad?.nome || cad?.razaoSocial || cad?.razao_social || '';
  }
  return obra.clienteNome || '';
}

/** Situação de prazo da obra (ponto + texto). */
const dias = (n) => (n > 365 ? '+1 ano' : `${n} ${n === 1 ? 'dia' : 'dias'}`);

export function situacaoObra(ind, hoje = new Date()) {
  if (!ind) return { tom: 'neutro', texto: '—' };
  if (!ind.ativa) return { tom: 'ok', texto: 'Concluída' };
  if (ind.semContrato) return { tom: 'neutro', texto: 'Sem contrato' };
  if (!ind.prazo) return { tom: 'neutro', texto: 'Sem prazo' };
  const prazo = parseLocalDate(ind.prazo);
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  if (prazo && prazo < base && (ind.kgRestante ?? 0) > 0) {
    return { tom: 'bad', texto: `Prazo vencido · ${dias(Math.round((base - prazo) / 86400000))}` };
  }
  if (ind.atrasoDias > 0) return { tom: 'warn', texto: `Atraso previsto · ${dias(ind.atrasoDias)}` };
  return { tom: 'ok', texto: 'No prazo' };
}

const normal = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function LinhaObra({ ind, cliente }) {
  const sit = situacaoObra(ind);
  const sub = [cliente, ind.codigo].filter(Boolean).join(' · ');
  return (
    <Link to={`/m/obras/${encodeURIComponent(ind.id)}`} className="block">
      <div className="px-4 py-3.5 active:bg-mx-s2">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="line-clamp-2 text-[15px] font-semibold leading-snug text-mx-text">{ind.nome}</div>
            {sub && <div className="truncate text-[13px] text-mx-text2">{sub}</div>}
          </div>
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-mx-text3" aria-hidden />
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="flex-1"><Barra valor={ind.fisicoPct ?? 0} tom="teal" altura={5} rotulo="Avanço físico" /></div>
            <span className="mx-tab w-[92px] shrink-0 text-right text-[12px] text-mx-tealhi">fabricado {pct(ind.fisicoPct)}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1"><Barra valor={ind.financeiroPct ?? 0} tom="neutro" altura={5} rotulo="Avanço financeiro (medido)" /></div>
            <span className="mx-tab w-[92px] shrink-0 text-right text-[12px] text-mx-text2">medido {pct(ind.financeiroPct)}</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <Status tom={sit.tom} className="min-w-0 truncate text-[13px]">{sit.texto}</Status>
          <span className="shrink-0 text-[13px] text-mx-text2">
            a medir <span className="mx-tab font-semibold text-mx-text">{ind.saldoAMedir === null ? '—' : brlc(ind.saldoAMedir)}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function Obras() {
  const [params, setParams] = useSearchParams();
  const filtroUrl = params.get('filtro');
  const filtro = FILTROS.includes(filtroUrl) ? filtroUrl : 'ativas';
  const [busca, setBusca] = useState('');

  const { obras = [], clientes = [] } = useObras();
  const { loading } = useERP();
  const dados = useBIData();
  const indicadores = dados.obras.indicadores;
  const executivo = dados.obras.executivo;

  const clientePorObra = useMemo(() => {
    const m = new Map();
    obras.forEach((o) => m.set(o.id, clienteDaObra(o, clientes)));
    return m;
  }, [obras, clientes]);

  const grupos = useMemo(() => {
    const ativas = indicadores.filter((i) => i.ativa);
    return {
      ativas,
      atraso: ativas.filter((i) => i.atrasoDias > 0),
      'sem-contrato': ativas.filter((i) => i.semContrato),
      concluidas: indicadores.filter((i) => !i.ativa),
    };
  }, [indicadores]);

  const lista = useMemo(() => {
    const termo = normal(busca.trim());
    return (grupos[filtro] || [])
      .filter((i) => !termo || [i.nome, i.codigo, clientePorObra.get(i.id)].some((t) => normal(t).includes(termo)))
      .slice()
      .sort((a, b) => (Math.max(0, b.atrasoDias || 0) - Math.max(0, a.atrasoDias || 0)) || (b.valorContrato - a.valorContrato));
  }, [grupos, filtro, busca, clientePorObra]);

  const mudarFiltro = useCallback((id) => {
    const p = new URLSearchParams(params);
    if (id === 'ativas') p.delete('filtro'); else p.set('filtro', id);
    setParams(p, { replace: true });
  }, [params, setParams]);

  const abas = [
    { id: 'ativas', rotulo: 'Ativas', badge: grupos.ativas.length },
    { id: 'atraso', rotulo: 'Em atraso', badge: grupos.atraso.length },
    { id: 'sem-contrato', rotulo: 'Sem contrato', badge: grupos['sem-contrato'].length },
    { id: 'concluidas', rotulo: 'Concluídas', badge: grupos.concluidas.length },
  ];

  const carregandoInicial = (loading && obras.length === 0) || (dados.carregando && indicadores.length === 0 && obras.length === 0);
  const subtitulo = carregandoInicial
    ? 'Carregando'
    : `${executivo.obrasAtivas} ${executivo.obrasAtivas === 1 ? 'ativa' : 'ativas'} · carteira ${brlc(executivo.carteiraValor)}`;

  const vazioTexto = {
    ativas: 'Nenhuma obra ativa cadastrada.',
    atraso: 'Nenhuma obra com previsão de término depois do prazo.',
    'sem-contrato': 'Todas as obras ativas têm valor de contrato.',
    concluidas: 'Nenhuma obra concluída.',
  }[filtro];

  return (
    <Tela
      titulo="Obras"
      subtitulo={subtitulo}
      onRefresh={() => dados.recarregar(true)}
      cabecalhoExtra={(
        <>
          <div className="px-4 pb-2.5">
            <Busca valor={busca} onChange={setBusca} placeholder="Buscar obra, código ou cliente" />
          </div>
          <Abas itens={abas} valor={filtro} onChange={mudarFiltro} />
        </>
      )}
    >
      {dados.erro && (
        <Erro
          texto="Não foi possível carregar o histórico de produção. Ritmo e previsão de término podem estar desatualizados."
          onTentar={() => dados.recarregar(true)}
        />
      )}
      {carregandoInicial ? (
        <Esqueleto linhas={6} />
      ) : lista.length === 0 ? (
        <Vazio
          icone={Building2}
          titulo={busca ? 'Nada encontrado' : 'Nenhuma obra aqui'}
          texto={busca ? `Nenhuma obra corresponde a "${busca}".` : vazioTexto}
        />
      ) : (
        <>
          <p className={cn('mb-2 mt-4 px-1 text-[13px] text-mx-text3')}>
            {lista.length} {lista.length === 1 ? 'obra' : 'obras'} · físico = fabricado, medido = contrato medido
          </p>
          <Grupo>
            {lista.map((ind) => (
              <LinhaObra key={ind.id} ind={ind} cliente={clientePorObra.get(ind.id)} />
            ))}
          </Grupo>
        </>
      )}
    </Tela>
  );
}
