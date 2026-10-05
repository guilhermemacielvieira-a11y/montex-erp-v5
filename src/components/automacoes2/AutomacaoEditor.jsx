import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Bell, ListTodo, Smartphone, Plus, Trash2, Info, Loader2, AlertTriangle } from 'lucide-react';
import { GATILHOS, TIPOS_ACAO, PRIORIDADES } from '@/api/colaboracaoApi';
import { SEVERIDADES, PRIORIDADE_ROTULO, ETAPAS_PECA, ROLES_DESTINO, automacaoVazia, descreverParametros } from './automacoesUtils';

const ICONE_ACAO = { notificar: Bell, criar_tarefa: ListTodo, push: Smartphone };
const TODAS = 'todas';
const ROLE_TODOS = 'todos';

function acaoPadrao(tipo) {
  if (tipo === 'criar_tarefa') return { tipo, prioridade: 'alta', prazo_dias: 3, responsavel: '' };
  if (tipo === 'push') return { tipo, destino_role: null };
  return { tipo: 'notificar', severidade: 'medio' };
}

/** Normaliza o objeto vindo do banco/modelo para o formulário. */
function paraForm(inicial, obraSugerida) {
  const base = automacaoVazia(obraSugerida);
  if (!inicial) return base;
  return {
    ...base,
    ...inicial,
    parametros: { ...(inicial.parametros || {}) },
    acoes: Array.isArray(inicial.acoes) && inicial.acoes.length ? inicial.acoes.map((a) => ({ ...a })) : [],
    obra_id: inicial.obra_id ?? (inicial.id ? null : base.obra_id),
    ativa: inicial.ativa !== undefined ? !!inicial.ativa : true,
  };
}

