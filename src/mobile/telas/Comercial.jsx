// ============================================================
// COMERCIAL — app da diretoria (/m/comercial)
// ============================================================
// Funil de orçamentos por status (quantidade e valor), conversão,
// orçamentos em aberto e clientes. Leitura: aprovar fica em /m/aprovacoes.
// Valor do orçamento = valor_total (alias do transform; mesmo campo da
// OrcamentosPage).
// ============================================================
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Users, CheckCircle2 } from 'lucide-react';
import { useERP, useOrcamentos, useObras } from '@/contexts/ERPContext';
import { useAuth } from '@/lib/AuthContext';
import { useDebounced } from '../ui/useDebounced';
import { Tela, Abas, Secao, Grupo, Linha, Metrica, Grade, Barra, Status, Busca, Botao, Vazio, Erro, Esqueleto } from '../kit';
import Folha from '../kit/Folha';
import { num, brl, brlc, pct, data, quando, kg } from '../kit/fmt';

const STATUS = {
  rascunho: { rotulo: 'Rascunho', tom: 'neutro' },
  enviado: { rotulo: 'Enviado', tom: 'teal' },
  em_analise: { rotulo: 'Em análise', tom: 'warn' },
  negociacao: { rotulo: 'Negociação', tom: 'warn' },
  aprovado: { rotulo: 'Aprovado', tom: 'ok' },
  perdido: { rotulo: 'Perdido', tom: 'bad' },
};
const ORDEM = ['rascunho', 'enviado', 'em_analise', 'negociacao', 'aprovado', 'perdido'];
const ABERTOS = ['enviado', 'em_analise', 'negociacao'];

const statusDe = (o) => {
  const s = String(o?.status || 'rascunho').toLowerCase();
  return s === 'pendente' ? 'em_analise' : s;
};
const valorDe = (o) => Number(o?.valor_total ?? o?.valorTotal ?? o?.valor) || 0;
const clienteDe = (o) => o?.cliente || o?.clienteNome || o?.cliente_nome || '';
const dataDe = (o) => o?.dataEmissao || o?.data_emissao || o?.createdAt || o?.created_at || '';
const tituloDe = (o) => o?.projeto || o?.nome || o?.numero || 'Orçamento';
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function DetalheOrcamento({ orc, podeAprovar, onClose }) {
  const navigate = useNavigate();
  if (!orc) return <Folha open={false} onClose={onClose} />;
  const st = STATUS[statusDe(orc)] || { rotulo: orc.status, tom: 'neutro' };
  const pesoEst = Number(orc.peso_estimado ?? orc.pesoEstimado) || 0;
  const aberto = ABERTOS.includes(statusDe(orc));
  return (
    <Folha
      open
      onClose={onClose}
      title={tituloDe(orc)}
      footer={aberto && podeAprovar ? (
        <Botao className="mb-1 w-full" icone={CheckCircle2} onClick={() => navigate('/m/aprovacoes')}>
          Decidir em aprovações
        </Botao>
      ) : null}
    >
      <div className="flex items-center justify-between gap-3">
        <Status tom={st.tom}>{st.rotulo}</Status>
        {orc.numero && <span className="text-[13px] text-mx-text3">{orc.numero}</span>}
      </div>
      <div className="mt-4 rounded-[14px] border border-mx-line/60 bg-mx-s2 p-3.5">
        <div className="text-[13px] text-mx-text2">Valor</div>
        <div className="mx-num mt-1 text-[26px] text-mx-text">{brl(valorDe(orc))}</div>
      </div>
      <Grupo className="mt-3">
        <Linha titulo="Cliente" valor={clienteDe(orc) || '—'} />
        {pesoEst > 0 && <Linha titulo="Peso estimado" valor={kg(pesoEst)} valorSub={valorDe(orc) > 0 ? `${brl(valorDe(orc) / pesoEst, 2)}/kg` : undefined} />}
        {dataDe(orc) && <Linha titulo="Emissão" valor={data(dataDe(orc), { ano: true })} valorSub={quando(dataDe(orc))} />}
        {orc.validade && <Linha titulo="Validade" valor={data(orc.validade, { ano: true })} valorSub={quando(orc.validade)} />}
        {orc.probabilidade !== undefined && orc.probabilidade !== null && aberto && <Linha titulo="Probabilidade" valor={pct(orc.probabilidade)} />}
        {orc.responsavel && <Linha titulo="Responsável" valor={orc.responsavel} />}
        {orc.tipo && <Linha titulo="Tipo" valor={orc.tipo} />}
        {orc.regiao && <Linha titulo="Região" valor={orc.regiao} />}
      </Grupo>
      {aberto && !podeAprovar && (
        <p className="mt-3 px-1 text-[12px] text-mx-text3">A aprovação de orçamentos exige a permissão de aprovar orçamentos.</p>
      )}
      <div className="h-2" />
    </Folha>
  );
}

