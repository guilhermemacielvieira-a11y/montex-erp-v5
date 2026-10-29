// ============================================================
// FÁBRICA — app da diretoria (/m/fabrica?aba=producao|pecas|expedicao|montagem|estoque)
// ============================================================
// Somente leitura: a diretoria acompanha; mover etapa, dar baixa e
// despachar ficam com os módulos operacionais (Kanban, expedição).
// Escopo = seletor do topo (CLAUDE.md 1c). Produção vem do motor do BI
// (histórico normalizado — CLAUDE.md 1e), nunca do histórico bruto.
// ============================================================
import React, { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useERP, useProducao, useEstoque } from '@/contexts/ERPContext';
import { useBIData } from '@/hooks/useBIData';
import { Tela, Abas, Erro } from '../../kit';
import { useEstadoERP } from './comum';
import AbaProducao from './AbaProducao';
import AbaPecas from './AbaPecas';
import AbaExpedicao from './AbaExpedicao';
import AbaMontagem from './AbaMontagem';
import AbaEstoque from './AbaEstoque';

const ABAS = [
  { id: 'producao', rotulo: 'Produção' },
  { id: 'pecas', rotulo: 'Peças' },
  { id: 'expedicao', rotulo: 'Expedição' },
  { id: 'montagem', rotulo: 'Montagem' },
  { id: 'estoque', rotulo: 'Estoque' },
];

export default function Fabrica() {
  const [params, setParams] = useSearchParams();
  const aba = ABAS.some((a) => a.id === params.get('aba')) ? params.get('aba') : 'producao';
  const trocar = (id) => setParams(id === 'producao' ? {} : { aba: id }, { replace: true });

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
      cabecalhoExtra={<Abas itens={ABAS} valor={aba} onChange={trocar} />}
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
