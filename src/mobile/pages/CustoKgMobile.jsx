// ============================================================
// CUSTO/KG MOBILE — custo da fábrica por kg, equilíbrio, 2027 e
// margem estimada por obra. Mesma aba do BI 360 (AbaCustoKg), com os
// mesmos dados (useBIData) — layout já responsivo para o celular.
// ============================================================
import React from 'react';
import { RefreshCw } from 'lucide-react';
import MobileLayout from '../MobileLayout';
import { useBIData } from '@/hooks/useBIData';
import AbaCustoKg from '@/components/bi/abas/AbaCustoKg';
import { Skeleton } from '@/components/ui/skeleton';

export default function CustoKgMobile() {
  const dados = useBIData();
  const primeiraCarga = dados.carregando && !dados.atualizadoEm && !dados.erro;
  const hora = dados.atualizadoEm
    ? dados.atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <MobileLayout title="Custo por kg" back>
      <div className="space-y-3 px-3 pb-6 pt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-400">{hora ? `Atualizado às ${hora}` : 'Carregando…'}</p>
          <button
            type="button"
            onClick={() => dados.recarregar()}
            disabled={dados.carregando}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-100 active:opacity-80 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${dados.carregando ? 'animate-spin' : ''}`} aria-hidden /> Atualizar
          </button>
        </div>
        {dados.erro && (
          <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-100">
            Não foi possível carregar o histórico de produção ({dados.erro}). Sem ele o custo por kg não é calculado.
          </div>
        )}
        {primeiraCarga ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-20 w-full bg-slate-800/70" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 bg-slate-800/70" />)}
            </div>
            <Skeleton className="h-64 w-full bg-slate-800/70" />
          </div>
        ) : (
          <AbaCustoKg dados={dados} />
        )}
      </div>
    </MobileLayout>
  );
}
