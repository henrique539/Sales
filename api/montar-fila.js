// montar-fila.js — IA monta fila diária priorizada com scripts
const PROJECT_ID = 'sales-team-6aeb6';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const MAKE_SECRET = 'sabagram-make-2026';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

// Mapa LisVen__c → info do vendedor
const VENDEDORES = {
  '185': { nome: 'Sizenando Andrade', email: 'nando@sabagram.com.br', userId: '005TW0000002BnNYAU', metaMensal: 233000, bu: 'BU MI' },
  '192': { nome: 'Kelly Julião',      email: 'kelly@sabagram.com.br',  userId: '005TW0000003rpNYAQ', metaMensal: 161000, bu: 'BU MI' },
  '11':  { nome: 'Marcelo Melo',      email: 'marcelo@sabagram.com.br',userId: '0054S000002TkpGQAS', metaMensal: 463000, bu: 'BU MI' },
  '200': { nome: 'Renata Santana',    email: 'renata@sabagram.com.br', userId: '005TW0000009V9RYAU', metaMensal: 105000, bu: 'BU MI' },
  '204': { nome: 'Cezar Fiorio',      email: 'cezar@sabagram.com.br',  userId: '005TW000000APunYAG', metaMensal: 172000, bu: 'BU ME' },
  '212': { nome: 'Diana Rigoni',      email: 'diana@sabagram.com.br',  userId: '0054S000002TkpZQAS', metaMensal: 25000,  bu: 'BU ME' },
  '171': { nome: 'Wesley Matieli',    email: 'wesley@sabagram.com.br', userId: '005TW000000C7AbYAK', metaMensal: 172000, bu: 'BU Obras' },
};

// ─── Auth Admin Firebase ──────────────────────────────────────────────────────
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
  for (const [k,v] of Object.entries(obj)) f[k] = toFsValue(v);
  return f;
}

// ─── Lógica de prioridade ─────────────────────────────────────────────────────
function calcPrioridade(cliente, pedidosCliente) {
  const dias = parseFloat(cliente.QtdDip__c) || 0;
  const score = parseInt(cliente.ScoAco__c) || 0;
  const status = cliente.StsCli__c || '';
  const totalPedidos = pedidosCliente?.total || 0;

  // URGENTE: clientes fiéis que pararam (score alto + muitos dias)
  if (score >= 4 && dias > 120) return 'URGENTE';
  if (score >= 3 && dias > 90 && totalPedidos >= 3) return 'URGENTE';
  // ALTA: em risco de inatividade
  if (dias > 60 && totalPedidos >= 2) return 'ALTA';
  if (status === '91A120' || status === '121A150') return 'ALTA';
  // MÉDIA: contato regular
  if (dias > 30) return 'MÉDIA';
  return 'NORMAL';
}

function deveContatarHoje(prioridade, diaSemana) {
  // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
  if (diaSemana === 0 || diaSemana === 6) return false; // fim de semana
  if (prioridade === 'URGENTE') return true; // todo dia útil
  if (prioridade === 'ALTA' && (diaSemana === 2 || diaSemana === 4)) return true; // Ter/Qui
  if (prioridade === 'MÉDIA' && diaSemana === 1) return true; // só Seg
  return false;
}

// ─── Gerar scripts via Claude ─────────────────────────────────────────────────
async function gerarScripts(clientesFila, ligacoesPorCliente) {
  const scripts = {};
  if (!clientesFila.length) return scripts;

  // Processar em lotes de 15 para não sobrecarregar
  const lotes = [];
  for (let i = 0; i < clientesFila.length; i += 15) lotes.push(clientesFila.slice(i, i+15));

  for (const lote of lotes) {
    const linhas = lote.map((c, i) => {
      const dias = parseFloat(c.QtdDip__c) || 0;
      const lig = ligacoesPorCliente[c.Id];
      const resumoLig = lig?.description ? lig.description.substring(0, 300) : 'Sem ligação registrada';
      const dataLig = c.DatUli__c ? new Date(c.DatUli__c).toLocaleDateString('pt-BR', {month:'short',year:'2-digit'}) : 'nunca';
      return `${i+1}. ID:${c.Id} | ${c.Name} | ${dias} dias sem comprar | score ${c.ScoAco__c||'?'} | status ${c.StsCli__c||'?'} | vendedor: ${c._vendedorNome||'?'} | ult.lig: ${dataLig} (${c.ResUli__c||'sem registro'}) | resumo: ${resumoLig}`;
    }).join('\n');

    const prompt = `Você é assistente de vendas sênior da Sabagram Granitos e Mármores.
Para cada cliente gere:
1. CONTEXTO: 1-2 frases sobre a situação comercial atual
2. SCRIPT: mensagem WhatsApp natural e personalizada, max 2 frases, português brasileiro informal
3. CANAL: "WA" ou "Ligação" (baseado no histórico)
4. PROXIMO_PASSO: o que fazer se não atender (1 frase)

Clientes:
${linhas}

Responda SOMENTE JSON válido sem markdown:
{"scripts":[{"id":"ID","contexto":"...","script":"...","canal":"WA","proximoPasso":"..."}]}`;

    try {
      const r = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': process.env.ANTHROPIC_API_KEY },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 3000, messages: [{ role: 'user', content: prompt }] })
      });
      const data = await r.json();
      const text = data.content?.find(b => b.type === 'text')?.text || '{}';
      const parsed = JSON.parse(text.replace(/```json|```/g,'').trim());
      (parsed.scripts || []).forEach(s => {
        scripts[s.id] = { contexto: s.contexto, script: s.script, canal: s.canal, proximoPasso: s.proximoPasso };
      });
    } catch(e) { console.error('Script lote erro:', e.message); }
  }
  return scripts;
}

