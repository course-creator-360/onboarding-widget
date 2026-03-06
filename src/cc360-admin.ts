const DEFAULT_BASE_URL = 'https://cc360-customers-admin.vercel.app';

export function getCC360AdminConfig() {
  const apiKey = process.env.CC360_CUSTOMERS_ADMIN_API_KEY || process.env.CC360_CUSTOMERS_API_KEY;
  const apiBaseUrl =
    process.env.CC360_CUSTOMERS_ADMIN_API_BASE_URL ||
    process.env.CC360_CUSTOMERS_API_BASE_URL ||
    DEFAULT_BASE_URL;
  return { apiKey, apiBaseUrl };
}
