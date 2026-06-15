// Firebase REST API — sem dependências externas, igual ao claude.js
const PROJECT_ID = 'sales-team-6aeb6';

async function enviarEmailBoasVindas(nome, email, senha, perfil) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.warn('RESEND_API_KEY não configurado — email não enviado'); return; }

  const perfilLabel = { vendedor: 'Vendedor', gerente: 'Gerente', diretor: 'Diretor', admin: 'Administrador' }[perfil] || perfil;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 20px">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <!-- Header -->
        <tr><td style="background:#1a3254;padding:28px 36px">
          <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:.04em">SABA<span style="color:#e0aa18">GRAM</span></p>
          <p style="margin:6px 0 0;font-size:11px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em">Portal de Vendas</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:36px 36px 28px">
          <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#1a2540">Olá, ${nome}!</p>
          <p style="margin:0 0 24px;font-size:14px;color:#3d5073;line-height:1.6">Seu acesso ao <strong>Portal Sabagram</strong> foi criado. Use as credenciais abaixo para entrar.</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;border-radius:10px;margin-bottom:24px">
            <tr><td style="padding:20px 24px">
              <p style="margin:0 0 10px;font-size:10px;font-weight:700;color:#7589a8;text-transform:uppercase;letter-spacing:.08em">Suas credenciais</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:12px;color:#7589a8;padding:5px 0;width:80px">Perfil</td>
                  <td style="font-size:13px;font-weight:600;color:#1a2540;padding:5px 0">${perfilLabel}</td>
                </tr>
                <tr>
                  <td style="font-size:12px;color:#7589a8;padding:5px 0">E-mail</td>
                  <td style="font-size:13px;font-weight:600;color:#1a2540;padding:5px 0;font-family:monospace">${email}</td>
                </tr>
                <tr>
                  <td style="font-size:12px;color:#7589a8;padding:5px 0">Senha</td>
                  <td style="font-size:13px;font-weight:700;color:#1a2540;padding:5px 0;font-family:monospace">${senha}</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="https://portal.sabagram.com.br" style="display:inline-block;background:#1a3254;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:13px 32px;border-radius:8px;letter-spacing:.02em">Acessar o Portal →</a>
            </td></tr>
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:18px 36px;border-top:1px solid #e2e7ef">
          <p style="margin:0;font-size:11px;color:#a8b8cf;line-height:1.6">Recomendamos alterar sua senha após o primeiro acesso. Em caso de dúvidas, fale com seu gestor.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Portal Sabagram <portal@sabagram.com.br>',
        to: email,
        subject: 'Seu acesso ao Portal Sabagram',
        html,
      }),
    });
    const d = await r.json();
    if (d.error) console.error('Resend erro:', d.error);
    else console.log('Email enviado para', email, '| id:', d.id);
  } catch(e) {
    console.error('enviarEmailBoasVindas:', e.message);
  }
}
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const AUTH_URL = `https://identitytoolkit.googleapis.com/v1`;
const IAM_URL = `https://iamcredentials.googleapis.com/v1`;

// Gerar JWT para autenticar com Firebase Admin via service account
async function getAdminToken() {
  const serviceAccount = {
    client_email: 'firebase-adminsdk-fbsvc@sales-team-6aeb6.iam.gserviceaccount.com',
    private_key_id: '5ef9d2fb8a51598b18afda30278989673e5c7321',
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
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase',
  };

  const b64 = s => btoa(unescape(encodeURIComponent(JSON.stringify(s)))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const unsigned = `${b64(header)}.${b64(payload)}`;

  // Importar crypto para assinar
  const keyData = serviceAccount.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey,
    new TextEncoder().encode(unsigned)
  );
  const sig64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const jwt = `${unsigned}.${sig64}`;

  // Trocar JWT por access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error('Falha ao obter access token: ' + JSON.stringify(tokenData));
  return tokenData.access_token;
}

// Converter documento Firestore para objeto JS
function fsToObj(doc) {
  if (!doc.fields) return null;
  const result = { id: doc.name.split('/').pop() };
  for (const [k, v] of Object.entries(doc.fields)) {
    if (v.stringValue !== undefined) result[k] = v.stringValue;
    else if (v.booleanValue !== undefined) result[k] = v.booleanValue;
    else if (v.integerValue !== undefined) result[k] = parseInt(v.integerValue);
    else if (v.timestampValue !== undefined) result[k] = v.timestampValue;
    else result[k] = v;
  }
  return result;
}

// Converter objeto JS para campos Firestore
function objToFs(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') fields[k] = { stringValue: v };
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    else if (typeof v === 'number') fields[k] = { integerValue: String(v) };
  }
  return { fields };
}

