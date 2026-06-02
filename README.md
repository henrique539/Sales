# Sabagram Sales Portal — Vercel

Portal comercial com login Firebase, 3 perfis e IA.
Hospedado na Vercel com proxy server-side — funciona em qualquer navegador.

---

## Deploy em 10 minutos

### 1 · Instalar Vercel CLI

```bash
npm install -g vercel
```

### 2 · Fazer login na Vercel

```bash
vercel login
```
Vai abrir o browser para autenticar com GitHub.

### 3 · Deploy

```bash
cd /Users/henriquesabadine/Desktop/Vendedores/sabagram-vercel
vercel --prod
```

Quando perguntar:
- **Set up and deploy?** → Y
- **Which scope?** → sua conta pessoal
- **Link to existing project?** → N
- **Project name?** → sabagram-sales
- **Directory?** → . (ponto)
- **Override settings?** → N

URL gerada: `https://sabagram-sales.vercel.app`

### 4 · Adicionar a API Key da Anthropic

No dashboard da Vercel (vercel.com):
- Projeto → **Settings** → **Environment Variables**
- Adicionar:
  - **Name:** `ANTHROPIC_API_KEY`
  - **Value:** sua API key (começa com `sk-ant-...`)
  - **Environment:** Production, Preview, Development
- Salvar e fazer novo deploy: `vercel --prod`

### 5 · Adicionar domínio portal.sabagram.com.br

Na Vercel:
- Projeto → **Settings** → **Domains**
- Adicionar: `portal.sabagram.com.br`
- A Vercel vai mostrar os registros DNS para configurar

No Registro.br (registro.br):
- Entrar no painel → Domínios → sabagram.com.br → DNS
- Adicionar registro CNAME:
  - **Nome:** portal
  - **Dados:** cname.vercel-dns.com.
- Salvar

Aguardar propagação DNS (5–30 minutos).

### 6 · Autorizar domínio no Firebase

Firebase Console → Authentication → Configurações → Domínios autorizados:
- Adicionar: `portal.sabagram.com.br`

---

## Adicionar vendedores

Edite `config.js` e adicione o email + dados em `USUARIOS`.
Depois: `vercel --prod`
