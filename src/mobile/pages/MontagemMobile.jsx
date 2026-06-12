// ============================================================
// MONTAGEM MOBILE - Aguardando ↔ Montado + Scanner de peça
// ============================================================
// Marca peças como montadas (entity_store, independente da etapa do banco
// — regra #6 do CLAUDE.md). Operação de campo: ESCANEAR a etiqueta/QR da
// peça → encontra a marca na obra → sheet de confirmação → marca montada.
// ============================================================
import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Hammer, CheckCircle2, Box, ScanLine, RotateCcw, Download } from 'lucide-react';
import MobileLayout from '../MobileLayout';
import Sheet from '../ui/Sheet';
import Scanner from '../ui/Scanner';
import SearchBar from '../ui/SearchBar';
import LoadMore from '../ui/LoadMore';
import EmptyState from '../ui/EmptyState';
import PhotoInput from '../ui/PhotoInput';
import { uploadFoto } from '../ui/upload';
import { downloadCsv } from '../ui/exportCsv';
import { useDebounced } from '../ui/useDebounced';
import { tap, success } from '../ui/haptics';
import { useERP } from '@/contexts/ERPContext';
import { useObraFiltro } from '../ObraContext';
import { loadConcluidasSmart, saveConcluidasSmart, subscribeConcluidas, getMontadasCount } from '@/utils/montagemSync';
import { toast } from 'react-hot-toast';

// Normaliza marca p/ matching robusto (maiúsculas, sem espaços) — alinhado ao 3D/ERP.
const norm = (s) => String(s || '').toUpperCase().replace(/\s+/g, '');

