// ============================================================
// Fábrica · Montagem — peças em obra × montadas, por obra
// ============================================================
// "Montada" NÃO é etapa do banco (CLAUDE.md 6): vem de montagemSync
// (localStorage + entity_store.montagem_concluidas_global), com marcação
// parcial por unidade (getMontadasCount). Somente leitura.
// Sincroniza: realtime do entity_store + storage event (outra aba) +
// releitura ao voltar o foco.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { HardHat } from 'lucide-react';
import { useProducao } from '@/contexts/ERPContext';
import { pesoPeca, qtdPeca, etapaPeca } from '@/services/relatorioProducao';
import { loadConcluidasSmart, loadConcluidasLocal, subscribeConcluidas, getMontadasCount, MONTAGEM_LS_KEY } from '@/utils/montagemSync';
import { Secao, Grupo, Metrica, Grade, Barra, Status, Vazio, Esqueleto } from '../../kit';
import { num, kg, peso, pct } from '../../kit/fmt';
import { useEscopoFabrica, obraIdDe } from './comum';

function useConcluidas() {
  const [concluidas, setConcluidas] = useState(() => loadConcluidasSmart((r) => setConcluidas(r || {})) || {});
  useEffect(() => {
    const unsub = subscribeConcluidas((r) => setConcluidas(r || {}));
    const onStorage = (e) => { if (e.key === MONTAGEM_LS_KEY) setConcluidas(loadConcluidasLocal()); };
    const onVis = () => { if (document.visibilityState === 'visible') loadConcluidasSmart((r) => setConcluidas(r || {})); };
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVis);
    return () => { unsub?.(); window.removeEventListener('storage', onStorage); document.removeEventListener('visibilitychange', onVis); };
  }, []);
  return concluidas;
}

export default function AbaMontagem({ carregando }) {
  const { pecas = [] } = useProducao();
  const { noEscopo, nomeObra } = useEscopoFabrica();
  const concluidas = useConcluidas();

  const { linhas, total } = useMemo(() => {
    const porObra = new Map();
    pecas.forEach((p) => {
      if (!noEscopo(p)) return;
      const e = etapaPeca(p);
      if (e !== 'enviado' && e !== 'entregue') return;
      const id = obraIdDe(p);
      if (!porObra.has(id)) porObra.set(id, { obraId: id, un: 0, unMontadas: 0, kg: 0, kgMontado: 0, marcas: 0, marcasCompletas: 0 });
      const l = porObra.get(id);
      const q = Math.max(1, qtdPeca(p));
      const w = pesoPeca(p);
      const m = getMontadasCount(concluidas[String(p.id)], q);
      l.un += q; l.unMontadas += m; l.kg += w; l.kgMontado += (w / q) * m; l.marcas += 1;
      if (m >= q) l.marcasCompletas += 1;
    });
    const arr = [...porObra.values()].sort((a, b) => (b.kg - b.kgMontado) - (a.kg - a.kgMontado));
    const t = arr.reduce((s, l) => ({ kg: s.kg + l.kg, kgMontado: s.kgMontado + l.kgMontado, un: s.un + l.un, unMontadas: s.unMontadas + l.unMontadas }), { kg: 0, kgMontado: 0, un: 0, unMontadas: 0 });
    return { linhas: arr, total: t };
  }, [pecas, noEscopo, concluidas]);

  if (carregando && pecas.length === 0) return <Esqueleto metricas={2} linhas={4} />;

  const pctTotal = total.kg > 0 ? (total.kgMontado / total.kg) * 100 : 0;

  return (
    <>
      <Secao titulo="Montagem em campo" descricao="peças entregues na obra">
        <Grade>
          <Metrica rotulo="Montado" valor={peso(total.kgMontado)} sub={`${pct(pctTotal)} do que está em obra`} tom="ok" />
          <Metrica rotulo="Aguardando montagem" valor={peso(Math.max(0, total.kg - total.kgMontado))} sub={`${num(total.un - total.unMontadas)} unidades`} tom={total.kg - total.kgMontado > 0 ? 'warn' : undefined} />
        </Grade>
      </Secao>

      <Secao titulo="Por obra">
        {linhas.length === 0 ? (
          <Grupo><Vazio icone={HardHat} titulo="Nenhuma peça em obra" texto="Quando um romaneio for despachado, as peças aparecem aqui." /></Grupo>
        ) : (
          <Grupo>
            {linhas.map((l) => {
              const p = l.kg > 0 ? (l.kgMontado / l.kg) * 100 : 0;
              const tom = p >= 99.5 ? 'ok' : p > 0 ? 'warn' : 'neutro';
              return (
                <div key={l.obraId || 'sem-obra'} className="px-4 py-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-[15px] text-mx-text">{nomeObra(l.obraId)}</span>
                    <span className="mx-tab shrink-0 text-[15px] font-semibold text-mx-text">{pct(p)}</span>
                  </div>
                  <div className="mt-2"><Barra valor={l.kgMontado} max={l.kg} tom="ok" altura={6} rotulo={`Montado em ${nomeObra(l.obraId)}`} /></div>
                  <div className="mt-1.5 flex items-center justify-between gap-3 text-[13px] text-mx-text2">
                    <span className="mx-tab">{kg(l.kgMontado)} de {kg(l.kg)}</span>
                    <Status tom={tom}>{num(l.unMontadas)}/{num(l.un)} un.</Status>
                  </div>
                </div>
              );
            })}
          </Grupo>
        )}
        <p className="mt-2 px-1 text-[12px] text-mx-text3">Marcar peça como montada é feito pela equipe de campo no módulo de montagem.</p>
      </Secao>
    </>
  );
}
