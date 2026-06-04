// montar-fila.js — lê contextos do Firestore e monta fila diária com IA
const PROJECT_ID = 'sales-team-6aeb6';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const MAKE_SECRET = 'sabagram-make-2026';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

const VENDEDORES = {
  '185': { nome: 'Sizenando Andrade', email: 'nando@sabagram.com.br',   userId: '005TW0000002BnNYAU', metaMensal: 233000, bu: 'BU MI', limite: 20 },
  '192': { nome: 'Kelly Julião',      email: 'kelly@sabagram.com.br',   userId: '005TW0000003rpNYAQ', metaMensal: 161000, bu: 'BU MI', limite: 15 },
  '11':  { nome: 'Marcelo Melo',      email: 'marcelo@sabagram.com.br', userId: '0054S000002TkpGQAS', metaMensal: 463000, bu: 'BU MI', limite: 20 },
  '203': { nome: 'Renata Santana',    email: 'santana@sabagram.com.br', userId: '005TW000000ANTBYA4', metaMensal: 105000, bu: 'BU MI', limite: 10 },
  '204': { nome: 'Cezar Fiorio',      email: 'cezar@sabagram.com.br',  userId: '005TW000000APunYAG', metaMensal: 172000, bu: 'BU ME', limite: 15 },
  '212': { nome: 'Diana Rigoni',      email: 'diana@sabagram.com.br',   userId: '0054S000002TkpZQAS', metaMensal: 25000,  bu: 'BU ME', limite: 10 },
  // Wesley (171) excluído — BU Obras trabalha com projetos
};

// ─── Feriados via API (dinâmico, funciona todo ano) ───────────────────────────
async function getFeriados(ano) {
  try {
    const [resBR, resUS] = await Promise.all([
      fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`),
      fetch(`https://date.nager.at/api/v3/PublicHolidays/${ano}/US`),
    ]);
    const [dataBR, dataUS] = await Promise.all([resBR.json(), resUS.json()]);
    const br = Array.isArray(dataBR) ? dataBR.map(f => f.date.slice(5)) : [];
    const us = Array.isArray(dataUS) ? dataUS.map(f => f.date.slice(5)) : [];
    return { br, us };
  } catch(e) {
    console.error('Erro ao buscar feriados:', e.message);
    return { br: [], us: [] };
  }
}

