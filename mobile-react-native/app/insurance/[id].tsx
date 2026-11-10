import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronRight, FileText, MessageCircle, Pencil, Phone, Trash2, type LucideIcon } from "lucide-react-native";
import { useState } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PolicyCard } from "@/components/insurance/parts";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { GlassCircle, glassShadow } from "@/components/ui/glass";
import { Backdrop, PillButton, ScreenHeader, SectionTitle } from "@/components/ui/screen";
import { ListSkeleton, ScreenSkeleton } from "@/components/ui/skeleton";
import { Tap } from "@/components/ui/tap";
import { coverSummary } from "@/lib/insurance/explain";
import { POLICY_TYPE_LABEL } from "@/lib/insurance/policy";
import { deletePolicy, usePolicies, useRefreshCover } from "@/lib/insurance/queries";
import { useFamily } from "@/lib/profiles/family";
import { rupees } from "@/lib/records/details";
import { brand, ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { goBack } from "@/lib/nav/go-back";

/*
 * One policy: the card, who it covers, what it covers in plain words (from
 * what was saved, never guessed), and the way into the chat about it.
 */

export default function PolicyPage() {
  const { id, note } = useLocalSearchParams<{ id: string; note?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const q = usePolicies();
  const family = useFamily();
  const refresh = useRefreshCover();
  const [confirm, setConfirm] = useState(false);

  const policy = q.data?.find((p) => p.id === id) ?? null;
  const members = family.data?.access.all ?? [];

  if (q.isPending) {
    return (
      <ScreenSkeleton>
        <ListSkeleton rows={4} />
      </ScreenSkeleton>
    );
  }
  if (!policy) {
    return (
      <View className="flex-1 bg-canvas">
        <ScreenHeader title="Policy" fallback="/insurance" />
        <Text style={{ fontFamily: font.regular, fontSize: 15, color: ink[500], padding: 24, textAlign: "center" }}>This policy isn&apos;t here any more.</Text>
      </View>
    );
  }

  const covered = members.filter((m) => policy.coveredProfileIds.includes(m.id));
  const names = covered.map((m) => m.name.split(" ")[0] ?? m.name);
  const lines = coverSummary(policy, names).slice(1);
  const asker = covered[0];

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader
        title={policy.insurer}
        subtitle={POLICY_TYPE_LABEL[policy.policyType]}
        fallback="/insurance"
        right={
          <GlassCircle label="Edit this policy" onPress={() => router.push({ pathname: "/insurance/edit", params: { id: policy.id } })}>
            <Pencil size={18} color={ink[900]} />
          </GlassCircle>
        }
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 32, gap: 22 }} showsVerticalScrollIndicator={false}>
        {note === "file" ? (
          <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: semantic.attentionText, backgroundColor: semantic.attentionBg, padding: 12, borderRadius: 16, overflow: "hidden" }}>
            Policy saved. The document didn&apos;t upload. Attach it again from Edit when you have signal.
          </Text>
        ) : null}
        <PolicyCard policy={policy} members={members} />

        <View style={{ gap: 10 }}>
          <SectionTitle>Who it covers</SectionTitle>
          {covered.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {covered.map((m) => (
                <View key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 4, paddingRight: 12, height: 40, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: surface.line }}>
                  <Avatar svg={m.avatar} photo={m.photo} image={m.avatarImage} background={m.avatarBackground} size={30} />
                  <Text style={{ fontFamily: font.medium, fontSize: 15, color: ink[900] }}>{m.name.split(" ")[0]}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>Nobody is linked to this policy. Edit it to pick who it covers.</Text>
          )}
        </View>

        <View style={{ gap: 10 }}>
          <SectionTitle>What it covers</SectionTitle>
          <View style={[glassShadow, { backgroundColor: "#fff", borderRadius: 24, padding: 16, gap: 10, borderWidth: 1, borderColor: surface.line }]}>
            {lines.map((l) => (
              <View key={l} style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: brand[400], marginTop: 7 }} />
                <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[700] }}>{l}</Text>
              </View>
            ))}
            <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500], marginTop: 4 }}>
              From the details saved here. The insurer&apos;s policy wording is what counts on a claim.
            </Text>
          </View>
          {asker ? (
            <PillButton
              icon={<MessageCircle size={18} color="#fff" />}
              onPress={() => router.push({ pathname: "/ask", params: { q: `What does my ${policy.insurer} policy cover?` } })}
            >
              Ask Cheeku about this policy
            </PillButton>
          ) : null}
        </View>

        <View style={{ gap: 10 }}>
          <SectionTitle>Details</SectionTitle>
          <View style={[glassShadow, { backgroundColor: "#fff", borderRadius: 24, borderWidth: 1, borderColor: surface.line, overflow: "hidden" }]}>
            <Detail label="Policy number" value={policy.policyNo} first />
            {policy.plan ? <Detail label="Plan" value={policy.plan} /> : null}
            {policy.premium ? <Detail label="Premium" value={`${rupees(policy.premium.amount)} ${policy.premium.frequency}`} /> : null}
            {policy.tpa ? (
              <Action
                icon={Phone}
                label={policy.tpa.phone ? `Call ${policy.tpa.name}` : policy.tpa.name}
                sub={policy.tpa.phone ?? "Claims and cashless approvals"}
                onPress={policy.tpa.phone ? () => void Linking.openURL(`tel:${policy.tpa?.phone?.replace(/[^\d+]/g, "")}`) : undefined}
              />
            ) : null}
            {policy.documentId ? (
              <Action icon={FileText} label="Policy document" sub="The file you attached" onPress={() => router.push(`/records/${policy.documentId}`)} />
            ) : null}
            {policy.notes ? <Detail label="Notes" value={policy.notes} /> : null}
          </View>
        </View>

        <PillButton tone="danger" icon={<Trash2 size={17} color={semantic.dangerText} />} onPress={() => setConfirm(true)}>
          Remove this policy
        </PillButton>
      </ScrollView>

      <ConfirmSheet
        open={confirm}
        title="Remove this policy?"
        body="It comes off everyone it covers. A policy document you attached stays in their records."
        confirmLabel="Remove"
        destructive
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          const ok = await deletePolicy(policy.id);
          setConfirm(false);
          if (ok) {
            refresh();
            goBack(router, "/insurance");
          }
        }}
      />
    </View>
  );
}

function Detail({ label, value, first }: { label: string; value: string; first?: boolean }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: first ? 0 : 1, borderTopColor: surface.line }}>
      <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>{label}</Text>
      <Text selectable style={{ fontFamily: font.medium, fontSize: 15, color: ink[900], marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}

function Action({ icon: Icon, label, sub, onPress }: { icon: LucideIcon; label: string; sub: string; onPress?: () => void }) {
  return (
    <Tap accessibilityRole="button" onPress={onPress} disabled={!onPress} scale={0.99} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: surface.line }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
        <Icon size={17} color={brand[600]} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{label}</Text>
        <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 1 }}>{sub}</Text>
      </View>
      {onPress ? <ChevronRight size={16} color={ink[300]} /> : null}
    </Tap>
  );
}
