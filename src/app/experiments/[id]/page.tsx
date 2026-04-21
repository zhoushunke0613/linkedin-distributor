import Link from "next/link";
import { notFound } from "next/navigation";
import { getExperiment, listVariants } from "@/lib/experiments/store";
import {
  createDraftFromPairAction,
  deleteExperimentAction,
  runGenerationAction,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function ExperimentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [experiment, variants] = await Promise.all([
    getExperiment(id),
    listVariants(id),
  ]);
  if (!experiment) notFound();

  const headlines = variants.filter((v) => v.kind === "headline");
  const bodies = variants.filter((v) => v.kind === "body");

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 font-sans">
      <div className="flex items-center justify-between">
        <Link
          href="/experiments"
          className="text-sm text-[#0a66c2] hover:underline"
        >
          ← All experiments
        </Link>
        <form action={deleteExperimentAction}>
          <input type="hidden" name="id" value={experiment.id} />
          <button
            type="submit"
            className="text-xs text-red-600 hover:underline"
          >
            Delete experiment
          </button>
        </form>
      </div>

      <h1 className="mt-4 text-2xl font-semibold">{experiment.topic}</h1>
      <div className="mt-1 text-xs text-gray-500">
        {experiment.platform} · status <strong>{experiment.status}</strong> ·
        created {experiment.createdAt.toISOString().slice(0, 16)}Z
      </div>

      {experiment.brief && (
        <div className="mt-4 whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm">
          {experiment.brief}
        </div>
      )}

      {variants.length === 0 && experiment.status !== "generating" && (
        <section className="mt-6">
          <form action={runGenerationAction}>
            <input type="hidden" name="id" value={experiment.id} />
            <button
              type="submit"
              className="rounded bg-[#0a66c2] px-4 py-2 text-sm font-medium text-white hover:bg-[#004182]"
            >
              {experiment.status === "failed"
                ? "Retry generation"
                : "Generate variants"}
            </button>
            <p className="mt-2 text-xs text-gray-500">
              Runs two sub-agents (headline + body) in parallel. Takes ~15-60s
              depending on provider and model.
            </p>
          </form>
        </section>
      )}

      {experiment.status === "generating" && (
        <div className="mt-6 rounded border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
          Generation in progress. Refresh in a moment.
        </div>
      )}

      {experiment.generatorMeta &&
        typeof experiment.generatorMeta.lastError === "string" && (
          <div className="mt-6 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900">
            <strong>Last error:</strong>{" "}
            <code>{String(experiment.generatorMeta.lastError)}</code>
          </div>
        )}

      {variants.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-medium">
            Variants ({headlines.length} headlines · {bodies.length} bodies)
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Pick one headline and one body to create a draft. The selected pair
            is combined into a single draft text (headline + blank line +
            body).
          </p>

          <form
            action={createDraftFromPairAction}
            className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <input
              type="hidden"
              name="experimentId"
              value={experiment.id}
            />
            <fieldset>
              <legend className="text-sm font-medium">Headlines</legend>
              <div className="mt-2 space-y-2">
                {headlines.map((v, idx) => {
                  const hookType =
                    typeof v.meta?.hookType === "string"
                      ? (v.meta.hookType as string)
                      : null;
                  return (
                    <label
                      key={v.id}
                      className="flex cursor-pointer items-start gap-2 rounded border border-gray-200 p-3 hover:border-[#0a66c2]"
                    >
                      <input
                        type="radio"
                        name="headlineId"
                        value={v.id}
                        defaultChecked={idx === 0}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        {hookType && (
                          <div className="text-[10px] uppercase tracking-wide text-gray-400">
                            {hookType.replace(/_/g, " ")}
                          </div>
                        )}
                        <div className="mt-1 whitespace-pre-wrap text-sm">
                          {v.text}
                        </div>
                        {v.draftId && (
                          <div className="mt-1 text-[10px] text-green-700">
                            ✓ used in a draft
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-medium">Bodies</legend>
              <div className="mt-2 space-y-2">
                {bodies.map((v, idx) => {
                  const ctaKind =
                    typeof v.meta?.ctaKind === "string"
                      ? (v.meta.ctaKind as string)
                      : null;
                  return (
                    <label
                      key={v.id}
                      className="flex cursor-pointer items-start gap-2 rounded border border-gray-200 p-3 hover:border-[#0a66c2]"
                    >
                      <input
                        type="radio"
                        name="bodyId"
                        value={v.id}
                        defaultChecked={idx === 0}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        {ctaKind && (
                          <div className="text-[10px] uppercase tracking-wide text-gray-400">
                            cta: {ctaKind}
                          </div>
                        )}
                        <div className="mt-1 whitespace-pre-wrap text-sm">
                          {v.text}
                        </div>
                        {v.draftId && (
                          <div className="mt-1 text-[10px] text-green-700">
                            ✓ used in a draft
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Create draft from selected pair
              </button>
              <p className="mt-2 text-xs text-gray-500">
                After creating the draft you'll be sent back to the home page
                where you can schedule it.
              </p>
            </div>
          </form>

          <div className="mt-8">
            <form action={runGenerationAction}>
              <input type="hidden" name="id" value={experiment.id} />
              <button
                type="submit"
                className="text-xs text-gray-500 hover:underline"
              >
                Regenerate (adds more variants)
              </button>
            </form>
          </div>
        </section>
      )}
    </main>
  );
}
