import { CircleCheck, Eye, PhoneCall, Siren, type LucideIcon } from "lucide-react-native";
import { Text, View } from "react-native";

import { TIER_LABEL, type Tier } from "@/lib/memory/types";
import { semantic } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * THE FOUR TIERS, DRAWN.
 *
 * These are health meaning, so they are the one place in the chat that uses
 * the semantic hues: green for "fits the expected pattern", amber for "keep an
 * eye on it", red for "call today" and solid red for "go now". Two reds, told
 * apart by weight (tint versus fill) and by the icon, never by colour alone.
 */

export type TierStyle = { fg: string; bg: string; solid: boolean; icon: LucideIcon };

export const TIER_STYLE: Record<Tier, TierStyle> = {
  reassure: { fg: semantic.safeText, bg: semantic.safeBg, solid: false, icon: CircleCheck },
  monitor: { fg: semantic.cautionText, bg: semantic.cautionBg, solid: false, icon: Eye },
  contact_today: { fg: semantic.dangerText, bg: semantic.dangerBg, solid: false, icon: PhoneCall },
  go_now: { fg: "#ffffff", bg: semantic.dangerStrong, solid: true, icon: Siren },
};

export function TierBadge({ tier, compact }: { tier: Tier; compact?: boolean }) {
  const s = TIER_STYLE[tier];
  const Icon = s.icon;
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Urgency: ${TIER_LABEL[tier]}`}
      style={{ flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: compact ? 8 : 10, paddingVertical: compact ? 3.5 : 5, borderRadius: 999, backgroundColor: s.bg }}
    >
      <Icon size={compact ? 11 : 13} color={s.fg} strokeWidth={2.4} />
      <Text style={{ fontFamily: font.semibold, fontSize: compact ? 11 : 12, color: s.fg }}>{TIER_LABEL[tier]}</Text>
    </View>
  );
}

/** A small dot for lists: a sitting's highest tier. */
export function TierDot({ tier }: { tier: Tier }) {
  return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tier === "reassure" ? semantic.safe : tier === "monitor" ? semantic.caution : semantic.danger }} />;
}
