# Sabagram Daily — Portal Comercial

Portal com login Firebase, 3 perfis distintos e briefing diário com IA.

---

## Arquivos

```
sabagram-daily/
├── index.html      → Tela de login (Firebase Auth)
├── vendedor.html   → Briefing do vendedor (Sizenando / Kelly)
├── gerente.html    → Visão gerencial (Dhiego)
├── config.js       → ⚠ Configurar antes de usar
└── .github/workflows/deploy.yml → Deploy automático
```

---

## SETUP — Passo a passo

### 1 · Criar projeto Firebase (5 minutos)

1. Acesse **console.firebase.google.com**
2. Clique em **Add project** → Nome: `sabagram-daily`
3. Desative Google Analytics → **Create project**

#### Ativar Authentication:
- Menu lateral → **Authentication** → **Get started**
- Aba **Sign-in method** → Ativar **Email/Password** → Save
- Ativar também **Google** → salvar o email de suporte → Save

#### Criar os usuários:
- Aba **Users** → **Add user**
- Criar um por um:
  - `dhiego@sabagram.com.br` + senha forte
  - `sizenando@sabagram.com.br` + senha forte
  - `kelly@sabagram.com.br` + senha forte

#### Pegar as credenciais:
- ⚙ (engrenagem) → **Project settings**
- Role até **Your apps** → clique no ícone **</>** (web)
- Nome do app: `portal`
- Copie o objeto `firebaseConfig`

### 2 · Preencher o config.js

Abra `config.js` e substitua os valores de `FIREBASE_CONFIG`:

```js
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSy...",
  authDomain:        "sabagram-daily.firebaseapp.com",
  projectId:         "sabagram-daily",
  storageBucket:     "sabagram-daily.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123:web:abc123"
};
```

Também atualize os emails em `USUARIOS` se forem diferentes.

### 3 · Criar repositório e publicar

```bash
cd sabagram-daily
git init
git add .
git commit -m "portal v1"
git branch -M main
git remote add origin https://github.com/henrique539/sabagram-daily.git
git push -u origin main
```

### 4 · Ativar GitHub Pages

- Repositório → **Settings** → **Pages**
- Source: **GitHub Actions**
- O deploy roda automaticamente a cada push

URL final: `https://henrique539.github.io/sabagram-daily`

### 5 · Autorizar o domínio no Firebase

Para o login Google funcionar no GitHub Pages:
- Firebase Console → Authentication → **Settings** → **Authorized domains**
- Adicionar: `henrique539.github.io`

---

## Como funciona

| Quem abre | O que vê |
|-----------|----------|
| `dhiego@sabagram.com.br` | Painel gerencial: consolidado do time, métricas de cada vendedor, cobranças do dia geradas por IA |
| `sizenando@sabagram.com.br` | Fila do dia personalizada: clientes priorizados por IA com dados reais do Salesforce + scripts de abordagem |
| `kelly@sabagram.com.br` | Mesmo que Sizenando, mas com sua carteira e sua meta |

## Adicionar novos vendedores

Edite o `config.js` — adicione o email e os dados na seção `USUARIOS`:

```js
"novovendedor@sabagram.com.br": {
  nome:       "Nome Sobrenome",
  perfil:     "vendedor",
  avatar:     "NS",
  salesforce: {
    ideVen: ["001..."],
    userId: "005..."
  },
  whatsapp: "55289...",
  cor: "#1a3254"
}
```

Depois crie o usuário no Firebase Authentication.
