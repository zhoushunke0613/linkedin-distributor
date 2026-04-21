import { listTokens } from "@/lib/linkedin/token_store";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string }>;
}) {
  const { connected } = await searchParams;
  const tokens = await listTokens().catch(() => []);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 font-sans">
      <h1 className="text-2xl font-semibold">LinkedIn Distributor</h1>
      <p className="mt-2 text-sm text-gray-500">
        Connect a LinkedIn identity and schedule posts.
      </p>

      {connected && (
        <div className="mt-6 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-900">
          Connected: <code>{connected}</code>
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-medium">Connect</h2>
        <div className="mt-3 flex gap-3">
          <a
            href="/auth/linkedin/login?as=person"
            className="rounded bg-[#0a66c2] px-4 py-2 text-sm font-medium text-white hover:bg-[#004182]"
          >
            Connect as Person
          </a>
          <a
            href="/auth/linkedin/login?as=organization"
            className="rounded border border-[#0a66c2] px-4 py-2 text-sm font-medium text-[#0a66c2] hover:bg-[#e8f0fe]"
          >
            Connect as Organization
          </a>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Organization scope requires LinkedIn Partner Program approval.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Connected identities</h2>
        {tokens.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">None yet.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="border-b text-left text-gray-500">
              <tr>
                <th className="py-2 pr-4">URN</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Access expires</th>
                <th className="py-2 pr-4">Refresh expires</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.authorUrn} className="border-b last:border-0">
                  <td className="py-2 font-mono text-xs">{t.authorUrn}</td>
                  <td className="py-2 pr-4">{t.ownerType}</td>
                  <td className="py-2 pr-4">{t.displayName ?? "—"}</td>
                  <td className="py-2 text-xs">
                    {t.accessExpiresAt.toISOString().slice(0, 16)}Z
                  </td>
                  <td className="py-2 text-xs">
                    {t.refreshExpiresAt
                      ? `${t.refreshExpiresAt.toISOString().slice(0, 16)}Z`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
