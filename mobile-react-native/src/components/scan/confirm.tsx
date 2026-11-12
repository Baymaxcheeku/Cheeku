import { Check, ChevronDown, ChevronUp, CircleHelp, ShieldCheck } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TYPE_STYLE } from "@/components/records/record-card";
import { Avatar } from "@/components/ui/avatar";
import { glass, glassShadow } from "@/components/ui/glass";
import { StaggerItem, useReducedMotion } from "@/components/ui/motion";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { Tap } from "@/components/ui/tap";
import type { Extraction } from "@/lib/ai/mock/extract-types";
import { feel } from "@/lib/feel";
import type { ActiveProfile } from "@/lib/profiles/context";
import { DOC_TYPE_LABEL } from "@/lib/records/types";
import { EMPTY_REVIEW, reviewItems, unresolved, type ReviewItem, type ReviewState } from "@/lib/scan/review";
import { brand, hue, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * "DID I READ THIS RIGHT?", BEFORE ANYTHING IS FILED (loop-scan-ux).
 *
 * The reader is sure about most of a page and unsure about a few things: a
 * smudged decimal, a handwritten clinic name. Only those few are put in
 * front of the person, each with the value as read, a field to correct it
 * and "Looks right". Everything read clearly is folded under one line.
 *
 * Saving with something left unchecked is allowed: the record then says
 * "Waiting for a check" until someone confirms it on the record page.
 */
export function ScanConfirm({
  extraction,
  member,
  busy,
  error,
  onSave,
  onDiscard,
}: {
  extraction: Extraction;
  member: ActiveProfile | null;
  busy: boolean;
  error: string | null;
  onSave: (review: ReviewState, left: number) => void;
  onDiscard: () => void;
}) {
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const [review, setReview] = useState<ReviewState>(EMPTY_REVIEW);
  const [showClear, setShowClear] = useState(false);

  const items = useMemo(() => reviewItems(extraction), [extraction]);
  const doubtful = items.filter((i) => i.low);
  const clear = items.filter((i) => !i.low);
  const left = unresolved(extraction, review).length;
  const style = TYPE_STYLE[extraction.docType] ?? TYPE_STYLE.other;
  const Icon = style.icon;
  const first = member?.isPrimary ? "your" : `${member?.name.split(" ")[0] ?? "their"}'s`;

  const confirm = (id: string, on: boolean) => {
    feel.tick();
    setReview((r) => {
      const confirmed = new Set(r.confirmed);
      if (on) confirmed.add(id);
      else confirmed.delete(id);
      return { ...r, confirmed };
    });
  };
  const edit = (id: string, patch: { value?: string; unit?: string }) =>
    setReview((r) => ({ ...r, edits: { ...r.edits, [id]: { ...r.edits[id], ...patch } } }));

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader title="Check and save" onBack={onDiscard} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 140, gap: 14 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={{ fontFamily: font.medium, fontSize: 28, lineHeight: 34, letterSpacing: -1, color: ink[900] }}>
              {doubtful.length ? "Did I read\n" : "All read\n"}
              <Text style={{ color: ink[300] }}>{doubtful.length ? "this right?" : "clearly."}</Text>
            </Text>
            <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[500], marginTop: 6 }}>
              {doubtful.length
                ? `${doubtful.length} ${doubtful.length === 1 ? "thing" : "things"} I'm not sure about. Fix or tick ${doubtful.length === 1 ? "it" : "them"}, then save.`
                : "Have a quick look, then save it to the file."}
            </Text>
          </View>
        </View>

        {/* What it is and whose. */}
        <StaggerItem index={0}>
          <View style={[glassShadow, { borderRadius: 24, backgroundColor: "#fff", borderWidth: 1, borderColor: glass.rim, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }]}>
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: style.wash, alignItems: "center", justifyContent: "center" }}>
              <Icon size={24} color={style.tint} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: font.medium, fontSize: 12, color: style.tint }}>{DOC_TYPE_LABEL[extraction.docType]}</Text>
              <Text numberOfLines={2} style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{extraction.title}</Text>
            </View>
            {member ? (
              <View style={{ alignItems: "center", gap: 2 }}>
                <Avatar svg={member.avatar} photo={member.photo} image={member.avatarImage} background={member.avatarBackground} size={36} />
                <Text style={{ fontFamily: font.medium, fontSize: 11, color: ink[500] }}>{member.isPrimary ? "You" : member.name.split(" ")[0]}</Text>
              </View>
            ) : null}
          </View>
        </StaggerItem>

        {doubtful.length ? (
          <View style={{ gap: 10 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[700] }}>Check these</Text>
            {doubtful.map((item, i) => (
              <StaggerItem key={item.id} index={i + 1}>
                <CheckRow item={item} review={review} onConfirm={confirm} onEdit={edit} />
              </StaggerItem>
            ))}
          </View>
        ) : null}

        {clear.length ? (
          <Animated.View layout={still ? undefined : LinearTransition.duration(220)} style={[glassShadow, { borderRadius: 24, backgroundColor: "#fff", borderWidth: 1, borderColor: glass.rim, overflow: "hidden" }]}>
            <Tap
              accessibilityRole="button"
              accessibilityState={{ expanded: showClear }}
              onPress={() => setShowClear((v) => !v)}
              style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14 }}
            >
              <View style={{ width: 28, height: 28, borderRadius: 999, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
                <Check size={15} color={ink[900]} strokeWidth={3} />
              </View>
              <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>
                {clear.length} read clearly
              </Text>
              {showClear ? <ChevronUp size={18} color={ink[500]} /> : <ChevronDown size={18} color={ink[500]} />}
            </Tap>
            {showClear ? (
              <Animated.View entering={still ? undefined : FadeIn.duration(180)} style={{ paddingHorizontal: 14, paddingBottom: 12, gap: 8 }}>
                {clear.map((c) => (
                  <View key={c.id} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: surface.line }}>
                    <Text numberOfLines={1} style={{ flex: 1, fontFamily: font.regular, fontSize: 13, color: ink[500] }}>{c.label}</Text>
                    <Text numberOfLines={1} style={{ maxWidth: "55%", fontFamily: font.semibold, fontSize: 13, color: ink[900], textAlign: "right" }}>
                      {c.value}{c.unit ? ` ${c.unit}` : ""}
                    </Text>
                  </View>
                ))}
              </Animated.View>
            ) : null}
          </Animated.View>
        ) : null}

        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start", paddingHorizontal: 4 }}>
          <ShieldCheck size={14} color={ink[300]} style={{ marginTop: 2 }} />
          <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500] }}>
            Nothing is saved until you tap Save. Discard removes the file you just added.
          </Text>
        </View>
      </ScrollView>

      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: surface.canvas, borderTopWidth: 1, borderTopColor: surface.line, gap: 6 }}>
        {error ? <Text accessibilityRole="alert" style={{ fontFamily: font.medium, fontSize: 13, color: hue.rose.fg }}>{error}</Text> : null}
        {left ? (
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], textAlign: "center" }}>
            {left} left unchecked: it will say &quot;Waiting for a check&quot; until you look.
          </Text>
        ) : null}
        <PillButton loading={busy} onPress={() => onSave(review, left)} icon={<Check size={17} color="#fff" strokeWidth={3} />}>
          {`Save to ${first} records`}
        </PillButton>
        <Tap accessibilityRole="button" disabled={busy} onPress={onDiscard} style={{ height: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[500] }}>Discard</Text>
        </Tap>
      </View>
    </View>
  );
}

