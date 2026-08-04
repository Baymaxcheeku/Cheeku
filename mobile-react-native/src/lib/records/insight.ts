import { FLAG_LABEL, type RecordDetail, type RecordEntity } from "./types";

/*
 * The "AI insight" card on D2.
 *
 * It is deliberately not a model call, and it is deliberately dull. Three of
 * the five product rules land squarely on this one paragraph:
 *
 *   - never diagnoses, never prescribes, never gives dosages
 *   - grounded or silent: if the record does not say it, neither do we
 *   - the safety gate runs before any AI surface
 *
 * So this restates what the document already contains — which values sit
 * outside their printed reference range — and stops. It names no condition,
 * suggests no treatment, and offers no threshold of its own. The frame's copy
 * ("Consider lifestyle adjustments and follow up if symptoms persist") is
 * general advice rather than a diagnosis, but it is still advice the record
 * does not support, so it is not reproduced.
 *
 * When a real model is wired in behind the mock adapter, this function is the
 * fallback that must still be correct when the model declines to answer.
 */

export type Insight = {
  headline: string;
  body: string;
  /** True when something in the document warrants a conversation with a doctor. */
  flagged: boolean;
};

/** Values whose flag means "outside the printed range", in the frames' words. */
export function flaggedEntities(entities: readonly RecordEntity[]): RecordEntity[] {
  return entities.filter((e) => e.flag && e.flag !== "normal");
}

function listNames(entities: readonly RecordEntity[]): string {
  const names = entities.map((e) => e.name);
  if (names.length === 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function buildInsight(record: RecordDetail): Insight {
  const measured = record.entities.filter((e) => e.kind === "lab_value" || e.kind === "vital");
  const flagged = flaggedEntities(measured);

  /*
   * Silence is a valid answer. A prescription or a bill has nothing to
   * summarise, and inventing an observation about it would be exactly the
   * improvising rule 4 forbids.
   */
  if (measured.length === 0) {
    return {
      headline: "Saved to your records",
      body: "Baymax has filed this document. There are no measured values in it to compare against a reference range.",
      flagged: false,
    };
  }

  if (flagged.length === 0) {
    return {
      headline: "Everything in range",
      body: `All ${measured.length} measured value${measured.length === 1 ? "" : "s"} in this report fall within the reference range printed on the document.`,
      flagged: false,
    };
  }

  return {
    headline: `${flagged.length} value${flagged.length === 1 ? "" : "s"} outside the printed range`,
    body:
      `${listNames(flagged)} ${flagged.length === 1 ? "is" : "are"} outside the reference range on this document. ` +
      `Baymax does not interpret results. Bring this to your doctor to discuss what it means.`,
    flagged: true,
  };
}

/** "13.2 g/dL", or the free-text value when there is no number. */
export function formatValue(entity: RecordEntity): string {
  if (entity.value !== null) {
    return entity.unit ? `${entity.value} ${entity.unit}` : String(entity.value);
  }
  return entity.valueText ?? "-";
}

/** The word shown in the pill beside a value. */
export function flagLabel(entity: RecordEntity): string | null {
  return entity.flag ? FLAG_LABEL[entity.flag] : null;
}
