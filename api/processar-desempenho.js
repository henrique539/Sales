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
  const sa = {
    client_email: 'firebase-adminsdk-fbsvc@sales-team-6aeb6.iam.gserviceaccount.com',
    private_key: `-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQChiXXh6REadiqc\nfZiRIpgWEQu7Yv7OMP3OPUCHQP4fbNrfKopzrA/yhw2D41mYX9BOhiNvhkKXIV/Z\nh844IVG50V1rpmEYnmkhmJsjR27mX4FM4ThHiFAoZtrGwELitmiYHnH/ajwoNxK/\nhziJtAlZChs8Rd8WVB2+VURmxXZWZublrMtsoMpYqGXKZWs6kNgzloPbv422+30j\nS326BLvg7XKAAYezdWUgVH1vIV1hLRmHOy2LdogFq8fNzSMYR1W3fcuRA6EeYuZa\nV62HqH88nWnkb42VSgkyypqBL8shnqsb6cWlL8Jc87CPrs6r4/Y49z81t0fxXeMn\nSB9WRcmFAgMBAAECggEAEzbqHj6eabLfm7C22qCuTYWmixoZ7AXY0tTnXY9GCw/k\nMwJ46IxxcyxMV8FN0XmoKgb7pRLnzdlK8PGd/oA8G+nC/oCScR66q6Pe5EHld6Kp\nmy75Bk05F60wXc7VxejjpSCN9883q6LtaHnZqEuRhxVUKwW2pQ3JYe/7jGv1iQ5R\nCLRAa/WEfHceZhZBIo/3gTu8hfVbFnQ8N2cL2nBqG6t0BHIEhKb5wCeWe/hD6YPo\nNWnAb1fEPq0NViHvoyHdyGFJdBP71bHsEFuFrmhWSHtgq+9L8fCyehN3VdmvOU3r\nFPcly8qeyFKuYb0v1jFJILoKhs4ci/1nSt6tD6NkEQKBgQDQv39dZ8obZ/jD1675\naYGGYcFueGkyvfcS3Ohs8Fcq2sSNPqSdki6puPrWIdkbHnfhilbc2zTbKeI5L+ND\nmNg23DPQGn/GcsRMWfT9jF7j7DzfbCJvoOofCIbmmXqI1gKIKOFvBEWsHRsymHzm\nUxxnOW+dcW7lIYKUXDrhV0mVHQKBgQDGGi6CY4yyps9s+KbORAcGgx/qjxmRaQ4M\nRHlBs+FWG3h1msA0s+vNgqlZrxYd6hzrGaTkCTp7ApgEs5QjA3LVjQOMDzytcdBL\nq5MkCd4d7CVTiSHrr57e5GZ/wxdlslfuxXGhKOOQ231Oe3yIZNPc5JiNZRfSP9MO\nSZmAc+lhiQKBgES7uSk9QnvxqSR7AR8YkVB5IaLJPQI7MH5ihJlSLbFrpSpIxRUp\nC/pQcS9Op9jZGGoIDf/cobPEP7vKu88HJbIyoVDVWNsz8NSfDh7qOFhd8dEzHseY\nuV4MhbaqNIGXze+dXlUamAJK9yiasw13sjN+4vR5ZCVH+mH1WGHYRt81AoGAeE/K\nU1IWTyHT9ACHfdn+0kushI3oH1HIQFcNtYODpQIGBJa5iMiEu0lRhLA7JGvcqEPo\nyr14EOEgZiqSGzmq8lsz/kn6tfPbZzmKoWaEyXNzr+om+batK/1W6t0XRqIrmU28\nlv34Ry+mSJXiqgtiSFNk+uqcrwooKhM08Lh00tECgYBN+lFgaCC1MU2qmJvPIsQ8\n8lTQvgLRIg591stAmZfUL2wWmC/nYbf1cOP7Zndmvdt90lCHDLCChfs8TpMLmapO\n9I34bQqGRkAAp0NY9PSW9EVL1gjBXWq4U8YUT2hnTGiQKe5/6vF8p62iy5zKd1O4\nBX3Ersw+g2aht7QxJOhixQ==\n-----END PRIVATE KEY-----`
  };
  const now = Math.floor(Date.now() / 1000);
  const b64 = s => btoa(unescape(encodeURIComponent(JSON.stringify(s)))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const header  = { alg: 'RS256', typ: 'JWT' };
  const payload = { iss: sa.client_email, sub: sa.client_email, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now+3600, scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase' };
  const unsigned  = `${b64(header)}.${b64(payload)}`;
  const keyData   = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g,'');
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey('pkcs8', binaryKey.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig   = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(unsigned));
  const sig64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
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
      const dataPedido = r.DatFat__c || r.CreatedDate || '';
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