/** One doubtful item: the value as read, a field to fix it, and "Looks right". */
function CheckRow({
  item,
  review,
  onConfirm,
  onEdit,
}: {
  item: ReviewItem;
  review: ReviewState;
  onConfirm: (id: string, on: boolean) => void;
  onEdit: (id: string, patch: { value?: string; unit?: string }) => void;
}) {
  const typed = review.edits[item.id]?.value;
  const done = review.confirmed.has(item.id) || Boolean((typed ?? "").trim());
  return (
    <View
      style={[
        glassShadow,
        { borderRadius: 24, padding: 14, gap: 10, backgroundColor: done ? "#fff" : hue.orange.wash, borderWidth: 1.5, borderColor: done ? brand[100] : hue.orange.bg },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {done ? <Check size={15} color={ink[900]} strokeWidth={3} /> : <CircleHelp size={15} color={hue.orange.fg} />}
        <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{item.label}</Text>
        <Text style={{ fontFamily: font.medium, fontSize: 11, color: done ? brand[600] : hue.orange.fg }}>{done ? "Checked" : "Not sure"}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", height: 48, borderRadius: 12, borderWidth: 1, borderColor: surface.line, backgroundColor: "#fff", paddingRight: item.unit ? 12 : 0 }}>
        <TextInput
          value={typed ?? item.value}
          onChangeText={(v) => onEdit(item.id, { value: v === item.value ? "" : v })}
          accessibilityLabel={`${item.label}, as read: ${item.value}${item.unit ? ` ${item.unit}` : ""}`}
          keyboardType={item.kind === "value" && /^[\d.,]+$/.test(item.value) ? "decimal-pad" : "default"}
          style={{ flex: 1, minWidth: 0, height: 46, paddingHorizontal: 14, fontFamily: font.semibold, fontSize: 17, color: ink[900] }}
        />
        {item.unit ? <Text numberOfLines={1} style={{ flexShrink: 1, maxWidth: "50%", fontFamily: font.medium, fontSize: 13, color: ink[500] }}>{item.unit}</Text> : null}
      </View>
      {item.refRange ? <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>Range on the report: {item.refRange}</Text> : null}
      {!typed ? (
        <Tap
          accessibilityRole="checkbox"
          accessibilityState={{ checked: review.confirmed.has(item.id) }}
          onPress={() => onConfirm(item.id, !review.confirmed.has(item.id))}
          style={{ alignSelf: "flex-start", height: 40, paddingHorizontal: 14, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: review.confirmed.has(item.id) ? brand[600] : "#fff", borderWidth: 1, borderColor: review.confirmed.has(item.id) ? brand[600] : surface.line }}
          scale={0.96}
        >
          <Check size={15} color={review.confirmed.has(item.id) ? "#fff" : brand[600]} strokeWidth={3} />
          <Text style={{ fontFamily: font.semibold, fontSize: 13, color: review.confirmed.has(item.id) ? "#fff" : ink[900] }}>Looks right</Text>
        </Tap>
      ) : (
        <Text style={{ fontFamily: font.regular, fontSize: 12, color: brand[600] }}>Corrected from {item.value}</Text>
      )}
    </View>
  );
}
