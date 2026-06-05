// compliance.js — v2
// Cruza fila por vendedor com ligações (SF) e WA (Nitzap)
// Marca contatado/respondeu por cliente individualmente
// POST /api/compliance
// Body: { data, chats } — chats = array do Nitzap

const PROJECT_ID    = 'sales-team-6aeb6';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const MAKE_SECRET   = 'sabagram-make-2026';

const VENDEDORES = [
  { email: 'nando@sabagram.com.br',   userId: '005TW0000002BnNYAU' },
  { email: 'kelly@sabagram.com.br',   userId: '005TW0000003rpNYAQ' },
  { email: 'marcelo@sabagram.com.br', userId: '0054S000002TkpGQAS' },
  { email: 'santana@sabagram.com.br', userId: '005TW000000ANTBYA4' },
  { email: 'cezar@sabagram.com.br',   userId: '005TW000000APunYAG' },
  { email: 'diana@sabagram.com.br',   userId: '0054S000002TkpZQAS' },
];

// ─── Auth Admin Firebase ──────────────────────────────────────────────────────
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

// ─── Firestore helpers ────────────────────────────────────────────────────────
function toFsValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string')  return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number')  return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v))       return { arrayValue: { values: v.map(toFsValue) } };
  if (typeof v === 'object')  return { mapValue: { fields: objToFs(v) } };
  return { stringValue: String(v) };
}
function objToFs(obj) {
  const f = {};
  for (const [k, v] of Object.entries(obj)) f[k] = toFsValue(v);
  return f;
}
function parseValue(v) {
  if (!v) return null;
  if (v.stringValue  !== undefined) return v.stringValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue);
  if (v.doubleValue  !== undefined) return v.doubleValue;
  if (v.nullValue    !== undefined) return null;
  if (v.arrayValue)  return (v.arrayValue.values || []).map(parseValue);
  if (v.mapValue)    return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, val]) => [k, parseValue(val)]));
  return null;
}
function fsToObj(doc) {
  if (!doc?.fields) return null;
  const r = {};
  for (const [k, v] of Object.entries(doc.fields)) r[k] = parseValue(v);
  return r;
}

async function lerFirestore(path, token) {
  const r = await fetch(`${FIRESTORE_URL}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const d = await r.json();
  return d.error ? null : fsToObj(d);
}

async function gravarFirestore(path, obj, token) {
  const r = await fetch(`${FIRESTORE_URL}/${path}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: objToFs(obj) })
  });
  const d = await r.json();
  if (d.error) console.error('Firestore erro:', d.error);
  return !d.error;
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-make-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Método não permitido' });
  if (req.headers['x-make-secret'] !== MAKE_SECRET) return res.status(401).json({ error: 'Não autorizado' });

  const { data, chats } = req.body;
  if (!data) return res.status(400).json({ error: 'data é obrigatório' });

  try {
    const token = await getAdminToken();
    const hoje  = data;

    // ── 1. Ler ligações do dia (contexto/ligacoes_{data}) ──────────────────
    // Ligações têm WhatId = Account ID do cliente — fonte mais confiável
    const ctxLig = await lerFirestore(`contexto/ligacoes_${hoje}`, token);
    const ligacoes = ctxLig?.registros || [];

    // Indexar: AccountId → { contatado, respondeu, canal, hora }
    // Ligação atendida = contatado + respondeu
    // Ligação não atendida = contatado apenas
    const contatadoPorConta = {};
    for (const l of ligacoes) {
      const accountId = l.WhatId;
      if (!accountId) continue;
      const atendida = (l.Subject || '').includes('Atendida') && !(l.Subject || '').includes('Não Atendida');
      if (!contatadoPorConta[accountId]) {
        contatadoPorConta[accountId] = { contatado: true, respondeu: atendida, canal: 'Ligação', hora: l.ActivityDate || hoje };
      } else if (atendida) {
        contatadoPorConta[accountId].respondeu = true;
      }
    }

    // ── 2. Cruzar WA (Nitzap) — usar last_salesforce_user como Account ID ──
    // Nitzap: last_salesforce_user pode ser Account ID ou User ID
    // isent = true → vendedor enviou (contatado)
    // isent = false + msg hoje → cliente respondeu
    const chatsArr = Array.isArray(chats) ? chats : [];
    for (const chat of chatsArr) {
      if (chat.isgroup) continue;
      const accountId = chat.last_salesforce_user;
      if (!accountId || accountId.startsWith('005')) continue; // pula User IDs

      const dtLast = chat.dt_lastmessage || chat.dt_second_last_message || '';
      const dataChat = dtLast.substring(0, 10);
      if (dataChat !== hoje) continue;

      if (!contatadoPorConta[accountId]) {
        contatadoPorConta[accountId] = {
          contatado: chat.isent,
          respondeu: !chat.isent,
          canal: 'WhatsApp',
          hora: dtLast,
        };
      } else {
        if (chat.isent) contatadoPorConta[accountId].contatado = true;
        if (!chat.isent) contatadoPorConta[accountId].respondeu = true;
      }
    }

    // ── 3. Processar fila por vendedor ─────────────────────────────────────
    const resumoGeral = {
      data: hoje,
      atualizadoEm: new Date().toISOString(),
      vendedores: {},
    };

    for (const v of VENDEDORES) {
      const emailKey = v.email.replace(/[@.]/g, '_');
      const filaDoc  = await lerFirestore(`fila/${emailKey}_${hoje}`, token);
      if (!filaDoc) {
        console.log(`Fila não encontrada: ${v.email}`);
        continue;
      }

      const fila = filaDoc.fila || [];
      if (!fila.length) continue;

      // Cruzar cada cliente da fila com ligações e WA
      const filaAtualizada = fila.map(cliente => {
        const accountId = cliente.Id;
        const contato   = contatadoPorConta[accountId];
        if (contato) {
          return {
            ...cliente,
            contatado:  true,
            respondeu:  contato.respondeu || false,
            canalContato: contato.canal,
            horaContato:  contato.hora,
          };
        }
        // Mantém estado anterior (não regride contatado para false)
        return {
          ...cliente,
          contatado: cliente.contatado || false,
          respondeu: cliente.respondeu || false,
        };
      });

      // Calcular compliance do vendedor
      const total      = filaAtualizada.length;
      const contatados = filaAtualizada.filter(c => c.contatado).length;
      const respondidos = filaAtualizada.filter(c => c.respondeu).length;
      const pct        = total > 0 ? Math.round(contatados / total * 100) : 0;

      // Gravar fila atualizada
      await gravarFirestore(`fila/${emailKey}_${hoje}`, {
        ...filaDoc,
        fila: filaAtualizada,
        ultimoCompliance: new Date().toISOString(),
        compliance: { total, contatados, respondidos, pct },
      }, token);

      resumoGeral.vendedores[v.email] = { total, contatados, respondidos, pct };
      console.log(`[COMPLIANCE] ${v.email}: ${contatados}/${total} (${pct}%)`);
    }

    // ── 4. Gravar resumo geral ─────────────────────────────────────────────
    await gravarFirestore(`contexto/compliance_${hoje}`, resumoGeral, token);

    return res.json({
      ok: true, data: hoje,
      resumo: resumoGeral.vendedores,
      totalContatadosPorConta: Object.keys(contatadoPorConta).length,
    });

  } catch(e) {
    console.error('compliance.js:', e.message, e.stack);
    return res.status(500).json({ error: e.message });
  }
}
