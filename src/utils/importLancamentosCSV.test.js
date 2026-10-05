import { describe, it, expect } from 'vitest';
import { parseCSVLancamentos, chaveLancamento, deduplicarLancamentos, splitCSVLine } from '@/utils/importLancamentosCSV';

const CSV = [
  'Data;Descrição;Valor;Vencimento;Status;Fornecedor',
  '05/10/2026;Chapa A36;1.234,56;20/10/2026;Pago;Gerdau',
  '06/10/2026;Parafusos;R$ 99,90;;;Ciser',
  '2026-10-07;Frete;1234.5;;aprovado;Transp',
  ';Sem valor;0;;;',
].join('\n');

describe('parseCSVLancamentos', () => {
  const rows = parseCSVLancamentos(CSV, { hoje: '2026-10-05', idPrefix: 'T' });
  it('ignora linhas sem valor', () => expect(rows).toHaveLength(3));
  it('valor BR com milhar e vírgula', () => expect(rows[0].valor).toBe(1234.56));
  it('valor com R$', () => expect(rows[1].valor).toBe(99.9));
  it('valor com ponto decimal', () => expect(rows[2].valor).toBe(1234.5));
  it('datas dd/mm/yyyy → ISO', () => {
    expect(rows[0].data).toBe('2026-10-05');
    expect(rows[0].dataVencimento).toBe('2026-10-20');
    expect(rows[2].data).toBe('2026-10-07');
  });
  it('preserva status do arquivo, senão pendente', () => {
    expect(rows[0].status).toBe('pago');
    expect(rows[1].status).toBe('pendente');
    expect(rows[2].status).toBe('aprovado');
  });
  it('cabeçalho com acento é reconhecido', () => expect(rows[0].descricao).toBe('Chapa A36'));
  it('aceita separador vírgula com aspas', () => {
    const r = parseCSVLancamentos('data,descricao,valor\n01/02/2026,"Item, com vírgula","1.000,00"', { hoje: '2026-01-01' });
    expect(r[0]).toMatchObject({ descricao: 'Item, com vírgula', valor: 1000, data: '2026-02-01' });
  });
  it('arquivo vazio → []', () => expect(parseCSVLancamentos('')).toEqual([]));
});

describe('splitCSVLine', () => {
  it('aspas duplas escapadas', () => expect(splitCSVLine('"a ""b""";c', ';')).toEqual(['a "b"', 'c']));
});

describe('deduplicação', () => {
  it('chave normaliza data, valor e descrição', () => {
    expect(chaveLancamento({ data: '05/10/2026', valor: 10, descricao: '  Frete  Açaí ' }))
      .toBe(chaveLancamento({ dataEmissao: '2026-10-05', valor: '10.00', descricao: 'frete acai' }));
  });
  it('separa duplicados contra existentes e dentro do arquivo', () => {
    const existentes = [{ dataEmissao: '2026-10-05', valor: 1234.56, descricao: 'Chapa A36' }];
    const novos = [
      { data: '2026-10-05', valor: 1234.56, descricao: 'chapa a36' },
      { data: '2026-10-06', valor: 5, descricao: 'X' },
      { data: '2026-10-06', valor: 5, descricao: 'X' },
    ];
    const { unicos, duplicados } = deduplicarLancamentos(novos, existentes);
    expect(unicos).toHaveLength(1);
    expect(duplicados).toHaveLength(2);
  });
});
