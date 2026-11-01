import { ShieldPlus } from "lucide-react-native";
import { Text, View } from "react-native";

import { Gradient, glassShadow } from "@/components/ui/glass";
import { Avatar } from "@/components/ui/avatar";
import { Tap } from "@/components/ui/tap";
import { POLICY_TYPE_LABEL, policyState, type Policy } from "@/lib/insurance/policy";
import type { ActiveProfile } from "@/lib/profiles/context";
import { rupeesShort, shortDate } from "@/lib/records/details";
import { hue, semantic } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * A policy as a card: who it's with, how much is left, until when, and the
 * faces of the people it covers. The same teal as the Health file's cover
 * card, so a policy looks like one thing wherever it shows up.
 */

const WHITE_SOFT = "rgba(255,255,255,0.78)";

export function statusWords(p: Policy, now: Date = new Date()): string {
  const s = policyState(p, now);
  if (s.status === "expired") return `Ended ${shortDate(p.end)}`;
  if (s.status === "renew_soon") return `Renews in ${s.daysLeft} day${s.daysLeft === 1 ? "" : "s"}`;
  if (s.status === "not_started") return `Starts ${shortDate(p.start)}`;
  return p.end ? `Till ${shortDate(p.end)}` : "Active";
}

export function PolicyCard({ policy, members, onPress }: { policy: Policy; members: ActiveProfile[]; onPress?: () => void }) {
  const s = policyState(policy);
  const covered = members.filter((m) => policy.coveredProfileIds.includes(m.id));
  const ended = s.status === "expired";
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={`${policy.insurer}, ${rupeesShort(s.remaining)} available of ${rupeesShort(policy.sumInsured)}, ${statusWords(policy)}`}
      onPress={onPress}
      disabled={!onPress}
      scale={0.985}
      style={[glassShadow, { borderRadius: 24, overflow: "hidden", padding: 16, opacity: ended ? 0.7 : 1 }]}
    >
      <Gradient from={hue.ocean.fg} to={hue.teal.fg} angle="diagonal" />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <ShieldPlus size={18} color="#fff" />
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, color: "#fff" }}>
          {policy.insurer}
        </Text>
        <View style={{ borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, backgroundColor: s.status === "renew_soon" || ended ? semantic.attentionBg : "rgba(255,255,255,0.18)" }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 12, color: s.status === "renew_soon" || ended ? semantic.attentionText : "#fff" }}>{statusWords(policy)}</Text>
        </View>
      </View>
      {policy.plan ? (
        <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: WHITE_SOFT, marginTop: 4, marginLeft: 28 }}>
          {policy.plan} · {POLICY_TYPE_LABEL[policy.policyType]}
        </Text>
      ) : (
        <Text style={{ fontFamily: font.regular, fontSize: 13, color: WHITE_SOFT, marginTop: 4, marginLeft: 28 }}>{POLICY_TYPE_LABEL[policy.policyType]}</Text>
      )}
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 20, marginTop: 14 }}>
        <View>
          <Text style={{ fontFamily: font.bold, fontSize: 24, letterSpacing: -0.4, color: "#fff" }}>{rupeesShort(s.remaining)}</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: WHITE_SOFT }}>available</Text>
        </View>
        <View>
          <Text style={{ fontFamily: font.bold, fontSize: 17, color: "#fff" }}>{rupeesShort(policy.sumInsured)}</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: WHITE_SOFT }}>sum insured</Text>
        </View>
        <View style={{ flex: 1 }} />
        {covered.length ? (
          <View style={{ flexDirection: "row" }}>
            {covered.slice(0, 4).map((m, i) => (
              <View key={m.id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                <Avatar svg={m.avatar} photo={m.photo} image={m.avatarImage} background={m.avatarBackground} size={30} ring="#ffffff" />
              </View>
            ))}
          </View>
        ) : null}
      </View>
      {policy.claimed > 0 ? (
        <View style={{ height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.22)", marginTop: 14, overflow: "hidden" }}>
          <View style={{ width: `${Math.round((1 - s.usedShare) * 100)}%`, height: 6, borderRadius: 999, backgroundColor: "#fff" }} />
        </View>
      ) : null}
    </Tap>
  );
}
