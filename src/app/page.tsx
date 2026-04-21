import { env } from "@/lib/env";
import { listTokens } from "@/lib/linkedin/token_store";
import { extractStoredMetrics } from "@/lib/linkedin/analytics";
import { listDrafts } from "@/lib/drafts";
import { listPublications } from "@/lib/publications";
import {
  createDraftAction,
  deleteDraftAction,
  schedulePublicationAction,
  cancelPublicationAction,
  publishPublicationAction,
  updateMetricsAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string }>;
}) {
  const { connected } = await searchParams;
  const [tokens, drafts, publications] = await Promise.all([
    listTokens().catch(() => []),
    listDrafts().catch(() => []),
    listPublications().catch(() => []),
  ]);

  const pubsByDraft = new Map<string, number>();
  for (const p of publications) {
    pubsByDraft.set(p.draftId, (pubsByDraft.get(p.draftId) ?? 0) + 1);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 font-sans">
      <h1 className="text-2xl font-semibold">LinkedIn Distributor</h1>
      <p className="mt-2 text-sm text-gray-500">
        Connect a LinkedIn identity, create drafts, and schedule publications.
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
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.authorUrn} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-mono text-xs">{t.authorUrn}</td>
                  <td className="py-2 pr-4">{t.ownerType}</td>
                  <td className="py-2 pr-4">{t.displayName ?? "—"}</td>
                  <td className="py-2 pr-4 text-xs">
                    {t.accessExpiresAt.toISOString().slice(0, 16)}Z
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-medium">Create draft</h2>
        <form action={createDraftAction} className="mt-3 space-y-3">
          <label className="block">
            <span className="text-sm text-gray-600">Text (max 3000 chars)</span>
            <textarea
              name="text"
              required
              rows={6}
              maxLength={3000}
              placeholder="Paste your LinkedIn post text here…"
              className="mt-1 w-full rounded border border-gray-300 p-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">
              Media URLs (one per line or comma-separated, optional)
            </span>
            <textarea
              name="media_urls"
              rows={2}
              placeholder="https://…/image1.png"
              className="mt-1 w-full rounded border border-gray-300 p-2 font-mono text-xs"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Note (optional)</span>
            <input
              name="note"
              type="text"
              placeholder="internal tag, source, etc."
              className="mt-1 w-full rounded border border-gray-300 p-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Save draft
          </button>
        </form>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-medium">Drafts ({drafts.length})</h2>
        {drafts.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">None yet.</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {drafts.map((d) => (
              <li
                key={d.id}
                className="rounded border border-gray-200 p-4 text-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="whitespace-pre-wrap text-gray-900">
                      {d.text.length > 300
                        ? `${d.text.slice(0, 300)}…`
                        : d.text}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      {d.mediaUrls.length > 0 && (
                        <span className="mr-3">📎 {d.mediaUrls.length}</span>
                      )}
                      <span className="mr-3">
                        {pubsByDraft.get(d.id) ?? 0} publications
                      </span>
                      <span className="mr-3">source: {d.source}</span>
                      <span>{d.createdAt.toISOString().slice(0, 16)}Z</span>
                    </div>
                  </div>
                  <form action={deleteDraftAction}>
                    <input type="hidden" name="id" value={d.id} />
                    <button
                      type="submit"
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </form>
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-[#0a66c2] hover:underline">
                    Schedule publication →
                  </summary>
                  <form
                    action={schedulePublicationAction}
                    className="mt-3 space-y-2 rounded bg-gray-50 p-3 text-sm"
                  >
                    <input type="hidden" name="draftId" value={d.id} />
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-xs text-gray-600">As</span>
                        <select
                          name="authorUrn"
                          required
                          className="mt-1 block w-full rounded border border-gray-300 p-2 text-sm"
                          defaultValue={tokens[0]?.authorUrn ?? ""}
                        >
                          {tokens.length === 0 && (
                            <option value="">(connect first)</option>
                          )}
                          {tokens.map((t) => (
                            <option key={t.authorUrn} value={t.authorUrn}>
                              {t.displayName ?? t.authorUrn} ({t.ownerType})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs text-gray-600">Kind</span>
                        <select
                          name="kind"
                          required
                          defaultValue="organic"
                          className="mt-1 block w-full rounded border border-gray-300 p-2 text-sm"
                        >
                          <option value="organic">Organic</option>
                          <option value="ads">Ads (PR 6 — not yet live)</option>
                        </select>
                      </label>
                    </div>
                    <fieldset className="mt-2">
                      <legend className="text-xs text-gray-600">
                        Schedule
                      </legend>
                      <label className="mt-1 flex items-center gap-2">
                        <input
                          type="radio"
                          name="mode"
                          value="now"
                          defaultChecked
                        />
                        <span className="text-sm">Publish now</span>
                      </label>
                      <label className="mt-1 flex items-center gap-2">
                        <input type="radio" name="mode" value="window" />
                        <span className="text-sm">Pick window</span>
                      </label>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="text-xs text-gray-500">From</span>
                          <input
                            type="datetime-local"
                            name="windowStart"
                            className="mt-1 block w-full rounded border border-gray-300 p-2 text-xs"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs text-gray-500">To</span>
                          <input
                            type="datetime-local"
                            name="windowEnd"
                            className="mt-1 block w-full rounded border border-gray-300 p-2 text-xs"
                          />
                        </label>
                      </div>
                    </fieldset>
                    <button
                      type="submit"
                      disabled={tokens.length === 0}
                      className="mt-2 rounded bg-[#0a66c2] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#004182] disabled:bg-gray-300"
                    >
                      Schedule
                    </button>
                    <p className="mt-1 text-xs text-gray-500">
                      Scheduled records sit in DB until the publisher (PR 3)
                      picks them up — nothing is posted to LinkedIn yet.
                    </p>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-medium">
          Publications ({publications.length})
        </h2>
        {publications.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">None yet.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="border-b text-left text-gray-500">
              <tr>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Kind</th>
                <th className="py-2 pr-4">Author</th>
                <th className="py-2 pr-4">Window</th>
                <th className="py-2 pr-4">Platform URN</th>
                <th className="py-2 pr-4">Engagement</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {publications.map((p) => (
                <tr key={p.id} className="border-b last:border-0 align-top">
                  <td className="py-2 pr-4">
                    <StatusBadge status={p.status} />
                    {p.errorMessage && (
                      <div className="mt-1 max-w-xs text-xs text-red-600">
                        {p.errorMessage}
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-4">{p.kind}</td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    {p.authorUrn}
                  </td>
                  <td className="py-2 pr-4 text-xs">
                    {p.windowStart.toISOString().slice(0, 16)}Z
                    {p.windowStart.getTime() !== p.windowEnd.getTime() && (
                      <> → {p.windowEnd.toISOString().slice(0, 16)}Z</>
                    )}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    {p.platformUrn ?? "—"}
                  </td>
                  <td className="py-2 pr-4 text-xs">
                    <Engagement
                      publicationId={p.id}
                      meta={p.meta}
                      published={p.status === "published"}
                    />
                  </td>
                  <td className="space-x-2 py-2 pr-4 text-xs">
                    {p.status === "scheduled" && (
                      <>
                        <form
                          action={publishPublicationAction}
                          className="inline"
                        >
                          <input type="hidden" name="id" value={p.id} />
                          <button
                            type="submit"
                            disabled={!env.LINKEDIN_PUBLISH_ENABLED}
                            title={
                              env.LINKEDIN_PUBLISH_ENABLED
                                ? "Publish to LinkedIn now"
                                : "Set LINKEDIN_PUBLISH_ENABLED=true to enable"
                            }
                            className="rounded bg-[#0a66c2] px-2 py-1 font-medium text-white hover:bg-[#004182] disabled:cursor-not-allowed disabled:bg-gray-300"
                          >
                            Publish now
                          </button>
                        </form>
                        <form
                          action={cancelPublicationAction}
                          className="inline"
                        >
                          <input type="hidden" name="id" value={p.id} />
                          <button
                            type="submit"
                            className="text-red-600 hover:underline"
                          >
                            Cancel
                          </button>
                        </form>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!env.LINKEDIN_PUBLISH_ENABLED && publications.length > 0 && (
          <p className="mt-2 text-xs text-amber-700">
            Publishing is disabled. Set{" "}
            <code>LINKEDIN_PUBLISH_ENABLED=true</code> in <code>.env</code> and
            restart the dev server to enable the “Publish now” button.
          </p>
        )}
      </section>
    </main>
  );
}

function Engagement({
  publicationId,
  meta,
  published,
}: {
  publicationId: string;
  meta: Record<string, unknown> | null;
  published: boolean;
}) {
  const m = extractStoredMetrics(meta);
  const source =
    meta && typeof meta.metrics === "object" && meta.metrics !== null
      ? (meta.metrics as Record<string, unknown>).source
      : null;
  const errorRaw =
    meta && typeof meta.metricsError === "object" && meta.metricsError !== null
      ? (meta.metricsError as Record<string, unknown>).reason
      : null;

  if (!published) return <span className="text-gray-400">—</span>;

  return (
    <details>
      <summary className="cursor-pointer list-none">
        {m ? (
          <span
            title={`fetched ${new Date(m.fetchedAt).toISOString()}${
              source === "manual" ? " (manual)" : ""
            }`}
          >
            ♡ {m.likes} · 💬 {m.comments}
            {source === "manual" && (
              <span className="ml-1 text-gray-400">✎</span>
            )}
          </span>
        ) : (
          <span className="text-gray-400 hover:text-gray-600">
            edit ↓
            {typeof errorRaw === "string" && (
              <span className="ml-1 text-red-400" title={errorRaw}>
                ⚠
              </span>
            )}
          </span>
        )}
      </summary>
      <form action={updateMetricsAction} className="mt-2 space-y-1">
        <input type="hidden" name="id" value={publicationId} />
        <label className="block text-[10px] text-gray-500">
          Likes
          <input
            type="number"
            name="likes"
            min={0}
            defaultValue={m?.likes ?? 0}
            className="ml-1 w-16 rounded border border-gray-300 px-1 text-xs"
          />
        </label>
        <label className="block text-[10px] text-gray-500">
          Comments
          <input
            type="number"
            name="comments"
            min={0}
            defaultValue={m?.comments ?? 0}
            className="ml-1 w-16 rounded border border-gray-300 px-1 text-xs"
          />
        </label>
        <button
          type="submit"
          className="mt-1 rounded bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-black"
        >
          Save
        </button>
      </form>
    </details>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-800",
    publishing: "bg-yellow-100 text-yellow-800",
    published: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    canceled: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100"}`}
    >
      {status}
    </span>
  );
}
