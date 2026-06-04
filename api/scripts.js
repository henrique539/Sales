const MAKE_SECRET = 'sabagram-make-2026';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-make-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo nao permitido' });
  const makeSecret = req.headers['x-make-secret'];
  if (makeSecret !== MAKE_SECRET) {
    const idToken = (req.headers.authorization || '').replace('Bearer ', '');
    if (!idToken || idToken.split('.').length !== 3) return res.status(401).json({ error: 'Sem token' });
  }
  try {
    const { clientes, vendedor } = req.body;
    if (!clientes || !clientes.length) return res.status(400).json({ error: 'clientes obrigatorio' });
    const linhas = clientes.map((c, i) => {
      const dias = parseFloat(c.QtdDip__c) || 0;
      const lig = c.DatUli__c ? new Date(c.DatUli__c).toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}) : 'nunca';
      return (i+1)+'. ID:'+c.Id+' | '+c.Name+' | '+dias+' dias | score '+c.ScoAco__c+' | ult.lig: '+lig+' ('+( c.ResUli__c||'sem registro')+')';
    }).join('\n');
    const prompt = 'Voce e assistente de vendas da Sabagram Granitos. O vendedor '+(vendedor||'da equipe')+' vai contatar esses clientes hoje.\nPara cada cliente gere CONTEXTO (1-2 frases) e SCRIPT (WhatsApp informal max 2 frases).\nClientes:\n'+linhas+'\nResponda SOMENTE JSON valido:\n{"scripts":[{"id":"ID","contexto":"...","script":"..."}]}';
    const r = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {'Content-Type':'application/json','anthropic-version':'2023-06-01','x-api-key':process.env.ANTHROPIC_API_KEY},
      body: JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:2000,messages:[{role:'user',content:prompt}]})
    });
    const data = await r.json();
    const text = data.content?.find(b=>b.type==='text')?.text||'{}';
    const parsed = JSON.parse(text.replace(/```json|```/g,'').trim());
    const scripts = {};
    (parsed.scripts||[]).forEach(s=>{scripts[s.id]={contexto:s.contexto,script:s.script};});
    return res.json({ok:true,scripts,total:Object.keys(scripts).length});
  } catch(e) {
    console.error('scripts.js:',e.message);
    return res.status(500).json({error:e.message});
  }
}
