// ============================================================
// Central de Relatórios — aba HISTÓRICO (relatorios_historico)
// ============================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, History, Bot, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listarHistoricoRelatorios, obterHistoricoRelatorio } from '@/api/colaboracaoApi';
import { rotuloTipo, fmtDataHoraBRT } from '@/services/relatoriosCatalogo';
import { Painel, SeloFormato, FaixaErro, Carregando, CLS_BTN, CLS_INPUT } from './relatoriosUi';
import DetalheHistorico from './DetalheHistorico';

export default function AbaHistorico({ idAberto, onAbrir, onFechar, onGerarAtual, nomeObra, versao = 0 }) {
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [filtroOrigem, setFiltroOrigem] = useState('todos');
  const [detalhe, setDetalhe] = useState({ item: null, carregando: false, erro: null });

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setLista(await listarHistoricoRelatorios({ limite: 200 }));
      setErro(null);
    } catch (e) {
      setErro(`Não foi possível carregar o histórico: ${e?.message || e}`);
    } finally {
      setCarregando(false);
    }
  }, []);
  useEffect(() => { carregar(); }, [carregar, versao]);

  // ?historico=<id>: usa a lista se já tiver o item; senão busca direto.
  useEffect(() => {
    if (!idAberto) { setDetalhe({ item: null, carregando: false, erro: null }); return undefined; }
    const local = lista.find((h) => String(h.id) === String(idAberto));
    if (local) { setDetalhe({ item: local, carregando: false, erro: null }); return undefined; }
    let vivo = true;
    setDetalhe({ item: null, carregando: true, erro: null });
    obterHistoricoRelatorio(idAberto)
      .then((it) => { if (vivo) setDetalhe({ item: it, carregando: false, erro: it ? null : 'Relatório não encontrado (pode ter sido removido).' }); })
      .catch((e) => { if (vivo) setDetalhe({ item: null, carregando: false, erro: `Não foi possível abrir o relatório: ${e?.message || e}` }); });
    return () => { vivo = false; };
  }, [idAberto, lista]);

  const filtrada = useMemo(
    () => (filtroOrigem === 'todos' ? lista : lista.filter((h) => (h.origem || 'manual') === filtroOrigem)),
    [lista, filtroOrigem],
  );

  return (
    <Painel className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><History className="h-4 w-4 text-slate-300" aria-hidden /> Relatórios gerados</h2>
        <div className="flex items-center gap-2">
          <label htmlFor="hist-origem" className="sr-only">Filtrar por origem</label>
          <select id="hist-origem" className={cn(CLS_INPUT, 'w-auto py-1.5 text-xs')} value={filtroOrigem} onChange={(e) => setFiltroOrigem(e.target.value)}>
            <option value="todos">Todas as origens</option>
            <option value="manual">Manuais</option>
            <option value="agendado">Agendados</option>
          </select>
          <button type="button" className={CLS_BTN} onClick={carregar} disabled={carregando}>
            <RefreshCw className={cn('h-3.5 w-3.5', carregando && 'animate-spin')} aria-hidden /> Atualizar
          </button>
        </div>
      </div>

      <FaixaErro mensagem={erro} onTentar={carregar} />
      {carregando && !lista.length ? <Carregando texto="Carregando histórico…" /> : !erro && !filtrada.length ? (
        <p className="py-8 text-center text-sm text-slate-400">Nenhum relatório no histórico ainda. Gere um na aba Gerar ou crie um agendamento.</p>
      ) : filtrada.length > 0 && (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full min-w-[720px] text-xs">
            <caption className="sr-only">Histórico de relatórios — clique numa linha para ver o detalhe</caption>
            <thead>
              <tr className="border-b border-slate-700 text-left text-slate-400">
                <th scope="col" className="py-2 pr-3 font-medium">Data</th>
                <th scope="col" className="py-2 pr-3 font-medium">Título</th>
                <th scope="col" className="py-2 pr-3 font-medium">Tipo</th>
                <th scope="col" className="py-2 pr-3 font-medium">Escopo</th>
                <th scope="col" className="py-2 pr-3 font-medium">Formato</th>
                <th scope="col" className="py-2 pr-3 font-medium">Origem</th>
                <th scope="col" className="py-2 font-medium">Gerado por</th>
              </tr>
            </thead>
            <tbody>
              {filtrada.map((h) => {
                const agendado = h.origem === 'agendado';
                return (
                  <tr
                    key={h.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`Abrir ${h.titulo}`}
                    onClick={() => onAbrir(h.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAbrir(h.id); } }}
                    className={cn('cursor-pointer border-b border-slate-800 hover:bg-slate-800/60 focus:bg-slate-800/60 focus:outline-none', String(idAberto) === String(h.id) && 'bg-slate-800/60')}
                  >
                    <td className="py-2 pr-3 whitespace-nowrap text-slate-300 tabular-nums">{fmtDataHoraBRT(h.created_at)}</td>
                    <td className="py-2 pr-3 text-slate-100 font-medium">{h.titulo}</td>
                    <td className="py-2 pr-3 text-slate-300">{rotuloTipo(h.tipo)}</td>
                    <td className="py-2 pr-3 text-slate-300 max-w-[200px] truncate" title={h.escopo_rotulo || ''}>{h.escopo_rotulo || (h.obra_id ? nomeObra(h.obra_id) : 'Geral')}</td>
                    <td className="py-2 pr-3"><SeloFormato formato={h.formato} /></td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <span className={cn('inline-flex items-center gap-1', agendado ? 'text-violet-200' : 'text-slate-300')}>
                        {agendado ? <Bot className="h-3.5 w-3.5" aria-hidden /> : <UserRound className="h-3.5 w-3.5" aria-hidden />}
                        {agendado ? 'Agendado' : 'Manual'}
                      </span>
                    </td>
                    <td className="py-2 text-slate-300">{h.gerado_por_nome || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {lista.length >= 200 && <p className="text-[11px] text-slate-500">Mostrando os 200 mais recentes.</p>}

      <DetalheHistorico
        aberto={!!idAberto}
        item={detalhe.item}
        carregando={detalhe.carregando}
        erro={detalhe.erro}
        onFechar={onFechar}
        onGerarAtual={onGerarAtual}
        nomeObra={nomeObra}
      />
    </Painel>
  );
}