// ─── Handler principal ────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-make-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const secret = req.headers['x-make-secret'];
  if (secret !== MAKE_SECRET) return res.status(401).json({ error: 'Não autorizado' });

  try {
    const { data, clientes, pedidos, ligacoes } = req.body;
    if (!data || !clientes?.length) return res.status(400).json({ error: 'data e clientes são obrigatórios' });

    const hoje = new Date(data + 'T12:00:00Z');
    const diaSemana = hoje.getDay();

    // Indexar pedidos por cliente
    const pedidosPorCliente = {};
    (pedidos || []).forEach(p => {
      if (!pedidosPorCliente[p.IdeCli__c]) pedidosPorCliente[p.IdeCli__c] = { total: 0, vendedor: p.IdeVen__c };
      pedidosPorCliente[p.IdeCli__c].total += p.total || 1;
    });

    // Indexar última ligação atendida por cliente
    const ligacoesPorCliente = {};
    (ligacoes || []).forEach(l => {
      if (!l.WhatId) return;
      if (!ligacoesPorCliente[l.WhatId] && l.Subject?.includes('Atendida')) {
        ligacoesPorCliente[l.WhatId] = { description: l.Description, date: l.ActivityDate };
      }
    });

    // Montar fila por vendedor
    const filasPorVendedor = {};

    for (const cliente of clientes) {
      const lisVen = (cliente.LisVen__c || '').replace(/^;|;$/g, '').split(';').filter(Boolean);

      for (const cod of lisVen) {
        const vInfo = VENDEDORES[cod];
        if (!vInfo) continue;

        const prioridade = calcPrioridade(cliente, pedidosPorCliente[cliente.Id]);
        if (!deveContatarHoje(prioridade, diaSemana)) continue;

        if (!filasPorVendedor[cod]) filasPorVendedor[cod] = [];
        filasPorVendedor[cod].push({
          ...cliente,
          _prioridade: prioridade,
          _vendedorCod: cod,
          _vendedorNome: vInfo.nome,
          _vendedorEmail: vInfo.email,
          _pedidos90d: pedidosPorCliente[cliente.Id]?.total || 0,
          _ultimaLigacaoResumo: ligacoesPorCliente[cliente.Id]?.description || null,
        });
      }
    }

    // Ordenar cada fila: URGENTE primeiro, depois dias sem comprar
    const ordem = { URGENTE: 0, ALTA: 1, MÉDIA: 2, NORMAL: 3 };
    for (const cod of Object.keys(filasPorVendedor)) {
      filasPorVendedor[cod].sort((a, b) =>
        (ordem[a._prioridade] || 3) - (ordem[b._prioridade] || 3) ||
        (parseFloat(b.QtdDip__c) || 0) - (parseFloat(a.QtdDip__c) || 0)
      );
    }

    // Gerar scripts para cada fila (top 20 por vendedor)
    const adminToken = await getAdminToken();
    const resultados = {};

    for (const [cod, fila] of Object.entries(filasPorVendedor)) {
      const vInfo = VENDEDORES[cod];
      const top = fila.slice(0, 20);
      const scripts = await gerarScripts(top, ligacoesPorCliente);

      // Enriquecer fila com scripts
      const filaFinal = fila.map(c => ({
        Id: c.Id,
        Name: c.Name,
        ScoAco__c: c.ScoAco__c,
        StsCli__c: c.StsCli__c,
        QtdDip__c: c.QtdDip__c,
        DatUli__c: c.DatUli__c,
        ResUli__c: c.ResUli__c,
        LisVen__c: c.LisVen__c,
        prioridade: c._prioridade,
        pedidos90d: c._pedidos90d,
        contatado: false,
        respondeu: false,
        contexto: scripts[c.Id]?.contexto || null,
        script: scripts[c.Id]?.script || null,
        canal: scripts[c.Id]?.canal || 'WA',
        proximoPasso: scripts[c.Id]?.proximoPasso || null,
      }));

      // Gravar no Firestore por vendedor
      const emailKey = vInfo.email.replace(/[@.]/g, '_');
      const docPath = `${FIRESTORE_URL}/fila/${emailKey}_${data}`;
      await fetch(docPath, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: objToFs({
          email: vInfo.email,
          data,
          vendedor: vInfo.nome,
          fila: filaFinal,
          total: filaFinal.length,
          atualizadoEm: new Date().toISOString(),
        })})
      });

      resultados[vInfo.nome] = filaFinal.length;
    }

    // Gravar também documento "todos" para compatibilidade
    const filaTotal = Object.values(filasPorVendedor).flat();
    await fetch(`${FIRESTORE_URL}/fila/todos_${data}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: objToFs({
        email: 'todos',
        data,
        fila: filaTotal.map(c => ({
          Id: c.Id, Name: c.Name, ScoAco__c: c.ScoAco__c, StsCli__c: c.StsCli__c,
          QtdDip__c: c.QtdDip__c, DatUli__c: c.DatUli__c, ResUli__c: c.ResUli__c,
          LisVen__c: c.LisVen__c, IdeVen__c: c.IdeVen__c || null,
          prioridade: c._prioridade, contatado: false, respondeu: false,
        })),
        atualizadoEm: new Date().toISOString(),
      })})
    });

    return res.json({ ok: true, data, resultados, totalClientes: filaTotal.length });

  } catch(e) {
    console.error('montar-fila.js:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