export default function AutomacaoEditor({ open, onOpenChange, inicial, obras = [], obraSugerida = null, onSalvar }) {
  const [form, setForm] = useState(() => paraForm(inicial, obraSugerida));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (open) { setForm(paraForm(inicial, obraSugerida)); setErro(''); setSalvando(false); }
  }, [open, inicial, obraSugerida]);

  const defGatilho = GATILHOS[form.gatilho];
  const obrasOrdenadas = useMemo(
    () => [...obras].sort((a, b) => String(a.nome || a.id).localeCompare(String(b.nome || b.id), 'pt-BR')),
    [obras],
  );

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const setParam = (chave, valor) => setForm((f) => ({ ...f, parametros: { ...f.parametros, [chave]: valor } }));
  const setAcao = (i, mud) => setForm((f) => ({ ...f, acoes: f.acoes.map((a, j) => (j === i ? { ...a, ...mud } : a)) }));
  const removerAcao = (i) => setForm((f) => ({ ...f, acoes: f.acoes.filter((_, j) => j !== i) }));
  const adicionarAcao = (tipo) => setForm((f) => ({ ...f, acoes: [...f.acoes, acaoPadrao(tipo)] }));

  const trocarGatilho = (g) => {
    const def = GATILHOS[g];
    const parametros = {};
    (def?.parametros || []).forEach((p) => { parametros[p.chave] = p.padrao; });
    setForm((f) => ({ ...f, gatilho: g, parametros }));
  };

  const etapasSel = Array.isArray(form.parametros?.etapas) ? form.parametros.etapas : [];
  const alternarEtapa = (v) => {
    const prox = etapasSel.includes(v) ? etapasSel.filter((x) => x !== v) : [...etapasSel, v];
    setParam('etapas', prox);
  };

  const validar = () => {
    if (!form.nome.trim()) return 'Informe o nome da automação.';
    if (!GATILHOS[form.gatilho]) return 'Escolha um gatilho.';
    for (const p of defGatilho?.parametros || []) {
      const n = Number(form.parametros?.[p.chave]);
      if (!Number.isFinite(n) || n < 1) return `"${p.rotulo}" precisa ser um número maior que zero.`;
    }
    if (!form.acoes.length) return 'Adicione ao menos uma ação (notificar, criar tarefa ou push).';
    for (const a of form.acoes) {
      if (a.tipo === 'criar_tarefa') {
        const d = Number(a.prazo_dias);
        if (!Number.isFinite(d) || d < 1) return 'O prazo da tarefa precisa ser de pelo menos 1 dia.';
      }
    }
    return '';
  };

  const salvar = async () => {
    const msg = validar();
    if (msg) { setErro(msg); return; }
    setErro('');
    // Limpa parâmetros: números de verdade; etapas vazias = todas
    const parametros = {};
    (defGatilho?.parametros || []).forEach((p) => { parametros[p.chave] = Number(form.parametros[p.chave]); });
    if (form.gatilho === 'peca_parada' && etapasSel.length) parametros.etapas = etapasSel;
    const acoes = form.acoes.map((a) => {
      if (a.tipo === 'criar_tarefa') {
        const out = { tipo: a.tipo, prioridade: a.prioridade || 'alta', prazo_dias: Number(a.prazo_dias) || 3 };
        if (a.responsavel && a.responsavel.trim()) out.responsavel = a.responsavel.trim();
        return out;
      }
      if (a.tipo === 'push') return a.destino_role ? { tipo: 'push', destino_role: a.destino_role } : { tipo: 'push' };
      const out = { tipo: 'notificar', severidade: a.severidade || 'medio' };
      if (a.destino_role) out.destino_role = a.destino_role;
      return out;
    });
    setSalvando(true);
    try {
      await onSalvar({
        id: form.id, nome: form.nome.trim(), descricao: form.descricao?.trim() || null,
        gatilho: form.gatilho, parametros, acoes, obra_id: form.obra_id || null, ativa: !!form.ativa,
      });
    } catch (e) {
      setErro(e?.message || String(e));
    } finally {
      setSalvando(false);
    }
  };

  const gatilhosPorArea = useMemo(() => {
    const m = {};
    Object.entries(GATILHOS).forEach(([k, g]) => { (m[g.area] = m[g.area] || []).push([k, g]); });
    return m;
  }, []);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!salvando) onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto bg-slate-900 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle>{form.id ? 'Editar automação' : 'Nova automação'}</DialogTitle>
          <DialogDescription className="text-slate-400">
            Quando o gatilho encontrar uma ocorrência, o motor executa as ações abaixo — uma única vez por ocorrência.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Identificação */}
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="auto-nome">Nome <span className="text-red-400" aria-hidden>*</span></Label>
              <Input id="auto-nome" value={form.nome} onChange={(e) => set('nome', e.target.value)}
                placeholder="Ex.: Peças paradas na pintura" className="bg-slate-800 border-slate-700" aria-required="true" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="auto-desc">Descrição</Label>
              <Textarea id="auto-desc" rows={2} value={form.descricao || ''} onChange={(e) => set('descricao', e.target.value)}
                placeholder="Para que serve esta automação?" className="bg-slate-800 border-slate-700" />
            </div>
          </div>

          {/* Gatilho */}
          <fieldset className="rounded-lg border border-slate-700 p-3 space-y-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Quando (gatilho)</legend>
            <div className="space-y-1.5">
              <Label htmlFor="auto-gatilho">Gatilho</Label>
              <Select value={form.gatilho} onValueChange={trocarGatilho}>
                <SelectTrigger id="auto-gatilho" className="bg-slate-800 border-slate-700" aria-label="Gatilho"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(gatilhosPorArea).map(([area, lista]) => (
                    <SelectGroup key={area}>
                      <SelectLabel className="text-[11px] uppercase text-muted-foreground">{area}</SelectLabel>
                      {lista.map(([k, g]) => <SelectItem key={k} value={k}>{g.rotulo}</SelectItem>)}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(defGatilho?.parametros || []).map((p) => (
              <div key={p.chave} className="space-y-1.5">
                <Label htmlFor={`auto-p-${p.chave}`}>{p.rotulo}</Label>
                <Input id={`auto-p-${p.chave}`} type="number" min={1} inputMode="numeric"
                  value={form.parametros?.[p.chave] ?? ''} onChange={(e) => setParam(p.chave, e.target.value)}
                  className="bg-slate-800 border-slate-700 w-32" />
              </div>
            ))}

            {form.gatilho === 'peca_parada' && (
              <div className="space-y-1.5">
                <span className="text-sm font-medium" id="auto-etapas-lbl">Etapas observadas</span>
                <div className="flex flex-wrap gap-2" role="group" aria-labelledby="auto-etapas-lbl">
                  {ETAPAS_PECA.map((e) => {
                    const ativo = etapasSel.includes(e.valor);
                    return (
                      <button key={e.valor} type="button" onClick={() => alternarEtapa(e.valor)} aria-pressed={ativo}
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${ativo ? 'border-blue-500 bg-blue-500/20 text-blue-200' : 'border-slate-600 text-slate-300 hover:bg-slate-800'}`}>
                        {e.rotulo}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500">Nenhuma marcada = fabricação, solda e pintura.</p>
              </div>
            )}

            <p className="text-xs text-slate-400 flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
              <span>Dispara quando: <strong className="text-slate-200">{defGatilho?.rotulo}</strong> — {descreverParametros(form.gatilho, form.parametros)}</span>
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="auto-obra">Obra</Label>
              <Select value={form.obra_id || TODAS} onValueChange={(v) => set('obra_id', v === TODAS ? null : v)}>
                <SelectTrigger id="auto-obra" className="bg-slate-800 border-slate-700" aria-label="Obra"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>Todas as obras</SelectItem>
                  {obrasOrdenadas.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.nome || o.id}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </fieldset>

          {/* Ações */}
          <fieldset className="rounded-lg border border-slate-700 p-3 space-y-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Então (ações)</legend>
            {form.acoes.length === 0 && (
              <p className="text-sm text-orange-300 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" aria-hidden /> Nenhuma ação — adicione ao menos uma.
              </p>
            )}
            {form.acoes.map((a, i) => {
              const Icone = ICONE_ACAO[a.tipo] || Bell;
              return (
                <div key={i} className="rounded-md border border-slate-700 bg-slate-800/60 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Icone className="h-4 w-4 text-blue-400" aria-hidden /> {TIPOS_ACAO[a.tipo] || a.tipo}
                    </span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removerAcao(i)}
                      aria-label={`Remover ação ${TIPOS_ACAO[a.tipo] || a.tipo}`} className="text-red-300 hover:text-red-200 hover:bg-red-500/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {a.tipo === 'notificar' && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor={`a${i}-sev`}>Severidade</Label>
                        <Select value={a.severidade || 'medio'} onValueChange={(v) => setAcao(i, { severidade: v })}>
                          <SelectTrigger id={`a${i}-sev`} className="bg-slate-900 border-slate-700"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {SEVERIDADES.map((s) => <SelectItem key={s.valor} value={s.valor}>{s.rotulo}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`a${i}-role`}>Quem vê (opcional)</Label>
                        <Select value={a.destino_role || ROLE_TODOS} onValueChange={(v) => setAcao(i, { destino_role: v === ROLE_TODOS ? null : v })}>
                          <SelectTrigger id={`a${i}-role`} className="bg-slate-900 border-slate-700"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ROLES_DESTINO.map((r) => <SelectItem key={r.valor} value={r.valor}>{r.rotulo}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {a.tipo === 'criar_tarefa' && (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`a${i}-pri`}>Prioridade</Label>
                        <Select value={a.prioridade || 'alta'} onValueChange={(v) => setAcao(i, { prioridade: v })}>
                          <SelectTrigger id={`a${i}-pri`} className="bg-slate-900 border-slate-700"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PRIORIDADES.map((p) => <SelectItem key={p} value={p}>{PRIORIDADE_ROTULO[p] || p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`a${i}-prazo`}>Prazo (dias)</Label>
                        <Input id={`a${i}-prazo`} type="number" min={1} value={a.prazo_dias ?? ''}
                          onChange={(e) => setAcao(i, { prazo_dias: e.target.value })} className="bg-slate-900 border-slate-700" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`a${i}-resp`}>Responsável (opcional)</Label>
                        <Input id={`a${i}-resp`} value={a.responsavel || ''} placeholder="Ex.: PCP"
                          onChange={(e) => setAcao(i, { responsavel: e.target.value })} className="bg-slate-900 border-slate-700" />
                      </div>
                      <p className="sm:col-span-3 text-[11px] text-slate-500">Cria uma tarefa por ocorrência (até 25 por execução), com origem “automação”.</p>
                    </div>
                  )}

                  {a.tipo === 'push' && (
                    <div className="space-y-2">
                      <div className="space-y-1.5">
                        <Label htmlFor={`a${i}-push`}>Enviar para (opcional)</Label>
                        <Select value={a.destino_role || ROLE_TODOS} onValueChange={(v) => setAcao(i, { destino_role: v === ROLE_TODOS ? null : v })}>
                          <SelectTrigger id={`a${i}-push`} className="bg-slate-900 border-slate-700"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ROLES_DESTINO.map((r) => <SelectItem key={r.valor} value={r.valor}>{r.rotulo}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-[11px] text-yellow-300/90 flex items-start gap-1.5">
                        <Smartphone className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
                        Só chega em quem tem o app iOS registrado.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex flex-wrap gap-2">
              {Object.entries(TIPOS_ACAO).map(([tipo, rotulo]) => {
                const Icone = ICONE_ACAO[tipo] || Plus;
                return (
                  <Button key={tipo} type="button" variant="outline" size="sm" onClick={() => adicionarAcao(tipo)}
                    className="border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800">
                    <Plus className="h-3.5 w-3.5 mr-1" aria-hidden /><Icone className="h-3.5 w-3.5 mr-1" aria-hidden />{rotulo}
                  </Button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex items-center gap-3">
            <Switch id="auto-ativa" checked={!!form.ativa} onCheckedChange={(v) => set('ativa', v)} />
            <Label htmlFor="auto-ativa">{form.ativa ? 'Ativa — roda sozinha de hora em hora' : 'Inativa — não roda automaticamente'}</Label>
          </div>

          {erro && (
            <div role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden /> {erro}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={salvando}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando} className="bg-blue-600 hover:bg-blue-500 text-white">
            {salvando && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden />}
            {form.id ? 'Salvar alterações' : 'Criar automação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
