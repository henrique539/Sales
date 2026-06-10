// montar-fila.js — lê contextos do Firestore e monta fila diária com IA
const PROJECT_ID = 'sales-team-6aeb6';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const MAKE_SECRET = 'sabagram-make-2026';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const NITZAP_URL = 'https://sabagram.nitzap.com';
const NITZAP_TIMEOUT_MS = 5000;
const CLAUDE_TIMEOUT_MS = 25000;
const NITZAP_DETAIL_LIMIT_PER_BATCH = 5;

const VENDEDORES = {
  '185': { nome: 'Sizenando Andrade', email: 'nando@sabagram.com.br',   userId: '005TW0000002BnNYAU', metaMensal: 233000, bu: 'BU MI', limite: 20, threshold: 100 },
  '192': { nome: 'Kelly Julião',      email: 'kelly@sabagram.com.br',   userId: '005TW0000003rpNYAQ', metaMensal: 161000, bu: 'BU MI', limite: 15, threshold: 100 },
  '11':  { nome: 'Marcelo Melo',      email: 'marcelo@sabagram.com.br', userId: '0054S000002TkpGQAS', metaMensal: 463000, bu: 'BU MI', limite: 20, threshold: 100 },
  '203': { nome: 'Renata Santana',    email: 'santana@sabagram.com.br', userId: '005TW000000ANTBYA4', metaMensal: 105000, bu: 'BU MI', limite: 15, threshold: 100 },
  '204': { nome: 'Cezar Fiorio',      email: 'cezar@sabagram.com.br',  userId: '005TW000000APunYAG', metaMensal: 172000, bu: 'BU ME', limite: 15, threshold: 50 },
  '212': { nome: 'Diana Rigoni',      email: 'diana@sabagram.com.br',   userId: '0054S000002TkpZQAS', metaMensal: 25000,  bu: 'BU ME', limite: 10, threshold: 50 },
  // Wesley (171) excluído — BU Obras trabalha com projetos
};

async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

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
  const raw = fsToVal(d.fields.registros) || [];
  // Registros podem ser strings JSON — fazer parse
  const result = raw.map(r => {
    if (typeof r === 'string') { try { return JSON.parse(r); } catch(e) { return null; } }
    return r;
  }).filter(Boolean);
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
function calcPrioridade(c, oportunidade) {
  const isProspect = c.RecordTypeId === '0124S0000005RiNQAU';
  const dias = parseFloat(c.QtdDip__c) || 0;

  // Oportunidade ativa sobe prioridade
  if (oportunidade) {
    const sts = oportunidade.StsOpo__c;
    const abrioLink   = (parseFloat(oportunidade.QtdAbl__c) || 0) > 0;
    const abrioEmail  = (parseFloat(oportunidade.QtdAbe__c) || 0) > 0;
    const abrioOferta = (parseFloat(oportunidade.QtdAbo__c) || 0) > 0;
    if (sts === 'Inspeção' || sts === 'PCP') return 'CRÍTICO';
    if (sts === 'Negociação') return 'URGENTE';
    if (abrioLink || abrioOferta) return 'URGENTE';
    if (abrioEmail) return 'ALTA';
    if (sts === 'Oferta') return 'ATENÇÃO';
  }

  if (isProspect) return 'PROSPECÇÃO';
  if (dias > 120) return 'CRÍTICO';
  if (dias > 90)  return 'URGENTE';
  if (dias > 60)  return 'ALTA';
  if (dias > 30)  return 'ATENÇÃO';
  return 'MANUTENÇÃO';
}

function deveContatarHoje(prioridade, diaSemana) {
  // Fim de semana nunca
  if (diaSemana === 0 || diaSemana === 6) return false;
  // Todo dia útil todos os 6 níveis entram — o cap controla a quantidade
  return ['CRÍTICO','URGENTE','ALTA','ATENÇÃO','PROSPECÇÃO','MANUTENÇÃO'].includes(prioridade);
}

