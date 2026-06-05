// api/processar-desempenho.js
// Lê contexto/desempenho_{data} (registros brutos do Make)
// Agrupa por vendedor + mês e grava estrutura vendedores no mesmo documento
// POST /api/processar-desempenho
// Body: { data } — ex: { data: "2026-06-05" }

const MAKE_SECRET   = 'sabagram-make-2026';
const PROJECT_ID    = 'sales-team-6aeb6';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const IDEVENMAP = {
  '001TW000003LbquYAC': 'nando@sabagram.com.br',
  '001TW000003LcYSYA0': 'nando@sabagram.com.br',
  '001TW000005ag14YAA': 'kelly@sabagram.com.br',
  '0014S00000BK1xDQAT': 'marcelo@sabagram.com.br',
  '001TW00000Buxa9YAB': 'santana@sabagram.com.br',
  '001TW00000C09VzYAJ': 'santana@sabagram.com.br',
  '001TW00000C10vCYAR': 'cezar@sabagram.com.br',
  '001TW00000C114rYAB': 'cezar@sabagram.com.br',
  '0054S000002TkpZQAS': 'diana@sabagram.com.br',
};

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
  const b64 = s => btoa(unescape(encodeURIComponent(JSON.stringify(s)))).replace(/=/g,'').replace(/+/g,'-').replace(/\//g,'_');
  const header  = { alg: 'RS256', typ: 'JWT' };
  const payload = { iss: sa.client_email, sub: sa.client_email, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now+3600, scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase' };
  const unsigned  = `${b64(header)}.${b64(payload)}`;
  const keyData   = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g,'');
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey('pkcs8', binaryKey.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig   = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(unsigned));
  const sig64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g,'').replace(/+/g,'-').replace(/\//g,'_');
  const jwt = `${unsigned}.${sig64}`;
  const tr  = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}` });
  const td  = await tr.json();
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
  if (v.arrayValue)  return (v.arrayValue.values||[]).map(fsToVal);
  if (v.mapValue) {
    const o = {};
    for (const [k,val] of Object.entries(v.mapValue.fields||{})) o[k] = fsToVal(val);
    return o;
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-make-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Metodo nao permitido' });
  if (req.headers['x-make-secret'] !== MAKE_SECRET) return res.status(401).json({ error: 'Nao autorizado' });

  const { data } = req.body;
  if (!data) return res.status(400).json({ error: 'data e obrigatorio (YYYY-MM-DD)' });

  const mesAtualNum = new Date().getMonth() + 1;
  const anoAtual    = new Date().getFullYear();

  try {
    const token = await getAdminToken();
    const docUrl = `${FIRESTORE_URL}/contexto/desempenho_${data}`;
    const getRes = await fetch(docUrl, { headers: { Authorization: `Bearer ${token}` } });
    const getDoc = await getRes.json();

    if (getDoc.error || !getDoc.fields) {
      return res.status(404).json({ error: `contexto/desempenho_${data} nao encontrado` });
    }

    const registrosRaw = fsToVal(getDoc.fields.registros) || [];
    console.log(`processar-desempenho: ${registrosRaw.length} registros brutos`);

    if (!registrosRaw.length) {
      return res.status(400).json({ error: 'Nenhum registro bruto encontrado' });
    }

    const porVendedor = {};
    for (const r of registrosRaw) {
      const email = IDEVENMAP[r.IdeVen__c];
      if (!email) continue;
      const dataPedido = r.CreatedDate || r.DatFat__c || '';
      if (!dataPedido) continue;
      const mes = new Date(dataPedido).getMonth() + 1;
      if (!mes || mes < 1 || mes > 12) continue;
      if (!porVendedor[email]) porVendedor[email] = { meses: {}, moeda: r.CurrencyIsoCode || METAS[email]?.moeda || 'BRL' };
      if (!porVendedor[email].meses[mes]) porVendedor[email].meses[mes] = { mes, pedidos: 0, faturamento: 0, moeda: r.CurrencyIsoCode || METAS[email]?.moeda || 'BRL' };
      porVendedor[email].meses[mes].pedidos++;
      porVendedor[email].meses[mes].faturamento += Number(r.VlrLi2__c) || 0;
    }

    for (const [email, cfg] of Object.entries(METAS)) {
      if (!porVendedor[email]) porVendedor[email] = { meses: {}, moeda: cfg.moeda };
    }

    const vendedores = {};
    for (const [email, vd] of Object.entries(porVendedor)) {
      const cfg      = METAS[email] || { meta: 0, moeda: 'BRL' };
      const mesesArr = Object.values(vd.meses).map(m => ({ ...m, faturamento: Math.round(m.faturamento) })).sort((a,b) => a.mes - b.mes);
      const totalPedidos     = mesesArr.reduce((s,m) => s + m.pedidos, 0);
      const totalFaturamento = mesesArr.reduce((s,m) => s + m.faturamento, 0);
      const ticketMedio      = totalPedidos > 0 ? Math.round(totalFaturamento / totalPedidos) : 0;
      const ultimos3 = mesesArr.filter(m => m.mes !== mesAtualNum).slice(-3);
      const ped3 = ultimos3.reduce((s,m) => s + m.pedidos, 0);
      const fat3 = ultimos3.reduce((s,m) => s + m.faturamento, 0);
      const ticket3m = ped3 > 0 ? Math.round(fat3 / ped3) : ticketMedio;
      const mesAtualObj = mesesArr.find(m => m.mes === mesAtualNum) || { pedidos: 0, faturamento: 0 };
      const diaHoje = new Date().getDate();
      vendedores[email] = {
        meses: mesesArr, totalPedidos, totalFaturamento, ticketMedio, ticket3m,
        moeda: vd.moeda || cfg.moeda, metaMensal: cfg.meta,
        mesAtual: {
          mes: mesAtualNum, pedidos: mesAtualObj.pedidos, faturamento: mesAtualObj.faturamento,
          pctMeta: cfg.meta > 0 ? Math.round(mesAtualObj.faturamento / cfg.meta * 100) : 0,
          projecao: diaHoje > 0 ? Math.round(mesAtualObj.faturamento / diaHoje * 30) : 0,
        },
      };
    }

    const patchRes = await fetch(docUrl, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { ...getDoc.fields, vendedores: fsVal(vendedores), processadoEm: fsVal(new Date().toISOString()), anoRef: fsVal(anoAtual) } }),
    });
    const patchData = await patchRes.json();
    if (patchData.error) return res.status(500).json({ error: 'Firestore: ' + patchData.error.message });

    return res.json({ ok: true, data, vendedores: Object.fromEntries(Object.entries(vendedores).map(([e,vd]) => [e, { totalFaturamento: vd.totalFaturamento, ticket3m: vd.ticket3m, mesAtual: vd.mesAtual }])) });
  } catch(e) {
    console.error('processar-desempenho:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
