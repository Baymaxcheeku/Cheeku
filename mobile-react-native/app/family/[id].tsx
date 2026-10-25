import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeftRight, Check, ChevronRight, FileText, Lock, Plus, Trash2, UserCog } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarPicker } from "@/components/family/avatar-picker";
import { HealthEditor } from "@/components/family/health-editor";
import { ReportQueue } from "@/components/family/report-queue";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { Field } from "@/components/ui/field";
import { Glass, Gradient, glass, glassShadow } from "@/components/ui/glass";
import { Enter } from "@/components/ui/motion";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { optimisticQueries } from "@/lib/optimistic";
import { generatedAvatar } from "@/lib/profiles/avatar";
import { isChild } from "@/lib/profiles/face-pool";
import { ageFrom, checkMemberHealth, EMPTY_HEALTH, loadMemberHealth, saveMemberHealth, type MemberHealth } from "@/lib/profiles/health";
import { clearProfilePhoto, pickPhoto, setProfilePhoto } from "@/lib/profiles/photo";
import { uploadQueue, type QueueItem } from "@/lib/records/bulk-upload";
import { formatEventDate } from "@/lib/records/grouping";
import { listProfileRecords } from "@/lib/records/queries";
import {
  listMembers,
  refreshRoster,
  showPhotoNow,
  removeMember,
  updateAvatar,
  updateMember,
  useFamily,
  useSwitchMember,
} from "@/lib/profiles/family";
import { addMemberSchema } from "@/lib/settings/schemas";
import { brand, hue, ink, lilac, semantic } from "@/theme/tokens";
import { font } from "@/theme/type";
import { Brand } from "@/components/ui/brand";
import { Tap } from "@/components/ui/tap";
import { DetailSkeleton, ScreenSkeleton } from "@/components/ui/skeleton";

/*
 * One family member: switch to them, change their face or details, or remove
 * them.
 *
 * THE ACCOUNT HOLDER is different on purpose. Their name, birthday and sex
 * live on Personal information, which also feeds sign-in and receipts, so
 * here they only get the face picker and a link across. They cannot be
 * removed; the database refuses it too (migration 0025). Removing yourself
 * is "Delete account", which is a different, louder decision.
 *
 * REMOVING is permanent, and the sheet says exactly what goes, with the
 * report count, before anything happens. Files are deleted before rows, so a
 * half-finished removal can never leave a scan in storage with nothing
 * pointing at it (lib/profiles/family.ts).
 */

const SEXES = [
  ["female", "Female"],
  ["male", "Male"],
  ["other", "Other"],
  ["prefer_not_to_say", "Rather not"],
] as const;

function firstName(name: string) {
  return name.trim().split(" ")[0] ?? name;
}

