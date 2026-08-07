// ============================================================
// AbastecimentoAutomatico — pedido futuro a partir do BOM × estoque
// ============================================================
// Para a obra selecionada: agrega a lista de materiais (materiais_corte),
// desconta o estoque disponível e estima o preço de cada perfil pela base de
// ÚLTIMOS VALORES lançados em materiais parecidos (estoque + movimentações de
// entrada + NFs). Gera um PEDIDO FUTURO (compra em cotação) com a estimativa.
// ============================================================
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sparkles, RefreshCw, Package, Weight, DollarSign, AlertTriangle, ShoppingCart, Loader2, Building2, TrendingUp } from 'lucide-react';
import { materiaisCorteApi, estoqueApi, movEstoqueApi } from '@/api/supabaseClient';
import { construirHistoricoPrecos, montarAbastecimento, agruparPorFornecedor } from '@/services/abastecimento';

const ESTRATEGIAS = [
  { value: 'ultimo', label: 'Último preço', hint: 'preço da entrada mais recente' },
  { value: 'media', label: 'Média', hint: 'média dos lançamentos do perfil' },
  { value: 'menor', label: 'Menor preço', hint: 'menor valor já pago' },
];

const fmtKg = (n) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' kg';
const fmtMoeda = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const hojeLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const FONTE_COR = {
  estoque: 'bg-blue-100 text-blue-800', movimentacao: 'bg-emerald-100 text-emerald-800',
  nf: 'bg-purple-100 text-purple-800', media_material: 'bg-amber-100 text-amber-800',
  media_geral: 'bg-orange-100 text-orange-800', sem_base: 'bg-red-100 text-red-800',
};

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

