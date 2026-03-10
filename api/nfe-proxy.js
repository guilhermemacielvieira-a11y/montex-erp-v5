// Vercel Serverless Function — Proxy para consulta NFe via BrasilAPI
// Resolve o problema de CORS ao consultar NFe por chave de acesso

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { chave } = req.query;

  if (!chave || chave.replace(/\D/g, '').length !== 44) {
    return res.status(400).json({ error: 'Chave de acesso invalida. Deve conter 44 digitos.' });
  }

  const chaveClean = chave.replace(/\D/g, '');

  try {
    const response = await fetch(`https://brasilapi.com.br/api/nfe/v1/${chaveClean}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MontexERP/1.0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = 'Erro ao consultar NFe';

      if (response.status === 404) {
        errorMsg = 'NFe nao encontrada. Verifique a chave de acesso.';
      } else if (response.status === 500) {
        errorMsg = 'Servico SEFAZ indisponivel. Tente novamente ou importe via XML.';
      } else if (response.status === 429) {
        errorMsg = 'Muitas requisicoes. Aguarde um momento e tente novamente.';
      }

      return res.status(response.status).json({
        error: errorMsg,
        details: errorText.substring(0, 200)
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error('Erro no proxy NFe:', err.message);
    return res.status(502).json({
      error: 'Erro ao conectar com o servico de consulta NFe. Tente novamente ou importe via XML.',
      details: err.message
    });
  }
}