// Verificar token Firebase do usuário logado e checar permissão
async function verificarPermissao(req) {
  const idToken = (req.headers.authorization || '').replace('Bearer ', '');
  if (!idToken) throw new Error('Sem token');
  
  // Verificar token via Firebase Auth REST API
  const verifyRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=AIzaSyC6oWnbIyaZejwtNcL2S0SrHKLlLLxzUfI`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }
  );
  const verifyData = await verifyRes.json();
  if (!verifyData.users?.[0]) throw new Error('Token inválido');
  const email = verifyData.users[0].email.toLowerCase();

  // Buscar perfil no Firestore (usando a API key pública — Firestore rules precisam permitir leitura autenticada)
  const adminToken = await getAdminToken();
  const docRes = await fetch(`${FIRESTORE_URL}/usuarios/${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const docData = await docRes.json();
  const user = fsToObj(docData);
  
  // Fallback: admin hardcoded
  const ADMINS = ['henrique@sabagram.com.br', 'dhiego@sabagram.com.br'];
  const perfil = user?.perfil || (ADMINS.includes(email) ? 'admin' : '');
  if (perfil !== 'admin' && perfil !== 'gerente') throw new Error('Sem permissão');
  return { email, adminToken };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { adminToken } = await verificarPermissao(req);

    // GET — listar usuários
    if (req.method === 'GET') {
      const r = await fetch(`${FIRESTORE_URL}/usuarios?orderBy=nome`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const data = await r.json();
      const users = (data.documents || []).map(fsToObj).filter(Boolean);
      return res.json({ users });
    }

    // POST — criar usuário
    if (req.method === 'POST') {
      const { nome, email, senha, perfil, bu, whatsapp } = req.body;
      if (!nome || !email || !senha || !perfil)
        return res.status(400).json({ error: 'nome, email, senha e perfil são obrigatórios' });
      const emailLower = email.toLowerCase();

      // Criar no Firebase Auth via REST
      const authRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyC6oWnbIyaZejwtNcL2S0SrHKLlLLxzUfI`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailLower, password: senha, displayName: nome, returnSecureToken: false }) }
      );
      const authData = await authRes.json();
      if (authData.error) throw new Error(authData.error.message);

      // Buscar UID via admin
      const listRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`,
        { method: 'POST', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: [emailLower] }) }
      );
      const listData = await listRes.json();
      const uid = listData.users?.[0]?.localId || '';

      // Salvar no Firestore
      await fetch(`${FIRESTORE_URL}/usuarios/${encodeURIComponent(emailLower)}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(objToFs({ uid, nome, email: emailLower, perfil, bu: bu || '', whatsapp: whatsapp || '', ativo: true }))
      });

      // Enviar email de boas-vindas (não bloqueia se falhar)
      enviarEmailBoasVindas(nome, emailLower, senha, perfil);

      return res.json({ ok: true, uid });
    }

    // PUT — editar usuário
    if (req.method === 'PUT') {
      const { email, nome, perfil, bu, whatsapp, ativo, novaSenha } = req.body;
      if (!email) return res.status(400).json({ error: 'email obrigatório' });
      const emailLower = email.toLowerCase();

      // Atualizar Firestore
      const update = {};
      if (nome !== undefined) update.nome = nome;
      if (perfil !== undefined) update.perfil = perfil;
      if (bu !== undefined) update.bu = bu;
      if (whatsapp !== undefined) update.whatsapp = whatsapp;
      if (ativo !== undefined) update.ativo = ativo;

      if (Object.keys(update).length > 0) {
        const fields = Object.keys(update).map(k => `updateMask.fieldPaths=${k}`).join('&');
        await fetch(`${FIRESTORE_URL}/usuarios/${encodeURIComponent(emailLower)}?${fields}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(objToFs(update))
        });
      }

      // Buscar UID para atualizar Auth
      if (novaSenha || ativo !== undefined) {
        const docRes = await fetch(`${FIRESTORE_URL}/usuarios/${encodeURIComponent(emailLower)}`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        const docData = await docRes.json();
        const user = fsToObj(docData);
        if (user?.uid) {
          const authUpdate = { localId: user.uid };
          if (novaSenha) authUpdate.password = novaSenha;
          if (ativo === false) authUpdate.disableUser = true;
          if (ativo === true) authUpdate.disableUser = false;
          await fetch(
            `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`,
            { method: 'POST', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(authUpdate) }
          );
        }
      }
      return res.json({ ok: true });
    }

    // DELETE — desativar
    if (req.method === 'DELETE') {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'email obrigatório' });
      const emailLower = email.toLowerCase();
      const docRes = await fetch(`${FIRESTORE_URL}/usuarios/${encodeURIComponent(emailLower)}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const user = fsToObj(await docRes.json());
      if (user?.uid) {
        await fetch(
          `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`,
          { method: 'POST', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ localId: user.uid, disableUser: true }) }
        );
      }
      await fetch(`${FIRESTORE_URL}/usuarios/${encodeURIComponent(emailLower)}?updateMask.fieldPaths=ativo`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(objToFs({ ativo: false }))
      });
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: 'Método não permitido' });

  } catch (e) {
    console.error('users.js:', e.message);
    return res.status(400).json({ error: e.message });
  }
}