// ─── Mensagens Nitzap por cliente ────────────────────────────────────────────
async function buscarMensagensCliente(chat) {
  if (!chat?.sequence || !chat?.secondwhatsappid) return [];
  try {
    // 3 dias antes da última mensagem
    const sequenceFinal = String(chat.sequence);
    const sequenceInicio = String(chat.sequence - (3 * 24 * 60 * 60 * 1000));
    const target = chat.secondwhatsappid.replace('@s.whatsapp.net','');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const r = await fetchWithTimeout(`${NITZAP_URL}/whatsapp/get-range-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NITZAP_TOKEN}`
      },
      body: JSON.stringify({ target, sequence: sequenceInicio, finalSequence: sequenceFinal }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const data = await r.json();
    if (!Array.isArray(data)) return [];
    // Filtrar só texto, últimas 8 mensagens
    return data
      .filter(m => m.type === 'text' && m.text && m.text.trim())
      .slice(-8)
      .map(m => ({ de: m.isent ? 'Vendedor' : 'Cliente', texto: m.text, data: m.datemsg }));
  } catch(e) {
    console.error('Nitzap msgs erro:', e.message);
    return [];
  }
}

// ─── Scripts via IA ──────────────────────────────────────────────────────────
async function gerarScriptsLote(clientes, ligacoesPorCliente, historicoLigPorCliente, nitzapPorCliente, nitzapPorTelefone, vendedorNome, sexta) {
  const scripts = {};
  if (!clientes.length) return scripts;

  const linhas = clientes.map((c, i) => {
    const dias = parseFloat(c.QtdDip__c) || 0;
    const isProspect = c.RecordTypeId === '0124S0000005RiNQAU';
    const lig = ligacoesPorCliente[c.Id];
    const resumoLig = lig?.Description ? lig.Description.substring(0, 300) : null;

    // Histórico de ligações: usa Task ActivityDate + Subject (mais confiável que DatUli__c)
    const ligsCliente = (historicoLigPorCliente[c.Id] || []).slice(0, 5);
    let historicoLig;
    if (ligsCliente.length) {
      historicoLig = ligsCliente.map(l => {
        const data = l.ActivityDate ? new Date(l.ActivityDate).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}) : '?';
        const atendida = (l.Subject||'').includes('Atendida') && !(l.Subject||'').includes('Não Atendida');
        const resultado = atendida ? 'Atendida' : 'Não Atendida';
        const resumo = l.Description ? ` — "${l.Description.substring(0,80)}"` : '';
        return `    ${data}: ${resultado}${resumo}`;
      }).join('\n');
    } else {
      const dataLig = c.DatUli__c ? new Date(c.DatUli__c).toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}) : null;
      historicoLig = dataLig
        ? `    ${dataLig}: ${c.ResUli__c||'sem resultado'}${resumoLig?' — "'+resumoLig+'"':''}`
        : '    sem ligações registradas (180 dias)';
    }

    const telNorm = (c.Phone||'').replace(/\D/g,'');
    const telBR = telNorm.length === 11 ? '55' + telNorm : telNorm.length === 13 ? telNorm : '';
    const nitzapCtx = nitzapPorCliente[c.Id] || (telBR && nitzapPorTelefone ? nitzapPorTelefone[telBR] : null);
    const dataUltimoWA = c.nitzap20__DateTime_Last_Sent_Whatsapp__c;
    const historicoWA = nitzapCtx && nitzapCtx.text_last_message
      ? `    Vendedor (${(nitzapCtx.dt_lastmessage||'').slice(0,10)}): "${nitzapCtx.text_last_message}"`
      : dataUltimoWA
        ? `    Último WA enviado em ${new Date(dataUltimoWA).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})} (sem texto disponível)`
        : '    sem WhatsApp recente';
    const oportunidade = c._oportunidade;
    const opoInfo = oportunidade ? `Oportunidade: ${oportunidade.StsOpo__c} | email aberto: ${oportunidade.QtdAbe__c>0?'SIM':'NÃO'} | link aberto: ${oportunidade.QtdAbl__c>0?'SIM':'NÃO'} | validade: ${oportunidade.DatVld__c?new Date(oportunidade.DatVld__c).toLocaleDateString('pt-BR'):'—'}` : 'Sem oportunidade ativa';
    return [
      `${i+1}. ID:${c.Id} | ${c.Name} | ${isProspect?'PROSPECT':dias+'d sem comprar'} | score ${c.ScoAco__c||'?'}`,
      `   ${opoInfo}`,
      `   Ligações recentes (180d):\n${historicoLig}`,
      `   Histórico WA:\n${historicoWA}`
    ].join('\n');
  }).join('\n\n');

  const tomsexta = sexta ? 'Hoje é SEXTA — use tom de relacionamento, não venda fria. Prefira WA.' : '';

  const prompt = `Você é assistente de vendas sênior da Sabagram Granitos e Mármores.
O vendedor ${vendedorNome} vai contatar esses clientes hoje. ${tomsexta}

PARA CADA CLIENTE analise todos os dados e gere:
1. PRIORIDADE_AJUSTADA: sinal de compra iminente → suba 1 nível | descarte → baixe | sem contexto → mantenha
2. HISTORICO: string com bullets separados por | com dados reais. Ex: "Último pedido R$37k fev/26 | 8 compras | frequência 2-3 meses | WA: áudio 28 mai (cliente enviou)"
3. SITUACAO: string com bullets separados por | sobre momento atual. Ex: "5 lig não atendidas jun | parou após maior pedido | sem WA recente"
4. ABORDAGEM: objeto com gancho (frase de abertura específica e informal, max 1 frase), objecao (principal objeção provável, max 1 frase), canal (ex: "WA · 14h-17h" ou "Ligação · 10h-12h")

Clientes:
${linhas}

Responda SOMENTE JSON válido sem markdown:
{"scripts":[{"id":"ID","prioridadeAjustada":"CRÍTICO|URGENTE|ALTA|ATENÇÃO|MANUTENÇÃO|PROSPECÇÃO","historico":"...","situacao":"...","abordagem":{"gancho":"...","objecao":"...","canal":"WA · 14h-17h"}}]}`;

  try {
    const r = await fetchWithTimeout(ANTHROPIC_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': process.env.ANTHROPIC_API_KEY },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] })
    }, CLAUDE_TIMEOUT_MS);
    const data = await r.json();
    const text = data.content?.find(b => b.type === 'text')?.text || '{}';
    const parsed = JSON.parse(text.replace(/```json|```/g,'').trim());
    (parsed.scripts || []).forEach(s => {
      scripts[s.id] = {
        prioridadeAjustada: s.prioridadeAjustada || null,
        historico: s.historico || null,
        situacao: s.situacao || null,
        abordagem: s.abordagem || null,
        contexto: s.situacao || s.contexto || null,
        script: s.abordagem?.gancho || s.script || null,
        canal: s.abordagem?.canal || s.canal || 'WA',
        melhorHorario: s.abordagem?.canal || s.melhorHorario || null,
      };
    });
  } catch(e) { console.error('Script lote erro:', e.message); }
  return scripts;
}


