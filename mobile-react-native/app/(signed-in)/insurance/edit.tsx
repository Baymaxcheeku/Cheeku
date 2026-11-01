import { useLocalSearchParams, useRouter } from "expo-router";
import { Building2, Calendar, Check, ChevronDown, FileText, Hash, IndianRupee, Paperclip, Phone, Users, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/ui/avatar";
import { ChipSelect, Field } from "@/components/ui/field";
import { glassShadow } from "@/components/ui/glass";
import { Backdrop, PageTitle, PillButton, ScreenHeader } from "@/components/ui/screen";
import { Tap } from "@/components/ui/tap";
import { BENEFITS, draftFrom, emptyDraft, POLICY_TYPE_LABEL, validateDraft, type BenefitKey, type DraftErrors, type PolicyDraft, type PolicyType } from "@/lib/insurance/policy";
import { pickPolicyFile, savePolicy, usePolicies, useRefreshCover } from "@/lib/insurance/queries";
import { useFamily } from "@/lib/profiles/family";
import type { PickedFile } from "@/lib/records/upload";
import { brand, ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * Add or edit a policy. Short on purpose: who it covers, the company, the
 * number, the cover and the dates are enough to be useful, and everything
 * else (TPA, room rent, co-pay, waiting periods, what's included and what
 * isn't) sits behind "More about this policy". The PDF can ride along; it is
 * filed as an Insurance record under the first person covered.
 *
 * The document reader isn't live yet, so nothing is filled in from the file:
 * the copy says so instead of pretending.
 */

const TYPES: readonly (readonly [PolicyType, string])[] = (Object.keys(POLICY_TYPE_LABEL) as PolicyType[]).map((k) => [k, POLICY_TYPE_LABEL[k]] as const);

export default function EditPolicy() {
  const { id, for: forId } = useLocalSearchParams<{ id?: string; for?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const q = usePolicies();
  const family = useFamily();
  const refresh = useRefreshCover();
  const members = family.data?.access.all ?? [];
  const existing = id ? (q.data?.find((p) => p.id === id) ?? null) : null;

  const [draft, setDraft] = useState<PolicyDraft>(() => emptyDraft(forId ? [forId] : []));
  const [loaded, setLoaded] = useState(false);
  const [more, setMore] = useState(false);
  const [file, setFile] = useState<PickedFile | null>(null);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // An edit starts from the saved policy; a new one from whoever is being viewed.
  useEffect(() => {
    if (loaded) return;
    if (existing) {
      setDraft(draftFrom(existing));
      setMore(Boolean(existing.tpa || existing.roomRent || existing.coPay || existing.waiting.length || existing.benefits.length || existing.exclusions.length || existing.premium || existing.claimed));
      setLoaded(true);
    } else if (!id && family.data) {
      if (!forId) setDraft((d) => (d.coveredProfileIds.length ? d : { ...d, coveredProfileIds: family.data?.profile ? [family.data.profile.id] : [] }));
      setLoaded(true);
    }
  }, [existing, family.data, forId, id, loaded]);

  const set = <K extends keyof PolicyDraft>(k: K, v: PolicyDraft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    if (errors[k as keyof DraftErrors]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const toggleMember = (pid: string) => {
    setDraft((d) => {
      const has = d.coveredProfileIds.includes(pid);
      const next = has ? d.coveredProfileIds.filter((x) => x !== pid) : [...d.coveredProfileIds, pid];
      // Picking a second person on a new individual policy makes it a floater; it can be changed back.
      const type = !existing && next.length > 1 && d.policyType === "individual" ? "family_floater" : d.policyType;
      return { ...d, coveredProfileIds: next, policyType: type };
    });
    setErrors((e) => ({ ...e, covered: undefined }));
  };

  const toggleBenefit = (k: BenefitKey) => set("benefits", draft.benefits.includes(k) ? draft.benefits.filter((b) => b !== k) : [...draft.benefits, k]);

  const firstError = useMemo(() => Object.values(errors).find(Boolean) ?? null, [errors]);

  async function save() {
    const e = validateDraft(draft);
    setErrors(e);
    if (Object.keys(e).length) {
      if (e.claimed || e.premiumAmount || e.preExistingUntil || e.specificUntil) setMore(true);
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await savePolicy(draft, { id: existing?.id ?? null, file, keepDocumentId: existing?.documentId ?? null });
      if (!res.ok) {
        setMessage(res.message);
        return;
      }
      refresh();
      router.replace({ pathname: "/insurance/[id]", params: res.fileFailed ? { id: res.id, note: "file" } : { id: res.id } });
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-canvas" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Backdrop />
      <ScreenHeader title={existing ? "Edit policy" : "Add a policy"} fallback="/insurance" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 120, gap: 18 }} showsVerticalScrollIndicator={false}>
        {!existing ? <PageTitle title="Your health insurance" line="The basics are enough to start. Everything else is optional." /> : null}

        {/* Who it covers. */}
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Users size={16} color={brand[400]} />
            <Text className="text-sm font-medium text-ink-700">
              Who it covers<Text className="text-brand-600"> *</Text>
            </Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {members.map((m) => {
              const on = draft.coveredProfileIds.includes(m.id);
              return (
                <Tap
                  key={m.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={m.name}
                  onPress={() => toggleMember(m.id)}
                  scale={0.96}
                  style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 4, paddingRight: 12, height: 44, borderRadius: 999, backgroundColor: on ? ink[900] : "#fff", borderWidth: 1, borderColor: on ? ink[900] : surface.line }}
                >
                  <Avatar svg={m.avatar} photo={m.photo} image={m.avatarImage} background={m.avatarBackground} size={34} />
                  <Text style={{ fontFamily: font.semibold, fontSize: 15, color: on ? "#fff" : ink[900] }}>{m.name.split(" ")[0]}</Text>
                  {on ? <Check size={15} color="#fff" strokeWidth={2.6} /> : null}
                </Tap>
              );
            })}
          </View>
          {errors.covered ? <Text style={{ fontFamily: font.regular, fontSize: 12, color: semantic.dangerText }}>{errors.covered}</Text> : null}
        </View>

        <Field label="Insurance company" required icon={Building2} placeholder="Like Star Health or Niva Bupa" value={draft.insurer} onChangeText={(v) => set("insurer", v)} error={errors.insurer} autoCapitalize="words" />
        <Field label="Policy number" required icon={Hash} placeholder="On the card or the first page" value={draft.policyNo} onChangeText={(v) => set("policyNo", v)} error={errors.policyNo} autoCapitalize="characters" autoCorrect={false} />
        <Field label="Plan name" icon={FileText} placeholder="Optional, like Optima Secure" value={draft.plan} onChangeText={(v) => set("plan", v)} />
        <ChipSelect label="Type" options={TYPES} value={draft.policyType} onChange={(v) => v && set("policyType", v)} />
        <Field label="Sum insured" required icon={IndianRupee} placeholder="Like 5 lakh or 10,00,000" value={draft.sumInsured} onChangeText={(v) => set("sumInsured", v)} error={errors.sumInsured} keyboardType="default" />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field label="Starts" icon={Calendar} placeholder="YYYY-MM-DD" value={draft.start} onChangeText={(v) => set("start", v)} error={errors.start} keyboardType="numbers-and-punctuation" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Ends" icon={Calendar} placeholder="YYYY-MM-DD" value={draft.end} onChangeText={(v) => set("end", v)} error={errors.end} keyboardType="numbers-and-punctuation" />
          </View>
        </View>

        {/* The document. */}
        <View style={[glassShadow, { backgroundColor: "#fff", borderRadius: 24, padding: 14, borderWidth: 1, borderColor: surface.line, gap: 10 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
              <Paperclip size={18} color={brand[600]} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>
                {file ? file.name : existing?.documentId ? "Policy document attached" : "Attach the policy"}
              </Text>
              <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500], marginTop: 1 }}>
                {file ? "Saved with the policy and filed in their records." : "The PDF or a photo of the card. Kept with the policy so the full wording is a tap away."}
              </Text>
            </View>
            {file ? (
              <Tap accessibilityRole="button" accessibilityLabel="Remove the file" onPress={() => setFile(null)} hitSlop={8} scale={0.94}>
                <X size={18} color={ink[500]} />
              </Tap>
            ) : null}
          </View>
          {!file ? (
            <PillButton tone="light" onPress={async () => setFile(await pickPolicyFile())}>
              {existing?.documentId ? "Replace the document" : "Choose a file"}
            </PillButton>
          ) : null}
        </View>

        {/* Everything else. */}
        <Tap accessibilityRole="button" accessibilityState={{ expanded: more }} onPress={() => setMore((m) => !m)} scale={0.99} style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 4 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: brand[600] }}>More about this policy</Text>
          <View style={{ transform: [{ rotate: more ? "180deg" : "0deg" }] }}>
            <ChevronDown size={17} color={brand[600]} />
          </View>
        </Tap>

        {more ? (
          <View style={{ gap: 18 }}>
            <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[500] }}>
              These are what Cheeku uses to answer &quot;is it covered?&quot;. Copy them from the policy schedule. Anything left blank, Cheeku says it doesn&apos;t know rather than guessing.
            </Text>
            <Field label="Already claimed this year" icon={IndianRupee} placeholder="Optional, like 40,000" value={draft.claimed} onChangeText={(v) => set("claimed", v)} error={errors.claimed} />
            <ChipSelect
              label="Cashless at network hospitals"
              options={[["yes", "Yes"], ["no", "No"]] as const}
              value={draft.cashless === null ? "" : draft.cashless ? "yes" : "no"}
              onChange={(v) => set("cashless", v === "" ? null : v === "yes")}
            />
            <Field label="TPA or claims helpline" icon={Building2} placeholder="Like Medi Assist" value={draft.tpaName} onChangeText={(v) => set("tpaName", v)} />
            {draft.tpaName.trim() ? <Field label="Its phone number" icon={Phone} placeholder="On the back of the card" value={draft.tpaPhone} onChangeText={(v) => set("tpaPhone", v)} keyboardType="phone-pad" /> : null}
            <Field label="Room rent limit" placeholder="Like single private room, or 1% of cover a day" value={draft.roomRent} onChangeText={(v) => set("roomRent", v)} />
            <Field label="Co-pay" placeholder="Like 20% for anyone over 60" value={draft.coPay} onChangeText={(v) => set("coPay", v)} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label="Pre-existing covered from" placeholder="YYYY-MM-DD" value={draft.preExistingUntil} onChangeText={(v) => set("preExistingUntil", v)} error={errors.preExistingUntil} keyboardType="numbers-and-punctuation" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Listed illnesses from" placeholder="YYYY-MM-DD" value={draft.specificUntil} onChangeText={(v) => set("specificUntil", v)} error={errors.specificUntil} keyboardType="numbers-and-punctuation" />
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text className="text-sm font-medium text-ink-700">What it includes</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {BENEFITS.map((b) => {
                  const on = draft.benefits.includes(b.key);
                  return (
                    <Tap
                      key={b.key}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      onPress={() => toggleBenefit(b.key)}
                      scale={0.96}
                      style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 999, backgroundColor: on ? brand[600] : "#fff", borderWidth: 1, borderColor: on ? brand[600] : surface.line }}
                    >
                      {on ? <Check size={14} color="#fff" strokeWidth={2.6} /> : null}
                      <Text style={{ fontFamily: font.medium, fontSize: 13, color: on ? "#fff" : ink[700] }}>{b.label}</Text>
                    </Tap>
                  );
                })}
              </View>
            </View>

            <Field label="Not covered" placeholder={"One per line, from the exclusions list"} value={draft.exclusions} onChangeText={(v) => set("exclusions", v)} multiline style={{ minHeight: 88 }} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label="Premium" icon={IndianRupee} placeholder="Optional" value={draft.premiumAmount} onChangeText={(v) => set("premiumAmount", v)} error={errors.premiumAmount} />
              </View>
              <View style={{ flex: 1, justifyContent: "flex-end" }}>
                <ChipSelect label="Paid" options={[["yearly", "Yearly"], ["monthly", "Monthly"]] as const} value={draft.premiumFrequency === "quarterly" ? "yearly" : draft.premiumFrequency} onChange={(v) => v && set("premiumFrequency", v)} />
              </View>
            </View>
            <Field label="Notes" placeholder="Anything worth remembering" value={draft.notes} onChangeText={(v) => set("notes", v)} multiline style={{ minHeight: 64 }} />
          </View>
        ) : null}
      </ScrollView>

      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 10, paddingBottom: insets.bottom + 12, backgroundColor: surface.canvas, borderTopWidth: 1, borderTopColor: surface.line }}>
        {message || firstError ? (
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: message && !firstError ? ink[700] : semantic.dangerText, marginBottom: 8, textAlign: "center" }}>
            {firstError ? "Check the fields marked above." : message}
          </Text>
        ) : null}
        <PillButton onPress={() => void save()} loading={saving} disabled={saving}>
          {existing ? "Save changes" : "Save policy"}
        </PillButton>
      </View>
    </KeyboardAvoidingView>
  );
}
