import { Configuration, LogLevel, PublicClientApplication } from "@azure/msal-browser";

const clientId = import.meta.env.VITE_AZURE_CLIENT_ID || "";
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID || "";

export const msalConfig: Configuration = {
  auth: {
    clientId: clientId,
    authority: tenantId
      ? `https://login.microsoftonline.com/${tenantId}`
      : "https://login.microsoftonline.com/common",
    redirectUri: window.location.origin + "/login",
    postLogoutRedirectUri: window.location.origin + "/login",
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: true,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error("[MSAL Error]:", message);
            break;
          case LogLevel.Warning:
            console.warn("[MSAL Warning]:", message);
            break;
          default:
            break;
        }
      },
      logLevel: LogLevel.Warning,
    },
  },
};

export const loginRequest = {
  scopes: ["openid", "profile", "email"],
};

export const msalInstance = new PublicClientApplication(msalConfig);

export const msalInitPromise: Promise<void> = msalInstance.initialize().catch((err) => {
  console.error("[MSAL] Initialization error:", err);
});