export default function MontagemMobile() {
  const erp = useERP?.() || {};
  const { pecas = [] } = erp;
  const { matchObra, obraSelecionada } = useObraFiltro();
  // Aba persistida (sobrevive a navegação/reload) — o operador volta de onde estava.
  const [tab, setTab] = useState(() => {
    try { return localStorage.getItem('montex_montagem_tab') || 'aguardando'; } catch { return 'aguardando'; }
  });
  useEffect(() => { try { localStorage.setItem('montex_montagem_tab', tab); } catch { /* noop */ } }, [tab]);
  const [concluidas, setConcluidas] = useState(() => loadConcluidasSmart(remoto => setConcluidas(remoto || {})) || {});
  const [q, setQ] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [pecaSel, setPecaSel] = useState(null); // peça aberta no sheet de confirmação
  const [fotoMont, setFotoMont] = useState(null); // { file, url } evidência da montagem
  const [salvandoMont, setSalvandoMont] = useState(false);
  const [limite, setLimite] = useState(40);
  const qd = useDebounced(q, 250); // busca com debounce
  useEffect(() => { setLimite(40); }, [tab, qd]);

  // TEMPO REAL: outro dispositivo/desktop/3D marcou peça → atualiza na hora.
  // Fallback: refetch ao voltar o app pro foco (iOS suspende websockets em bg).
  useEffect(() => {
    const unsub = subscribeConcluidas(remoto => setConcluidas(remoto || {}));
    const onFocus = () => {
      if (document.visibilityState === 'visible') {
        loadConcluidasSmart(remoto => setConcluidas(remoto || {}));
      }
    };
    document.addEventListener('visibilitychange', onFocus);
    return () => { unsub(); document.removeEventListener('visibilitychange', onFocus); };
  }, []);

  // Montagem PARCIAL: unidades montadas escolhidas no sheet (peças com qtd > 1)
  const [unidadesMont, setUnidadesMont] = useState(1);

  // Todas as peças da obra (p/ mensagem útil quando a marca existe mas não está em campo)
  const pecasDaObra = useMemo(() => pecas.filter(matchObra), [pecas, matchObra]);
  // Peças em montagem — escopo de campo. Etapas reais do banco: 'enviado'
  // E 'entregue' (38 peças em prod estavam invisíveis aqui — auditoria 11/06).
  const pecasCampo = useMemo(() => pecasDaObra.filter(p => ['enviado', 'entregue', 'montado'].includes(String(p.etapa || '').toLowerCase())), [pecasDaObra]);

  const listaFiltrada = useMemo(() => {
    const QQ = norm(qd);
    return qd.trim() ? pecasCampo.filter(p => norm(p.marca).includes(QQ)) : pecasCampo;
  }, [pecasCampo, qd]);

  const aguardando = listaFiltrada.filter(p => !concluidas[String(p.id)]);
  const montadas = listaFiltrada.filter(p => !!concluidas[String(p.id)]);
  const lista = tab === 'aguardando' ? aguardando : montadas;

  // Define o estado montado de uma peça (com fotoUrl opcional de evidência).
  // Marcação parcial: o mobile NÃO tem UI de parcial — toggle ON = "todas montadas".
  // Mas se a peça já estava parcial (ex.: marcada via MontagemPage com montadas=2/3),
  // PRESERVAMOS esse campo para não regredir silenciosamente. Operador no campo que
  // queira completar a peça parcial vai usar o desktop (MontagemPage) ou o scanner
  // continua válido — toggle aqui só ATUALIZA metadados (montadoEm/origem) sem
  // sobrescrever o montadas existente.
  const setMontada = (peca, montada, fotoUrl, unidades = null) => {
    const id = String(peca.id);
    const qtdTotal = Math.max(1, parseInt(peca.quantidade) || 1);
    const nova = { ...concluidas };
    if (!montada) {
      delete nova[id];
    } else {
      const prev = nova[id] || {};
      // MESMO formato de MontagemPage/MontexERP3DPage (entity_store) + fotoUrl.
      // PARCIAL: `montadas: N` quando 0 < N < qtd; completa = sem o campo
      // (formato legado/full, compatível com 3D MONTADO_PARCIAL).
      const payload = {
        ...prev,
        montadoEm: prev.montadoEm || new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
        origem: 'MontagemMobile',
        marca: peca.marca,
        ...(fotoUrl ? { fotoUrl } : {}),
      };
      if (unidades != null && unidades > 0 && unidades < qtdTotal) {
        payload.montadas = unidades;
      } else {
        delete payload.montadas; // completa
      }
      nova[id] = payload;
    }
    setConcluidas(nova);
    // Feedback otimista imediato; o save tem merge+retry e fila offline
    // (montagemSync) — se a rede falhar, a marcação fica no aparelho e
    // sobe no próximo foco/load (flag dirty), sem reverter sozinha.
    if (montada) {
      success();
      const parcial = unidades != null && unidades > 0 && unidades < qtdTotal;
      toast.success(parcial ? `${peca.marca}: ${unidades}/${qtdTotal} montadas` : `${peca.marca} montada`);
    } else { tap('medium'); toast.success(`${peca.marca} desmarcada`); }
    Promise.resolve(saveConcluidasSmart(nova)).then(ok => {
      if (ok === false) toast(`${peca.marca}: sem conexão — salvo no aparelho, sincroniza depois`, { icon: '📶' });
    }).catch(() => toast.error('Falha ao sincronizar'));
  };
  // Quick-toggle (scanner/uso interno) — sem foto.
  const toggle = (peca) => setMontada(peca, !concluidas[String(peca.id)]);

  // Resultado do scanner CONTÍNUO: encontra a peça pela marca e MARCA montada
  // direto (sem sheet) — fluxo de bipar peça após peça no canteiro.
  const onScan = (codigo) => {
    const alvo = norm(codigo);
    const peca = pecasCampo.find(p => norm(p.marca) === alvo)
            || pecasCampo.find(p => norm(p.marca).includes(alvo) && alvo.length >= 3);
    if (peca) {
      if (concluidas[String(peca.id)]) { toast(`${peca.marca} já montada`, { icon: '✓' }); return; }
      toggle(peca); // marca montada (entity_store) + toast "X montada"
      return;
    }
    // existe na obra mas ainda não está em campo?
    const fora = pecasDaObra.find(p => norm(p.marca) === alvo);
    if (fora) {
      toast(`${fora.marca} está em "${fora.etapa}" — ainda não enviada para montagem`, { icon: '📦' });
      return;
    }
    toast.error(`Peça "${codigo}" não encontrada nesta obra`);
  };

  const confirmarSheet = async (desmarcar = false) => {
    if (!pecaSel) return;
    const id = String(pecaSel.id);
    if (desmarcar) {
      setMontada(pecaSel, false);
      setPecaSel(null); setFotoMont(null);
      return;
    }
    // marcando/atualizando: sobe a foto de evidência (best-effort) e grava
    setSalvandoMont(true);
    let url = null;
    if (fotoMont?.file) {
      url = await uploadFoto(fotoMont.file, 'montagem');
      if (!url) toast('Foto não enviada (peça marcada mesmo assim)', { icon: '⚠️' });
    }
    const qtdTotal = Math.max(1, parseInt(pecaSel.quantidade) || 1);
    setMontada(pecaSel, true, url, qtdTotal > 1 ? unidadesMont : null);
    setSalvandoMont(false);
    setPecaSel(null); setFotoMont(null);
  };

  // Relatório de montagem (CSV): todas as peças montadas da obra (ignora a busca).
  const exportarMontadas = () => {
    const rows = pecasCampo
      .filter(p => concluidas[String(p.id)])
      .map(p => {
        const c = concluidas[String(p.id)] || {};
        const dt = c.montadoEm ? new Date(c.montadoEm).toLocaleString('pt-BR') : '';
        return [p.marca || p.id, p.tipo || '', (Number(p.peso) || 0).toFixed(0), p.quantidade || 1, dt, c.origem || '', c.fotoUrl || ''];
      });
    if (!rows.length) { toast('Nenhuma peça montada para exportar'); return; }
    const obraSlug = (obraSelecionada?.nome || 'geral').replace(/\s+/g, '_').slice(0, 30);
    const dia = new Date().toISOString().slice(0, 10);
    downloadCsv(`montagem_${obraSlug}_${dia}.csv`, ['Marca', 'Tipo', 'Peso (kg)', 'Qtd', 'Montada em', 'Origem', 'Foto'], rows);
    toast.success(`${rows.length} peça(s) exportada(s)`);
  };

  const pecaMontada = pecaSel ? !!concluidas[String(pecaSel.id)] : false;
  const fotoExistente = pecaSel ? concluidas[String(pecaSel.id)]?.fotoUrl : null;

  return (
    <MobileLayout title="Montagem" obraFilter>
      {/* Tabs + busca */}
      <div className="bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => setTab('aguardando')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${tab === 'aguardando' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 border border-slate-800 text-slate-400'}`}
          >Aguardando ({aguardando.length})</button>
          <button
            onClick={() => setTab('montadas')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${tab === 'montadas' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 border border-slate-800 text-slate-400'}`}
          >Montadas ({montadas.length})</button>
        </div>
        <SearchBar value={q} onChange={setQ} placeholder="Buscar marca..." />
        {tab === 'montadas' && montadas.length > 0 && (
          <button
            onClick={exportarMontadas}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-amber-400 active:scale-[.99] transition"
          >
            <Download className="w-4 h-4" /> Exportar relatório (CSV)
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="px-4 pt-3 space-y-2">
        {lista.length === 0 && (
          <EmptyState
            icon={Box}
            title={qd ? 'Nada encontrado' : (tab === 'aguardando' ? 'Sem peças aguardando' : 'Nenhuma peça montada ainda')}
            subtitle={qd ? 'Tente outra marca' : (tab === 'aguardando' ? 'Use o scanner para registrar montagem' : 'Marque peças como montadas na aba Aguardando')}
            actionLabel={q ? 'Limpar busca' : undefined}
            onAction={q ? (() => setQ('')) : undefined}
          />
        )}
        {lista.slice(0, limite).map(p => {
          const isOk = !!concluidas[String(p.id)];
          return (
            <motion.button
              key={p.id}
              onClick={() => {
                tap('light'); setPecaSel(p); setFotoMont(null);
                const qtdT = Math.max(1, parseInt(p.quantidade) || 1);
                const atual = getMontadasCount(concluidas[String(p.id)], qtdT);
                setUnidadesMont(atual > 0 ? atual : qtdT); // default: completar tudo
              }}
              whileTap={{ scale: 0.97 }}
              className={`w-full text-left rounded-2xl border p-3 flex items-center gap-3 transition ${isOk ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900 border-slate-800 hover:border-amber-500/30'}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm ${isOk ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-amber-400'}`}>
                {isOk ? <CheckCircle2 className="w-6 h-6" /> : <Hammer className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">{p.marca || '—'}</div>
                <div className="text-[11px] text-slate-400 truncate">
                  {p.tipo || ''} · qtd {p.quantidade || 1} · {(Number(p.peso) || 0).toFixed(0)} kg
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                {isOk ? (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">MONTADA</span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">TOCAR</span>
                )}
              </div>
            </motion.button>
          );
        })}
        <LoadMore total={lista.length} shown={limite} onMore={() => setLimite(l => l + 40)} />
      </div>

      {/* FAB Escanear */}
      <button
        onClick={() => { tap('light'); setScanOpen(true); }}
        className="fixed right-4 z-30 flex items-center gap-2 px-5 py-3.5 rounded-full bg-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/30 active:scale-95 transition"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}
      >
        <ScanLine className="w-5 h-5" /> Escanear
      </button>

      {/* Scanner */}
      <Scanner open={scanOpen} onClose={() => setScanOpen(false)} onResult={onScan} title="Bipar peças montadas" continuous />

      {/* Sheet de confirmação da peça */}
      <Sheet
        open={!!pecaSel}
        onClose={() => setPecaSel(null)}
        title={pecaSel ? (pecaSel.marca || pecaSel.id) : ''}
        footer={
          pecaSel && (
            <div className="space-y-2">
              <button
                onClick={() => confirmarSheet(false)}
                disabled={salvandoMont}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm active:scale-[.99] transition disabled:opacity-60 bg-emerald-500 text-slate-950"
              >
                {!salvandoMont && <CheckCircle2 className="w-5 h-5" />}
                {salvandoMont
                  ? 'Salvando…'
                  : pecaMontada
                    ? 'Atualizar montagem'
                    : 'Marcar como montada'}
              </button>
              {pecaMontada && (
                <button
                  onClick={() => confirmarSheet(true)}
                  disabled={salvandoMont}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl font-bold text-xs active:scale-[.99] transition disabled:opacity-60 bg-slate-800 text-slate-300 border border-slate-700"
                >
                  <RotateCcw className="w-4 h-4" /> Desmarcar montagem
                </button>
              )}
            </div>
          )
        }
      >
        {pecaSel && (() => {
          const qtdTotal = Math.max(1, parseInt(pecaSel.quantidade) || 1);
          const montadasAtual = getMontadasCount(concluidas[String(pecaSel.id)], qtdTotal);
          const parcial = pecaMontada && montadasAtual > 0 && montadasAtual < qtdTotal;
          return (
          <div className="space-y-4">
            <div className={`rounded-xl px-3 py-2.5 text-sm font-bold flex items-center gap-2 ${pecaMontada ? (parcial ? 'bg-teal-500/15 text-teal-300' : 'bg-emerald-500/15 text-emerald-300') : 'bg-amber-500/15 text-amber-300'}`}>
              {pecaMontada ? <CheckCircle2 className="w-4 h-4" /> : <Hammer className="w-4 h-4" />}
              {pecaMontada
                ? (parcial ? `Montagem parcial — ${montadasAtual}/${qtdTotal}` : 'Montada')
                : 'Aguardando montagem'}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Info label="Tipo" value={pecaSel.tipo || '—'} />
              <Info label="Quantidade" value={String(qtdTotal)} />
              <Info label="Peso" value={`${(Number(pecaSel.peso) || 0).toFixed(0)} kg`} />
              <Info label="Etapa" value={pecaSel.etapa || '—'} />
            </div>
            {/* EDIÇÃO: unidades montadas (peças com mais de 1 unidade) */}
            {qtdTotal > 1 && (
              <div className="bg-slate-800/60 rounded-xl p-3">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
                  Unidades montadas
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { tap('light'); setUnidadesMont(u => Math.max(1, u - 1)); }}
                    className="w-12 h-12 rounded-xl bg-slate-700 text-slate-100 font-black text-xl active:scale-95 transition"
                    aria-label="Diminuir"
                  >−</button>
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-black text-slate-100">{unidadesMont}</span>
                    <span className="text-sm text-slate-400 font-bold"> / {qtdTotal}</span>
                  </div>
                  <button
                    onClick={() => { tap('light'); setUnidadesMont(u => Math.min(qtdTotal, u + 1)); }}
                    className="w-12 h-12 rounded-xl bg-slate-700 text-slate-100 font-black text-xl active:scale-95 transition"
                    aria-label="Aumentar"
                  >+</button>
                  <button
                    onClick={() => { tap('light'); setUnidadesMont(qtdTotal); }}
                    className="px-3 h-12 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold text-xs active:scale-95 transition"
                  >Todas</button>
                </div>
                {unidadesMont < qtdTotal && (
                  <div className="text-[11px] text-teal-300 mt-2">
                    Será gravada como montagem PARCIAL ({unidadesMont}/{qtdTotal}) — aparece em teal no 3D
                  </div>
                )}
              </div>
            )}
            {/* Foto: evidência existente (se montada) ou anexar nova (ao marcar) */}
            {fotoExistente ? (
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">Evidência</div>
                <img src={fotoExistente} alt="evidência da montagem" className="w-full h-40 object-cover rounded-xl border border-slate-700" />
              </div>
            ) : (
              <PhotoInput foto={fotoMont} onChange={setFotoMont} label="Foto da peça montada (opcional)" />
            )}
          </div>
          );
        })()}
      </Sheet>
    </MobileLayout>
  );
}

function Info({ label, value }) {
  return (
    <div className="bg-slate-800/60 rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</div>
      <div className="text-sm font-bold text-slate-100 mt-0.5 truncate">{value}</div>
    </div>
  );
}
