// contexto.js — grava contexto diário (clientes, pedidos, ligacoes) no Firestore
const PROJECT_ID = 'sales-team-6aeb6';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const MAKE_SECRET = 'sabagram-make-2026';

async function getAdminToken() {
  const sa = {
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
  const b64 = s => btoa(unescape(encodeURIComponent(JSON.stringify(s)))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iss: sa.client_email, sub: sa.client_email, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now+3600, scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase' };
  const unsigned = `${b64(header)}.${b64(payload)}`;
  const keyData = sa.private_key.replace('-----BEGIN PRIVATE KEY-----','').replace('-----END PRIVATE KEY-----','').replace(/\s/g,'');
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey('pkcs8', binaryKey.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(unsigned));
  const sig64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const jwt = `${unsigned}.${sig64}`;
  const tr = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}` });
  const td = await tr.json();
  if (!td.access_token) throw new Error('Token falhou');
  return td.access_token;
}

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
  for (const [k,v] of Object.entries(obj)) f[k] = toFsValue(v);
  return f;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-make-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Auth
  const secret = req.headers['x-make-secret'];
  if (secret !== MAKE_SECRET) {
    const idToken = (req.headers.authorization || '').replace('Bearer ', '');
    if (!idToken) return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    // GET — lê contexto do Firestore
    if (req.method === 'GET') {
      const { tipo, data } = req.query;
      if (!tipo || !data) return res.status(400).json({ error: 'tipo e data são obrigatórios' });
      const adminToken = await getAdminToken();
      const docPath = `${FIRESTORE_URL}/contexto/${tipo}_${data}`;
      const r = await fetch(docPath, { headers: { Authorization: `Bearer ${adminToken}` } });
      const d = await r.json();
      if (d.error || !d.fields) return res.json({ registros: [], total: 0 });
      const registros = d.fields.registros?.arrayValue?.values?.map(v => {
        if (v.mapValue) {
          const obj = {};
          for (const [k, val] of Object.entries(v.mapValue.fields || {})) {
            if (val.stringValue !== undefined) obj[k] = val.stringValue;
            else if (val.integerValue !== undefined) obj[k] = parseInt(val.integerValue);
            else if (val.doubleValue !== undefined) obj[k] = val.doubleValue;
            else if (val.nullValue !== undefined) obj[k] = null;
            else obj[k] = val;
          }
          return obj;
        }
        return null;
      }).filter(Boolean) || [];
      return res.json({ registros, total: registros.length });
    }

    // POST — grava contexto no Firestore
    if (req.method === 'POST') {
      const { tipo, data, registros } = req.body;
      if (!tipo || !data || !Array.isArray(registros)) {
        return res.status(400).json({ error: 'tipo, data e registros[] são obrigatórios' });
      }

      const tiposValidos = ['clientes', 'pedidos', 'ligacoes', 'nitzap', 'oportunidades', 'desempenho'];
      if (!tiposValidos.includes(tipo)) {
        return res.status(400).json({ error: `tipo deve ser: ${tiposValidos.join(', ')}` });
      }

      const adminToken = await getAdminToken();
      const docPath = `${FIRESTORE_URL}/contexto/${tipo}_${data}`;

      await fetch(docPath, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: objToFs({
          tipo,
          data,
          registros,
          total: registros.length,
          gravodoEm: new Date().toISOString(),
        })})
      });

      return res.json({ ok: true, tipo, data, total: registros.length });
    }

    return res.status(405).json({ error: 'Método não permitido' });

  } catch(e) {
    console.error('contexto.js:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
