import { describe, it, expect } from 'vitest';
import { dadosRelatorioRomaneio, htmlRelatorioRomaneio, nomeArquivoRomaneio, pdfRelatorioRomaneio } from './relatorioRomaneio';

const pecas = new Map([
  ['P1__split_enviado_E1', { id: 'P1__split_enviado_E1', marca: 'TS10A', tipo: 'Tesoura', quantidade: 2, peso_total: 200 }],
  ['P2', { id: 'P2', marca: 'C2A<script>', tipo: 'Coluna', quantidade: 1, peso_total: 80 }],
]);
const romaneio = {
  id: 'E1', numeroRomaneio: 'ENV-77', dataExpedicao: '2026-10-29', status: 'PREPARANDO',
  transportadora: 'Transp X', placa: 'RHA1B23', observacoes: 'Descarregar no pátio',
  pecas: [{ id: 'P1__split_enviado_E1', qtd_enviada: 2, qtd_total: 2 }, { id: 'P2' }],
};

describe('relatorioRomaneio', () => {
  it('monta itens com qtd do romaneio e peso proporcional', () => {
    const d = dadosRelatorioRomaneio(romaneio, pecas, 'Obra Teste');
    expect(d.numero).toBe('ENV-77');
    expect(d.data).toBe('29/10/2026');
    expect(d.status).toBe('Preparando');
    expect(d.totalPecas).toBe(2);
    expect(d.totalUn).toBe(3);
    expect(d.totalKg).toBeCloseTo(280);
    expect(d.itens[0].pesoUnit).toBeCloseTo(100);
  });

  it('HTML escapa texto e traz totais e assinaturas', () => {
    const html = htmlRelatorioRomaneio(dadosRelatorioRomaneio(romaneio, pecas, 'Obra Teste'));
    expect(html).toContain('ROMANEIO DE EMBARQUE');
    expect(html).toContain('<h1>ENV-77</h1>');
    expect(html).toContain('C2A&lt;script&gt;');
    expect(html).not.toContain('C2A<script>');
    expect(html).toContain('280,0 kg');
    expect(html).toContain('Recebimento na obra');
  });

  it('nome de arquivo seguro', () => {
    const d = dadosRelatorioRomaneio({ ...romaneio, numeroRomaneio: 'ENV 7/8' }, pecas, 'Obra');
    expect(nomeArquivoRomaneio(d, 'pdf')).toBe('Romaneio_ENV-7-8_29-10-2026.pdf');
  });

  it('HTML com logo usa a imagem; sem logo usa o nome', () => {
    const d = dadosRelatorioRomaneio(romaneio, pecas, 'Obra Teste');
    expect(htmlRelatorioRomaneio(d, { logo: 'data:image/png;base64,AAAA' })).toContain('<img src="data:image/png;base64,AAAA"');
    expect(htmlRelatorioRomaneio(d)).toContain('GRUPO MONTEX');
    expect(htmlRelatorioRomaneio(d)).toContain('Grupo Montex · soluções em aço');
  });

  it('gera PDF', async () => {
    const blob = await pdfRelatorioRomaneio(dadosRelatorioRomaneio(romaneio, pecas, 'Obra Teste'));
    expect(blob.size).toBeGreaterThan(1000);
    const cabecalho = await blob.slice(0, 5).text();
    expect(cabecalho).toBe('%PDF-');
  });

  it('gera PDF com a logo oficial', async () => {
    const { LOGO_FULL_B64 } = await import('@/utils/montexLogos');
    const semLogo = await pdfRelatorioRomaneio(dadosRelatorioRomaneio(romaneio, pecas, 'Obra Teste'));
    const comLogo = await pdfRelatorioRomaneio(dadosRelatorioRomaneio(romaneio, pecas, 'Obra Teste'), { logo: LOGO_FULL_B64 });
    expect(comLogo.size).toBeGreaterThan(semLogo.size + 5000);
  });
});