export default function AbastecimentoAutomatico({ obras = [], obraAtual, notasFiscais = [], addCompra, onGerado }) {
  const [obraId, setObraId] = useState(obraAtual || '');
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState({ bom: [], estoque: [], mov: [] });
  const [sel, setSel] = useState({});
  const [gerando, setGerando] = useState(false);
  const [estrategia, setEstrategia] = useState('ultimo');
  const [agrupar, setAgrupar] = useState(false);

  const carregar = useCallback(async (oid) => {
    if (!oid) { setDados({ bom: [], estoque: [], mov: [] }); return; }
    setLoading(true);
    try {
      const [bom, estoque, mov] = await Promise.all([
        materiaisCorteApi.getByField('obra_id', oid),
        estoqueApi.getAll(),
        movEstoqueApi.getAll(),
      ]);
      setDados({ bom: bom || [], estoque: estoque || [], mov: mov || [] });
    } catch (e) {
      toast.error('Erro ao carregar dados: ' + (e.message || e));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(obraId); }, [obraId, carregar]);

  const resultado = useMemo(() => {
    const historico = construirHistoricoPrecos({ movimentacoes: dados.mov, estoque: dados.estoque, notasFiscais });
    return montarAbastecimento({ bom: dados.bom, estoque: dados.estoque, historico, estrategia });
  }, [dados, notasFiscais, estrategia]);

  const aComprar = useMemo(() => resultado.linhas.filter((l) => l.pesoFalta > 0), [resultado]);
  const grupos = useMemo(() => agruparPorFornecedor(aComprar), [aComprar]);

  useEffect(() => {
    const s = {};
    aComprar.forEach((l) => { s[`${l.perfil}|${l.material}`] = true; });
    setSel(s);
  }, [aComprar]);

  const selecionadas = aComprar.filter((l) => sel[`${l.perfil}|${l.material}`]);
  const totalSelValor = selecionadas.reduce((s, l) => s + l.valorEstimado, 0);
  const totalSelPeso = selecionadas.reduce((s, l) => s + l.pesoFalta, 0);
  const toggle = (k) => setSel((p) => ({ ...p, [k]: !p[k] }));

  const mapItem = (l) => ({
    descricao: `${l.perfil} — ${l.material}`,
    perfil: l.perfil, material: l.material,
    quantidade: l.pesoFalta, unidade: 'kg',
    precoUnitario: l.precoKg, valorTotal: l.valorEstimado,
    fontePreco: l.fonteLabel, fornecedorSugerido: l.fornecedorSugerido || '',
  });
  const estrategiaLabel = ESTRATEGIAS.find((e) => e.value === estrategia)?.label || estrategia;

  const gerar = async () => {
    if (!selecionadas.length) { toast.error('Selecione ao menos um item para gerar o pedido'); return; }
    setGerando(true);
    try {
      const o = obras.find((x) => x.id === obraId);
      const obraNome = o?.codigo || o?.nome || obraId;
      const obsBase = `Gerado do BOM × estoque · preço por "${estrategiaLabel}" (base: estoque / movimentações / NFs).`;

      // Um pedido por FORNECEDOR sugerido (agrupar) ou um pedido único.
      const pedidos = agrupar
        ? agruparPorFornecedor(selecionadas).map((g) => ({
            fornecedor: g.fornecedor === 'A definir' ? '' : g.fornecedor,
            fornecedorLabel: g.fornecedor,
            linhas: g.linhas, valor: g.valor, peso: g.peso,
          }))
        : [{ fornecedor: '', fornecedorLabel: '', linhas: selecionadas, valor: totalSelValor, peso: totalSelPeso }];

      let seq = 0;
      for (const p of pedidos) {
        seq += 1;
        const itens = p.linhas.map(mapItem);
        const sufixo = agrupar && p.fornecedorLabel ? ` · ${p.fornecedorLabel}` : '';
        await addCompra({
          id: `COMP-${Date.now()}-${seq}`,
          obraId,
          descricao: `Abastecimento automático — ${obraNome}${sufixo} (${itens.length} itens)`,
          fornecedor: p.fornecedor,
          valorPrevisto: Math.round(p.valor * 100) / 100,
          valorTotal: Math.round(p.valor * 100) / 100,
          pesoTotalKg: Math.round(p.peso * 100) / 100,
          status: 'cotacao',
          tipo: 'abastecimento_automatico',
          documentoOrigem: 'abastecimento_automatico',
          dataPedido: hojeLocal(),
          itens,
          observacoes: agrupar && p.fornecedorLabel ? `${obsBase} Fornecedor sugerido: ${p.fornecedorLabel}.` : obsBase,
        });
      }
      toast.success(
        agrupar
          ? `${pedidos.length} pedido(s) por fornecedor · ${fmtMoeda(totalSelValor)}`
          : `Pedido futuro gerado: ${selecionadas.length} itens · ${fmtMoeda(totalSelValor)}`
      );
      onGerado?.();
    } catch (e) {
      toast.error('Erro ao gerar pedido: ' + (e.message || e));
    } finally { setGerando(false); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Abastecimento Automático (Pedido Futuro)
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Cruza a lista de materiais da obra com o estoque e estima o que comprar pelos últimos preços de materiais parecidos.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={obraId} onValueChange={setObraId}>
                <SelectTrigger className="w-[280px]">
                  <Building2 className="h-4 w-4 mr-1" />
                  <SelectValue placeholder="Selecione a obra" />
                </SelectTrigger>
                <SelectContent>
                  {(obras || []).map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.codigo ? `${o.codigo} · ` : ''}{o.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => carregar(obraId)} disabled={loading} title="Atualizar">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {!obraId ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Selecione uma obra para gerar a sugestão de compra.
        </CardContent></Card>
      ) : loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /> Calculando abastecimento…
        </CardContent></Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi icon={Package} label="Itens a comprar" value={resultado.itensAComprar} sub={`${resultado.comCobertura} já cobertos pelo estoque`} />
            <Kpi icon={Weight} label="Peso a comprar" value={fmtKg(resultado.totalPesoFalta)} tone="warn" />
            <Kpi icon={DollarSign} label="Valor estimado" value={fmtMoeda(resultado.totalValor)} tone="ok" />
            <Kpi icon={AlertTriangle} label="Sem base de preço" value={resultado.semPreco} sub="usam média geral" tone={resultado.semPreco ? 'danger' : 'default'} />
          </div>

          {/* Estratégia de preço + agrupamento */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Estimar por:</span>
              <Select value={estrategia} onValueChange={setEstrategia}>
                <SelectTrigger className="w-[190px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ESTRATEGIAS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      <span className="font-medium">{e.label}</span>
                      <span className="text-muted-foreground text-xs ml-1">· {e.hint}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={agrupar} onChange={(e) => setAgrupar(e.target.checked)} className="accent-primary w-4 h-4" />
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Agrupar por fornecedor sugerido
              {agrupar && <Badge variant="secondary" className="ml-1">{grupos.length} pedido(s)</Badge>}
            </label>
          </div>

          {/* Resumo por fornecedor (quando agrupado) */}
          {agrupar && grupos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {grupos.map((g) => (
                <Badge key={g.fornecedor} variant="outline" className="gap-1 py-1 px-2">
                  <Building2 className="h-3 w-3" />
                  <span className="font-medium">{g.fornecedor}</span>
                  <span className="text-muted-foreground">· {g.linhas.length} itens · {fmtKg(g.peso)} · {fmtMoeda(g.valor)}</span>
                </Badge>
              ))}
            </div>
          )}

          {/* Ação */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">
              <strong>{selecionadas.length}</strong> selecionado(s) · {fmtKg(totalSelPeso)} · <strong className="text-foreground">{fmtMoeda(totalSelValor)}</strong>
            </p>
            <Button onClick={gerar} disabled={gerando || !selecionadas.length} className="gap-2">
              {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              {agrupar ? 'Gerar pedidos por fornecedor' : 'Gerar pedido futuro'}
            </Button>
          </div>

          {/* Tabela */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Necessário</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead className="text-right">Falta</TableHead>
                    <TableHead className="text-right">R$/kg</TableHead>
                    <TableHead>Base preço</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Valor estimado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aComprar.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                      Nenhum material faltando — o estoque cobre o BOM desta obra. 🎉
                    </TableCell></TableRow>
                  )}
                  {aComprar.map((l) => {
                    const k = `${l.perfil}|${l.material}`;
                    return (
                      <TableRow key={k} className={sel[k] ? '' : 'opacity-50'}>
                        <TableCell><input type="checkbox" checked={!!sel[k]} onChange={() => toggle(k)} className="accent-primary w-4 h-4" /></TableCell>
                        <TableCell className="font-mono text-xs font-medium">{l.perfil}</TableCell>
                        <TableCell className="text-xs">{l.material}</TableCell>
                        <TableCell className="text-right text-xs">{fmtKg(l.pesoNecessario)}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{l.pesoEstoque ? fmtKg(l.pesoEstoque) : '—'}</TableCell>
                        <TableCell className="text-right text-xs font-semibold text-amber-600">{fmtKg(l.pesoFalta)}</TableCell>
                        <TableCell className="text-right text-xs">{l.precoKg ? fmtMoeda(l.precoKg) : '—'}</TableCell>
                        <TableCell><Badge variant="secondary" className={`text-[10px] ${FONTE_COR[l.fonte] || ''}`}>{l.fonteLabel}</Badge></TableCell>
                        <TableCell className="text-xs">{l.fornecedorSugerido || <span className="text-muted-foreground italic">a definir</span>}</TableCell>
                        <TableCell className="text-right text-sm font-bold">{fmtMoeda(l.valorEstimado)}</TableCell>
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
