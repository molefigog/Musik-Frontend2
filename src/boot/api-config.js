// src/boot/api-config.js (or similar)
export function getApiPath() {
    return localStorage.getItem('API_PATH') || process.env.API_PATH;
}
