// ============================================================
// Fábrica · Peças — busca por marca, filtro de etapa e de obra
// ============================================================
// Somente leitura. Lista paginada no cliente (50 por vez) sobre as peças
// do contexto (já carregadas com paginação PostgREST — CLAUDE.md 4).
// ============================================================
import React, { useMemo, useState } from 'react';
import { Package, Building2, Check } from 'lucide-react';
import { useProducao } from '@/contexts/ERPContext';
import { pesoPeca, qtdPeca, etapaPeca } from '@/services/relatorioProducao';
import { useDebounced } from '../../ui/useDebounced';
import { Secao, Grupo, Linha, Status, Busca, Abas, Botao, Vazio, Esqueleto } from '../../kit';
import Folha from '../../kit/Folha';
import { num, kg, data, quando } from '../../kit/fmt';
import { useEscopoFabrica, obraIdDe, obraAtiva, FILTRO_ETAPA, casaFiltroEtapa, etapaInfo, normBusca } from './comum';

const PAGINA = 50;

const DATAS_ETAPA = [
  { k: ['dataInicioCorte', 'data_inicio_corte'], rotulo: 'Início do corte' },
  { k: ['dataFimCorte', 'data_fim_corte'], rotulo: 'Fim do corte' },
  { k: ['dataInicioFabricacao', 'data_inicio_fabricacao'], rotulo: 'Entrou em fabricação' },
  { k: ['dataInicioSolda', 'data_inicio_solda'], rotulo: 'Entrou em solda' },
  { k: ['dataInicioPintura', 'data_inicio_pintura'], rotulo: 'Entrou em pintura' },
  { k: ['dataExpedicao', 'data_expedicao'], rotulo: 'Expedida' },
];
const RESPONSAVEIS = [
  { k: ['funcionarioFabricacao', 'funcionario_fabricacao'], rotulo: 'Fabricação' },
  { k: ['funcionarioSolda', 'funcionario_solda'], rotulo: 'Solda' },
  { k: ['funcionarioPintura', 'funcionario_pintura'], rotulo: 'Pintura' },
];
const campo = (p, ks) => { for (const k of ks) if (p?.[k] !== undefined && p[k] !== null && p[k] !== '') return p[k]; return null; };

function DetalhePeca({ peca, nomeObra, nomeFunc, onClose }) {
  if (!peca) return <Folha open={false} onClose={onClose} />;
  const e = etapaPeca(peca);
  const info = etapaInfo(e);
  const q = qtdPeca(peca);
  const pu = Number(peca.pesoUnitario ?? peca.peso_unitario) || (q > 0 ? pesoPeca(peca) / q : 0);
  const datas = DATAS_ETAPA.map((d) => ({ ...d, v: campo(peca, d.k) })).filter((d) => d.v);
  const resp = RESPONSAVEIS.map((r) => ({ ...r, v: campo(peca, r.k) })).filter((r) => r.v);
  return (
    <Folha open onClose={onClose} title={peca.marca || peca.id}>
      <div className="flex items-center justify-between gap-3">
        <Status tom={info.tom}>{info.rotulo}</Status>
        <span className="text-[13px] text-mx-text3">{nomeObra(obraIdDe(peca))}</span>
      </div>
      <Grupo className="mt-4">
        <Linha titulo="Tipo" valor={peca.tipo || peca.nome || '—'} />
        {peca.perfil && peca.perfil !== peca.tipo && <Linha titulo="Perfil" valor={peca.perfil} />}
        <Linha titulo="Quantidade" valor={`${num(q)} un.`} />
        <Linha titulo="Peso unitário" valor={kg(pu)} />
        <Linha titulo="Peso total" valor={kg(pesoPeca(peca))} destaque />
      </Grupo>
      <Secao titulo="Datas das etapas" className="mt-5">
        {datas.length ? (
          <Grupo>
            {datas.map((d) => <Linha key={d.rotulo} titulo={d.rotulo} valor={data(d.v, { ano: true })} valorSub={quando(d.v)} />)}
          </Grupo>
        ) : (
          <p className="px-1 text-[14px] text-mx-text2">Sem datas de etapa registradas na peça.</p>
        )}
      </Secao>
      {resp.length > 0 && (
        <Secao titulo="Responsáveis" className="mt-5">
          <Grupo>
            {resp.map((r) => <Linha key={r.rotulo} titulo={r.rotulo} valor={nomeFunc(r.v)} />)}
          </Grupo>
        </Secao>
      )}
      <p className="mt-5 px-1 pb-2 text-[12px] text-mx-text3">
        Leitura. Para mover etapa ou rastrear o fluxo completo da peça, use o Kanban de produção no computador.
      </p>
    </Folha>
  );
}

