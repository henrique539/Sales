// api/gravar-desempenho.js — v2
// Aceita campos separados por vendedor como strings JSON
// POST /api/gravar-desempenho
// Body: { data, nando, kelly, marcelo, renata, cezar, diana }
// Cada campo é uma STRING JSON do array de records do SF

const MAKE_SECRET  = 'sabagram-make-2026';
const PROJECT_ID   = 'sales-team-6aeb6';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const VENDEDORES = {
  nando:   { email: 'nando@sabagram.com.br',   meta: 233000, moeda: 'BRL' },
  kelly:   { email: 'kelly@sabagram.com.br',   meta: 161000, moeda: 'BRL' },
  marcelo: { email: 'marcelo@sabagram.com.br', meta: 463000, moeda: 'BRL' },
  renata:  { email: 'santana@sabagram.com.br', meta: 105000, moeda: 'BRL' },
  cezar:   { email: 'cezar@sabagram.com.br',  meta: 172000, moeda: 'USD' },
  diana:   { email: 'diana@sabagram.com.br',   meta:  25000, moeda: 'USD' },
};

async function getAdminToken() {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  const now = Math.floor(Date.now() / 1000);
  const b64 = s => btoa(unescape(encodeURIComponent(JSON.stringify(s))))
    .replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const header  = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: sa.client_email, sub: sa.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase'
  };
  const unsigned  = `${b64(header)}.${b64(payload)}`;
  const keyData   = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g,'');
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );
  const sig   = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(unsigned));
  const sig64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const jwt = `${unsigned}.${sig64}`;
  const tr  = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  const td = await tr.json();
  if (!td.access_token) throw new Error('Token falhou: ' + JSON.stringify(td));
  return td.access_token;
}

function fsVal(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string')  return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number')  return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v))       return { arrayValue: { values: v.map(fsVal) } };
  if (typeof v === 'object')  return { mapValue: { fields: objToFs(v) } };
  return { stringValue: String(v) };
}
function objToFs(obj) {
  const f = {};
  for (const [k, v] of Object.entries(obj)) f[k] = fsVal(v);
  return f;
}

function parseRecords(val) {
  if (!val) return [];
  // Pode vir como string JSON ou já como array
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch(e) { return []; }
  }
  return [];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-make-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Método não permitido' });
  if (req.headers['x-make-secret'] !== MAKE_SECRET) return res.status(401).json({ error: 'Não autorizado' });

  const { data, nando, kelly, marcelo, renata, cezar, diana } = req.body;
  if (!data) return res.status(400).json({ error: 'data é obrigatório (YYYY-MM-DD)' });

  const mesAtualNum = new Date().getMonth() + 1;
  const anoAtual    = new Date().getFullYear();

  const inputs = { nando, kelly, marcelo, renata, cezar, diana };
  const vendedores = {};

  for (const [chave, cfg] of Object.entries(VENDEDORES)) {
    const records = parseRecords(inputs[chave]);
    const mesesArr = records
      .filter(r => r && r.mes)
      .map(r => ({
        mes:          Number(r.mes),
        pedidos:      Number(r.pedidos)     || 0,
        faturamento:  Math.round(Number(r.faturamento) || 0),
        moeda:        cfg.moeda,
      }))
      .sort((a, b) => a.mes - b.mes);

    const totalPedidos     = mesesArr.reduce((s, m) => s + m.pedidos, 0);
    const totalFaturamento = mesesArr.reduce((s, m) => s + m.faturamento, 0);
    const ticketMedio      = totalPedidos > 0 ? Math.round(totalFaturamento / totalPedidos) : 0;

    // Ticket médio últimos 3 meses (exclui mês atual)
    const ultimos3  = mesesArr.filter(m => m.mes !== mesAtualNum).slice(-3);
    const ped3      = ultimos3.reduce((s, m) => s + m.pedidos, 0);
    const fat3      = ultimos3.reduce((s, m) => s + m.faturamento, 0);
    const ticket3m  = ped3 > 0 ? Math.round(fat3 / ped3) : ticketMedio;

    const mesAtual  = mesesArr.find(m => m.mes === mesAtualNum) || { pedidos: 0, faturamento: 0 };
    const pctMeta   = cfg.meta > 0 ? Math.round(mesAtual.faturamento / cfg.meta * 100) : 0;
    const diaHoje   = new Date().getDate();
    const projecao  = diaHoje > 0 ? Math.round(mesAtual.faturamento / diaHoje * 30) : 0;

    vendedores[cfg.email] = {
      meses: mesesArr,
      totalPedidos,
      totalFaturamento,
      ticketMedio,
      ticket3m,
      moeda:      cfg.moeda,
      metaMensal: cfg.meta,
      mesAtual: {
        mes:        mesAtualNum,
        pedidos:    mesAtual.pedidos,
        faturamento: mesAtual.faturamento,
        pctMeta,
        projecao,
      },
    };
  }

  const token  = await getAdminToken();
  const docUrl = `${FIRESTORE_URL}/contexto/desempenho_${data}`;
  const fsRes  = await fetch(docUrl, {
    method:  'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      fields: objToFs({ geradoEm: new Date().toISOString(), data, anoRef: anoAtual, periodo: 'THIS_YEAR', vendedores })
    }),
  });
  const fsData = await fsRes.json();
  if (fsData.error) return res.status(500).json({ error: 'Firestore: ' + fsData.error.message });

  console.log(`desempenho_${data} gravado`);
  return res.json({
    ok: true, data,
    resumo: Object.fromEntries(Object.entries(vendedores).map(([email, vd]) => [
      email, { totalFaturamento: vd.totalFaturamento, ticketMedio: vd.ticketMedio, mesAtual: vd.mesAtual }
    ]))
  });
}
