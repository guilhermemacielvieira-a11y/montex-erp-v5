// ============================================================
// NOVO ROMANEIO (app) — seleção na Fila de Embarque
// ============================================================
// Lista SÓ as peças na Fila de Embarque (etapa `expedido`) com saldo:
// quantidade da linha − unidades já reservadas em romaneio ativo
// (montarFilaEmbarque, services/romaneio.js — mesma regra do desktop).
// Peça com mais de uma unidade permite remessa parcial: o banco
// (RPC criar_romaneio) separa as unidades enviadas numa linha própria
// e subtrai da peça original, que segue na fila com o restante.
// Um romaneio é de UMA obra: a 1ª peça escolhida trava a obra.
// Criar o romaneio NÃO tira a peça do pátio: ela vira `enviado` só no
// despacho (conferência + "Confirmar despacho" na tela do romaneio).
// ============================================================
import React, { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Truck, Check, Minus, Plus, PackageOpen } from 'lucide-react';
import { useERP, useExpedicao } from '@/contexts/ERPContext';
import { montarFilaEmbarque, planejarSelecaoFila, hojeLocalISO } from '@/services/romaneio';
import { useObraFiltro } from '../ObraContext';
import ObraSelector from './ObraSelector';
import { Tela, Busca, Botao, Vazio, Etiqueta, Campo, classeInput } from '../kit';
import Folha from '../kit/Folha';
import { num, kg } from '../kit/fmt';
import { isOnline } from '../ui/online';
import { tap, success } from '../ui/haptics';
import { cn } from '@/lib/utils';

const norm = (s) => String(s || '').toUpperCase().replace(/\s+/g, '');
const fichaVazia = () => ({ numero: '', data: hojeLocalISO(), transportadora: '', motorista: '', placa: '', observacoes: '' });

