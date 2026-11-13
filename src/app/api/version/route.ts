/** The running deploy's id, so an open app can tell a newer version is live. */
export const dynamic = "force-dynamic";

export function GET() {
  const version = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || "dev").slice(0, 12);
  return Response.json({ version }, { headers: { "cache-control": "no-store" } });
}