// ─── Auth Admin Firebase ──────────────────────────────────────────────────────
async function getAdminToken() {
  const sa = {
    client_email: 'firebase-adminsdk-fbsvc@sales-team-6aeb6.iam.gserviceaccount.com',
    private_key: `-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQChiXXh6REadiqc\nfZiRIpgWEQu7Yv7OMP3OPUCHQP4fbNrfKopzrA/yhw2D41mYX9BOhiNvhkKXIV/Z\nh844IVG50V1rpmEYnmkhmJsjR27mX4FM4ThHiFAoZtrGwELitmiYHnH/ajwoNxK/\nhziJtAlZChs8Rd8WVB2+VURmxXZWZublrMtsoMpYqGXKZWs6kNgzloPbv422+30j\nS326BLvg7XKAAYezdWUgVH1vIV1hLRmHOy2LdogFq8fNzSMYR1W3fcuRA6EeYuZa\nV62HqH88nWnkb42VSgkyypqBL8shnqsb6cWlL8Jc87CPrs6r4/Y49z81t0fxXeMn\nSB9WRcmFAgMBAAECggEAEzbqHj6eabLfm7C22qCuTYWmixoZ7AXY0tTnXY9GCw/k\nMwJ46IxxcyxMV8FN0XmoKgb7pRLnzdlK8PGd/oA8G+nC/oCScR66q6Pe5EHld6Kp\nmy75Bk05F60wXc7VxejjpSCN9883q6LtaHnZqEuRhxVUKwW2pQ3JYe/7jGv1iQ5R\nCLRAa/WEfHceZhZBIo/3gTu8hfVbFnQ8N2cL2nBqG6t0BHIEhKb5wCeWe/hD6YPo\nNWnAb1fEPq0NViHvoyHdyGFJdBP71bHsEFuFrmhWSHtgq+9L8fCyehN3VdmvOU3r\nFPcly8qeyFKuYb0v1jFJILoKhs4ci/1nSt6tD6NkEQKBgQDQv39dZ8obZ/jD1675\naYGGYcFueGkyvfcS3Ohs8Fcq2sSNPqSdki6puPrWIdkbHnfhilbc2zTbKeI5L+ND\nmNg23DPQGn/GcsRMWfT9jF7j7DzfbCJvoOofCIbmmXqI1gKIKOFvBEWsHRsymHzm\nUxxnOW+dcW7lIYKUXDrhV0mVHQKBgQDGGi6CY4yyps9s+KbORAcGgx/qjxmRaQ4M\nRHlBs+FWG3h1msA0s+vNgqlZrxYd6hzrGaTkCTp7ApgEs5QjA3LVjQOMDzytcdBL\nq5MkCd4d7CVTiSHrr57e5GZ/wxdlslfuxXGhKOOQ231Oe3yIZNPc5JiNZRfSP9MO\nSZmAc+lhiQKBgES7uSk9QnvxqSR7AR8YkVB5IaLJPQI7MH5ihJlSLbFrpSpIxRUp\nC/pQcS9Op9jZGGoIDf/cobPEP7vKu88HJbIyoVDVWNsz8NSfDh7qOFhd8dEzHseY\nuV4MhbaqNIGXze+dXlUamAJK9yiasw13sjN+4vR5ZCVH+mH1WGHYRt81AoGAeE/K\nU1IWTyHT9ACHfdn+0kushI3oH1HIQFcNtYODpQIGBJa5iMiEu0lRhLA7JGvcqEPo\nyr14EOEgZiqSGzmq8lsz/kn6tfPbZzmKoWaEyXNzr+om+batK/1W6t0XRqIrmU28\nlv34Ry+mSJXiqgtiSFNk+uqcrwooKhM08Lh00tECgYBN+lFgaCC1MU2qmJvPIsQ8\n8lTQvgLRIg591stAmZfUL2wWmC/nYbf1cOP7Zndmvdt90lCHDLCChfs8TpMLmapO\n9I34bQqGRkAAp0NY9PSW9EVL1gjBXWq4U8YUT2hnTGiQKe5/6vF8p62iy5zKd1O4\nBX3Ersw+g2aht7QxJOhixQ==\n-----END PRIVATE KEY-----`
  };
  const now = Math.floor(Date.now() / 1000);
  const b64 = s => btoa(unescape(encodeURIComponent(JSON.stringify(s)))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iss: sa.client_email, sub: sa.client_email, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now+3600, scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase' };
  const unsigned = `${b64(header)}.${b64(payload)}`;
  const keyData = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g,'');
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey('pkcs8', binaryKey.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(unsigned));
  const sig64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const jwt = `${unsigned}.${sig64}`;
  const tr = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}` });
  const td = await tr.json();
  if (!td.access_token) throw new Error('Token falhou: ' + JSON.stringify(td));
  return td.access_token;
}

// ─── Firestore helpers ────────────────────────────────────────────────────────
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
  for (const [k,v] of Object.entries(obj)) f[k] = fsVal(v);
  return f;
}
function fsToVal(v) {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.arrayValue) return (v.arrayValue.values||[]).map(fsToVal);
  if (v.mapValue) {
    const obj = {};
    for (const [k,val] of Object.entries(v.mapValue.fields||{})) obj[k] = fsToVal(val);
    return obj;
  }
  return null;
}

async function lerContexto(tipo, data, token) {
  const url = `${FIRESTORE_URL}/contexto/${tipo}_${data}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const d = await r.json();
  if (d.error || !d.fields) {
    console.log(`lerContexto ${tipo}_${data}: nao encontrado ou erro`, JSON.stringify(d.error||'sem fields'));
    return [];
  }
  const result = fsToVal(d.fields.registros) || [];
  console.log(`lerContexto ${tipo}_${data}: ${result.length} registros`);
  return result;
}

