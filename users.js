const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: "service_account",
      project_id: "sales-team-6aeb6",
      private_key_id: "5ef9d2fb8a51598b18afda30278989673e5c7321",
      private_key: process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQChiXXh6REadiqc\nfZiRIpgWEQu7Yv7OMP3OPUCHQP4fbNrfKopzrA/yhw2D41mYX9BOhiNvhkKXIV/Z\nh844IVG50V1rpmEYnmkhmJsjR27mX4FM4ThHiFAoZtrGwELitmiYHnH/ajwoNxK/\nhziJtAlZChs8Rd8WVB2+VURmxXZWZublrMtsoMpYqGXKZWs6kNgzloPbv422+30j\nS326BLvg7XKAAYezdWUgVH1vIV1hLRmHOy2LdogFq8fNzSMYR1W3fcuRA6EeYuZa\nV62HqH88nWnkb42VSgkyypqBL8shnqsb6cWlL8Jc87CPrs6r4/Y49z81t0fxXeMn\nSB9WRcmFAgMBAAECggEAEzbqHj6eabLfm7C22qCuTYWmixoZ7AXY0tTnXY9GCw/k\nMwJ46IxxcyxMV8FN0XmoKgb7pRLnzdlK8PGd/oA8G+nC/oCScR66q6Pe5EHld6Kp\nmy75Bk05F60wXc7VxejjpSCN9883q6LtaHnZqEuRhxVUKwW2pQ3JYe/7jGv1iQ5R\nCLRAa/WEfHceZhZBIo/3gTu8hfVbFnQ8N2cL2nBqG6t0BHIEhKb5wCeWe/hD6YPo\nNWnAb1fEPq0NViHvoyHdyGFJdBP71bHsEFuFrmhWSHtgq+9L8fCyehN3VdmvOU3r\nFPcly8qeyFKuYb0v1jFJILoKhs4ci/1nSt6tD6NkEQKBgQDQv39dZ8obZ/jD1675\naYGGYcFueGkyvfcS3Ohs8Fcq2sSNPqSdki6puPrWIdkbHnfhilbc2zTbKeI5L+ND\nmNg23DPQGn/GcsRMWfT9jF7j7DzfbCJvoOofCIbmmXqI1gKIKOFvBEWsHRsymHzm\nUxxnOW+dcW7lIYKUXDrhV0mVHQKBgQDGGi6CY4yyps9s+KbORAcGgx/qjxmRaQ4M\nRHlBs+FWG3h1msA0s+vNgqlZrxYd6hzrGaTkCTp7ApgEs5QjA3LVjQOMDzytcdBL\nq5MkCd4d7CVTiSHrr57e5GZ/wxdlslfuxXGhKOOQ231Oe3yIZNPc5JiNZRfSP9MO\nSZmAc+lhiQKBgES7uSk9QnvxqSR7AR8YkVB5IaLJPQI7MH5ihJlSLbFrpSpIxRUp\nC/pQcS9Op9jZGGoIDf/cobPEP7vKu88HJbIyoVDVWNsz8NSfDh7qOFhd8dEzHseY\nuV4MhbaqNIGXze+dXlUamAJK9yiasw13sjN+4vR5ZCVH+mH1WGHYRt81AoGAeE/K\nU1IWTyHT9ACHfdn+0kushI3oH1HIQFcNtYODpQIGBJa5iMiEu0lRhLA7JGvcqEPo\nyr14EOEgZiqSGzmq8lsz/kn6tfPbZzmKoWaEyXNzr+om+batK/1W6t0XRqIrmU28\nlv34Ry+mSJXiqgtiSFNk+uqcrwooKhM08Lh00tECgYBN+lFgaCC1MU2qmJvPIsQ8\n8lTQvgLRIg591stAmZfUL2wWmC/nYbf1cOP7Zndmvdt90lCHDLCChfs8TpMLmapO\n9I34bQqGRkAAp0NY9PSW9EVL1gjBXWq4U8YUT2hnTGiQKe5/6vF8p62iy5zKd1O4\nBX3Ersw+g2aht7QxJOhixQ==\n-----END PRIVATE KEY-----\n",
      client_email: "firebase-adminsdk-fbsvc@sales-team-6aeb6.iam.gserviceaccount.com",
      client_id: "111812646996565260774",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
    }),
  });
}

