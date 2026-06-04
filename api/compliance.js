// compliance.js — cruza fila Firestore com chats Nitzap
const PROJECT_ID = 'sales-team-6aeb6';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const MAKE_SECRET = 'sabagram-make-2026';

// ─── Auth Admin ───────────────────────────────────────────────────────────────
async function getAdminToken() {
  const serviceAccount = {
    client_email: 'firebase-adminsdk-fbsvc@sales-team-6aeb6.iam.gserviceaccount.com',
    private_key: `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQChiXXh6REadiqc
fZiRIpgWEQu7Yv7OMP3OPUCHQP4fbNrfKopzrA/yhw2D41mYX9BOhiNvhkKXIV/Z
h844IVG50V1rpmEYnmkhmJsjR27mX4FM4ThHiFAoZtrGwELitmiYHnH/ajwoNxK/
hziJtAlZChs8Rd8WVB2+VURmxXZWZublrMtsoMpYqGXKZWs6kNgzloPbv422+30j
S326BLvg7XKAAYezdWUgVH1vIV1hLRmHOy2LdogFq8fNzSMYR1W3fcuRA6EeYuZa
V62HqH88nWnkb42VSgkyypqBL8shnqsb6cWlL8Jc87CPrs6r4/Y49z81t0fxXeMn
SB9WRcmFAgMBAAECggEAEzbqHj6eabLfm7C22qCuTYWmixoZ7AXY0tTnXY9GCw/k
MwJ46IxxcyxMV8FN0XmoKgb7pRLnzdlK8PGd/oA8G+nC/oCScR66q6Pe5EHld6Kp
my75Bk05F60wXc7VxejjpSCN9883q6LtaHnZqEuRhxVUKwW2pQ3JYe/7jGv1iQ5R
CLRAa/WEfHceZhZBIo/3gTu8hfVbFnQ8N2cL2nBqG6t0BHIEhKb5wCeWe/hD6YPo
NWnAb1fEPq0NViHvoyHdyGFJdBP71bHsEFuFrmhWSHtgq+9L8fCyehN3VdmvOU3r
FPcly8qeyFKuYb0v1jFJILoKhs4ci/1nSt6tD6NkEQKBgQDQv39dZ8obZ/jD1675
aYGGYcFueGkyvfcS3Ohs8Fcq2sSNPqSdki6puPrWIdkbHnfhilbc2zTbKeI5L+ND
mNg23DPQGn/GcsRMWfT9jF7j7DzfbCJvoOofCIbmmXqI1gKIKOFvBEWsHRsymHzm
UxxnOW+dcW7lIYKUXDrhV0mVHQKBgQDGGi6CY4yyps9s+KbORAcGgx/qjxmRaQ4M
RHlBs+FWG3h1msA0s+vNgqlZrxYd6hzrGaTkCTp7ApgEs5QjA3LVjQOMDzytcdBL
q5MkCd4d7CVTiSHrr57e5GZ/wxdlslfuxXGhKOOQ231Oe3yIZNPc5JiNZRfSP9MO
SZmAc+lhiQKBgES7uSk9QnvxqSR7AR8YkVB5IaLJPQI7MH5ihJlSLbFrpSpIxRUp
C/pQcS9Op9jZGGoIDf/cobPEP7vKu88HJbIyoVDVWNsz8NSfDh7qOFhd8dEzHseY
uV4MhbaqNIGXze+dXlUamAJK9yiasw13sjN+4vR5ZCVH+mH1WGHYRt81AoGAeE/K
U1IWTyHT9ACHfdn+0kushI3oH1HIQFcNtYODpQIGBJa5iMiEu0lRhLA7JGvcqEPo
yr14EOEgZiqSGzmq8lsz/kn6tfPbZzmKoWaEyXNzr+om+batK/1W6t0XRqIrmU28
lv34Ry+mSJXiqgtiSFNk+uqcrwooKhM08Lh00tECgYBN+lFgaCC1MU2qmJvPIsQ8
8lTQvgLRIg591stAmZfUL2wWmC/nYbf1cOP7Zndmvdt90lCHDLCChfs8TpMLmapO
9I34bQqGRkAAp0NY9PSW9EVL1gjBXWq4U8YUT2hnTGiQKe5/6vF8p62iy5zKd1O4
BX3Ersw+g2aht7QxJOhixQ==
-----END PRIVATE KEY-----`
  };

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase',
  };
  const b64 = s => btoa(unescape(encodeURIComponent(JSON.stringify(s)))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const unsigned = `${b64(header)}.${b64(payload)}`;
  const keyData = serviceAccount.private_key.replace('-----BEGIN PRIVATE KEY-----','').replace('-----END PRIVATE KEY-----','').replace(/\s/g,'');
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey('pkcs8', binaryKey.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(unsigned));
  const sig64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const jwt = `${unsigned}.${sig64}`;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error('Falha ao obter access token');
  return tokenData.access_token;
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
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = toFsValue(v);
  return fields;
}
function parseValue(v) {
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
  if (!doc || !doc.fields) return null;
  const result = {};
  for (const [k, v] of Object.entries(doc.fields)) result[k] = parseValue(v);
  return result;
}

