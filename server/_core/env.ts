export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  zeDeliveryClientId: process.env.ZE_DELIVERY_CLIENT_ID ?? "",
  zeDeliveryClientSecret: process.env.ZE_DELIVERY_CLIENT_SECRET ?? "",
  zeDeliveryApiBaseUrl: process.env.ZE_DELIVERY_API_BASE_URL ?? "",
  zeDeliveryUseMocks: process.env.ZE_DELIVERY_USE_MOCKS ?? "false",
};
