/**
 * Stream detail page — Server Component with ISR.
 * Complete redesign with moon theme, enhanced data visualization, and action buttons.
 */

import type { Metadata } from "next";
import { AlertCircle } from "lucide-react";
import {
  ViewStreamClient,
  type _StreamData,
} from "@/components/view-stream-client";
import { fetchPublicStream } from "@/lib/fetch-public-stream";

// ─── ISR revalidation interval ────────────────────────────────────────────────
// The page HTML is cached at the CDN edge and regenerated in the background
// at most once every 60 seconds (stale-while-revalidate pattern).
export const revalidate = 60;

// ─── Metadata ─────────────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const stream = await fetchPublicStream(id);

  if (!stream) {
    return { title: "Stream Not Found — StellarStream" };
  }

  return {
    title: `${stream.name} — StellarStream`,
    description: `Live payment stream: ${stream.totalAmount.toLocaleString()} ${stream.token} streamed on-chain.`,
    openGraph: {
      title: stream.name,
      description: `${stream.ratePerSecond.toFixed(5)} ${stream.token}/sec · ${stream.status}`,
      siteName: "StellarStream",
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ViewStreamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const stream = await fetchPublicStream(id);

  if (!stream) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <AlertCircle className="h-16 w-16 text-red-500/50" />
        <h1 className="font-heading text-2xl font-bold text-white">
          Stream Not Found
        </h1>
        <p className="font-body text-sm text-white/40">
          The stream you're looking for doesn't exist or has been removed.
        </p>
        <a
          href="/"
          className="mt-4 rounded-xl border border-[#00f5ff]/30 bg-[#00f5ff]/10 px-6 py-3 font-body text-sm text-[#00f5ff] transition-colors hover:bg-[#00f5ff]/20"
        >
          Go to Homepage
        </a>
      </div>
    );
  }

  // Render the stream detail page with all new components
  // The skeleton/loading states are handled inside ViewStreamClient
  return (
    <div className="relative min-h-screen">
      {/* Nebula background blobs */}
      <div className="nebula-blob nebula-cyan" />
      <div className="nebula-blob nebula-violet" />

      <main className="relative z-10 mx-auto flex w-full max-w-4xl items-start justify-center p-4 pb-20 pt-8 sm:p-6 sm:pt-12">
        <ViewStreamClient stream={stream} />
      </main>
    </div>
  );
}