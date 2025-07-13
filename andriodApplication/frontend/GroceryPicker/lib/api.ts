// Backend URL configuration
const USE_PRODUCTION_URL = false; // Set to true to test production URL locally

export const backend_url = (USE_PRODUCTION_URL || !__DEV__)
  ? 'https://grocerypicker.onrender.com'
  : 'http://localhost:3000';
