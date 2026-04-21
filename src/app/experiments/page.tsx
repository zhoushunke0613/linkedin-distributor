import Link from "next/link";
import { listExperiments } from "@/lib/experiments/store";
import { providerLabel } from "@/lib/experiments/provider";
import { createExperimentAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ExperimentsPage() {
  const experiments = await listExperiments().catch(() => []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 font-sans">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Experiments</h1>
        <Link href="/" className="text-sm text-[#0a66c2] hover:underline">
          ← Drafts & publications
        </Link>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        AI agent that generates LinkedIn post variants. Provider:{" "}
        <code>{providerLabel()}</code>
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-medium">New experiment</h2>
        <form action={createExperimentAction} className="mt-3 space-y-3">
          <label className="block">
            <span className="text-sm text-gray-600">Topic</span>
            <input
              name="topic"
              required
              maxLength={500}
              placeholder="e.g. 'Why marketing attribution breaks on iOS'"
              className="mt-1 w-full rounded border border-gray-300 p-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">
              Brief (optional — audience, angle, voice, proof points)
            </span>
            <textarea
              name="brief"
              rows={4}
              maxLength={5000}
              className="mt-1 w-full rounded border border-gray-300 p-2 text-sm"
            />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-sm text-gray-600">Platform</span>
              <select
                name="platform"
                defaultValue="linkedin"
                className="mt-1 block w-full rounded border border-gray-300 p-2 text-sm"
              >
                <option value="linkedin">LinkedIn</option>
                <option value="xiaohongshu" disabled>
                  Xiaohongshu (future)
                </option>
                <option value="x" disabled>
                  X (future)
                </option>
                <option value="google_ads" disabled>
                  Google Ads (future)
                </option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Headlines</span>
              <input
                type="number"
                name="headline_n"
                min={1}
                max={10}
                defaultValue={3}
                className="mt-1 block w-full rounded border border-gray-300 p-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Bodies</span>
              <input
                type="number"
                name="body_n"
                min={1}
                max={10}
                defaultValue={3}
                className="mt-1 block w-full rounded border border-gray-300 p-2 text-sm"
              />
            </label>
          </div>
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Create experiment
          </button>
        </form>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-medium">
          Past experiments ({experiments.length})
        </h2>
        {experiments.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">None yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {experiments.map((e) => (
              <li
                key={e.id}
                className="rounded border border-gray-200 p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">
                    <Link
                      href={`/experiments/${e.id}`}
                      className="text-[#0a66c2] hover:underline"
                    >
                      {e.topic}
                    </Link>
                  </div>
                  <StatusBadge status={e.status} />
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {e.platform} · headlines N={e.headlineN} · bodies N=
                  {e.bodyN} ·{" "}
                  {e.createdAt.toISOString().slice(0, 16).replace("T", " ")}Z
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    generating: "bg-yellow-100 text-yellow-800",
    ready: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    archived: "bg-gray-100 text-gray-500",
  };
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100"}`}
    >
      {status}
    </span>
  );
}