export default function Comercial() {
  const { orcamentos = [] } = useOrcamentos();
  const { obras = [], clientes = [] } = useObras();
  const { dataSource, connectionError } = useERP() || {};
  const { hasPermission } = useAuth() || {};
  const podeAprovar = !hasPermission || hasPermission('orcamentos.aprovar');
  const carregando = dataSource === 'loading';

  const [aba, setAba] = useState('funil');
  const [sel, setSel] = useState(null);
  const [busca, setBusca] = useState('');
  const termo = useDebounced(busca, 250);

  const funil = useMemo(() => {
    const por = Object.fromEntries(ORDEM.map((s) => [s, { n: 0, valor: 0 }]));
    orcamentos.forEach((o) => {
      const s = statusDe(o);
      if (!por[s]) por[s] = { n: 0, valor: 0 };
      por[s].n += 1; por[s].valor += valorDe(o);
    });
    const ap = por.aprovado.n, pe = por.perdido.n;
    const apV = por.aprovado.valor, peV = por.perdido.valor;
    const abertos = ABERTOS.reduce((t, s) => ({ n: t.n + por[s].n, valor: t.valor + por[s].valor }), { n: 0, valor: 0 });
    const ponderado = orcamentos.filter((o) => ABERTOS.includes(statusDe(o)))
      .reduce((s, o) => s + valorDe(o) * ((Number(o.probabilidade ?? 50) || 0) / 100), 0);
    const maxValor = Math.max(1, ...ORDEM.map((s) => por[s].valor));
    return {
      por, abertos, ponderado, maxValor,
      conversao: ap + pe > 0 ? (ap / (ap + pe)) * 100 : null,
      conversaoValor: apV + peV > 0 ? (apV / (apV + peV)) * 100 : null,
      decididos: ap + pe,
    };
  }, [orcamentos]);

  const abertos = useMemo(() => orcamentos
    .filter((o) => ABERTOS.includes(statusDe(o)))
    .sort((a, b) => String(dataDe(b)).localeCompare(String(dataDe(a)))), [orcamentos]);

  const listaClientes = useMemo(() => {
    const obrasPorCliente = new Map();
    const chave = (v) => norm(v);
    obras.forEach((o) => {
      const ks = new Set([o.clienteId, o.cliente_id].filter(Boolean).map(String));
      [o.cliente, o.clienteNome, o.cliente_nome, o.endereco?.meta?.cliente_nome].filter(Boolean).forEach((n) => ks.add(`n:${chave(n)}`));
      ks.forEach((k) => obrasPorCliente.set(k, (obrasPorCliente.get(k) || 0) + 1));
    });
    const orcPorCliente = new Map();
    orcamentos.forEach((o) => {
      const k = `n:${chave(clienteDe(o))}`;
      if (!orcPorCliente.has(k)) orcPorCliente.set(k, { n: 0, abertos: 0 });
      const c = orcPorCliente.get(k);
      c.n += 1; if (ABERTOS.includes(statusDe(o))) c.abertos += 1;
    });
    const t = norm(termo);
    return clientes
      .map((c) => {
        const nome = c.nome || c.nomeFantasia || c.razaoSocial || c.razao_social || 'Sem nome';
        const kNome = `n:${chave(nome)}`;
        const nObras = Math.max(obrasPorCliente.get(String(c.id)) || 0, obrasPorCliente.get(kNome) || 0);
        return { id: c.id, nome, cidade: c.cidade, cnpj: c.cnpj, nObras, orc: orcPorCliente.get(kNome) || { n: 0, abertos: 0 } };
      })
      .filter((c) => !t || norm(`${c.nome} ${c.cidade || ''} ${c.cnpj || ''}`).includes(t))
      .sort((a, b) => b.nObras - a.nObras || a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [clientes, obras, orcamentos, termo]);

  return (
    <Tela
      titulo="Comercial"
      voltar="/m/mais"
      cabecalhoExtra={<Abas itens={[{ id: 'funil', rotulo: 'Orçamentos', badge: funil.abertos.n }, { id: 'clientes', rotulo: 'Clientes' }]} valor={aba} onChange={setAba} />}
    >
      {dataSource === 'error' && <Erro texto={connectionError || 'Não foi possível carregar os dados comerciais.'} onTentar={() => window.location.reload()} />}
      {carregando && orcamentos.length === 0 ? <Esqueleto metricas={4} linhas={5} /> : aba === 'funil' ? (
        <>
          <Secao titulo="Resumo">
            <Grade>
              <Metrica rotulo="Em aberto" valor={brlc(funil.abertos.valor)} sub={`${num(funil.abertos.n)} ${funil.abertos.n === 1 ? 'orçamento' : 'orçamentos'}`} />
              <Metrica rotulo="Ponderado" valor={brlc(funil.ponderado)} sub="pela probabilidade" />
              <Metrica rotulo="Aprovado" valor={brlc(funil.por.aprovado.valor)} sub={`${num(funil.por.aprovado.n)} fechados`} tom="ok" />
              <Metrica
                rotulo="Conversão"
                valor={funil.conversao === null ? '—' : pct(funil.conversao)}
                sub={funil.decididos ? `aprovados ÷ decididos (${num(funil.decididos)})` : 'sem orçamentos decididos'}
                tom={funil.conversao === null ? undefined : funil.conversao >= 30 ? 'ok' : 'warn'}
              />
            </Grade>
            {funil.conversaoValor !== null && (
              <p className="mt-2 px-1 text-[12px] text-mx-text3">Em valor, {pct(funil.conversaoValor)} do que foi decidido virou contrato.</p>
            )}
          </Secao>

          <Secao titulo="Funil por status">
            {orcamentos.length === 0 ? (
              <Grupo><Vazio icone={FileText} titulo="Nenhum orçamento" texto="Os orçamentos cadastrados no computador aparecem aqui." /></Grupo>
            ) : (
              <Grupo>
                {ORDEM.map((s) => {
                  const l = funil.por[s];
                  return (
                    <div key={s} className="px-4 py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <Status tom={STATUS[s].tom}>{STATUS[s].rotulo}</Status>
                        <span className="mx-tab text-[15px] font-semibold text-mx-text">{brlc(l.valor)}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1"><Barra valor={l.valor} max={funil.maxValor} tom={STATUS[s].tom} altura={6} rotulo={STATUS[s].rotulo} /></div>
                        <span className="mx-tab w-14 shrink-0 text-right text-[13px] text-mx-text2">{num(l.n)} {l.n === 1 ? 'orç.' : 'orçs.'}</span>
                      </div>
                    </div>
                  );
                })}
              </Grupo>
            )}
          </Secao>

          <Secao
            titulo="Em aberto"
            descricao="enviados, em análise e em negociação"
            acao={podeAprovar && abertos.length ? { rotulo: 'Aprovações', to: '/m/aprovacoes' } : undefined}
          >
            {abertos.length === 0 ? (
              <Grupo><Vazio icone={FileText} titulo="Nada em aberto" texto="Nenhum orçamento aguardando o cliente." /></Grupo>
            ) : (
              <Grupo>
                {abertos.map((o) => {
                  const st = STATUS[statusDe(o)];
                  return (
                    <Linha
                      key={o.id}
                      onClick={() => setSel(o)}
                      titulo={tituloDe(o)}
                      sub={`${clienteDe(o) || 'Sem cliente'}${dataDe(o) ? ` · ${data(dataDe(o))}` : ''}`}
                      valor={brlc(valorDe(o))}
                      valorSub={<Status tom={st.tom} className="text-[12px]">{st.rotulo}</Status>}
                    />
                  );
                })}
              </Grupo>
            )}
          </Secao>
        </>
      ) : (
        <>
          <Busca valor={busca} onChange={setBusca} placeholder="Buscar cliente, cidade ou CNPJ" className="mt-4" />
          <Secao titulo={`${num(listaClientes.length)} ${listaClientes.length === 1 ? 'cliente' : 'clientes'}`} className="mt-4">
            {listaClientes.length === 0 ? (
              <Grupo><Vazio icone={Users} titulo={termo ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'} texto={termo ? 'Confira o termo digitado.' : 'O cadastro de clientes fica no computador.'} /></Grupo>
            ) : (
              <Grupo>
                {listaClientes.map((c) => (
                  <Linha
                    key={c.id}
                    titulo={c.nome}
                    sub={[c.cidade, c.orc.n ? `${num(c.orc.n)} ${c.orc.n === 1 ? 'orçamento' : 'orçamentos'}${c.orc.abertos ? `, ${num(c.orc.abertos)} em aberto` : ''}` : null].filter(Boolean).join(' · ') || 'Sem orçamentos'}
                    valor={num(c.nObras)}
                    valorSub={c.nObras === 1 ? 'obra' : 'obras'}
                  />
                ))}
              </Grupo>
            )}
          </Secao>
        </>
      )}

      <DetalheOrcamento orc={sel} podeAprovar={podeAprovar} onClose={() => setSel(null)} />
    </Tela>
  );
}
