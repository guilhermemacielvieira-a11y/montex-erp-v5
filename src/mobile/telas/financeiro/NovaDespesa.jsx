// ============================================================
// Financeiro > Nova despesa (fábrica) — Folha de cadastro
// ============================================================
// Regra 1: despesa da FÁBRICA, sem campo de obra (obraId sempre null).
// Regra 2: o status escolhido no form é preservado.
// ============================================================
import React, { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { useLancamentos } from '@/contexts/ERPContext';
import { parseValorBR } from '@/utils/financeiroCalc';
import Folha from '../../kit/Folha';
import { Campo, Botao, classeInput } from '../../kit';
import { cn } from '@/lib/utils';
import { ensureOnline } from '../../ui/online';
import { confirmarBiometria } from '../../ui/biometric';
import { success, tap } from '../../ui/haptics';
import { hojeLocalISO } from '../../ui/format';

const vazio = () => ({ descricao: '', fornecedor: '', categoria: '', valor: '', dataVencimento: hojeLocalISO(), status: 'pendente' });

export default function NovaDespesa({ open, onClose }) {
  const { lancamentosDespesas = [], addLancamento, deleteLancamento } = useLancamentos();
  const [form, setForm] = useState(vazio);
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);

  const categorias = useMemo(() => {
    const s = new Set();
    (lancamentosDespesas || []).forEach((l) => { const c = String(l?.categoria || '').trim(); if (c) s.add(c); });
    return [...s].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [lancamentosDespesas]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const fechar = () => { if (salvando) return; setErros({}); setForm(vazio()); onClose?.(); };

  const salvar = async () => {
    const valor = parseValorBR(form.valor);
    const e = {};
    if (!form.descricao.trim()) e.descricao = 'Informe a descrição';
    if (!(valor > 0)) e.valor = 'Informe um valor maior que zero';
    if (!form.dataVencimento) e.dataVencimento = 'Informe o vencimento';
    setErros(e);
    if (Object.keys(e).length) return;
    if (salvando || !ensureOnline()) return;
    tap();
    setSalvando(true);
    if (!(await confirmarBiometria('Confirmar cadastro da despesa'))) {
      setSalvando(false);
      toast.error('Autenticação não confirmada');
      return;
    }
    const hoje = hojeLocalISO();
    const status = form.status || 'pendente';
    const id = `desp-${Date.now()}`;
    try {
      await addLancamento({
        id,
        tipo: 'despesa',
        obraId: null,
        descricao: form.descricao.trim(),
        fornecedor: form.fornecedor.trim() || undefined,
        categoria: form.categoria || 'Outros',
        valor,
        dataEmissao: hoje,
        dataVencimento: form.dataVencimento,
        status,
        ...(status === 'pago' ? { dataPagamento: hoje } : {}),
      });
      success();
      toast.success('Despesa cadastrada');
      setForm(vazio());
      setErros({});
      onClose?.();
    } catch (err) {
      // O contexto mostra a despesa antes do banco confirmar: tira da tela.
      deleteLancamento?.(id).catch(() => {});
      toast.error(`A despesa não foi cadastrada: ${err?.message || 'erro de conexão'}`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Folha
      open={open}
      onClose={fechar}
      title="Nova despesa da fábrica"
      footer={<Botao className="mb-1 w-full" icone={Plus} carregando={salvando} onClick={salvar}>Cadastrar despesa</Botao>}
    >
      <div className="space-y-4">
        <Campo rotulo="Descrição" erro={erros.descricao}>
          <input className={classeInput} value={form.descricao} onChange={set('descricao')} placeholder="Ex.: energia elétrica outubro" autoComplete="off" />
        </Campo>
        <Campo rotulo="Fornecedor">
          <input className={classeInput} value={form.fornecedor} onChange={set('fornecedor')} placeholder="Opcional" autoComplete="off" />
        </Campo>
        <Campo rotulo="Categoria" ajuda={categorias.length ? undefined : 'Sem categorias cadastradas; será gravada como Outros'}>
          <select className={classeInput} value={form.categoria} onChange={set('categoria')}>
            <option value="">Outros</option>
            {categorias.filter((c) => c !== 'Outros').map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Valor (R$)" erro={erros.valor}>
            <input className={classeInput} value={form.valor} onChange={set('valor')} inputMode="decimal" placeholder="0,00" />
          </Campo>
          <Campo rotulo="Vencimento" erro={erros.dataVencimento}>
            <input className={classeInput} type="date" value={form.dataVencimento} onChange={set('dataVencimento')} />
          </Campo>
        </div>
        <div>
          <span className="mb-1.5 block text-[14px] font-medium text-mx-text2">Situação</span>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Situação">
            {[{ id: 'pendente', rotulo: 'Pendente' }, { id: 'pago', rotulo: 'Pago' }].map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={form.status === s.id}
                onClick={() => setForm((f) => ({ ...f, status: s.id }))}
                className={cn('h-12 rounded-xl border text-[15px] font-medium',
                  form.status === s.id ? 'border-mx-teal bg-mx-teal text-white' : 'border-mx-line bg-mx-s1 text-mx-text2 active:bg-mx-s2')}
              >
                {s.rotulo}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[12px] text-mx-text3">Despesa da fábrica. Material de obra é lançado na gestão financeira da obra.</p>
      </div>
    </Folha>
  );
}
