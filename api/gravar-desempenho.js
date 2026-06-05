// api/gravar-desempenho.js — v3
// Aceita UMA chamada por mês por vendedor
// POST /api/gravar-desempenho
// Body: { email, mes, pedidos, faturamento, moeda, data }
// Faz merge no documento Firestore contexto/desempenho_{data}

const MAKE_SECRET   = 'sabagram-make-2026';
const PROJECT_ID    = 'sales-team-6aeb6';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const METAS = {
  'nando@sabagram.com.br':   { meta: 233000, moeda: 'BRL' },
  'kelly@sabagram.com.br':   { meta: 161000, moeda: 'BRL' },
  'marcelo@sabagram.com.br': { meta: 463000, moeda: 'BRL' },
  'santana@sabagram.com.br': { meta: 105000, moeda: 'BRL' },
  'cezar@sabagram.com.br':   { meta: 172000, moeda: 'USD' },
  'diana@sabagram.com.br':   { meta:  25000, moeda: 'USD' },
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
function fsToVal(v) {
  if (!v) return null;
  if (v.stringValue  !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue);
  if (v.doubleValue  !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue    !== undefined) return null;
  if (v.arrayValue)  return (v.arrayValue.values || []).map(fsToVal);
  if (v.mapValue) {
    const obj = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) obj[k] = fsToVal(val);
    return obj;
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-make-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Método não permitido' });
  if (req.headers['x-make-secret'] !== MAKE_SECRET) return res.status(401).json({ error: 'Não autorizado' });

  const { email, mes, pedidos, faturamento, moeda, data } = req.body;
  if (!email || !mes || !data) return res.status(400).json({ error: 'email, mes e data são obrigatórios' });

  const mesNum       = Number(mes);
  const pedidosNum   = Number(pedidos)    || 0;
  const fatNum       = Number(faturamento) || 0;
  const mesAtualNum  = new Date().getMonth() + 1;
  const anoAtual     = new Date().getFullYear();
  const cfg          = METAS[email] || { meta: 0, moeda: moeda || 'BRL' };

  const token  = await getAdminToken();
  const docUrl = `${FIRESTORE_URL}/contexto/desempenho_${data}`;

  // Ler documento existente
  const getRes  = await fetch(docUrl, { headers: { Authorization: `Bearer ${token}` } });
  const getData = await getRes.json();

  let vendedores = {};
  if (!getData.error && getData.fields) {
    const raw = fsToVal(getData.fields.vendedores);
    if (raw) vendedores = raw;
  }

  // Inicializa estrutura do vendedor se não existir
  if (!vendedores[email]) {
    vendedores[email] = {
      meses: [],
      totalPedidos: 0,
      totalFaturamento: 0,
      ticketMedio: 0,
      ticket3m: 0,
      moeda: cfg.moeda,
      metaMensal: cfg.meta,
      mesAtual: { mes: mesAtualNum, pedidos: 0, faturamento: 0, pctMeta: 0, projecao: 0 },
    };
  }

  const vd = vendedores[email];

  // Remove mês existente se já foi gravado (re-run)
  vd.meses = (vd.meses || []).filter(m => m.mes !== mesNum);

  // Adiciona o mês novo
  vd.meses.push({ mes: mesNum, pedidos: pedidosNum, faturamento: Math.round(fatNum), moeda: cfg.moeda });
  vd.meses.sort((a, b) => a.mes - b.mes);

  // Recalcula totais
  vd.totalPedidos     = vd.meses.reduce((s, m) => s + m.pedidos, 0);
  vd.totalFaturamento = vd.meses.reduce((s, m) => s + m.faturamento, 0);
  vd.ticketMedio      = vd.totalPedidos > 0 ? Math.round(vd.totalFaturamento / vd.totalPedidos) : 0;

  // Ticket médio últimos 3 meses excluindo mês atual
  const ultimos3 = vd.meses.filter(m => m.mes !== mesAtualNum).slice(-3);
  const ped3     = ultimos3.reduce((s, m) => s + m.pedidos, 0);
  const fat3     = ultimos3.reduce((s, m) => s + m.faturamento, 0);
  vd.ticket3m    = ped3 > 0 ? Math.round(fat3 / ped3) : vd.ticketMedio;

  // Mês atual
  const mesAtualObj  = vd.meses.find(m => m.mes === mesAtualNum) || { pedidos: 0, faturamento: 0 };
  const diaHoje      = new Date().getDate();
  vd.mesAtual = {
    mes:         mesAtualNum,
    pedidos:     mesAtualObj.pedidos,
    faturamento: mesAtualObj.faturamento,
    pctMeta:     cfg.meta > 0 ? Math.round(mesAtualObj.faturamento / cfg.meta * 100) : 0,
    projecao:    diaHoje > 0 ? Math.round(mesAtualObj.faturamento / diaHoje * 30) : 0,
  };

  vendedores[email] = vd;

  // Grava de volta no Firestore
  const patchRes = await fetch(docUrl, {
    method:  'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: objToFs({
        geradoEm:  new Date().toISOString(),
        data,
        anoRef:    anoAtual,
        periodo:   'THIS_YEAR',
        vendedores,
      })
    }),
  });
  const patchData = await patchRes.json();
  if (patchData.error) return res.status(500).json({ error: 'Firestore: ' + patchData.error.message });

  console.log(`desempenho_${data} | ${email} | mes ${mesNum} | R$${Math.round(fatNum)}`);
  return res.json({
    ok: true, email, mes: mesNum, faturamento: Math.round(fatNum),
    totalFaturamento: vd.totalFaturamento, mesesGravados: vd.meses.length,
  });
}
