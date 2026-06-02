// ─── CONFIGURAÇÃO FIREBASE ────────────────────────────────────────────────────
export const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyC6oWnbIyaZejwtNcL2S0SrHKLlLLxzUfI",
  authDomain:        "sales-team-6aeb6.firebaseapp.com",
  projectId:         "sales-team-6aeb6",
  storageBucket:     "sales-team-6aeb6.firebasestorage.app",
  messagingSenderId: "421701680094",
  appId:             "1:421701680094:web:1f8bc4ae716dd0d0f3bb4f"
};

// ─── USUÁRIOS AUTORIZADOS ─────────────────────────────────────────────────────
export const USUARIOS = {
  "henrique@sabagram.com.br": {
    nome:   "Henrique Sabadine",
    perfil: "admin",
    avatar: "HS"
  },

  "dhiego@sabagram.com.br": {
    nome:   "Dhiego Zanardi",
    perfil: "gerente",
    avatar: "DZ"
  },

  "sizenando@sabagram.com.br": {
    nome:       "Sizenando Andrade",
    perfil:     "vendedor",
    avatar:     "SA",
    salesforce: {
      ideVen: ["001TW000003LbquYAC", "001TW000003LcYSYA0"],
      userId: "005TW0000002BnNYAU"
    },
    whatsapp: "5528999565519",
    cor: "#1a3254"
  },

  "kelly@sabagram.com.br": {
    nome:       "Kelly Julião",
    perfil:     "vendedor",
    avatar:     "KJ",
    salesforce: {
      ideVen: ["001TW000005ag14YAA", "001TW000005ah3ZYAQ"],
      userId: "005TW0000003rpNYAQ"
    },
    whatsapp: "5528999688866",
    cor: "#1a5f3a"
  }
};

// ─── APIs ─────────────────────────────────────────────────────────────────────
export const API = {
  claude:     "https://api.anthropic.com/v1/messages",
  salesforce: "https://api.salesforce.com/platform/mcp/v1/platform/sobject-all",
  nitzap:     "https://sabagram-mcp.nitzap.com/mcp/master"
};