export default function AbaPecas({ carregando, funcionarios = [] }) {
  const { pecas = [] } = useProducao();
  const { obras, noEscopo, obraNoEscopo, nomeObra } = useEscopoFabrica();
  const [busca, setBusca] = useState('');
  const termo = useDebounced(busca, 250);
  const [etapa, setEtapa] = useState('todas');
  const [obraFiltro, setObraFiltro] = useState('todas');
  const [folhaObra, setFolhaObra] = useState(false);
  const [limite, setLimite] = useState(PAGINA);
  const [sel, setSel] = useState(null);

  const nomeFunc = useMemo(() => {
    const m = new Map(funcionarios.map((f) => [String(f.id), f.nome || f.name]));
    return (v) => m.get(String(v)) || String(v);
  }, [funcionarios]);

  const base = useMemo(() => pecas.filter(noEscopo), [pecas, noEscopo]);

  const obrasLista = useMemo(() => {
    const cont = new Map();
    base.forEach((p) => { const id = obraIdDe(p); cont.set(id, (cont.get(id) || 0) + 1); });
    return obras
      .filter((o) => obraNoEscopo(o) && obraAtiva(o) && cont.has(o.id))
      .map((o) => ({ ...o, n: cont.get(o.id) }))
      .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));
  }, [obras, base, obraNoEscopo]);

  const filtradas = useMemo(() => {
    const t = normBusca(termo);
    return base
      .filter((p) => obraFiltro === 'todas' || obraIdDe(p) === obraFiltro)
      .filter((p) => casaFiltroEtapa(p, etapa))
      .filter((p) => !t || normBusca(`${p.marca} ${p.nome} ${p.tipo}`).includes(t))
      .sort((a, b) => String(a.marca || '').localeCompare(String(b.marca || ''), 'pt-BR', { numeric: true }));
  }, [base, obraFiltro, etapa, termo]);

  const contagem = useMemo(() => {
    const c = {};
    const daObra = base.filter((p) => obraFiltro === 'todas' || obraIdDe(p) === obraFiltro);
    FILTRO_ETAPA.forEach((f) => { c[f.id] = daObra.filter((p) => casaFiltroEtapa(p, f.id)).length; });
    return c;
  }, [base, obraFiltro]);

  const totalKg = useMemo(() => filtradas.reduce((s, p) => s + pesoPeca(p), 0), [filtradas]);
  const visiveis = filtradas.slice(0, limite);
  const mudar = (fn) => (v) => { fn(v); setLimite(PAGINA); };
  const obraSel = obraFiltro === 'todas' ? null : obras.find((o) => o.id === obraFiltro);

  if (carregando && pecas.length === 0) return <Esqueleto linhas={8} />;

  return (
    <>
      <div className="mt-4 space-y-2">
        <Busca valor={busca} onChange={mudar(setBusca)} placeholder="Buscar marca ou nome" />
        <button
          type="button"
          onClick={() => setFolhaObra(true)}
          className="flex h-11 w-full items-center gap-2 rounded-xl border border-mx-line bg-mx-s1 px-3 text-left text-[14px] text-mx-text active:bg-mx-s2"
          aria-label="Filtrar por obra"
        >
          <Building2 className="h-4 w-4 shrink-0 text-mx-text3" aria-hidden />
          <span className="truncate">{obraSel ? (obraSel.nome || obraSel.codigo) : 'Todas as obras'}</span>
        </button>
      </div>
      <Abas
        className="-mx-4 mt-3 pb-0"
        itens={FILTRO_ETAPA.map((f) => ({ ...f, badge: contagem[f.id] }))}
        valor={etapa}
        onChange={mudar(setEtapa)}
      />

      <Secao
        titulo={`${num(filtradas.length)} ${filtradas.length === 1 ? 'marca' : 'marcas'}`}
        descricao={kg(totalKg)}
        className="mt-4"
      >
        {filtradas.length === 0 ? (
          <Grupo><Vazio icone={Package} titulo="Nenhuma peça encontrada" texto={termo ? 'Confira a marca digitada ou limpe os filtros.' : 'Não há peças nesta combinação de filtros.'} /></Grupo>
        ) : (
          <Grupo>
            {visiveis.map((p) => {
              const info = etapaInfo(etapaPeca(p));
              return (
                <Linha
                  key={p.id}
                  onClick={() => setSel(p)}
                  titulo={p.marca || p.id}
                  sub={`${nomeObra(obraIdDe(p))} · ${num(qtdPeca(p))} un. · ${kg(pesoPeca(p))}`}
                  direita={<Status tom={info.tom}>{info.rotulo}</Status>}
                />
              );
            })}
          </Grupo>
        )}
        {filtradas.length > limite && (
          <Botao variante="secundario" className="mt-3 w-full" onClick={() => setLimite((l) => l + PAGINA)}>
            Mostrar mais ({num(filtradas.length - limite)} restantes)
          </Botao>
        )}
      </Secao>

      <Folha open={folhaObra} onClose={() => setFolhaObra(false)} title="Filtrar por obra">
        <Grupo>
          <Linha
            titulo="Todas as obras"
            sub={`${num(base.length)} marcas`}
            onClick={() => { mudar(setObraFiltro)('todas'); setFolhaObra(false); }}
            chevron={false}
            direita={obraFiltro === 'todas' ? <Check className="h-5 w-5 text-mx-tealhi" aria-label="Selecionada" /> : null}
          />
          {obrasLista.map((o) => (
            <Linha
              key={o.id}
              titulo={o.nome || o.codigo || o.id}
              sub={`${o.codigo ? `${o.codigo} · ` : ''}${num(o.n)} marcas`}
              onClick={() => { mudar(setObraFiltro)(o.id); setFolhaObra(false); }}
              chevron={false}
              direita={obraFiltro === o.id ? <Check className="h-5 w-5 text-mx-tealhi" aria-label="Selecionada" /> : null}
            />
          ))}
        </Grupo>
        {obrasLista.length === 0 && <p className="mt-3 px-1 text-[14px] text-mx-text2">Nenhuma obra ativa com peças no escopo atual.</p>}
      </Folha>

      <DetalhePeca peca={sel} nomeObra={nomeObra} nomeFunc={nomeFunc} onClose={() => setSel(null)} />
    </>
  );
}
