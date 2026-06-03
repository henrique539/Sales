// Proxy direto para Salesforce MCP — executa SOQL queries
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);
    const { q } = body;
    if (!q) return res.status(400).json({ error: 'Missing query' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        mcp_servers: [{ type: 'url', url: 'https://api.salesforce.com/platform/mcp/v1/platform/sobject-all', name: 'salesforce' }],
        system: 'Execute a SOQL query via Salesforce MCP and return ONLY the raw JSON result, no explanation.',
        messages: [{ role: 'user', content: `Execute this SOQL and return the result as JSON with "records" array:\n${q}` }]
      })
    });

    const data = await response.json();
    const text = data.content?.map(b => b.type === 'text' ? b.text : '').join('') || '{}';
    // Tentar extrair JSON do texto
    const match = text.match(/\{[\s\S]*\}/);
    const json = match ? JSON.parse(match[0]) : { records: [], totalSize: 0 };
    return res.status(200).json(json);
  } catch (error) {
    return res.status(500).json({ error: error.message, records: [] });
  }
}
