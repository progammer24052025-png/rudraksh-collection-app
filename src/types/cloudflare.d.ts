import "next";

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    ADMIN_SECRET?: string;
  }
}

export {};
