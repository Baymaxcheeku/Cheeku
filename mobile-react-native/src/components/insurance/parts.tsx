import { ShieldPlus } from "lucide-react-native";
import { Text, View } from "react-native";

import { Avatar } from "@/components/ui/avatar";
import { Gradient, glassShadow } from "@/components/ui/glass";
import { Tap } from "@/components/ui/tap";
import { POLICY_TYPE_LABEL, policyState, type Policy } from "@/lib/insurance/policy";
import type { ActiveProfile } from "@/lib/profiles/context";
import type { CoverStatus } from "@/lib/records/details";
import { rupeesShort, shortDate } from "@/lib/records/details";
import { hue } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * The insurance card.
 *
 * THE COLOURS ARE THE ORIGINAL TEAL, ON PURPOSE (owner, 2026-11-01). A light
 * lime "pass" was tried and rejected: the green clashed with the app and the
 * washed-out, see-through look made the card feel weak. The deep ocean-to-
 * teal gradient with white text is what the owner liked, so it stays: no
 * watermark, no faded card for an ended policy, nothing translucent laid
 * over it. Only the status pill changes colour, and it is solid: white with
 * teal text while active, orange within 30 days of renewal, slate once it
 * has ended or before it starts (category accents, `hue`, not `semantic`).
 *
 * What was kept from the redesign is layout only: insurer and plan at full
 * width, the status beside the amount, the people covered and a masked
 * policy number at the foot. One component for every place a policy shows
 * (Insurance list and page, the Health file), so they never drift apart.
 */

const SOFT = "rgba(255,255,255,0.78)";

export type CoverCardProps = {
  insurer: string;
  /** "Family Health Optima · Family floater". */
  subtitle: string | null;
  remaining: number;
  sumInsured: number;
  claimed: number;
  status: CoverStatus;
  daysLeft: number | null;
  start: string | null;
  end: string | null;
  /** The last few characters, shown as "•••• 0918" like the physical card. */
  policyNo?: string | null;
  members?: ActiveProfile[];
  onPress?: () => void;
};

export function statusWords(status: CoverStatus, daysLeft: number | null, start: string | null, end: string | null): string {
  if (status === "expired") return `Ended ${shortDate(end)}`;
  if (status === "renew_soon") return `Renews in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
  if (status === "not_started") return `Starts ${shortDate(start)}`;
  return end ? `Active till ${shortDate(end)}` : "Active";
}

function pillTone(status: CoverStatus): { bg: string; fg: string } {
  if (status === "renew_soon") return { bg: hue.orange.bg, fg: hue.orange.fg };
  if (status === "expired" || status === "not_started") return { bg: hue.slate.bg, fg: hue.slate.fg };
  return { bg: "#ffffff", fg: hue.ocean.fg };
}

const tail = (no: string) => {
  // Separators dropped first: "GHP-4471-22" ends "7122", not "1-22".
  const clean = no.replace(/[^A-Za-z0-9]/g, "");
  return clean.length > 4 ? `•••• ${clean.slice(-4)}` : clean;
};

export function CoverCard({ insurer, subtitle, remaining, sumInsured, claimed, status, daysLeft, start, end, policyNo, members = [], onPress }: CoverCardProps) {
  const ended = status === "expired";
  const tone = pillTone(status);
  const left = sumInsured > 0 ? Math.max(0, Math.min(1, remaining / sumInsured)) : 0;
  const names = members.map((m) => m.name.split(" ")[0]).join(", ");

  return (
    <Tap
      accessibilityRole={onPress ? "button" : "summary"}
      accessibilityLabel={`${insurer}. ${rupeesShort(remaining)} available of ${rupeesShort(sumInsured)}. ${statusWords(status, daysLeft, start, end)}.${names ? ` Covers ${names}.` : ""}`}
      onPress={onPress}
      disabled={!onPress}
      scale={0.985}
      style={[glassShadow, { borderRadius: 24, overflow: "hidden" }]}
    >
      <Gradient from={hue.ocean.fg} to={hue.ocean.mid} angle="diagonal" />

      <View style={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <ShieldPlus size={20} color="#fff" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: "#fff" }}>
              {insurer}
            </Text>
            {subtitle ? (
              <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12, color: SOFT, marginTop: 1 }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        <View>
          {/* The status sits with the money, so the names above get the full width. */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <Text style={{ fontFamily: font.medium, fontSize: 12, color: SOFT }}>{ended ? "Was covering" : "Available to use"}</Text>
            <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: tone.bg }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 11, color: tone.fg }}>{statusWords(status, daysLeft, start, end)}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 2 }}>
            <Text style={{ fontFamily: font.bold, fontSize: 28, letterSpacing: -0.8, color: "#fff" }}>{rupeesShort(remaining)}</Text>
            <Text style={{ fontFamily: font.medium, fontSize: 13, color: SOFT }}>of {rupeesShort(sumInsured)} sum insured</Text>
          </View>
          <View style={{ height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.22)", marginTop: 10, overflow: "hidden" }}>
            <View style={{ width: `${Math.round(left * 100)}%`, height: 6, borderRadius: 999, backgroundColor: "#fff" }} />
          </View>
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: SOFT, marginTop: 6 }}>
            {claimed > 0 ? `${rupeesShort(claimed)} used this policy year` : "Nothing claimed this policy year"}
          </Text>
        </View>

        {members.length || policyNo ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.18)" }}>
            {members.length ? (
              <View style={{ flexDirection: "row" }}>
                {members.slice(0, 4).map((m, i) => (
                  <View key={m.id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                    <Avatar svg={m.avatar} photo={m.photo} image={m.avatarImage} background={m.avatarBackground} size={28} ring="#ffffff" />
                  </View>
                ))}
              </View>
            ) : null}
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: font.medium, fontSize: 13, color: "#fff" }}>
              {names}
            </Text>
            {policyNo ? <Text style={{ fontFamily: font.semibold, fontSize: 12, letterSpacing: 0.6, color: SOFT }}>{tail(policyNo)}</Text> : null}
          </View>
        ) : null}
      </View>
    </Tap>
  );
}

/** A saved policy as the card. */
export function PolicyCard({ policy, members, onPress }: { policy: Policy; members: ActiveProfile[]; onPress?: () => void }) {
  const s = policyState(policy);
  return (
    <CoverCard
      insurer={policy.insurer}
      subtitle={[policy.plan, POLICY_TYPE_LABEL[policy.policyType]].filter(Boolean).join(" · ")}
      remaining={s.remaining}
      sumInsured={policy.sumInsured}
      claimed={policy.claimed}
      status={s.status}
      daysLeft={s.daysLeft}
      start={policy.start}
      end={policy.end}
      policyNo={policy.policyNo}
      members={members.filter((m) => policy.coveredProfileIds.includes(m.id))}
      onPress={onPress}
    />
  );
}
