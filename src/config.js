const defaultBaseUrl = import.meta.env.DEV
  ? ''
  : 'https://api-production-7b6a.up.railway.app';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  defaultBaseUrl;
