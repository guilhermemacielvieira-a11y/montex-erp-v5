import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PAGINAS, podeAcessarPagina, primeiraPaginaPermitida, modulosLiberados } from '@/lib/acessoPaginas';

const raiz = path.resolve(__dirname, '..');
const tem = (lista) => (p) => lista.includes('*') || lista.includes(p);

// Perfil real do David (operador de logística) em 29/10/2026
const DAVID = ['producao.view', 'producao.lancar_avanco', 'kanban.view', 'kanban.edit', 'materiais.view',
  'suprimentos.view', 'estoque.view', 'estoque.edit', 'estoque.movimentar', 'compras.view', 'compras.edit',
  'materiais.edit', 'expedicao.view', 'expedicao.edit', 'expedicao.aprovar'];

describe('acessoPaginas', () => {
  it('toda página do pages.config e do menu lateral tem regra', () => {
    const config = fs.readFileSync(path.join(raiz, 'pages.config.js'), 'utf8');
    const bloco = config.slice(config.indexOf('PAGES = {'), config.indexOf('};', config.indexOf('PAGES = {')));
    const paginas = [...bloco.matchAll(/^\s+"?([A-Za-z0-9]+)"?\s*:/gm)].map((m) => m[1]);
    expect(paginas.length).toBeGreaterThan(40);
    const layout = fs.readFileSync(path.join(raiz, 'Layout.jsx'), 'utf8');
    const menu = [...layout.matchAll(/href: '([A-Za-z0-9]+)'/g)].map((m) => m[1]);
    const ignorar = new Set(['mainPage', 'Pages', 'Layout']);
    const faltando = [...new Set([...paginas, ...menu])].filter((p) => !ignorar.has(p) && !PAGINAS[p]);
    expect(faltando).toEqual([]);
  });

  it('David vê só os módulos liberados', () => {
    const pode = (p) => podeAcessarPagina(p, tem(DAVID));
    ['KanbanProducaoIntegrado', 'KanbanCortePage', 'EnviosExpedicaoPage', 'EstoquePage', 'ComprasPage', 'MateriaisPage', 'AnaliseProducaoPage']
      .forEach((p) => expect(pode(p), p).toBe(true));
    ['MontexERP3DPage', 'FinanceiroPage', 'GestaoFinanceiraObra', 'BI360', 'VisaoGeralPage', 'CommandCenterUltra',
      'GestaoUsuariosPage', 'OrcamentosPage', 'RHPage', 'EquipesPage', 'MontagemPage', 'CentralRelatorios', 'PaginaInexistente']
      .forEach((p) => expect(pode(p), p).toBe(false));
    expect(primeiraPaginaPermitida(tem(DAVID), 'CommandCenterUltra')).toBe('KanbanProducaoIntegrado');
    expect(modulosLiberados(tem(DAVID))).toEqual(['Suprimentos', 'Produção', 'Expedição']);
  });

  it('admin abre tudo, inclusive página fora do mapa', () => {
    const admin = tem(['*']);
    Object.keys(PAGINAS).forEach((p) => expect(podeAcessarPagina(p, admin)).toBe(true));
    expect(podeAcessarPagina('PaginaNova', admin)).toBe(true);
    expect(primeiraPaginaPermitida(admin, 'CommandCenterUltra')).toBe('CommandCenterUltra');
  });

  it('sem nenhuma permissão: nenhuma página', () => {
    expect(primeiraPaginaPermitida(tem([]))).toBeNull();
  });
});
