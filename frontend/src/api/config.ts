export const API_BASE =
  import.meta.env.VITE_API_BASE ?? "";

export const WS_URL =
  import.meta.env.VITE_WS_URL ??
  (API_BASE
    ? `${API_BASE.replace(/^http/, "ws")}/ws`
    : `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
