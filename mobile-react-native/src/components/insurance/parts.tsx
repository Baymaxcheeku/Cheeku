import { ShieldCheck, ShieldPlus } from "lucide-react-native";
import { Text, View } from "react-native";

import { Avatar } from "@/components/ui/avatar";
import { Gradient, glassShadow } from "@/components/ui/glass";
import { Tap } from "@/components/ui/tap";
import { POLICY_TYPE_LABEL, policyState, type Policy } from "@/lib/insurance/policy";
import type { ActiveProfile } from "@/lib/profiles/context";
import type { CoverStatus } from "@/lib/records/details";
import { rupeesShort, shortDate } from "@/lib/records/details";
import { hue, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * The insurance card (owner, 2026-11-01).
 *
 * WHY IT LOOKS LIKE THIS. The first version was a dark teal slab: distinct,
 * but it sat on the lilac glass like a sticker from another app. Cover reads
 * best as a light PASS, the way the physical card does: who it's with and
 * whether it's live at the top, the money as the one big number, who it
 * covers and the policy number at the foot.
 *
 * The green is the lime of the "Open now" pill on Book services: the app's
 * own "live, available" accent, so "you're covered" means what green already
 * means here. Pink was the other candidate; it is the pregnancy and vaccine
 * tint in this app, so it would have blurred the meaning. The status pill
 * changes, never the card: ink with lime text while active, orange when it
 * renews within 30 days, slate once it has ended or before it starts. These
 * are category accents (`hue`), not health meaning (`semantic`).
 *
 * One component for every place a policy shows (Insurance list and page,
 * the Health file), so they can never drift apart again.
 */

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
  return { bg: ink[900], fg: hue.lime.bg };
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
      style={[glassShadow, { borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: surface.line, opacity: ended ? 0.75 : 1 }]}
    >
      <Gradient from={ended ? hue.slate.bg : hue.lime.bg} to="#ffffff" angle="diagonal" />
      {/* The watermark: a big quiet shield, so the card reads as cover at a glance. */}
      <View pointerEvents="none" style={{ position: "absolute", right: -18, top: -14, opacity: 0.09 }}>
        <ShieldCheck size={132} color={ink[900]} strokeWidth={1.5} />
      </View>

      <View style={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: ink[900], alignItems: "center", justifyContent: "center" }}>
            <ShieldPlus size={18} color={hue.lime.bg} strokeWidth={2} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>
              {insurer}
            </Text>
            {subtitle ? (
              <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12, color: ink[700], marginTop: 1 }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        <View>
          {/* The status sits with the money, so the names above get the full width. */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[700] }}>{ended ? "Was covering" : "Available to use"}</Text>
            <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: tone.bg }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 11, color: tone.fg }}>{statusWords(status, daysLeft, start, end)}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 2 }}>
            <Text style={{ fontFamily: font.bold, fontSize: 28, letterSpacing: -0.8, color: ink[900] }}>{rupeesShort(remaining)}</Text>
            <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[700] }}>of {rupeesShort(sumInsured)}</Text>
          </View>
          <View style={{ height: 6, borderRadius: 999, backgroundColor: "rgba(15,16,48,0.08)", marginTop: 10, overflow: "hidden" }}>
            <View style={{ width: `${Math.round(left * 100)}%`, height: 6, borderRadius: 999, backgroundColor: ink[900] }} />
          </View>
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 6 }}>
            {claimed > 0 ? `${rupeesShort(claimed)} used this policy year` : "Nothing claimed this policy year"}
          </Text>
        </View>

        {members.length || policyNo ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(15,16,48,0.07)" }}>
            {members.length ? (
              <View style={{ flexDirection: "row" }}>
                {members.slice(0, 4).map((m, i) => (
                  <View key={m.id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                    <Avatar svg={m.avatar} photo={m.photo} image={m.avatarImage} background={m.avatarBackground} size={28} ring="#ffffff" />
                  </View>
                ))}
              </View>
            ) : null}
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: font.medium, fontSize: 13, color: ink[700] }}>
              {names}
            </Text>
            {policyNo ? <Text style={{ fontFamily: font.semibold, fontSize: 12, letterSpacing: 0.6, color: ink[500] }}>{tail(policyNo)}</Text> : null}
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
