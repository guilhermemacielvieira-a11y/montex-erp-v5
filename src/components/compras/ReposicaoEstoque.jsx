// ============================================================
// ReposicaoEstoque — ponto de compra proativo (estoque mínimo)
// ============================================================
// Lê o estoque atual, aponta os itens no/abaixo do ponto de reposição (mínimo)
// e sugere a quantidade a comprar para repor até o nível-alvo (máximo). Gera um
// PEDIDO DE REPOSIÇÃO (compra em cotação) com os itens selecionados.
// ============================================================
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, PackageX, DollarSign, AlertTriangle, ShoppingCart, Loader2, Bell, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { estoqueApi } from '@/api/supabaseClient';
import { calcularReposicao, linhaParaItemCompra, SEVERIDADE, itensSemPonto } from '@/services/reposicao';
import DefinirPontosReposicao from '@/components/compras/DefinirPontosReposicao';

const fmtNum = (n, u) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + (u ? ` ${u}` : '');
const fmtMoeda = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const hojeLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

function Kpi({ icon: Icon, label, value, sub, tone = 'default' }) {
  const cor = { default: 'text-primary', warn: 'text-amber-600', danger: 'text-red-600', ok: 'text-emerald-600' }[tone];
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-xl font-bold ${cor}`}>{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <Icon className={`h-8 w-8 opacity-70 ${cor}`} />
      </CardContent>
    </Card>
  );
}

export default function ReposicaoEstoque({ addCompra, onGerado }) {
  const [loading, setLoading] = useState(false);
  const [estoque, setEstoque] = useState([]);
  const [sel, setSel] = useState({});
  const [gerando, setGerando] = useState(false);
  const [abrirPontos, setAbrirPontos] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const est = await estoqueApi.getAll();
      setEstoque(est || []);
    } catch (e) {
      toast.error('Erro ao carregar estoque: ' + (e.message || e));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const resultado = useMemo(() => calcularReposicao(estoque), [estoque]);
  const semPonto = useMemo(() => itensSemPonto(estoque).length, [estoque]);

  useEffect(() => {
    const s = {};
    resultado.linhas.forEach((l) => { s[l.id] = true; });
    setSel(s);
  }, [resultado]);

  const selecionadas = resultado.linhas.filter((l) => sel[l.id]);
  const totalSelValor = selecionadas.reduce((s, l) => s + l.custoEstimado, 0);
  const toggle = (id) => setSel((p) => ({ ...p, [id]: !p[id] }));

  const gerar = async () => {
    if (!selecionadas.length) { toast.error('Selecione ao menos um item para gerar o pedido'); return; }
    setGerando(true);
    try {
      const itens = selecionadas.map(linhaParaItemCompra);
      await addCompra({
        id: `COMP-${Date.now()}`,
        obraId: null, // reposição é de fábrica (não obra-específica)
        descricao: `Reposição de estoque — ${itens.length} itens`,
        fornecedor: '',
        valorPrevisto: Math.round(totalSelValor * 100) / 100,
        valorTotal: Math.round(totalSelValor * 100) / 100,
        status: 'cotacao',
        tipo: 'reposicao_estoque',
        documentoOrigem: 'reposicao_estoque',
        dataPedido: hojeLocal(),
        itens,
        observacoes: 'Gerado do ponto de reposição (estoque mínimo). Quantidades sugeridas p/ repor até o nível-alvo (máximo).',
      });
      toast.success(`Pedido de reposição gerado: ${itens.length} itens · ${fmtMoeda(totalSelValor)}`);
      onGerado?.();
    } catch (e) {
      toast.error('Erro ao gerar pedido: ' + (e.message || e));
    } finally { setGerando(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Reposição de Estoque</h3>
          <p className="text-sm text-muted-foreground">Itens no/abaixo do ponto de compra (estoque mínimo), com sugestão para repor até o nível-alvo.</p>
        </div>
        <Button variant="outline" size="icon" onClick={carregar} disabled={loading} title="Atualizar">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /> Analisando estoque…
        </CardContent></Card>
      ) : (
        <>
          {/* Configurar pontos de reposição (mín/máx) em massa */}
          <div>
            <Button variant="outline" size="sm" onClick={() => setAbrirPontos((v) => !v)} className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Definir pontos de reposição
              {semPonto > 0 && <Badge variant="secondary" className="bg-amber-100 text-amber-800">{semPonto} sem mínimo</Badge>}
              <ChevronDown className={`h-4 w-4 transition-transform ${abrirPontos ? 'rotate-180' : ''}`} />
            </Button>
            {abrirPontos && (
              <div className="mt-3">
                <DefinirPontosReposicao estoque={estoque} onSaved={carregar} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Kpi icon={PackageX} label="Itens a repor" value={resultado.itens} sub={`${resultado.criticos} crítico(s)`} tone={resultado.itens ? 'warn' : 'ok'} />
            <Kpi icon={DollarSign} label="Custo estimado" value={fmtMoeda(resultado.totalCusto)} tone="ok" />
            <Kpi icon={AlertTriangle} label="Sem base de preço" value={resultado.semPreco} sub="custo não estimado" tone={resultado.semPreco ? 'danger' : 'default'} />
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">
              <strong>{selecionadas.length}</strong> selecionado(s) · <strong className="text-foreground">{fmtMoeda(totalSelValor)}</strong>
            </p>
            <Button onClick={gerar} disabled={gerando || !selecionadas.length} className="gap-2">
              {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              Gerar pedido de reposição
            </Button>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">Mín.</TableHead>
                    <TableHead className="text-right">Alvo</TableHead>
                    <TableHead className="text-right">Comprar</TableHead>
                    <TableHead className="text-right">R$/un</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Custo estimado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultado.linhas.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                      Nenhum item abaixo do ponto de reposição. Estoque saudável. 🎉
                    </TableCell></TableRow>
                  )}
                  {resultado.linhas.map((l) => {
                    const sev = SEVERIDADE[l.severidade];
                    return (
                      <TableRow key={l.id} className={sel[l.id] ? '' : 'opacity-50'}>
                        <TableCell><input type="checkbox" checked={!!sel[l.id]} onChange={() => toggle(l.id)} className="accent-primary w-4 h-4" /></TableCell>
                        <TableCell>
                          <div className="font-medium text-xs">{l.descricao}</div>
                          {l.codigo && <div className="font-mono text-[10px] text-muted-foreground">{l.codigo}</div>}
                        </TableCell>
                        <TableCell><Badge variant="secondary" className={`text-[10px] ${sev.cor}`}>{sev.label}</Badge></TableCell>
                        <TableCell className="text-right text-xs font-semibold">{fmtNum(l.saldo, l.unidade)}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{fmtNum(l.minimo)}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{fmtNum(l.alvo)}</TableCell>
                        <TableCell className="text-right text-xs font-semibold text-amber-600">{fmtNum(l.sugestao, l.unidade)}</TableCell>
                        <TableCell className="text-right text-xs">{l.temPreco ? fmtMoeda(l.preco) : '—'}</TableCell>
                        <TableCell className="text-xs">{l.fornecedor || <span className="text-muted-foreground italic">a definir</span>}</TableCell>
                        <TableCell className="text-right text-sm font-bold">{fmtMoeda(l.custoEstimado)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