const db = admin.firestore();
const authAdmin = admin.auth();

// Verificar se quem chama é admin/gerente
async function verificarPermissao(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new Error('Sem token');
  const decoded = await authAdmin.verifyIdToken(token);
  const doc = await db.collection('usuarios').doc(decoded.email).get();
  if (!doc.exists) throw new Error('Usuário não encontrado');
  const perfil = doc.data().perfil;
  if (perfil !== 'admin' && perfil !== 'gerente') throw new Error('Sem permissão');
  return decoded;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET /api/users — listar todos
    if (req.method === 'GET') {
      await verificarPermissao(req);
      const snap = await db.collection('usuarios').orderBy('nome').get();
      const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return res.json({ users });
    }

    // POST /api/users — criar usuário
    if (req.method === 'POST') {
      await verificarPermissao(req);
      const { nome, email, senha, perfil, bu, whatsapp } = req.body;
      if (!nome || !email || !senha || !perfil) {
        return res.status(400).json({ error: 'Campos obrigatórios: nome, email, senha, perfil' });
      }

      // Criar no Firebase Auth
      const userRecord = await authAdmin.createUser({
        email: email.toLowerCase(),
        password: senha,
        displayName: nome,
      });

      // Salvar no Firestore
      await db.collection('usuarios').doc(email.toLowerCase()).set({
        uid: userRecord.uid,
        nome,
        email: email.toLowerCase(),
        perfil,
        bu: bu || '',
        whatsapp: whatsapp || '',
        ativo: true,
        criadoEm: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.json({ ok: true, uid: userRecord.uid });
    }

    // PUT /api/users — editar usuário
    if (req.method === 'PUT') {
      await verificarPermissao(req);
      const { email, nome, perfil, bu, whatsapp, ativo, novaSenha } = req.body;
      if (!email) return res.status(400).json({ error: 'Email obrigatório' });

      // Atualizar Firestore
      const update = {};
      if (nome !== undefined) update.nome = nome;
      if (perfil !== undefined) update.perfil = perfil;
      if (bu !== undefined) update.bu = bu;
      if (whatsapp !== undefined) update.whatsapp = whatsapp;
      if (ativo !== undefined) update.ativo = ativo;
      update.atualizadoEm = admin.firestore.FieldValue.serverTimestamp();
      await db.collection('usuarios').doc(email.toLowerCase()).update(update);

      // Atualizar Auth se senha ou ativo mudaram
      const doc = await db.collection('usuarios').doc(email.toLowerCase()).get();
      if (doc.exists) {
        const uid = doc.data().uid;
        const authUpdate = {};
        if (novaSenha) authUpdate.password = novaSenha;
        if (ativo === false) authUpdate.disabled = true;
        if (ativo === true) authUpdate.disabled = false;
        if (Object.keys(authUpdate).length > 0) {
          await authAdmin.updateUser(uid, authUpdate);
        }
      }

      return res.json({ ok: true });
    }

    // DELETE /api/users — desativar (não apaga)
    if (req.method === 'DELETE') {
      await verificarPermissao(req);
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email obrigatório' });
      const doc = await db.collection('usuarios').doc(email.toLowerCase()).get();
      if (doc.exists) {
        await authAdmin.updateUser(doc.data().uid, { disabled: true });
        await db.collection('usuarios').doc(email.toLowerCase()).update({ ativo: false });
      }
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: 'Método não permitido' });

  } catch (e) {
    console.error('users.js error:', e.message);
    return res.status(400).json({ error: e.message });
  }
};
