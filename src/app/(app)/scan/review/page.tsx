import { notFound, redirect } from "next/navigation";

import { getRecord } from "@/lib/records/queries";
import { ReviewForm } from "./review-form";
import type { ExtractedField, ExtractedValue } from "@/lib/ai/mock/extract-types";

export const dynamic = "force-dynamic";

/** C2 — check what was read before it becomes part of the record. */
export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ document?: string }>;
}) {
  const { document } = await searchParams;
  if (!document) redirect("/scan");

  const record = await getRecord(document);
  if (!record) notFound();

  // Written by our own upload action, but it is jsonb — the column will hold
  // whatever shape it is given, so it is narrowed here rather than trusted.
  const parsed = parseExtraction(record.extraction);

  return (
    <ReviewForm
      documentId={record.id}
      title={parsed.title}
      fileLabel={record.title}
      mimeType={record.mimeType}
      eventDate={record.eventDate}
      facility={record.facility}
      confidence={record.confidence ?? 0}
      fields={parsed.fields}
      values={parsed.values}
    />
  );
}

function parseExtraction(raw: unknown): {
  title: string;
  fields: ExtractedField[];
  values: ExtractedValue[];
} {
  const obj = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    title: typeof obj.title === "string" ? obj.title : "Document",
    fields: Array.isArray(obj.fields) ? (obj.fields as ExtractedField[]) : [],
    values: Array.isArray(obj.values) ? (obj.values as ExtractedValue[]) : [],
  };
}