async function gravarFila(emailKey, data, doc, token) {
  const url = `${FIRESTORE_URL}/fila/${emailKey}_${data}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: objToFs(doc) })
  });
  const d = await r.json();
  if (d.error) console.error(`gravarFila ${emailKey}:`, d.error);
}

// ─── Prioridade ───────────────────────────────────────────────────────────────
function calcPrioridade(c, pedidos90d) {
  const dias = parseFloat(c.QtdDip__c) || 0;
  const score = parseInt(c.ScoAco__c) || 0;
  const status = c.StsCli__c || '';
  if (score >= 4 && dias > 120) return 'URGENTE';
  if (score >= 3 && dias > 90 && pedidos90d >= 3) return 'URGENTE';
  if (dias > 90) return 'ALTA';
  if (dias > 60 && pedidos90d >= 2) return 'ALTA';
  if (status === '91A120' || status === '121A150' || status === '151A180') return 'ALTA';
  if (dias > 30) return 'MÉDIA';
  return 'NORMAL';
}

function deveContatarHoje(prioridade, diaSemana) {
  if (diaSemana === 0 || diaSemana === 6) return false;
  if (prioridade === 'URGENTE') return true;
  if (prioridade === 'ALTA' && diaSemana !== 5) return true;
  if (prioridade === 'ALTA' && diaSemana === 5) return true; // sexta tom leve
  if (prioridade === 'MÉDIA' && diaSemana === 1) return true; // só segunda
  return false;
}

// ─── Scripts via IA ──────────────────────────────────────────────────────────
async function gerarScriptsLote(clientes, ligacoesPorCliente, nitzapPorCliente, vendedorNome, sexta) {
  const scripts = {};
  if (!clientes.length) return scripts;

  const linhas = clientes.map((c, i) => {
    const dias = parseFloat(c.QtdDip__c) || 0;
    const lig = ligacoesPorCliente[c.Id];
    const resumoLig = lig?.Description ? lig.Description.substring(0, 200) : null;
    const dataLig = c.DatUli__c ? new Date(c.DatUli__c).toLocaleDateString('pt-BR', {month:'short',year:'2-digit'}) : 'nunca';
    const nitzap = nitzapPorCliente[c.Id];
    const ultimoWA = nitzap ? `WA recente: "${(nitzap.text_last_message||'').substring(0,80)}"` : 'sem WA recente';
    const canalHist = (c.ResUli__c === 'Atendeu') ? 'historico: atende ligacao' : 'historico: nao atende bem';
    return `${i+1}. ID:${c.Id} | ${c.Name} | ${dias} dias sem comprar | score ${c.ScoAco__c||'?'} | ${c.StsCli__c||'?'} | ult.lig: ${dataLig} (${c.ResUli__c||'sem registro'}) | ${canalHist}${resumoLig?` | resumo: ${resumoLig}`:''}${ultimoWA?` | ${ultimoWA}`:''}`;
  }).join('\n');

  const tomsexta = sexta ? 'Hoje é SEXTA-FEIRA — use tom de relacionamento, não venda fria. Prefira WA a ligação fria.' : '';

  const prompt = `Você é assistente de vendas sênior da Sabagram Granitos e Mármores.
O vendedor ${vendedorNome} vai contatar esses clientes hoje. ${tomsexta}

Para cada cliente gere:
1. CONTEXTO: 1-2 frases sobre a situação comercial atual
2. SCRIPT: mensagem personalizada para o canal sugerido (max 2 frases, português informal)
3. CANAL: "WA" ou "Ligação" — se atende ligação use Ligação, se sexta prefira WA
4. MELHOR_HORARIO: sugestão de horário baseado no histórico (ex: "manhã 9h-11h", "tarde 14h-16h")
5. PROXIMO_PASSO: o que fazer se não atender (1 frase)

Clientes:
${linhas}

Responda SOMENTE JSON válido sem markdown:
{"scripts":[{"id":"ID","contexto":"...","script":"...","canal":"WA","melhorHorario":"...","proximoPasso":"..."}]}`;

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
      scripts[s.id] = { contexto: s.contexto, script: s.script, canal: s.canal||'WA', melhorHorario: s.melhorHorario, proximoPasso: s.proximoPasso };
    });
  } catch(e) { console.error('Script lote erro:', e.message); }
  return scripts;
}

// ─── Handler principal ────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-make-secret,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const secret = req.headers['x-make-secret'];
  if (secret !== MAKE_SECRET) return res.status(401).json({ error: 'Não autorizado' });

  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: 'data é obrigatório' });

    const hoje = new Date(data + 'T12:00:00Z');
    const diaSemana = hoje.getDay();
    const sexta = diaSemana === 5;
    const ano = data.slice(0, 4);
    const mmdd = data.slice(5);

    // Buscar feriados dinamicamente
    const { br: feriadosBR, us: feriadosUS } = await getFeriados(ano);
    const feriadoBR = feriadosBR.includes(mmdd);
    const feriadoUS = feriadosUS.includes(mmdd);
    console.log(`Data: ${data} | DiaSemana: ${diaSemana} | FeriadoBR: ${feriadoBR} | FeriadoUS: ${feriadoUS}`);

    const adminToken = await getAdminToken();

    // Ler os 4 contextos do Firestore
    console.log('Lendo contextos do Firestore para data:', data);
    const [clientes, pedidos, ligacoes, nitzap] = await Promise.all([
      lerContexto('clientes', data, adminToken),
      lerContexto('pedidos', data, adminToken),
      lerContexto('ligacoes', data, adminToken),
      lerContexto('nitzap', data, adminToken),
    ]);

    console.log(`Contextos: ${clientes.length} clientes, ${pedidos.length} pedidos, ${ligacoes.length} ligacoes, ${nitzap.length} nitzap`);

    if (!clientes.length) {
      return res.json({ ok: false, data, erro: 'Nenhum cliente no Firestore — verifique se os cenarios 1-4 rodaram', resultados: {}, totalClientes: 0 });
    }

    // Indexar pedidos por cliente
    const pedidosPorCliente = {};
    pedidos.forEach(p => {
      if (!p) return;
      const cliId = p.IdeCli__c;
      if (!cliId) return;
      if (!pedidosPorCliente[cliId]) pedidosPorCliente[cliId] = 0;
      pedidosPorCliente[cliId] += (p.total || 1);
    });

    // Indexar última ligação atendida por cliente
    const ligacoesPorCliente = {};
    ligacoes.forEach(l => {
      if (!l) return;
      const whatId = l.WhatId;
      const subject = l.Subject || '';
      if (!whatId || ligacoesPorCliente[whatId]) return;
      if (subject.includes('Atendida') && !subject.includes('Não Atendida')) {
        ligacoesPorCliente[whatId] = l;
      }
    });

    // Indexar Nitzap por last_salesforce_user (Account ID)
    const nitzapPorCliente = {};
    nitzap.forEach(n => {
      if (!n || !n.last_salesforce_user || n.isgroup) return;
      if (!nitzapPorCliente[n.last_salesforce_user]) {
        nitzapPorCliente[n.last_salesforce_user] = n;
      }
    });

    // Montar fila por vendedor
    const filasPorVendedor = {};
    const ordemPrioridade = { URGENTE: 0, ALTA: 1, 'MÉDIA': 2, NORMAL: 3 };

    for (const cliente of clientes) {
      if (!cliente || !cliente.Id) continue;
      const lisVen = (cliente.LisVen__c || '').replace(/^;|;$/g, '').split(';').filter(Boolean);

      for (const cod of lisVen) {
        const vInfo = VENDEDORES[cod];
        if (!vInfo) continue;

        const pedidos90d = pedidosPorCliente[cliente.Id] || 0;
        const prioridade = calcPrioridade(cliente, pedidos90d);
        if (!deveContatarHoje(prioridade, diaSemana)) continue;

        if (!filasPorVendedor[cod]) filasPorVendedor[cod] = [];
        filasPorVendedor[cod].push({ ...cliente, _prioridade: prioridade, _vendedorCod: cod, _vendedorNome: vInfo.nome, _vendedorEmail: vInfo.email, _pedidos90d: pedidos90d });
      }
    }

    const resultados = {};

    for (const [cod, fila] of Object.entries(filasPorVendedor)) {
      const vInfo = VENDEDORES[cod];

      // Pular BU em feriado
      if (feriadoBR && vInfo.bu !== 'BU ME') {
        console.log(`Feriado BR — pulando ${vInfo.nome}`);
        resultados[vInfo.nome] = 'Feriado BR';
        continue;
      }
      if (feriadoUS && vInfo.bu === 'BU ME') {
        console.log(`Feriado US — pulando ${vInfo.nome}`);
        resultados[vInfo.nome] = 'Feriado US';
        continue;
      }

      // Ordenar: URGENTE primeiro, depois por dias sem comprar
      fila.sort((a, b) =>
        (ordemPrioridade[a._prioridade]||3) - (ordemPrioridade[b._prioridade]||3) ||
        (parseFloat(b.QtdDip__c)||0) - (parseFloat(a.QtdDip__c)||0)
      );

      // Cap de fila por prioridade
      const limite = vInfo.limite || 20;
      const urgentes = fila.filter(c => c._prioridade === 'URGENTE');
      const altas = fila.filter(c => c._prioridade === 'ALTA');
      const medias = sexta ? [] : fila.filter(c => c._prioridade === 'MÉDIA');
      const restante = Math.max(0, limite - urgentes.length);
      const altasCap = altas.slice(0, restante);
      const mediasCap = medias.slice(0, Math.max(0, restante - altasCap.length));
      const filaFinal = [...urgentes, ...altasCap, ...mediasCap];

      // Gerar scripts em lotes de 15
      const scripts = {};
      for (let i = 0; i < filaFinal.length; i += 15) {
        const lote = filaFinal.slice(i, i + 15);
        const scriptsLote = await gerarScriptsLote(lote, ligacoesPorCliente, nitzapPorCliente, vInfo.nome, sexta);
        Object.assign(scripts, scriptsLote);
      }

      // Montar documento final
      const filaDoc = filaFinal.map(c => ({
        Id: c.Id, Name: c.Name, ScoAco__c: c.ScoAco__c||null, StsCli__c: c.StsCli__c||null,
        QtdDip__c: c.QtdDip__c||null, DatUli__c: c.DatUli__c||null, ResUli__c: c.ResUli__c||null,
        LisVen__c: c.LisVen__c||null, nitzap20__DateTime_Last_Sent_Whatsapp__c: c.nitzap20__DateTime_Last_Sent_Whatsapp__c||null,
        prioridade: c._prioridade, pedidos90d: c._pedidos90d, contatado: false, respondeu: false,
        contexto: scripts[c.Id]?.contexto||null, script: scripts[c.Id]?.script||null,
        canal: scripts[c.Id]?.canal||'WA', melhorHorario: scripts[c.Id]?.melhorHorario||null,
        proximoPasso: scripts[c.Id]?.proximoPasso||null,
      }));

      const emailKey = vInfo.email.replace(/[@.]/g, '_');
      await gravarFila(emailKey, data, {
        email: vInfo.email, data, vendedor: vInfo.nome, fila: filaDoc,
        total: filaDoc.length, urgentes: filaDoc.filter(c => c.prioridade==='URGENTE').length,
        atualizadoEm: new Date().toISOString(),
      }, adminToken);

      resultados[vInfo.nome] = filaDoc.length;
    }

    // Gravar "todos" para compatibilidade
    const filaTotal = Object.values(filasPorVendedor).flat().map(c => ({
      Id: c.Id, Name: c.Name, ScoAco__c: c.ScoAco__c, StsCli__c: c.StsCli__c,
      QtdDip__c: c.QtdDip__c, DatUli__c: c.DatUli__c, ResUli__c: c.ResUli__c,
      LisVen__c: c.LisVen__c, prioridade: c._prioridade, contatado: false, respondeu: false,
    }));

    await gravarFila('todos', data, {
      email: 'todos', data, fila: filaTotal, total: filaTotal.length,
      atualizadoEm: new Date().toISOString(),
    }, adminToken);

    return res.json({ ok: true, data, resultados, totalClientes: filaTotal.length });

  } catch(e) {
    console.error('montar-fila.js:', e.message, e.stack);
    return res.status(500).json({ error: e.message });
  }
}

