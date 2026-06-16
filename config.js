export const FIREBASE_CONFIG = {
  apiKey:"AIzaSyC6oWnbIyaZejwtNcL2S0SrHKLlLLxzUfI",
  authDomain:"sales-team-6aeb6.firebaseapp.com",
  projectId:"sales-team-6aeb6",
  storageBucket:"sales-team-6aeb6.firebasestorage.app",
  messagingSenderId:"421701680094",
  appId:"1:421701680094:web:1f8bc4ae716dd0d0f3bb4f"
};

export const USUARIOS = {
  "henrique@sabagram.com.br": { nome:"Henrique Sabadine", perfil:"admin", avatar:"HS" },
  "dhiego@sabagram.com.br":   { nome:"Dhiego Zanardi",    perfil:"gerente", avatar:"DZ" },

  // BU MI — Mercado Interno (BRL)
  "sizenando@sabagram.com.br": {
    nome:"Sizenando Andrade", perfil:"vendedor", avatar:"SA", bu:"MI", moeda:"BRL",
    salesforce:{ ideVen:["001TW000003LbquYAC","001TW000003LcYSYA0"], userId:"005TW0000002BnNYAU" },
    whatsapp:"5528999565519", cor:"#1a3254"
  },
  "nando@sabagram.com.br": {
    nome:"Sizenando Andrade", perfil:"vendedor", avatar:"SA", bu:"MI", moeda:"BRL",
    salesforce:{ ideVen:["001TW000003LbquYAC","001TW000003LcYSYA0"], userId:"005TW0000002BnNYAU" },
    whatsapp:"5528999565519", cor:"#1a3254"
  },
  "kelly@sabagram.com.br": {
    nome:"Kelly Julião", perfil:"vendedor", avatar:"KJ", bu:"MI", moeda:"BRL",
    salesforce:{ ideVen:["001TW000005ag14YAA","001TW000005ah3ZYAQ"], userId:"005TW0000003rpNYAQ" },
    whatsapp:"5528999688866", cor:"#1a5f3a"
  },
  "marcelo@sabagram.com.br": {
    nome:"Marcelo Melo", perfil:"vendedor", avatar:"MM", bu:"MI", moeda:"BRL",
    salesforce:{ ideVen:["0014S00000BK1xDQAT"], userId:"0054S000002TkpGQAS" },
    whatsapp:"", cor:"#8b1a1a"
  },
  "renata@sabagram.com.br": {
    nome:"Renata Santana", perfil:"vendedor", avatar:"RS", bu:"MI", moeda:"BRL",
    salesforce:{ ideVen:["001TW00000Buxa9YAB","001TW00000BusqcYAB","001TW00000C09VzYAJ"], userId:"005TW000000ANTBYA4" },
    whatsapp:"", cor:"#6b1a5f"
  },

  // BU Obras (BRL)
  "wesley@sabagram.com.br": {
    nome:"Wesley Matieli", perfil:"vendedor", avatar:"WM", bu:"Obras", moeda:"BRL",
    salesforce:{ ideVen:["0014S00000Br0ySQAR"], userId:"005TW000000C7AbYAK" },
    whatsapp:"", cor:"#1a4a2a"
  },

  // BU ME — Mercado Externo (USD)
  "cezar@sabagram.com.br": {
    nome:"Cezar Fiorio", perfil:"vendedor", avatar:"CF", bu:"ME", moeda:"USD",
    salesforce:{ ideVen:["001TW00000C114rYAB"], userId:"005TW000000APunYAG" },
    whatsapp:"", cor:"#1a3a6b"
  },
  "diana@sabagram.com.br": {
    nome:"Diana Rigoni", perfil:"vendedor", avatar:"DR", bu:"ME", moeda:"USD",
    salesforce:{ ideVen:["001TW00000AooaAYAR"], userId:"0054S000002TkpZQAS" },
    whatsapp:"", cor:"#5f1a4a"
  }
};

export const API = {
  claude:     "/api/claude",
  salesforce: "https://api.salesforce.com/platform/mcp/v1/platform/sobject-all",
  nitzap:     "https://sabagram-mcp.nitzap.com/mcp/master"
};