// ─── Extrair número do secondwhatsappid ──────────────────────────────────────
function extrairNumero(secondwhatsappid) {
  // formato: 5528999565519@s.whatsapp.net → 5528999565519
  return (secondwhatsappid || '').replace('@s.whatsapp.net', '').replace('@c.us', '');
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-make-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  // Auth
  const secret = req.headers['x-make-secret'];
  if (secret !== MAKE_SECRET) return res.status(401).json({ error: 'Não autorizado' });

  try {
    const { chats, data } = req.body;
    // chats = array de chats do Nitzap vindos do Make
    // data = "2026-06-04"

    if (!chats || !data) return res.status(400).json({ error: 'chats e data são obrigatórios' });

    const adminToken = await getAdminToken();
    const hoje = data; // "2026-06-04"

    // Montar set de números contatados hoje (isent = true = vendedor enviou)
    // e respondidos (isent = false = cliente respondeu após contato)
    const contatadosHoje = new Set();
    const respondeuHoje = new Set();

    for (const chat of chats) {
      if (chat.isgroup) continue; // ignora grupos
      const numero = extrairNumero(chat.secondwhatsappid);
      if (!numero) continue;

      const dtLast = chat.dt_lastmessage || chat.dt_second_last_message;
      if (!dtLast) continue;

      const dataChat = dtLast.substring(0, 10); // "2026-06-04"
      if (dataChat !== hoje) continue;

      if (chat.isent) {
        contatadosHoje.add(numero);
      } else {
        // cliente respondeu — mas vendedor também precisou ter enviado
        respondeuHoje.add(numero);
      }
    }

    // Buscar fila do Firestore
    const docPath = `${FIRESTORE_URL}/fila/todos_${hoje}`;
    const docRes = await fetch(docPath, { headers: { Authorization: `Bearer ${adminToken}` } });
    const docData = await docRes.json();

    if (docData.error || !docData.fields) {
      return res.status(404).json({ error: 'Fila não encontrada para esta data' });
    }

    const filaDoc = fsToObj(docData);
    const fila = filaDoc.fila || [];

    // Cruzar fila com chats — adicionar campos contatado e respondeu
    // O número do cliente precisa estar no SF Account — por enquanto usamos o campo phone
    // Como não temos phone na fila ainda, marcamos via last_salesforce_user do chat
    // que mapeia para o IdeVen__c do vendedor

    // Construir mapa de salesforceUserId → numeros contatados
    const sfUserContatou = new Set();
    const sfUserRespondeu = new Set();

    for (const chat of chats) {
      if (chat.isgroup) continue;
      const dtLast = chat.dt_lastmessage || chat.dt_second_last_message;
      if (!dtLast) continue;
      const dataChat = dtLast.substring(0, 10);
      if (dataChat !== hoje) continue;
      if (chat.last_salesforce_user) {
        if (chat.isent) sfUserContatou.add(chat.last_salesforce_user);
        else sfUserRespondeu.add(chat.last_salesforce_user);
      }
    }

    // Atualizar cada cliente na fila
    const filaAtualizada = fila.map(cliente => ({
      ...cliente,
      contatado: sfUserContatou.size > 0, // refinamento futuro: cruzar por número de telefone
      respondeu: sfUserRespondeu.size > 0,
      atualizadoCompliance: new Date().toISOString(),
    }));

    // Salvar fila atualizada no Firestore
    await fetch(docPath, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: objToFs({
          ...filaDoc,
          fila: filaAtualizada,
          ultimoCompliance: new Date().toISOString(),
          totalContatados: sfUserContatou.size,
        })
      })
    });

    return res.json({
      ok: true,
      data: hoje,
      totalClientes: fila.length,
      totalChatsHoje: chats.filter(c => !c.isgroup).length,
      contatadosHoje: sfUserContatou.size,
    });

  } catch (e) {
    console.error('compliance.js:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
