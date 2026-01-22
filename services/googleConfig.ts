
export const googleConfig = {
  web: {
    // Client ID з вашого JSON конфігу
    client_id: "381854750655-v35keqgho1atoelimfj2uro4n972grpv.apps.googleusercontent.com", 
    project_id: "sitrem-portal",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    // Домени, з яких дозволено вхід
    javascript_origins: [
      "https://portal-dl1w.onrender.com", // Оновлено під ваш поточний домен
      "https://sitrem.onrender.com",
      "http://localhost:5173",
      "http://localhost:3000"
    ]
  }
};