// ─── Limite Dinâmico ─────────────────────────────────────────────────────────
async function calcLimiteDinamico(email, vInfo, data, token, feriados = { br: [], us: [] }) {
  try {
    // 1. Ler desempenho
    const desempenhoUrl = `${FIRESTORE_URL}/contexto/desempenho_${data}`;
    const dr = await fetch(desempenhoUrl, { headers: { Authorization: `Bearer ${token}` } });
    const dd = await dr.json();
    if (dd.error || !dd.fields) return vInfo.limite; // fallback

    // Extrair dados do vendedor do desempenho
    const vendedoresRaw = dd.fields.vendedores?.mapValue?.fields;
    if (!vendedoresRaw || !vendedoresRaw[email]) return vInfo.limite;

    const vdFields = vendedoresRaw[email].mapValue?.fields || {};
    const fatMesAtual = parseFloat(vdFields.mesAtual?.mapValue?.fields?.faturamento?.integerValue
      || vdFields.mesAtual?.mapValue?.fields?.faturamento?.doubleValue || 0);
    const ticketMedio = parseFloat(vdFields.ticket3m?.integerValue
      || vdFields.ticket3m?.doubleValue
      || vdFields.ticketMedio?.integerValue
      || vdFields.ticketMedio?.doubleValue || 0);

    if (ticketMedio <= 0) return vInfo.limite;

    // Meta restante no mês
    const metaRestante = Math.max(0, vInfo.metaMensal - fatMesAtual);
    if (metaRestante <= 0) return Math.max(3, Math.floor(vInfo.limite * 0.3)); // meta batida — reduz fila

    // 2. Dias úteis restantes no mês (excluindo feriados conforme BU do vendedor)
    const isUS = vInfo.bu === 'BU ME';
    const feriadosVendedor = isUS ? feriados.us : feriados.br;
    const hoje = new Date(data + 'T12:00:00Z');
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    let diasUteis = 0;
    const d = new Date(hoje);
    d.setDate(d.getDate() + 1);
    while (d <= fimMes) {
      const diaSemana = d.getDay();
      const mmdd = d.toISOString().slice(5, 10);
      if (diaSemana !== 0 && diaSemana !== 6 && !feriadosVendedor.includes(mmdd)) diasUteis++;
      d.setDate(d.getDate() + 1);
    }
    if (diasUteis <= 0) diasUteis = 1;
    const diasUteisEfetivos = Math.max(1, diasUteis * 0.8); // 80% dos dias úteis como margem

    // 3. Ler ligações para calcular taxas (últimos 90 dias)
    const ligUrl = `${FIRESTORE_URL}/contexto/ligacoes_${data}`;
    const lr = await fetch(ligUrl, { headers: { Authorization: `Bearer ${token}` } });
    const ld = await lr.json();

    let taxaAtendimento = 0.35; // default
    let taxaConversao   = 0.10; // default

    if (!ld.error && ld.fields) {
      const ligsRaw = ld.fields.registros?.arrayValue?.values || [];
      const ligs = ligsRaw.map(v => {
        if (v.mapValue) {
          const f = v.mapValue.fields || {};
          return {
            ownerId:  f.OwnerId?.stringValue || '',
            subject:  f.Subject?.stringValue || '',
          };
        }
        return null;
      }).filter(Boolean);

      const ligVendedor = ligs.filter(l => l.ownerId === vInfo.userId);
      const totalLig    = ligVendedor.length;
      const atendidas   = ligVendedor.filter(l => l.subject.includes('Atendida') && !l.subject.includes('Não Atendida')).length;

      if (totalLig > 5) {
        taxaAtendimento = atendidas / totalLig;

        // Taxa de conversão = pedidos mês / ligações atendidas 90d
        const totalPedidos = parseFloat(vdFields.totalPedidos?.integerValue || 0);
        const mesesArr = vdFields.meses?.arrayValue?.values || [];
        // Usa pedidos dos últimos 3 meses para estimar conversão
        const ped3m = mesesArr.slice(-3).reduce((s, m) => {
          return s + parseFloat(m.mapValue?.fields?.pedidos?.integerValue || 0);
        }, 0);
        if (atendidas > 0 && ped3m > 0) {
          taxaConversao = Math.min(0.8, ped3m / atendidas);
        }
      }
    }

    // 4. Cálculo do limite
    // limite = metaRestante / diasUteis / ticketMedio / (taxaAtendimento * taxaConversao)
    const contatosNecessarios = metaRestante / diasUteisEfetivos / ticketMedio / (taxaAtendimento * taxaConversao);
    // Arredonda para cima, aplica min/max razoável
    const limiteDinamico = Math.min(
      25,                        // cap absoluto — máximo 25 clientes por vendedor
      Math.max(
        Math.ceil(vInfo.limite * 0.5), // nunca menos que 50% do limite fixo
        Math.ceil(contatosNecessarios)
      )
    );

    console.log(`[LIMITE] ${vInfo.nome}: meta=${vInfo.metaMensal} fat=${fatMesAtual} restante=${metaRestante} diasUteis=${diasUteis} efetivos=${diasUteisEfetivos.toFixed(1)} ticket=${ticketMedio} atend=${(taxaAtendimento*100).toFixed(0)}% conv=${(taxaConversao*100).toFixed(0)}% feriados=${feriadosVendedor.length} → limite=${limiteDinamico} (fixo=${vInfo.limite})`);
    return limiteDinamico;

  } catch(e) {
    console.error(`[LIMITE] ${vInfo.nome} erro:`, e.message);
    return vInfo.limite; // fallback
  }
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
    const { data, vendedor: vendedorFiltro } = req.body;
    if (!data) return res.status(400).json({ error: 'data é obrigatório' });
    // Se vendedor especificado, processa só ele (ex: "185" para Sizenando)
    const VENDEDORES_ATIVOS = vendedorFiltro
      ? Object.fromEntries(Object.entries(VENDEDORES).filter(([cod]) => cod === vendedorFiltro))
      : VENDEDORES;
    if (vendedorFiltro && !Object.keys(VENDEDORES_ATIVOS).length) {
      return res.status(400).json({ error: `Vendedor ${vendedorFiltro} não encontrado` });
    }

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
    const [clientes, pedidos, ligacoes, nitzap, oportunidades] = await Promise.all([
      lerContexto('clientes', data, adminToken),
      lerContexto('pedidos', data, adminToken),
      lerContexto('ligacoes', data, adminToken),
      lerContexto('nitzap', data, adminToken),
      lerContexto('oportunidades', data, adminToken),
    ]);

    console.log(`Contextos: ${clientes.length} clientes, ${pedidos.length} pedidos, ${ligacoes.length} ligacoes, ${nitzap.length} nitzap, ${oportunidades.length} oportunidades`);

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

    // Indexar ligações por cliente — última atendida + histórico completo
    const ligacoesPorCliente = {};    // última atendida (para resumo)
    const historicoLigPorCliente = {}; // todas as ligações ordenadas (para IA)
    ligacoes.forEach(l => {
      if (!l) return;
      const whatId = l.WhatId;
      const subject = l.Subject || '';
      if (!whatId) return;
      // Histórico completo (todas as ligações)
      if (!historicoLigPorCliente[whatId]) historicoLigPorCliente[whatId] = [];
      historicoLigPorCliente[whatId].push(l);
      // Última atendida
      const atendida = subject.includes('Atendida') && !subject.includes('Não Atendida');
      if (atendida && !ligacoesPorCliente[whatId]) {
        ligacoesPorCliente[whatId] = l;
      }
    });

    // Indexar Nitzap por last_salesforce_user (Account ID)
    const nitzapPorCliente = {};
    const nitzapPorTelefone = {};
    nitzap.forEach(n => {
      if (!n || n.isgroup) return;
      if (n.last_salesforce_user && !nitzapPorCliente[n.last_salesforce_user]) {
        nitzapPorCliente[n.last_salesforce_user] = n;
      }
      if (n.secondwhatsappid) {
        const num = (n.secondwhatsappid||'').replace('@s.whatsapp.net','').replace('@c.us','');
        if (num && !nitzapPorTelefone[num]) nitzapPorTelefone[num] = n;
      }
    });

    // Indexar oportunidades por cliente — pega a mais relevante
    const statusPeso = { 'Inspeção': 6, 'PCP': 5, 'Negociação': 4, 'Aprovação Comercial': 3, 'Aprovação Financeira': 3, 'Oferta': 2, 'Sincronização': 1 };
    const oportunidadesPorCliente = {};
    console.log('Oportunidades sample:', JSON.stringify(oportunidades.slice(0,2)));
    oportunidades.forEach(o => {
      // Make grava com labels em português
      const cliId = o.IdeCli__c || o['Cliente'];
      const sts = o.StsOpo__c || o['Status'];
      const abeEmail = parseFloat(o.QtdAbe__c ?? o['Quantidade de Aberturas'] ?? 0);
      const abeLink = parseFloat(o.QtdAbl__c ?? o['Quantidade de Aberturas do Link'] ?? 0);
      const abeOferta = parseFloat(o.QtdAbo__c ?? o['Quantidade de Aberturas (Oferta)'] ?? 0);
      const validade = o.DatVld__c || o['Data Validade'];
      if (!cliId) return;
      const oNorm = { IdeCli__c: cliId, StsOpo__c: sts, QtdAbe__c: abeEmail, QtdAbl__c: abeLink, QtdAbo__c: abeOferta, DatVld__c: validade };
      const peso = statusPeso[sts] || 0;
      const atual = oportunidadesPorCliente[cliId];
      if (!atual || peso > (statusPeso[atual.StsOpo__c] || 0)) oportunidadesPorCliente[cliId] = oNorm;
    });

    // Montar fila por vendedor
    const filasPorVendedor = {};
    const ordemPrioridade = { 'CRÍTICO': 0, URGENTE: 1, ALTA: 2, 'ATENÇÃO': 3, 'PROSPECÇÃO': 4, 'MANUTENÇÃO': 5 };

    for (const cliente of clientes) {
      if (!cliente || !cliente.Id) continue;
      const lisVen = (cliente.LisVen__c || '').replace(/^;|;$/g, '').split(';').filter(Boolean);

      for (const cod of lisVen) {
        const vInfo = VENDEDORES_ATIVOS[cod];
        if (!vInfo) continue;

        const pedidos90d = pedidosPorCliente[cliente.Id] || 0;
        const oportunidade = oportunidadesPorCliente[cliente.Id] || null;
        const prioridade = calcPrioridade(cliente, oportunidade);
        if (!deveContatarHoje(prioridade, diaSemana)) continue;

        if (!filasPorVendedor[cod]) filasPorVendedor[cod] = [];
        filasPorVendedor[cod].push({ ...cliente, _prioridade: prioridade, _vendedorCod: cod, _vendedorNome: vInfo.nome, _vendedorEmail: vInfo.email, _pedidos90d: pedidos90d, _oportunidade: oportunidade });
      }
    }

    const resultados = {};

    for (const [cod, fila] of Object.entries(filasPorVendedor)) {
      const vInfo = VENDEDORES_ATIVOS[cod];

      // Contar clientes ativos para definir modo EXPANSAO/FOCO
      const clientesAtivos = fila.filter(c => c.RecordTypeId !== '0124S0000005RiNQAU').length;
      const modo = clientesAtivos < (vInfo.threshold || 100) ? 'EXPANSAO' : 'FOCO';
      console.log(`${vInfo.nome}: ${clientesAtivos} ativos → modo ${modo}`);

      // Filtrar por feriado + modo EXPANSAO/FOCO
      const filaFiltrada = fila.filter(c => {
        const isUS = c.BillingCountry && c.BillingCountry !== 'Brazil';
        if (feriadoUS && isUS) return false;
        if (feriadoBR && !isUS) return false;

        const isProspect = c.RecordTypeId === '0124S0000005RiNQAU';
        if (!isProspect) return true; // clientes sempre entram

        // Prospect — depende do modo
        if (modo === 'EXPANSAO') return true; // todos entram

        // Modo FOCO — prospect só entra com engajamento
        const opo = oportunidadesPorCliente[c.Id];
        const temWA = nitzapPorCliente[c.Id];
        if (opo) { // DEBUG
          console.log(`FOCO prospect ${c.Id} opo: ${opo.StsOpo__c} abre: ${opo.QtdAbe__c} link: ${opo.QtdAbl__c}`);
          const sts = opo.StsOpo__c;
          const abrioAlgo = (opo.QtdAbe__c||0) > 0 || (opo.QtdAbl__c||0) > 0;
          if (['Negociação','PCP','Inspeção'].includes(sts)) return true;
          if (abrioAlgo) return true;
          if (sts === 'Oferta') return true;
          return true; // tem oportunidade → entra
        }
        if (temWA) return true;
        return false; // prospect frio → fora
      });

      if (!filaFiltrada.length) {
        console.log(`Feriado/sem clientes — ${vInfo.nome}`);
        resultados[vInfo.nome] = 'Feriado';
        continue;
      }

      // Substitui fila pela filtrada
      fila.length = 0;
      fila.push(...filaFiltrada);

      // Ordenar: URGENTE primeiro, depois por dias sem comprar
      fila.sort((a, b) =>
        (ordemPrioridade[a._prioridade]||3) - (ordemPrioridade[b._prioridade]||3) ||
        (parseFloat(b.QtdDip__c)||0) - (parseFloat(a.QtdDip__c)||0)
      );

      // Cap de fila — limite dinâmico calculado via desempenho + ligações
      const limite = await calcLimiteDinamico(vInfo.email, vInfo, data, adminToken, { br: feriadosBR, us: feriadosUS });
      const filaFinal = fila.slice(0, limite); // já está ordenada por prioridade

      // Gerar scripts em lotes de 15 em paralelo
      const scripts = {};
      const lotes = [];
      for (let i = 0; i < filaFinal.length; i += 15) {
        lotes.push(filaFinal.slice(i, i + 15));
      }
      const scriptsPorLote = await Promise.all(
        lotes.map(lote => gerarScriptsLote(lote, ligacoesPorCliente, historicoLigPorCliente, nitzapPorCliente, nitzapPorTelefone, vInfo.nome, sexta))
      );
      scriptsPorLote.forEach(scriptsLote => Object.assign(scripts, scriptsLote));

      // Montar documento final
      const filaDoc = filaFinal.map(c => ({
        Id: c.Id, Name: c.Name, ScoAco__c: c.ScoAco__c||null, StsCli__c: c.StsCli__c||null,
        QtdDip__c: c.QtdDip__c||null, DatUli__c: c.DatUli__c||null, ResUli__c: c.ResUli__c||null,
        Phone: c.Phone||null,
        LisVen__c: c.LisVen__c||null, nitzap20__DateTime_Last_Sent_Whatsapp__c: c.nitzap20__DateTime_Last_Sent_Whatsapp__c||null,
        prioridade: c._prioridade, pedidos90d: c._pedidos90d, contatado: false, respondeu: false,
        oportunidade: c._oportunidade ? { status: c._oportunidade.StsOpo__c, abrioEmail: (c._oportunidade.QtdAbe__c||0)>0, abrioLink: (c._oportunidade.QtdAbl__c||0)>0, validade: c._oportunidade.DatVld__c||null } : null,
        prioridadeAjustada: scripts[c.Id]?.prioridadeAjustada||null,
        historico: scripts[c.Id]?.historico||null,
        situacao: scripts[c.Id]?.situacao||null,
        abordagem: scripts[c.Id]?.abordagem||null,
        contexto: scripts[c.Id]?.contexto||null,
        script: scripts[c.Id]?.script||null,
        canal: scripts[c.Id]?.canal||'WA',
        melhorHorario: scripts[c.Id]?.melhorHorario||null,
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

    // Diagnóstico
    const diag = {};
    for (const [cod, vInfo] of Object.entries(VENDEDORES_ATIVOS)) {
      const fila = filasPorVendedor[cod] || [];
      const ativos = fila.filter(c => c.RecordTypeId !== '0124S0000005RiNQAU').length;
      const prospects = fila.filter(c => c.RecordTypeId === '0124S0000005RiNQAU').length;
      const comOpo = fila.filter(c => oportunidadesPorCliente[c.Id]).length;
      diag[vInfo.nome] = { ativos, prospects, comOpo, modo: ativos < (vInfo.threshold||100) ? 'EXPANSAO' : 'FOCO' };
    }
    console.log('DIAGNOSTICO:', JSON.stringify(diag));

    return res.json({ ok: true, data, resultados, totalClientes: filaTotal.length, diag });

  } catch(e) {
    console.error('montar-fila.js:', e.message, e.stack);
    return res.status(500).json({ error: e.message });
  }
}
