// ============================================================
// FÁBRICA — app da diretoria (/m/fabrica?aba=producao|pecas|expedicao|montagem|estoque)
// ============================================================
// Somente leitura: a diretoria acompanha; mover etapa, dar baixa e
// despachar ficam com os módulos operacionais (Kanban, expedição).
// Escopo = seletor do topo (CLAUDE.md 1c). Produção vem do motor do BI
// (histórico normalizado — CLAUDE.md 1e), nunca do histórico bruto.
// ============================================================
import React, { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useERP, useProducao, useEstoque } from '@/contexts/ERPContext';
import { useAuth } from '@/lib/AuthContext';
import { useBIData } from '@/hooks/useBIData';
import { Tela, Abas, Erro } from '../../kit';
import { useEstadoERP } from './comum';
import AbaProducao from './AbaProducao';
import AbaPecas from './AbaPecas';
import AbaExpedicao from './AbaExpedicao';
import AbaMontagem from './AbaMontagem';
import AbaEstoque from './AbaEstoque';

// Cada aba só aparece para quem tem o módulo liberado.
const ABAS = [
  { id: 'producao', rotulo: 'Produção', perm: 'producao.view' },
  { id: 'pecas', rotulo: 'Peças', perm: 'producao.view' },
  { id: 'expedicao', rotulo: 'Expedição', perm: 'expedicao.view' },
  { id: 'montagem', rotulo: 'Montagem', perm: ['montagem.view', 'obras.view'] },
  { id: 'estoque', rotulo: 'Estoque', perm: 'estoque.view' },
];

export default function Fabrica() {
  const [params, setParams] = useSearchParams();
  const { hasPermission } = useAuth() || {};
  const abas = useMemo(
    () => ABAS.filter((a) => !hasPermission || (Array.isArray(a.perm) ? a.perm : [a.perm]).some((p) => hasPermission(p))),
    [hasPermission],
  );
  const padrao = abas[0]?.id || 'producao';
  const aba = abas.some((a) => a.id === params.get('aba')) ? params.get('aba') : padrao;
  const trocar = (id) => setParams(id === padrao ? {} : { aba: id }, { replace: true });

  // reloadExpedicoes não sai em useExpedicao(); vem do agregado useERP().
  const { funcionarios = [], reloadExpedicoes } = useERP() || {};
  const { reloadPecas } = useProducao();
  const { reloadEstoque } = useEstoque();
  const { carregando, erro } = useEstadoERP();
  const bi = useBIData({ empresa: true });

  const atualizar = useCallback(async () => {
    const tarefas = [bi.recarregar(true)];
    if (aba === 'pecas' || aba === 'montagem' || aba === 'producao') tarefas.push(reloadPecas?.());
    if (aba === 'expedicao') tarefas.push(reloadPecas?.(), reloadExpedicoes?.());
    if (aba === 'estoque') tarefas.push(reloadEstoque?.());
    await Promise.allSettled(tarefas);
  }, [aba, bi, reloadPecas, reloadExpedicoes, reloadEstoque]);

  return (
    <Tela
      titulo="Fábrica"
      subtitulo="Acompanhamento, somente leitura"
      onRefresh={atualizar}
      cabecalhoExtra={<Abas itens={abas} valor={aba} onChange={trocar} />}
    >
      {erro && <Erro texto={erro} onTentar={() => window.location.reload()} />}
      {aba === 'producao' && <AbaProducao bi={bi} />}
      {aba === 'pecas' && <AbaPecas carregando={carregando} funcionarios={funcionarios} />}
      {aba === 'expedicao' && <AbaExpedicao carregando={carregando} />}
      {aba === 'montagem' && <AbaMontagem carregando={carregando} />}
      {aba === 'estoque' && <AbaEstoque bi={bi} carregando={carregando} />}
    </Tela>
  );
}
