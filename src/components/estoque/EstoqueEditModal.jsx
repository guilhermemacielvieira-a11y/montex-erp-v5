// ============================================================
// EstoqueEditModal — edição direta / novo item de estoque
// ============================================================
// Cria ou edita um item de estoque direto na tabela `estoque` (Supabase),
// via estoqueApi (createCrud). Reaproveitado pelos botões "Novo Item" e
// "Editar". Após salvar, chama onSaved() para o pai recarregar (reloadEstoque).
// Campos espelham as colunas reais: codigo/descricao (obrigatórios), categoria,
// quantidade, unidade, minimo, maximo, localizacao, preco, fornecedor,
// material, perfil, peso_kg, obra_id, observacoes.
// ============================================================
import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { estoqueApi } from '@/api/supabaseClient';
import { CATEGORIAS_MATERIAL } from '@/data/database';

const N = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };

export default function EstoqueEditModal({ open, item, obras = [], obraAtual = null, onClose, onSaved }) {
  const ehNovo = !item?.id;
  const [f, setF] = useState({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF({
      codigo: item?.codigo || '',
      descricao: item?.descricao || item?.nome || '',
      categoria: item?.categoria || item?.tipo || '',
      quantidade: item?.quantidade ?? 0,
      unidade: item?.unidade || 'UN',
      minimo: item?.minimo ?? 0,
      maximo: item?.maximo ?? 0,
      localizacao: item?.localizacao || '',
      preco: item?.preco ?? 0,
      fornecedor: item?.fornecedor || '',
      material: item?.material || '',
      perfil: item?.perfil || '',
      peso_kg: item?.peso_kg ?? 0,
      obra_id: item?.obra_id || item?.obraId || (obraAtual || ''),
      observacoes: item?.observacoes || '',
    });
  }, [open, item, obraAtual]);

  if (!open) return null;
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e?.target ? e.target.value : e }));

  const salvar = async () => {
    if (!String(f.codigo).trim()) { toast.error('Informe o código do item'); return; }
    if (!String(f.descricao).trim()) { toast.error('Informe a descrição'); return; }
    setSalvando(true);
    try {
      const payload = {
        codigo: String(f.codigo).trim(),
        descricao: String(f.descricao).trim(),
        categoria: f.categoria || null,
        tipo: f.categoria || null, // mantém tipo em sincronia com categoria (a página lê os dois)
        quantidade: N(f.quantidade),
        unidade: f.unidade || 'UN',
        minimo: N(f.minimo),
        maximo: N(f.maximo),
        localizacao: f.localizacao || null,
        preco: N(f.preco),
        fornecedor: f.fornecedor || null,
        material: f.material || null,
        perfil: f.perfil || null,
        peso_kg: N(f.peso_kg),
        obra_id: f.obra_id || null,
        observacoes: f.observacoes || null,
        updated_at: new Date().toISOString(),
      };
      if (ehNovo) await estoqueApi.create(payload);
      else await estoqueApi.update(item.id, payload);
      toast.success(ehNovo ? 'Item criado no estoque' : 'Item atualizado');
      onSaved?.();
      onClose?.();
    } catch (e) {
      toast.error('Erro ao salvar: ' + (e.message || e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
          <h2 className="text-white font-semibold text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-400" />
            {ehNovo ? 'Novo Item de Estoque' : `Editar — ${item.codigo}`}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Código *"><input value={f.codigo} onChange={set('codigo')} className={inp} placeholder="Ex.: W150X13" /></Campo>
          <Campo label="Descrição *"><input value={f.descricao} onChange={set('descricao')} className={inp} placeholder="Ex.: Perfil W 150x13 - 12m" /></Campo>
          <Campo label="Categoria">
            <select value={f.categoria} onChange={set('categoria')} className={inp}>
              <option value="">— Selecione —</option>
              {CATEGORIAS_MATERIAL.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Campo>
          <Campo label="Material / Perfil"><input value={f.material} onChange={set('material')} className={inp} placeholder="Ex.: ASTM A36" /></Campo>
          <Campo label="Quantidade"><input type="number" inputMode="decimal" value={f.quantidade} onChange={set('quantidade')} className={inp} /></Campo>
          <Campo label="Unidade">
            <select value={f.unidade} onChange={set('unidade')} className={inp}>
              {['UN', 'KG', 'M', 'M2', 'PC', 'BARRA', 'CH', 'L'].map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Campo>
          <Campo label="Mínimo"><input type="number" inputMode="decimal" value={f.minimo} onChange={set('minimo')} className={inp} /></Campo>
          <Campo label="Máximo"><input type="number" inputMode="decimal" value={f.maximo} onChange={set('maximo')} className={inp} /></Campo>
          <Campo label="Preço unitário (R$)"><input type="number" inputMode="decimal" value={f.preco} onChange={set('preco')} className={inp} /></Campo>
          <Campo label="Peso (kg)"><input type="number" inputMode="decimal" value={f.peso_kg} onChange={set('peso_kg')} className={inp} /></Campo>
          <Campo label="Localização"><input value={f.localizacao} onChange={set('localizacao')} className={inp} placeholder="Ex.: Galpão A - Prateleira 3" /></Campo>
          <Campo label="Fornecedor"><input value={f.fornecedor} onChange={set('fornecedor')} className={inp} /></Campo>
          <Campo label="Obra vinculada">
            <select value={f.obra_id} onChange={set('obra_id')} className={inp}>
              <option value="">🏭 MONTEX (Geral — sem obra)</option>
              {obras.map((o) => <option key={o.id} value={o.id}>{o.codigo ? `${o.codigo} · ` : ''}{o.nome}</option>)}
            </select>
          </Campo>
          <Campo label="Observações" full><textarea value={f.observacoes} onChange={set('observacoes')} rows={2} className={inp + ' resize-none'} /></Campo>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-slate-700 sticky bottom-0 bg-slate-900">
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 text-sm">Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-sm flex items-center gap-2 disabled:opacity-60">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {salvando ? 'Salvando…' : (ehNovo ? 'Criar item' : 'Salvar alterações')}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50';

function Campo({ label, children, full }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