export default function NovoRomaneioMobile({ onVoltar, onCriado }) {
  const { pecas = [], obras = [] } = useERP?.() || {};
  const { expedicoes = [], addExpedicao } = useExpedicao?.() || {};
  const { matchObra, isTodas } = useObraFiltro();

  const [busca, setBusca] = useState('');
  const [sel, setSel] = useState({}); // id → qtd (número)
  const [ficha, setFicha] = useState(fichaVazia);
  const [folha, setFolha] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const nomeObra = useMemo(() => {
    const m = new Map(obras.map((o) => [String(o.id), o.nome || o.codigo || o.id]));
    return (id) => m.get(String(id)) || id || 'Sem obra';
  }, [obras]);

  // Fila inteira (todas as obras) — a seleção valida contra ela.
  const filaTotal = useMemo(() => montarFilaEmbarque(pecas, expedicoes), [pecas, expedicoes]);
  const fila = useMemo(() => filaTotal.filter((f) => matchObra(f.peca)), [filaTotal, matchObra]);

  const obraTravada = useMemo(() => {
    const primeiro = Object.keys(sel)[0];
    return primeiro ? filaTotal.find((f) => f.id === primeiro)?.obraId ?? null : null;
  }, [sel, filaTotal]);

  const visiveis = useMemo(() => {
    const q = norm(busca);
    return q ? fila.filter((f) => norm(f.marca).includes(q) || norm(f.tipo).includes(q)) : fila;
  }, [fila, busca]);

  // Agrupa por obra (no escopo "Todas" aparecem várias)
  const grupos = useMemo(() => {
    const m = new Map();
    visiveis.forEach((f) => {
      const k = String(f.obraId ?? '');
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(f);
    });
    return [...m.entries()].map(([obraId, itens]) => ({
      obraId,
      itens,
      kg: itens.reduce((s, i) => s + i.pesoDisponivel, 0),
    }));
  }, [visiveis]);

  const plano = useMemo(() => planejarSelecaoFila(filaTotal, sel), [filaTotal, sel]);
  const nSel = Object.keys(sel).length;
  const unidades = plano.ok ? plano.itens.reduce((s, i) => s + i.qtd, 0) : 0;

  const alternar = (f) => {
    if (obraTravada && String(f.obraId) !== String(obraTravada) && !sel[f.id]) {
      toast.error(`Romaneio é de uma obra só: ${nomeObra(obraTravada)}. Limpe a seleção para trocar.`);
      return;
    }
    tap('light');
    setSel((s) => {
      const n = { ...s };
      if (n[f.id] != null) delete n[f.id]; else n[f.id] = f.disponivel;
      return n;
    });
  };

  const mudarQtd = (f, valor) => {
    const v = Math.max(1, Math.min(f.disponivel, parseInt(valor, 10) || 1));
    setSel((s) => ({ ...s, [f.id]: v }));
  };

  const selecionarGrupo = (g) => {
    if (obraTravada && String(g.obraId) !== String(obraTravada)) {
      toast.error(`Romaneio é de uma obra só: ${nomeObra(obraTravada)}.`);
      return;
    }
    tap('light');
    setSel((s) => {
      const n = { ...s };
      g.itens.forEach((f) => { if (n[f.id] == null) n[f.id] = f.disponivel; });
      return n;
    });
  };

  const abrirFolha = () => {
    if (!plano.ok) { toast.error(plano.erro); return; }
    tap('medium');
    setFolha(true);
  };

  const gerar = async () => {
    if (salvando) return;
    if (!plano.ok) { toast.error(plano.erro); return; }
    if (!ficha.data) { toast.error('Informe a data do romaneio'); return; }
    if (!isOnline()) { toast.error('Sem conexão. O romaneio precisa do servidor para reservar as peças.'); return; }
    if (!addExpedicao) { toast.error('Expedição indisponível'); return; }
    setSalvando(true);
    try {
      const porId = new Map(filaTotal.map((f) => [f.id, f]));
      const result = await addExpedicao({
        numero: ficha.numero.trim() || `ENV-${Date.now()}`,
        data_envio: ficha.data,
        transportadora: ficha.transportadora.trim() || null,
        motorista: ficha.motorista.trim() || null,
        placa: ficha.placa.trim().toUpperCase() || null,
        observacoes: ficha.observacoes.trim() || null,
        status: 'preparando',
        pecas_detalhes: plano.itens.map((i) => ({ id: i.id, qtd_enviada: i.qtd, qtd_total: porId.get(i.id)?.disponivel ?? i.qtdDisponivel })),
        obra_nome: nomeObra(plano.obraId),
      });
      await success();
      const parc = plano.parciais ? ` · ${plano.parciais} parcial(is)` : '';
      toast.success(`Romaneio criado: ${plano.itens.length} peça(s), ${kg(plano.pesoKg)}${parc}`);
      setFolha(false);
      setSel({});
      setFicha(fichaVazia());
      onCriado?.(result?.expedicao?.id || null);
    } catch (err) {
      console.error('[NovoRomaneioMobile] criar romaneio falhou:', err);
      toast.error(`Não foi possível criar o romaneio: ${err?.message || err}`);
    } finally {
      setSalvando(false);
    }
  };

  const rodape = (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-[13px] text-mx-text2">
        <span>
          {nSel === 0 ? 'Nenhuma peça selecionada' : `${num(nSel)} ${nSel === 1 ? 'peça' : 'peças'} · ${num(unidades)} un`}
          {plano.ok && plano.parciais > 0 ? ` · ${plano.parciais} parcial(is)` : ''}
        </span>
        {nSel > 0 && <span className="mx-num text-[16px] text-mx-text">{kg(plano.pesoKg)}</span>}
      </div>
      <div className="flex gap-2">
        {nSel > 0 && <Botao variante="secundario" onClick={() => setSel({})}>Limpar</Botao>}
        <Botao className="flex-1" icone={Truck} disabled={nSel === 0} onClick={abrirFolha}>Gerar romaneio</Botao>
      </div>
    </div>
  );

  return (
    <Tela
      titulo="Novo romaneio"
      subtitulo={obraTravada ? nomeObra(obraTravada) : 'Fila de embarque'}
      voltar={onVoltar}
      semRecuo
      cabecalhoExtra={<ObraSelector />}
      rodape={rodape}
    >
      <div className="px-4 pt-3">
        <Busca valor={busca} onChange={setBusca} placeholder="Buscar marca ou tipo" />
        <p className="mt-2 text-[13px] text-mx-text3">
          Só aparecem peças prontas na expedição que ainda não estão em outro romaneio. Peças com mais de uma unidade aceitam envio parcial.
        </p>
      </div>

      {fila.length === 0 ? (
        <Vazio
          icone={PackageOpen}
          titulo="Fila de embarque vazia"
          texto={isTodas ? 'Nenhuma peça pronta aguardando romaneio.' : 'Nenhuma peça desta obra aguardando romaneio.'}
        />
      ) : visiveis.length === 0 ? (
        <Vazio icone={PackageOpen} titulo="Nada encontrado" texto={`Nenhuma peça da fila com "${busca}".`} />
      ) : (
        grupos.map((g) => {
          const bloqueado = obraTravada && String(g.obraId) !== String(obraTravada);
          return (
            <section key={g.obraId} className="mt-4">
              <div className="flex items-center justify-between gap-2 px-4 pb-2">
                <div className="min-w-0">
                  <h2 className="truncate text-[15px] font-semibold text-mx-text">{nomeObra(g.obraId)}</h2>
                  <p className="text-[12px] text-mx-text3">{num(g.itens.length)} {g.itens.length === 1 ? 'peça' : 'peças'} · {kg(g.kg)}</p>
                </div>
                {!bloqueado && (
                  <button type="button" onClick={() => selecionarGrupo(g)} className="shrink-0 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-mx-tealhi active:bg-mx-s2">
                    Selecionar todas
                  </button>
                )}
              </div>
              <ul className={cn('mx-4 overflow-hidden rounded-2xl border border-mx-line bg-mx-s1', bloqueado && 'opacity-45')}>
                {g.itens.map((f, idx) => {
                  const marcado = sel[f.id] != null;
                  const qtd = sel[f.id] ?? f.disponivel;
                  const parcial = marcado && qtd < f.disponivel;
                  return (
                    <li key={f.id} className={cn(idx > 0 && 'border-t border-mx-line', marcado && 'bg-mx-teal/10')}>
                      <button
                        type="button"
                        onClick={() => alternar(f)}
                        aria-pressed={marcado}
                        className="flex w-full items-center gap-3 px-3 py-3 text-left"
                      >
                        <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md border', marcado ? 'border-mx-tealhi bg-mx-teal text-white' : 'border-mx-text3')}>
                          {marcado && <Check className="h-4 w-4" aria-hidden />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold text-mx-text">{f.marca}</span>
                          <span className="block truncate text-[12px] text-mx-text2">
                            {f.tipo || '—'} · {num(f.disponivel)} un na fila
                            {f.reservada > 0 ? ` (${num(f.reservada)} já em romaneio)` : ''}
                          </span>
                        </span>
                        <span className="mx-tab shrink-0 text-right text-[13px] text-mx-text2">{kg(marcado ? f.pesoUnit * qtd : f.pesoDisponivel)}</span>
                      </button>

                      {marcado && f.disponivel > 1 && (
                        <div className="flex items-center gap-2 px-3 pb-3 pl-12">
                          <span className="text-[13px] text-mx-text2">Enviar</span>
                          <div className="flex items-center rounded-xl border border-mx-line bg-mx-bg">
                            <button type="button" aria-label={`Menos ${f.marca}`} onClick={() => mudarQtd(f, qtd - 1)} disabled={qtd <= 1} className="flex h-10 w-10 items-center justify-center text-mx-text2 disabled:opacity-30">
                              <Minus className="h-4 w-4" />
                            </button>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={f.disponivel}
                              value={qtd}
                              onChange={(e) => mudarQtd(f, e.target.value)}
                              aria-label={`Quantidade de ${f.marca}`}
                              className="mx-num h-10 w-12 bg-transparent text-center text-[16px] text-mx-text outline-none"
                            />
                            <button type="button" aria-label={`Mais ${f.marca}`} onClick={() => mudarQtd(f, qtd + 1)} disabled={qtd >= f.disponivel} className="flex h-10 w-10 items-center justify-center text-mx-text2 disabled:opacity-30">
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <span className="whitespace-nowrap text-[13px] text-mx-text3">de {num(f.disponivel)}</span>
                        </div>
                      )}
                      {parcial && (
                        <div className="-mt-1 px-3 pb-3 pl-12">
                          <Etiqueta tom="warn">Envio parcial · {num(f.disponivel - qtd)} un continuam na fila</Etiqueta>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}

      <Folha
        open={folha}
        onClose={() => !salvando && setFolha(false)}
        title="Gerar romaneio"
        footer={
          <Botao className="w-full" icone={Truck} carregando={salvando} disabled={salvando} onClick={gerar}>
            {salvando ? 'Gerando…' : 'Gerar romaneio'}
          </Botao>
        }
      >
        {plano.ok && (
          <div className="space-y-4">
            <div className="rounded-xl border border-mx-line bg-mx-s1 p-3">
              <p className="text-[15px] font-semibold text-mx-text">{nomeObra(plano.obraId)}</p>
              <p className="text-[13px] text-mx-text2">
                {num(plano.itens.length)} {plano.itens.length === 1 ? 'peça' : 'peças'} · {num(unidades)} un · {kg(plano.pesoKg)}
              </p>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-[13px]">
                {plano.itens.map((i) => {
                  const f = filaTotal.find((x) => x.id === i.id);
                  return (
                    <li key={i.id} className="flex justify-between gap-2">
                      <span className="truncate text-mx-text">{f?.marca || i.id}</span>
                      <span className={cn('mx-tab shrink-0', i.parcial ? 'text-mx-warn' : 'text-mx-text2')}>
                        {i.parcial ? `${num(i.qtd)} de ${num(i.qtdDisponivel)}` : `${num(i.qtd)} un`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Nº do romaneio" ajuda="Vazio = automático">
                <input className={classeInput} value={ficha.numero} onChange={(e) => setFicha((x) => ({ ...x, numero: e.target.value }))} placeholder="ENV-…" />
              </Campo>
              <Campo rotulo="Data">
                <input type="date" className={classeInput} value={ficha.data} onChange={(e) => setFicha((x) => ({ ...x, data: e.target.value }))} />
              </Campo>
            </div>
            <Campo rotulo="Transportadora">
              <input className={classeInput} value={ficha.transportadora} onChange={(e) => setFicha((x) => ({ ...x, transportadora: e.target.value }))} />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Motorista">
                <input className={classeInput} value={ficha.motorista} onChange={(e) => setFicha((x) => ({ ...x, motorista: e.target.value }))} />
              </Campo>
              <Campo rotulo="Placa">
                <input className={cn(classeInput, 'uppercase')} value={ficha.placa} onChange={(e) => setFicha((x) => ({ ...x, placa: e.target.value }))} placeholder="ABC1D23" />
              </Campo>
            </div>
            <Campo rotulo="Observações">
              <textarea className={cn(classeInput, 'h-20 py-2')} value={ficha.observacoes} onChange={(e) => setFicha((x) => ({ ...x, observacoes: e.target.value }))} />
            </Campo>
            <p className="text-[12px] text-mx-text3">
              As peças ficam reservadas neste romaneio e continuam no pátio até o despacho. Nos envios parciais, o restante volta para a fila.
            </p>
          </div>
        )}
      </Folha>
    </Tela>
  );
}