export default function Member() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const family = useFamily();
  const switchMember = useSwitchMember();
  const members = useQuery({ queryKey: ["family-members"], queryFn: listMembers });

  const index = members.data?.members.findIndex((m) => m.id === id) ?? -1;
  const member = index >= 0 ? members.data?.members[index] : undefined;

  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState("");
  const [seed, setSeed] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState(false);
  // Photo edits wait for Save like everything else: a local file to upload,
  // or `cleared` to go back to a drawn face.
  const [newPhoto, setNewPhoto] = useState<string | null>(null);
  const [cleared, setCleared] = useState(false);
  // The photo just saved, shown from the phone's own copy until the roster
  // comes back with a signed link to the stored one.
  const [savedPhoto, setSavedPhoto] = useState<string | null>(null);
  const [health, setHealth] = useState<MemberHealth>(EMPTY_HEALTH);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [filing, setFiling] = useState(false);

  const savedHealth = useQuery({ queryKey: ["member-health", id], queryFn: () => loadMemberHealth(id), enabled: Boolean(id) });
  // Same key Home uses, so this list and Home's are one cache entry.
  const records = useQuery({ queryKey: ["records", id], queryFn: () => listProfileRecords(id), enabled: Boolean(id) && !member?.locked });

  // Each form is filled in once per person: a rolled-back instant save must
  // never wipe what was typed (lib/optimistic.ts).
  const seededHealth = useRef<string | null>(null);
  useEffect(() => {
    if (!savedHealth.data || seededHealth.current === id) return;
    seededHealth.current = id;
    setHealth(savedHealth.data);
  }, [savedHealth.data, id]);
  const healthDirty = useMemo(
    () => Boolean(savedHealth.data) && JSON.stringify(health) !== JSON.stringify(savedHealth.data),
    [health, savedHealth.data],
  );

  const seededMember = useRef<string | null>(null);
  useEffect(() => {
    if (!member || seededMember.current === member.id) return;
    seededMember.current = member.id;
    setName(member.name);
    setRelationship(member.relationship ?? "");
    setDob(member.dob ?? "");
    setSex(member.sex ?? "");
    setSeed(member.avatarSeed ?? "");
  }, [member]);

  if (!member && members.isPending) {
    return (
      <ScreenSkeleton title="Family member">
        <DetailSkeleton hero={220} round />
      </ScreenSkeleton>
    );
  }
  if (!member) {
    return (
      <View className="flex-1 bg-canvas">
        <Backdrop />
        <ScreenHeader title="Family member" fallback="/family" />
        {members.isSuccess ? (
          <Text style={{ fontFamily: font.medium, fontSize: 15, color: ink[500], textAlign: "center", marginTop: 40 }}>
            This person isn&apos;t in your family any more.
          </Text>
        ) : null}
      </View>
    );
  }

  const derived = generatedAvatar(member.id, index);
  const face = seed ? generatedAvatar(seed, 0) : derived;
  const viewing = family.data?.profile?.id === member.id;
  const photoShown = cleared ? null : (newPhoto ?? savedPhoto ?? member.photo);
  const photoDirty = Boolean(newPhoto) || (cleared && Boolean(member.photoPath || savedPhoto));
  const age = ageFrom(member.isPrimary ? member.dob : dob);
  const dirty = photoDirty || healthDirty || (member.isPrimary
    ? seed !== (member.avatarSeed ?? "")
    : name !== member.name ||
      relationship !== (member.relationship ?? "") ||
      dob !== (member.dob ?? "") ||
      sex !== (member.sex ?? "") ||
      seed !== (member.avatarSeed ?? ""));

  /*
   * INSTANT SAVE for details, face and health: checked here first, then Saved
   * shows and the roster changes at once while the writes run behind it. A
   * failure puts the saved copy back, keeps what was typed, and the save bar
   * offers Retry. A new or removed PHOTO is an upload, so that path keeps the
   * spinner below and waits for the server.
   */
  function saveInstant() {
    if (!member) return;
    setErrors({});
    setMessage(null);
    const patch = { name, relationship, dob, sex, avatarSeed: seed };
    if (!member.isPrimary) {
      const checked = addMemberSchema.safeParse(patch);
      if (!checked.success) {
        const fields: Record<string, string> = {};
        for (const issue of checked.error.issues) fields[String(issue.path[0] ?? "form")] ??= issue.message;
        setErrors(fields);
        setMessage("Check the fields below.");
        return;
      }
    }
    if (healthDirty) {
      const invalid = checkMemberHealth(health);
      if (invalid) {
        setMessage(invalid.message);
        return;
      }
    }
    const memberId = member.id;
    const primary = member.isPrimary;
    const nextHealth = health;
    const withHealth = healthDirty;
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
    void optimisticQueries(
      qc,
      [
        {
          key: ["family-members"],
          update: (old) => {
            const o = old as NonNullable<typeof members.data>;
            return {
              ...o,
              members: o.members.map((m) =>
                m.id !== memberId
                  ? m
                  : primary
                    ? { ...m, avatarSeed: seed || null }
                    : { ...m, name: name.trim(), relationship: relationship || null, dob: dob || null, sex: sex || null, avatarSeed: seed || null },
              ),
            };
          },
        },
        ...(withHealth ? [{ key: ["member-health", memberId], update: () => nextHealth }] : []),
      ],
      {
        write: async () => {
          const r = primary ? await updateAvatar(memberId, seed || null) : await updateMember(memberId, patch);
          if (!r.ok) return { ok: false, message: r.message };
          if (withHealth) return saveMemberHealth(memberId, nextHealth);
          return { ok: true };
        },
        message: `Couldn't save ${firstName(member.name)}'s details. Check your connection.`,
        onSaved: () => {
          refreshRoster(qc);
          if (withHealth) {
            void qc.invalidateQueries({ queryKey: ["member-health", memberId] });
            // Ask grounds itself in these, so it hears about the change too.
            void qc.invalidateQueries({ queryKey: ["ask-context"] });
            void qc.invalidateQueries({ queryKey: ["settings-health"] });
          }
        },
      },
    ).then((ok) => {
      if (!ok) setSaved(false);
    });
  }

  async function save() {
    if (!member) return;
    if (!photoDirty) {
      saveInstant();
      return;
    }
    setSaving(true);
    setErrors({});
    setMessage(null);
    // `finally`, so the button can never be left spinning: whatever fails,
    // the person gets the button back and a sentence saying what happened.
    try {
      const result = member.isPrimary
        ? await updateAvatar(member.id, seed || null)
        : await updateMember(member.id, { name, relationship, dob, sex, avatarSeed: seed });
      if (!result.ok) {
        setErrors(("fieldErrors" in result && result.fieldErrors) || {});
        setMessage(result.message);
        return;
      }
      if (newPhoto) {
        const p = await setProfilePhoto(member.id, newPhoto);
        if (!p.ok) {
          // The rest saved; keep the picked photo on screen so one more tap
          // on Save retries just the photo.
          setMessage(p.message);
          refreshRoster(qc);
          return;
        }
        setSavedPhoto(newPhoto);
        showPhotoNow(qc, member.id, newPhoto, p.path);
        setNewPhoto(null);
      } else if (cleared && (member.photoPath || savedPhoto)) {
        const c = await clearProfilePhoto(member.id);
        if (!c.ok) {
          setMessage(c.message);
          return;
        }
        setSavedPhoto(null);
        showPhotoNow(qc, member.id, null, null);
        setCleared(false);
      }
      if (healthDirty) {
        const h = await saveMemberHealth(member.id, health);
        if (!h.ok) {
          setMessage(h.message);
          return;
        }
        void qc.invalidateQueries({ queryKey: ["member-health", member.id] });
        // Ask grounds itself in these, so it hears about the change too.
        void qc.invalidateQueries({ queryKey: ["ask-context"] });
        void qc.invalidateQueries({ queryKey: ["settings-health"] });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
      refreshRoster(qc);
    } catch {
      setMessage("That didn't save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!member) return;
    const result = await removeMember(member.id);
    if (!result.ok) {
      setConfirm(false);
      setMessage(result.message);
      return;
    }
    setConfirm(false);
    refreshRoster(qc);
    router.back();
  }

  async function fileReports() {
    if (!member) return;
    setFiling(true);
    await uploadQueue(member.id, queue, (key, patch) => setQueue((q) => q.map((x) => (x.key === key ? { ...x, ...patch } : x))));
    setFiling(false);
    void qc.invalidateQueries({ queryKey: ["records", member.id] });
    void qc.invalidateQueries({ queryKey: ["family-members"] });
    void qc.invalidateQueries({ queryKey: ["health-overview"] });
    // Clear the ones that made it; leave failures to retry.
    setQueue((q) => q.filter((x) => x.status !== "done"));
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-canvas" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Backdrop height={460} />
      <ScreenHeader title={member.isPrimary ? "You" : firstName(member.name)} fallback="/family" />

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* Hero. */}
        <View style={[glassShadow, { borderRadius: 32, overflow: "hidden", paddingVertical: 22, alignItems: "center" }]}>
          <Gradient from={face.background} to="#ffffff" angle="vertical" glow="#ffffff" />
          <Enter key={photoShown ?? (seed || "derived")} kind="quick" style={{ borderRadius: 999, borderWidth: 4, borderColor: "#fff", opacity: member.locked ? 0.5 : 1 }}>
            <Avatar svg={face.svg} image={face.image} photo={photoShown} background={face.background} size={96} />
          </Enter>
          <Text style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.5, color: ink[900], marginTop: 12 }}>{member.name}</Text>
          <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500], marginTop: 2 }}>
            {member.isPrimary ? "Account holder" : (member.relationship ?? "Family")} · {member.reports === 1 ? "1 report" : `${member.reports} reports`}
          </Text>
          {viewing ? (
            <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 30, borderRadius: 999, backgroundColor: brand[600] }}>
              <Check size={13} color="#fff" strokeWidth={3} />
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: "#fff" }}>Viewing now</Text>
            </View>
          ) : !member.locked ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void switchMember(member.id);
                router.replace("/home");
              }}
              style={({ pressed }) => [glassShadow, { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 999, backgroundColor: pressed ? "#fff" : glass.fillStrong, borderWidth: 1, borderColor: glass.rim }]}
            >
              <ArrowLeftRight size={14} color={ink[900]} />
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[900] }}>Switch to {firstName(member.name)}</Text>
            </Pressable>
          ) : null}
        </View>

        {member.locked ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/settings/subscription")}
            style={({ pressed }) => ({ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 24, backgroundColor: pressed ? lilac.base : brand[50] })}
          >
            <Lock size={17} color={brand[700]} />
            <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[700] }}>
              {firstName(member.name)} is paused on your current plan. Their records are safe.{" "}
              <Text style={{ fontFamily: font.semibold, color: brand[700] }}>Family opens them again.</Text>
            </Text>
          </Pressable>
        ) : null}

        {/* Face. */}
        <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], marginTop: 24, marginBottom: 12 }}>Photo or face</Text>
        <Glass strong className="rounded-xl p-4">
          <AvatarPicker
            value={seed}
            onChange={setSeed}
            derived={derived}
            size={48}
            kidsFirst={isChild(age, relationship)}
            photo={photoShown}
            onPickPhoto={(source) => void pickPhoto(source).then((uri) => { if (uri) { setNewPhoto(uri); setCleared(false); } })}
            onClearPhoto={() => { setNewPhoto(null); setCleared(true); }}
          />
        </Glass>

        {/* Details. */}
        {member.isPrimary ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/settings/personal")}
            style={({ pressed }) => [glassShadow, { marginTop: 16, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 24, backgroundColor: pressed ? "#fff" : glass.fillStrong, borderWidth: 1, borderColor: glass.rim }]}
          >
            <UserCog size={19} color={ink[700]} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>Your name and details</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>Edited in Personal information</Text>
            </View>
            <ChevronRight size={18} color={ink[300]} />
          </Pressable>
        ) : (
          <>
            <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], marginTop: 24, marginBottom: 12 }}>Details</Text>
            <View style={{ gap: 14 }}>
              <Field label="Name" value={name} onChangeText={setName} autoCapitalize="words" error={errors.name} />
              <Field label="Relationship to you" value={relationship} onChangeText={setRelationship} error={errors.relationship} />
              <Field label="Date of birth" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" autoCapitalize="none" error={errors.dob} hint="Helps read their reports against the right ranges." />
            </View>
            <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[700], marginTop: 16, marginBottom: 8 }}>Sex</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {SEXES.map(([value, label]) => {
                const on = sex === value;
                return (
                  <Tap
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    onPress={() => setSex(on ? "" : value)}
                    style={{ flex: 1, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: on ? brand[50] : glass.fillStrong, borderWidth: 1.5, borderColor: on ? brand[500] : "rgba(15,16,48,0.08)" }}
                  >
                    <Text numberOfLines={1} style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 13, color: on ? brand[700] : ink[700] }}>{label}</Text>
                  </Tap>
                );
              })}
            </View>
          </>
        )}

        {message ? (
          <Text accessibilityRole="alert" style={{ fontFamily: font.medium, fontSize: 13, color: semantic.dangerText, marginTop: 14 }}>{message}</Text>
        ) : null}

        {/* Their records: the same list their file shows, never anyone else's. */}
        {!member.locked ? (
          <>
            <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], marginTop: 28, marginBottom: 12 }}>
              {member.isPrimary ? "Your reports" : `${firstName(member.name)}'s reports`}
            </Text>
            <Glass strong className="rounded-xl p-4">
              {(records.data ?? []).slice(0, 3).map((r, i) => (
                <Tap
                  key={r.id}
                  accessibilityRole="button"
                  onPress={() => {
                    // Opening their report makes them the person being viewed,
                    // so Ask and everything else follow the record.
                    void switchMember(member.id);
                    router.push(`/records/${r.id}`);
                  }}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: "rgba(15,16,48,0.06)" }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
                    <FileText size={16} color={brand[600]} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{r.title}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>{formatEventDate(r.eventDate)}{r.facility ? ` · ${r.facility}` : ""}</Text>
                  </View>
                  <ChevronRight size={16} color={ink[300]} />
                </Tap>
              ))}
              {records.data && records.data.length === 0 ? (
                <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginBottom: 4 }}>
                  Nothing filed yet. Add old reports and I&apos;ll read them for {member.isPrimary ? "you" : firstName(member.name)}.
                </Text>
              ) : null}
              {records.data && records.data.length > 3 ? (
                <Tap
                  accessibilityRole="button"
                  onPress={() => {
                    void switchMember(member.id);
                    router.push("/records");
                  }}
                  style={{ height: 40, justifyContent: "center" }}
                >
                  <Text style={{ fontFamily: font.semibold, fontSize: 15, color: brand[700] }}>See all {records.data.length}</Text>
                </Tap>
              ) : null}
              <View style={{ marginTop: 10 }}>
                <ReportQueue items={queue} onChange={setQueue} locked={filing} />
              </View>
              {queue.some((q) => q.status !== "done") ? (
                <PillButton tone="brand" loading={filing} onPress={() => void fileReports()} icon={<Plus size={17} color="#fff" />} style={{ marginTop: 12, height: 48 }}>
                  {`File ${queue.filter((q) => q.status !== "done").length === 1 ? "1 report" : `${queue.filter((q) => q.status !== "done").length} reports`}`}
                </PillButton>
              ) : null}
            </Glass>
          </>
        ) : null}

        {/* Health basics, the same editor as when they were added. */}
        <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], marginTop: 28, marginBottom: 4 }}>Health basics</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginBottom: 14 }}>
          <Brand /> uses these when reading {member.isPrimary ? "your" : `${firstName(member.name)}'s`} reports and answering questions.
        </Text>
        <HealthEditor value={health} onChange={setHealth} age={age} name={member.isPrimary ? undefined : member.name} />

        {/* Remove. */}
        {!member.isPrimary ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setConfirm(true)}
            style={({ pressed }) => ({ marginTop: 28, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 999, backgroundColor: pressed ? hue.rose.bg : semantic.dangerBg })}
          >
            <Trash2 size={17} color={semantic.dangerText} />
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: semantic.dangerText }}>Remove {firstName(member.name)} from family</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {dirty || saved ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 12 }}>
          <PillButton tone={saved ? "light" : "brand"} loading={saving} disabled={saved} onPress={() => void save()} icon={saved ? <Check size={17} color={ink[900]} /> : undefined}>
            {saved ? "Saved" : "Save changes"}
          </PillButton>
        </View>
      ) : null}

      <ConfirmSheet
        open={confirm}
        title={`Remove ${firstName(member.name)} for good?`}
        body={`This deletes ${firstName(member.name)}'s ${member.reports === 1 ? "report" : `${member.reports} reports`}, their chats with Cheeku and their health profile. It can't be undone, so download anything you want to keep first.`}
        confirmLabel={`Remove ${firstName(member.name)}`}
        cancelLabel="Keep them"
        destructive
        onConfirm={remove}
        onClose={() => setConfirm(false)}
      />
    </KeyboardAvoidingView>
  );
}
