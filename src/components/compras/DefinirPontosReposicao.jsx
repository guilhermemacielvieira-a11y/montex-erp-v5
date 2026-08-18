// ============================================================
// DefinirPontosReposicao — editor em massa de estoque mínimo/máximo
// ============================================================
// Configura o PONTO DE REPOSIÇÃO (mínimo/máximo) de vários itens de uma vez,
// inline. Foca nos itens SEM ponto definido (que não entram no radar), com
// opção de mostrar todos. "Sugerir" preenche a partir do saldo atual. Salva em
// lote só as linhas alteradas e válidas.
// ============================================================
import React, { useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save, Wand2, SlidersHorizontal } from 'lucide-react';
import { estoqueApi } from '@/api/supabaseClient';
import { itensSemPonto, sugerirPontos, validarPontos } from '@/services/reposicao';

const fmtNum = (n, u) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + (u ? ` ${u}` : '');
const inp = 'w-24 bg-background border border-input rounded-md px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-primary/40';

export default function DefinirPontosReposicao({ estoque = [], onSaved }) {
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [edits, setEdits] = useState({});
  const [salvando, setSalvando] = useState(false);

  const linhas = useMemo(() => {
    const base = mostrarTodos ? estoque : itensSemPonto(estoque);
    return [...base].sort((a, b) => String(a.descricao || a.codigo || '').localeCompare(String(b.descricao || b.codigo || ''), 'pt-BR'));
  }, [estoque, mostrarTodos]);

  const semPonto = useMemo(() => itensSemPonto(estoque).length, [estoque]);

  const valOf = (item, campo) => {
    const e = edits[item.id];
    if (e && e[campo] !== undefined) return e[campo];
    return item[campo] ?? 0;
  };
  const setVal = (id, campo, v) => setEdits((p) => ({ ...p, [id]: { ...p[id], [campo]: v } }));

  const sugerir = useCallback((item) => {
    const s = sugerirPontos(item.quantidade);
    setEdits((p) => ({ ...p, [item.id]: { ...p[item.id], minimo: s.minimo, maximo: s.maximo } }));
  }, []);

  const sugerirTodos = () => {
    setEdits((p) => {
      const next = { ...p };
      linhas.forEach((item) => {
        const s = sugerirPontos(item.quantidade);
        next[item.id] = { ...next[item.id], minimo: s.minimo, maximo: s.maximo };
      });
      return next;
    });
  };

  // Linhas alteradas em relação ao valor atual do item.
  const alteradas = useMemo(() => linhas.filter((item) => {
    const e = edits[item.id];
    if (!e) return false;
    const mnDif = e.minimo !== undefined && Number(e.minimo) !== Number(item.minimo ?? 0);
    const mxDif = e.maximo !== undefined && Number(e.maximo) !== Number(item.maximo ?? 0);
    return mnDif || mxDif;
  }), [linhas, edits]);

  const salvar = async () => {
    if (!alteradas.length) { toast.error('Nenhuma alteração para salvar'); return; }
    setSalvando(true);
    try {
      const now = new Date().toISOString();
      let ok = 0, invalidas = 0;
      for (const item of alteradas) {
        const v = validarPontos({ minimo: valOf(item, 'minimo'), maximo: valOf(item, 'maximo') });
        if (!v.ok) { invalidas++; continue; }
        await estoqueApi.update(item.id, { minimo: v.minimo, maximo: v.maximo, updated_at: now });
        ok++;
      }
      if (ok) toast.success(`${ok} item(ns) com ponto de reposição atualizado(s)`);
      if (invalidas) toast.error(`${invalidas} item(ns) ignorado(s) — máximo deve ser ≥ mínimo`);
      setEdits({});
      onSaved?.();
    } catch (e) {
      toast.error('Erro ao salvar pontos: ' + (e.message || e));
    } finally { setSalvando(false); }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Definir pontos de reposição</span>
            {semPonto > 0 && <Badge variant="secondary" className="bg-amber-100 text-amber-800">{semPonto} sem mínimo</Badge>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
              <input type="checkbox" checked={mostrarTodos} onChange={(e) => setMostrarTodos(e.target.checked)} className="accent-primary w-3.5 h-3.5" />
              Mostrar todos
            </label>
            <Button variant="outline" size="sm" onClick={sugerirTodos} className="gap-1.5 h-8"><Wand2 className="h-3.5 w-3.5" /> Sugerir todos</Button>
            <Button size="sm" onClick={salvar} disabled={salvando || !alteradas.length} className="gap-1.5 h-8">
              {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salvar{alteradas.length ? ` (${alteradas.length})` : ''}
            </Button>
          </div>
        </div>

        {linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {mostrarTodos ? 'Sem itens no estoque.' : 'Todos os itens já têm ponto de reposição definido. 🎉'}
          </p>
        ) : (
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead className="text-right">Máximo</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="text-xs font-medium">{item.descricao || item.codigo}</div>
                      {item.codigo && <div className="font-mono text-[10px] text-muted-foreground">{item.codigo}</div>}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{fmtNum(item.quantidade, item.unidade)}</TableCell>
                    <TableCell className="text-right">
                      <input type="number" inputMode="decimal" className={inp} value={valOf(item, 'minimo')} onChange={(e) => setVal(item.id, 'minimo', e.target.value)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <input type="number" inputMode="decimal" className={inp} value={valOf(item, 'maximo')} onChange={(e) => setVal(item.id, 'maximo', e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Sugerir pelo saldo" onClick={() => sugerir(item)}>
                        <Wand2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
