// api/gravar-desempenho.js
// Cenário 8 Make — recebe registros agregados do SF (THIS_YEAR) e grava no Firestore
// Rota: POST /api/gravar-desempenho
// Header obrigatório: x-make-secret: sabagram-make-2026

const MAKE_SECRET = 'sabagram-make-2026';
const PROJECT_ID  = 'sales-team-6aeb6';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// IdeVen__c → email do vendedor (Sizenando tem 2 IDs — ambos mapeados)
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

// Metas mensais por email (BRL ou USD conforme moeda)
const METAS = {
  'nando@sabagram.com.br':   { meta: 233000, moeda: 'BRL' },
  'kelly@sabagram.com.br':   { meta: 161000, moeda: 'BRL' },
  'marcelo@sabagram.com.br': { meta: 463000, moeda: 'BRL' },
  'santana@sabagram.com.br': { meta: 105000, moeda: 'BRL' },
  'cezar@sabagram.com.br':   { meta: 172000, moeda: 'USD' },
  'diana@sabagram.com.br':   { meta:  25000, moeda: 'USD' },
};

// ── Firebase Auth via Service Account ────────────────────────────────────────
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
  const unsigned = `${b64(header)}.${b64(payload)}`;
  const keyData  = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g,'');
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

// ── Firestore helpers ─────────────────────────────────────────────────────────
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

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-make-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Método não permitido' });
  if (req.headers['x-make-secret'] !== MAKE_SECRET) return res.status(401).json({ error: 'Não autorizado' });

  const { data, registros } = req.body;
  if (!data)       return res.status(400).json({ error: 'data é obrigatório (YYYY-MM-DD)' });
  if (!registros?.length) return res.status(400).json({ error: 'registros é obrigatório' });

  const mesAtualNum = new Date().getMonth() + 1; // 1-12
  const anoAtual    = new Date().getFullYear();

  // ── 1. Agrupa registros por vendedor + mês ──────────────────────────────────
  const porVendedor = {};

  for (const r of registros) {
    // r vem do Make com campos: IdeVen__c, mes, pedidos, faturamento, CurrencyIsoCode
    const ideVen   = r.IdeVen__c || r.ideVen;
    const email    = IDEVENMAP[ideVen];
    if (!email) {
      console.warn('IdeVen não mapeado:', ideVen);
      continue;
    }

    const mes        = Number(r.mes)        || 0;
    const pedidos    = Number(r.pedidos)    || 0;
    const faturamento = Number(r.faturamento) || 0;
    const moeda      = r.CurrencyIsoCode || r.moeda || METAS[email]?.moeda || 'BRL';

    if (!porVendedor[email]) porVendedor[email] = { meses: {}, moeda };

    const chave = `${anoAtual}-${String(mes).padStart(2,'0')}`;
    if (!porVendedor[email].meses[chave]) {
      porVendedor[email].meses[chave] = { ano: anoAtual, mes, pedidos: 0, faturamento: 0, moeda };
    }
    // Soma (Sizenando tem 2 IdeVen — pode vir em 2 linhas para o mesmo mês)
    porVendedor[email].meses[chave].pedidos     += pedidos;
    porVendedor[email].meses[chave].faturamento += faturamento;
  }

  // ── 2. Calcula totais, ticket médio e projeção ──────────────────────────────
  const vendedores = {};

  for (const [email, vd] of Object.entries(porVendedor)) {
    const mesesArr = Object.values(vd.meses)
      .sort((a, b) => a.mes - b.mes);

    // Apenas meses com dados (exclui zeros)
    const mesesComDados = mesesArr.filter(m => m.pedidos > 0);

    const totalPedidos      = mesesArr.reduce((s, m) => s + m.pedidos, 0);
    const totalFaturamento  = mesesArr.reduce((s, m) => s + m.faturamento, 0);
    const ticketMedio       = totalPedidos > 0 ? Math.round(totalFaturamento / totalPedidos) : 0;

    // Mês atual
    const chaveAtual = `${anoAtual}-${String(mesAtualNum).padStart(2,'0')}`;
    const mesAtual   = porVendedor[email].meses[chaveAtual] || { pedidos: 0, faturamento: 0 };

    // Meta e % atingido no mês atual
    const metaMensal   = METAS[email]?.meta || 0;
    const pctMesAtual  = metaMensal > 0 ? Math.round(mesAtual.faturamento / metaMensal * 100) : 0;

    // Projeção do mês atual (faturamento/dia corrido × dias úteis do mês)
    const diaHoje      = new Date().getDate();
    const projecao     = diaHoje > 0 ? Math.round(mesAtual.faturamento / diaHoje * 30) : 0;

    // Ticket médio dos últimos 3 meses (exclui mês atual se quiser tendência)
    const ultimos3     = mesesComDados.filter(m => m.mes !== mesAtualNum).slice(-3);
    const ticket3m     = ultimos3.length > 0
      ? Math.round(ultimos3.reduce((s,m) => s + m.faturamento, 0) / ultimos3.reduce((s,m) => s + m.pedidos, 0))
      : ticketMedio;

    vendedores[email] = {
      meses: mesesArr.map(m => ({
        mes: m.mes,
        pedidos: m.pedidos,
        faturamento: Math.round(m.faturamento),
        moeda: m.moeda,
      })),
      totalPedidos,
      totalFaturamento: Math.round(totalFaturamento),
      ticketMedio,
      ticket3m,           // ticket médio últimos 3 meses — mais preciso para cálculo de meta
      moeda: vd.moeda,
      metaMensal,
      mesAtual: {
        mes: mesAtualNum,
        pedidos: mesAtual.pedidos,
        faturamento: Math.round(mesAtual.faturamento),
        pctMeta: pctMesAtual,
        projecao,
      },
    };
  }

  // ── 3. Garante entradas zeradas para vendedores sem pedidos (ex: Diana) ─────
  for (const [email, cfg] of Object.entries(METAS)) {
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
  }

  // ── 4. Grava no Firestore ─────────────────────────────────────────────────
  const token   = await getAdminToken();
  const docUrl  = `${FIRESTORE_URL}/contexto/desempenho_${data}`;
  const payload = {
    fields: objToFs({
      geradoEm:  new Date().toISOString(),
      data,
      anoRef:    anoAtual,
      periodo:   'THIS_YEAR',
      vendedores,
    })
  };

  const fsRes = await fetch(docUrl, {
    method:  'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  const fsData = await fsRes.json();
  if (fsData.error) {
    console.error('Firestore erro:', fsData.error);
    return res.status(500).json({ error: 'Firestore: ' + fsData.error.message });
  }

  console.log(`desempenho_${data} gravado — ${Object.keys(vendedores).length} vendedores`);
  return res.json({
    ok: true,
    data,
    vendedores: Object.fromEntries(
      Object.entries(vendedores).map(([email, vd]) => [
        email, {
          totalFaturamento: vd.totalFaturamento,
          totalPedidos:     vd.totalPedidos,
          ticketMedio:      vd.ticketMedio,
          ticket3m:         vd.ticket3m,
          mesAtual:         vd.mesAtual,
        }
      ])
    )
  });
}
