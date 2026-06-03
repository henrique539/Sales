// Proxy direto para Nitzap MCP — busca chats WhatsApp
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
    const { where } = body;
    if (!where) return res.status(400).json({ error: 'Missing where' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        mcp_servers: [{ type: 'url', url: 'https://sabagram-mcp.nitzap.com/mcp/master', name: 'nitzap' }],
        system: 'Execute the Nitzap chat query and return ONLY a JSON array of chat objects, no explanation.',
        messages: [{ role: 'user', content: `Query Nitzap chats with WHERE clause: ${where}\nReturn ONLY a JSON array with the chat results.` }]
      })
    });

    const data = await response.json();
    const text = data.content?.map(b => b.type === 'text' ? b.text : '').join('') || '[]';
    const match = text.match(/\[[\s\S]*\]/);
    const json = match ? JSON.parse(match[0]) : [];
    return res.status(200).json(json);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
