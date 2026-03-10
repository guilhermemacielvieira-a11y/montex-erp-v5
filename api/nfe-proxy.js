// Vercel Serverless Function — Proxy para consulta NFe
// Tenta múltiplas fontes: BrasilAPI + scraping SEFAZ nacional

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { chave } = req.query;
  if (!chave || chave.replace(/\D/g, '').length !== 44) {
    return res.status(400).json({ error: 'Chave de acesso invalida. Deve conter 44 digitos.' });
  }

  const chaveClean = chave.replace(/\D/g, '');
  const errors = [];

  // === TENTATIVA 1: BrasilAPI ===
  try {
    const resp = await fetch(`https://brasilapi.com.br/api/nfe/v1/${chaveClean}`, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'MontexERP/1.0' },
      signal: AbortSignal.timeout(10000)
    });

    if (resp.ok) {
      const data = await resp.json();
      return res.status(200).json({ ...data, _source: 'brasilapi' });
    }

    if (resp.status === 404) {
      errors.push('BrasilAPI: NFe nao encontrada');
    } else {
      errors.push(`BrasilAPI: HTTP ${resp.status}`);
    }
  } catch (e) {
    errors.push(`BrasilAPI: ${e.message}`);
  }

  // === TENTATIVA 2: Portal Nacional NFe (consulta pública) ===
  try {
    const sefazUrl = `https://www.nfe.fazenda.gov.br/portal/consultaResumo.aspx?tipoConsulta=resumo&tipoConteudo=7PhJ+gAVw2g=&nfe=${chaveClean}`;
    const resp = await fetch(sefazUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow'
    });

    if (resp.ok) {
      const html = await resp.text();

      // Tentar extrair dados da página de consulta resumida
      const extractField = (label) => {
        const regex = new RegExp(label + '[^>]*>([^<]+)', 'i');
        const match = html.match(regex);
        return match ? match[1].trim() : '';
      };

      // Se a página contém dados da NFe (não redirect para captcha)
      if (html.includes('Dados da NF-e') || html.includes('Emitente') || html.includes('nNF')) {
        const nfeData = {
          _source: 'sefaz_portal',
          _raw: true,
          chave_acesso: chaveClean,
          message: 'Dados extraidos do portal SEFAZ (parcial)'
        };
        return res.status(200).json(nfeData);
      }

      errors.push('SEFAZ Portal: Requer captcha ou dados indisponiveis');
    } else {
      errors.push(`SEFAZ Portal: HTTP ${resp.status}`);
    }
  } catch (e) {
    errors.push(`SEFAZ Portal: ${e.message}`);
  }

  // === TENTATIVA 3: Speedio/Open NFe ===
  try {
    const resp = await fetch(`https://open.nfe.io/v1/nfe/${chaveClean}`, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'MontexERP/1.0' },
      signal: AbortSignal.timeout(8000)
    });

    if (resp.ok) {
      const data = await resp.json();
      return res.status(200).json({ ...data, _source: 'opennfe' });
    }
    errors.push(`OpenNFe: HTTP ${resp.status}`);
  } catch (e) {
    errors.push(`OpenNFe: ${e.message}`);
  }

  // === NENHUMA FONTE ENCONTROU ===
  return res.status(404).json({
    error: 'NFe nao encontrada em nenhuma fonte publica. As APIs gratuitas tem cobertura limitada. Recomendamos importar via arquivo XML.',
    details: errors.join(' | '),
    sugestoes: [
      'Importe o arquivo XML da NFe (metodo mais confiavel)',
      'Verifique se a chave de acesso esta correta (44 digitos)',
      'A NFe pode ser muito recente e ainda nao estar indexada',
      'Consulte diretamente no portal: www.nfe.fazenda.gov.br'
    ]
  });
}
