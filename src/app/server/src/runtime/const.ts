export const SERVER_HOST = process.env.HOST ?? "127.0.0.1";
export const SERVER_PORT = Number.parseInt(process.env.PORT ?? "3001", 10);
export const SERVER_UPS = 60;
export const SERVER_UPDATE_DELTA_MS = 1000 / SERVER_UPS;

export const MULTIPLAYER_PATH = "/multiplayer";
export const HEALTH_PATH = "/health";
export const SNAPSHOT_PATH = "/snapshot";