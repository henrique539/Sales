import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Inicializar apenas uma vez
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: 'sales-team-6aeb6',
      clientEmail: 'firebase-adminsdk-fbsvc@sales-team-6aeb6.iam.gserviceaccount.com',
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
const authAdmin = getAuth();

async function verificarPermissao(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) throw new Error('Sem token de autenticação');
  const decoded = await authAdmin.verifyIdToken(token);
  const snap = await db.collection('usuarios').doc(decoded.email).get();
  if (!snap.exists) throw new Error('Usuário não encontrado no Firestore');
  const { perfil } = snap.data();
  if (perfil !== 'admin' && perfil !== 'gerente') throw new Error('Sem permissão');
  return decoded;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      await verificarPermissao(req);
      const snap = await db.collection('usuarios').orderBy('nome').get();
      const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return res.json({ users });
    }

    if (req.method === 'POST') {
      await verificarPermissao(req);
      const { nome, email, senha, perfil, bu, whatsapp } = req.body;
      if (!nome || !email || !senha || !perfil)
        return res.status(400).json({ error: 'Campos obrigatórios: nome, email, senha, perfil' });

      const userRecord = await authAdmin.createUser({
        email: email.toLowerCase(),
        password: senha,
        displayName: nome,
      });

      await db.collection('usuarios').doc(email.toLowerCase()).set({
        uid: userRecord.uid,
        nome,
        email: email.toLowerCase(),
        perfil,
        bu: bu || '',
        whatsapp: whatsapp || '',
        ativo: true,
        criadoEm: FieldValue.serverTimestamp(),
      });

      return res.json({ ok: true, uid: userRecord.uid });
    }

    if (req.method === 'PUT') {
      await verificarPermissao(req);
      const { email, nome, perfil, bu, whatsapp, ativo, novaSenha } = req.body;
      if (!email) return res.status(400).json({ error: 'Email obrigatório' });

      const update = { atualizadoEm: FieldValue.serverTimestamp() };
      if (nome !== undefined) update.nome = nome;
      if (perfil !== undefined) update.perfil = perfil;
      if (bu !== undefined) update.bu = bu;
      if (whatsapp !== undefined) update.whatsapp = whatsapp;
      if (ativo !== undefined) update.ativo = ativo;
      await db.collection('usuarios').doc(email.toLowerCase()).update(update);

      const docSnap = await db.collection('usuarios').doc(email.toLowerCase()).get();
      if (docSnap.exists) {
        const { uid } = docSnap.data();
        const authUpdate = {};
        if (novaSenha) authUpdate.password = novaSenha;
        if (ativo === false) authUpdate.disabled = true;
        if (ativo === true) authUpdate.disabled = false;
        if (Object.keys(authUpdate).length > 0) await authAdmin.updateUser(uid, authUpdate);
      }
      return res.json({ ok: true });
    }

    if (req.method === 'DELETE') {
      await verificarPermissao(req);
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email obrigatório' });
      const docSnap = await db.collection('usuarios').doc(email.toLowerCase()).get();
      if (docSnap.exists) {
        await authAdmin.updateUser(docSnap.data().uid, { disabled: true });
        await db.collection('usuarios').doc(email.toLowerCase()).update({ ativo: false });
      }
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: 'Método não permitido' });

  } catch (e) {
    console.error('users.js error:', e.message);
    return res.status(400).json({ error: e.message });
  }
}
