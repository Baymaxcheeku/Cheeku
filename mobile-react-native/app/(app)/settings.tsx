import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Crown,
  Download,
  Globe,
  HeartPulse,
  Info,
  Lock,
  LogOut,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";

import {
  ActivityIndicator,
  LayoutAnimation,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  deleteAccountData,
  discardExport,
  exportAccount,
  shareExport,
} from "@/lib/account/actions";
import { Avatar } from "@/components/ui/avatar";
import { AddMemberSheet } from "@/components/app/add-member-sheet";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { clearOfflineCache } from "@/lib/offline/cache";
import { Paywall } from "@/components/billing/paywall";
import { allowsFamily, planFor, seatsFor } from "@/lib/billing/plans";
import { getEntitlement } from "@/lib/billing/quota";
import {
  clearActiveProfile,
  profileAccess,
  activeProfile,
  type ActiveProfile,
} from "@/lib/profiles/context";
import { castFaces } from "@/lib/profiles/avatar";
import { listProfileRecords, statsFrom } from "@/lib/records/queries";
import { supabase } from "@/lib/supabase/client";
import { brand, ink, semantic, shadow, surface } from "@/theme/tokens";

/**
 * I1 — profile and settings.
 *
 * The two rows that matter most are export and delete. DPDP gives people a
 * right to their data and a right to have it erased; drawing those buttons and
 * wiring them to nothing would be a promise the app is breaking. Both do the
 * real thing.
 */
export default function Settings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);

  const context = useQuery({
    queryKey: ["settings-context"],
    queryFn: async () => {
      const [access, profile, entitlement] = await Promise.all([
        profileAccess(),
        activeProfile(),
        getEntitlement(),
      ]);
      const records = profile ? await listProfileRecords(profile.id) : [];
      return { access, profile, entitlement, stats: statsFrom(records) };
    },
  });

  async function signOut() {
    // The active profile is cleared with the session. Leaving it would hand the
    // next account that signs in on this device a stale selection pointing at
    // someone else's profile id.
    await clearActiveProfile();
    await supabase.auth.signOut();
    queryClient.clear();
    // The in-memory cache is not the copy that matters. `queryClient.clear()`
    // empties RAM; the records are also on disk, and a device being signed out
    // of is a device that may be about to change hands.
    await clearOfflineCache();
    router.replace("/welcome");
  }

  if (context.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={brand[600]} />
      </View>
    );
  }

  const data = context.data;
  if (!data?.profile) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-10">
        <Text className="text-center text-[15px] text-ink-500">Set up a profile first.</Text>
      </View>
    );
  }

  const { profile, entitlement, access, stats } = data;
  const plan = planFor(entitlement.tier);
  // Family is the top tier; there is nothing to sell above it.
  const canUpgrade = entitlement.tier !== "family";

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/*
       * No page title and no mascot above the identity card. The tab bar
       * already names this screen, and a decorative portrait directly above a
       * card showing the reader's own face is two portraits stacked.
       */}
      <View className="mx-5 rounded-card bg-surface p-4" style={shadow.e1}>
        <View className="flex-row items-center gap-3.5">
          <Avatar svg={profile.avatar} background={profile.avatarBackground ?? undefined} size={64} />
          <View className="min-w-0 flex-1">
            <Text className="text-[19px] font-bold text-ink-900" numberOfLines={1}>
              {profile.name}
            </Text>
            <Text className="text-[12.5px] text-ink-500">
              {profile.isPrimary ? "Primary profile" : (profile.relationship ?? "Family member")}
            </Text>
            <Text className="mt-0.5 text-[12px] text-ink-300">
              {stats.total} {stats.total === 1 ? "document" : "documents"}
            </Text>
          </View>
        </View>

        {/*
         * The plan card is the upgrade entry point for people who came looking
         * for one, rather than hitting a wall. On the Family plan there is
         * nothing above it to sell, so it stops being a button and just states
         * the fact — an "Upgrade" chevron on the top tier is a dead end that
         * makes the reader wonder what they are missing.
         */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${plan.name}. Opens your subscription`}
          onPress={() => router.push("/settings/subscription")}
          className="mt-3.5 flex-row items-center gap-3 rounded-tile bg-brand-50 p-3"
        >
          <View className="h-9 w-9 items-center justify-center rounded-pill bg-surface">
            <Crown size={17} color={brand[600]} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-[13.5px] font-bold text-ink-900">{plan.name}</Text>
            <Text className="text-[11.5px] text-ink-500">
              {entitlement.chatsRemaining === null
                ? "Unlimited Ask Cheeku"
                : `${entitlement.chatsRemaining} of ${entitlement.limit} chats left this month`}
            </Text>
          </View>
          {/*
           * "Manage" on a paid plan, "Upgrade" on free. Both go to the same
           * screen: someone on Family still needs a way to cancel, and a card
           * that only ever says Upgrade has nothing to offer them.
           */}
          <View className="flex-row items-center gap-1">
            <Text className="text-[12.5px] font-semibold text-brand-600">
              {canUpgrade ? "Upgrade" : "Manage"}
            </Text>
            <ChevronRight size={15} color={brand[600]} />
          </View>
        </Pressable>
      </View>

      {/*
       * Family before the settings list: someone looking for "where are my
       * people" should find them before scrolling past seven preference rows.
       */}
      <FamilySection
        profiles={access.all}
        activeId={profile.id}
        seats={seatsFor(entitlement.tier)}
        canAdd={allowsFamily(entitlement.tier)}
        onUpgrade={() => setPaywallOpen(true)}
        onAddMember={() => setAddOpen(true)}
      />

      {/*
       * Three named groups rather than one long list.
       *
       * Colour-coding the rows would scan faster still, but green/amber/red
       * carry health meaning everywhere else in this app and a red icon beside
       * "Notifications" would read as a warning about the reader's health. The
       * grouping does the work the colour is not allowed to.
       */}
      <Group label="Account">
        <Row icon={UserCog} title="Personal information" body="Name, date of birth and contact" href="/settings/personal" />
        <Row icon={HeartPulse} title="Health profile" body="Conditions, allergies and medicines" href="/settings/health" />
        <Row icon={ShieldCheck} title="Security & privacy" body="Password, privacy and permissions" href="/settings/security" />
        <Row icon={Crown} title="Subscription" body="Your plan, seats and billing" href="/settings/subscription" />
      </Group>

      <Group label="Preferences">
        <Row icon={Bell} title="Notifications" body="Alerts and reminders" href="/settings/notifications" />
        <Row icon={Globe} title="Language" body="English" href="/settings/language" />
      </Group>

      <Group label="Support">
        <Row icon={CircleHelp} title="Help & support" body="Guides, FAQs and reporting an issue" href="/settings/help" />
        <Row icon={Info} title="About Cheeku AI" body="Version and information" href="/settings/about" />
      </Group>

      <AccountData onDeleted={signOut} />

      <View className="mx-5 mt-6 overflow-hidden rounded-card bg-surface" style={shadow.e1}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setSignOutOpen(true)}
          className="flex-row items-center gap-3.5 px-3.5 py-3.5"
        >
          <View className="h-9 w-9 items-center justify-center rounded-tile bg-canvas">
            <LogOut size={17} color={ink[500]} />
          </View>
          <Text className="flex-1 text-[14.5px] font-semibold text-ink-900">Sign out</Text>
        </Pressable>
      </View>

      {/*
       * Plain text in the page margin, not a tinted card. As a card it was the
       * eighth container in a row of eight and read as another thing to act on;
       * this is a footnote, and footnotes look like footnotes.
       */}
      <ConfirmSheet
        open={signOutOpen}
        title="Sign out?"
        body="Your records stay safe on the server and come back the moment you sign in. Anything saved on this device for offline reading is cleared."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        onConfirm={signOut}
        onClose={() => setSignOutOpen(false)}
      />

      <AddMemberSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => {
          setAddOpen(false);
          // The roster, the seat count and the home switcher all derive from
          // the profile list, so everything is refetched rather than patched.
          void queryClient.invalidateQueries();
        }}
        onUpgrade={() => setPaywallOpen(true)}
      />

      <Paywall
        open={paywallOpen}
        reason="upgrade"
        onClose={() => setPaywallOpen(false)}
        onActivated={() => {
          setPaywallOpen(false);
          // Seats, the locked rows and the chat allowance all read from the
          // entitlement, so the whole screen is refetched rather than patched.
          void queryClient.invalidateQueries({ queryKey: ["settings-context"] });
          void queryClient.invalidateQueries({ queryKey: ["entitlement"] });
        }}
      />

      <View className="mx-5 mt-6 flex-row items-start gap-2">
        <ShieldCheck size={14} color={ink[300]} style={{ marginTop: 2 }} />
        <Text className="flex-1 text-[11.5px] leading-[17px] text-ink-300">
          Cheeku never sells your data and never shares it outside your family. It gives helpful
          information, not medical advice.
        </Text>
      </View>
    </ScrollView>
  );
}

/**
 * The family roster.
 *
 * Locked members are drawn as padlocked slots WITHOUT their name or face. The
 * reader knows who they are; the point of the lock is that the plan does not
 * reach them, and rendering a real member's identity as bait for an upgrade
 * would be using their data to sell against them.
 */
function FamilySection({
  profiles,
  activeId,
  seats,
  canAdd,
  onUpgrade,
  onAddMember,
}: {
  profiles: readonly ActiveProfile[];
  activeId: string;
  seats: number;
  canAdd: boolean;
  onUpgrade: () => void;
  onAddMember: () => void;
}) {
  const reachable = profiles.slice(0, seats);
  const lockedCount = Math.max(0, profiles.length - reachable.length);
  // Clamped: a downgrade leaves more profiles than seats, and "-2 seats free"
  // is a number nobody should ever be shown.
  const free = Math.max(0, seats - profiles.length);
  const lockedFaces = castFaces(4);

  /*
   * COLLAPSED BY DEFAULT once there is more than one member.
   *
   * At full height this was six rows plus an add row, so a family of four
   * pushed Account, Preferences and Support entirely below the fold — the
   * settings screen became a family screen with settings underneath it. The
   * summary row carries the same facts (who is active, how many people, how
   * many seats) in one line, and the roster is one tap away.
   *
   * A single-member account expands, because a collapsed list of one is a
   * disclosure triangle hiding nothing.
   */
  const [open, setOpen] = useState(profiles.length <= 1);
  const active = profiles.find((p) => p.id === activeId);

  return (
    <View className="mt-6">
      <Text className="px-5 text-[12px] font-bold uppercase tracking-wide text-ink-300">Family</Text>
      <View className="mx-5 mt-2 overflow-hidden rounded-card bg-surface" style={shadow.e1}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`Family. ${profiles.length} ${profiles.length === 1 ? "member" : "members"}. ${open ? "Collapse" : "Expand"}`}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setOpen((v) => !v);
          }}
          className="flex-row items-center gap-3 px-3.5 py-3"
        >
          <View className="flex-row">
            {/* Overlapped faces: the roster at a glance, in one row's height. */}
            {profiles.slice(0, 3).map((p, i) => (
              <View key={p.id} style={{ marginLeft: i === 0 ? 0 : -10 }}>
                <Avatar
                  svg={p.avatar}
                  background={p.avatarBackground ?? undefined}
                  size={36}
                  ring={surface.base}
                />
              </View>
            ))}
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-[14px] font-semibold text-ink-900" numberOfLines={1}>
              {active ? `Viewing ${active.name}` : "Your family"}
            </Text>
            <Text className="text-[11.5px] text-ink-500">
              {profiles.length} of {seats} {seats === 1 ? "seat" : "seats"} used
              {free > 0 ? `, ${free} free` : ""}
            </Text>
          </View>
          <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
            <ChevronDown size={18} color={ink[300]} />
          </View>
        </Pressable>
      </View>

      <View
        className="mx-5 mt-2 overflow-hidden rounded-card bg-surface"
        style={[shadow.e1, open ? undefined : { height: 0, marginTop: 0, opacity: 0 }]}
      >
        {reachable.map((p, i) => (
          <View
            key={p.id}
            className="flex-row items-center gap-3 px-3.5 py-3"
            style={i > 0 ? { borderTopWidth: 1, borderTopColor: surface.line } : undefined}
          >
            <Avatar svg={p.avatar} background={p.avatarBackground ?? undefined} size={40} />
            <View className="min-w-0 flex-1">
              <Text className="text-[14px] font-semibold text-ink-900" numberOfLines={1}>
                {p.name}
              </Text>
              <Text className="text-[11.5px] text-ink-500">
                {/* "Currently viewing" beats the relationship: on a settings
                    screen the first question is whose data is on screen. */}
                {p.id === activeId
                  ? "Currently viewing"
                  : p.isPrimary
                    ? "You"
                    : (p.relationship ?? "Family")}
              </Text>
            </View>
          </View>
        ))}

        {lockedCount > 0
          ? Array.from({ length: lockedCount }, (_, i) => (
              <Pressable
                key={`locked-${i}`}
                accessibilityRole="button"
                accessibilityLabel="Locked family member. Opens plans"
                onPress={onUpgrade}
                className="flex-row items-center gap-3 px-3.5 py-3"
                style={{ borderTopWidth: 1, borderTopColor: surface.line }}
              >
                <View className="h-10 w-10 items-center justify-center">
                  {/* A stand-in face behind a padlock — never the real
                      member's. See the note on this component. */}
                  <View style={{ opacity: 0.25, position: "absolute" }}>
                    <Avatar svg={lockedFaces[i % lockedFaces.length] ?? ""} size={40} />
                  </View>
                  <Lock size={15} color={ink[500]} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[14px] font-semibold text-ink-300">Family member</Text>
                  <Text className="text-[11.5px] text-ink-300">
                    Part of the Family plan. Their records are safe.
                  </Text>
                </View>
                <ChevronRight size={16} color={ink[300]} />
              </Pressable>
            ))
          : null}

        {/*
         * Shown only while there is room. On a full Family plan this becomes a
         * plain line rather than a button: an invitation that the database is
         * going to refuse is worse than no invitation, and there is nothing to
         * upsell to above Family.
         */}
        {canAdd && free > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a family member"
            onPress={onAddMember}
            className="flex-row items-center gap-3.5 px-3.5 py-3"
            style={{ borderTopWidth: 1, borderTopColor: surface.line }}
          >
            <View
              className="h-10 w-10 items-center justify-center rounded-pill bg-brand-50"
              style={{ borderWidth: 1, borderStyle: "dashed", borderColor: brand[200] }}
            >
              <UserPlus size={17} color={brand[600]} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[14px] font-semibold text-brand-600">Add a family member</Text>
              <Text className="text-[11.5px] text-ink-500">
                {free} of {seats} {seats === 1 ? "seat" : "seats"} free
              </Text>
            </View>
            <ChevronRight size={16} color={ink[300]} />
          </Pressable>
        ) : canAdd ? (
          <View className="px-3.5 py-3" style={{ borderTopWidth: 1, borderTopColor: surface.line }}>
            <Text className="text-[12.5px] text-ink-300">
              All {seats} seats on your plan are in use.
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Export and erasure. */
function AccountData({ onDeleted }: { onDeleted: () => void }) {
  const [busy, setBusy] = useState<null | "export" | "delete">(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  async function runExport() {
    setBusy("export");
    setMessage(null);
    try {
      const result = await exportAccount();
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      await shareExport(result.uri);
      // Removed as soon as the share sheet is done with it: the bundle is the
      // whole family's medical history in plaintext, and it has no reason to
      // outlive the export.
      discardExport(result.uri);
    } finally {
      setBusy(null);
    }
  }

  async function runDelete() {
    setBusy("delete");
    setMessage(null);
    try {
      const result = await deleteAccountData(confirmation);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setConfirmOpen(false);
      onDeleted();
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <View className="mt-6">
        <Text className="px-5 text-[12px] font-bold uppercase tracking-wide text-ink-300">
          Your data
        </Text>
        <View className="mx-5 mt-2 overflow-hidden rounded-card bg-surface" style={shadow.e1}>
          <Pressable
            accessibilityRole="button"
            disabled={busy !== null}
            onPress={() => void runExport()}
            className="flex-row items-center gap-3.5 px-3.5 py-3"
          >
            <View className="h-9 w-9 items-center justify-center rounded-tile bg-brand-50">
              {busy === "export" ? (
                <ActivityIndicator size="small" color={brand[600]} />
              ) : (
                <Download size={17} color={brand[600]} />
              )}
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[14.5px] font-semibold text-ink-900">Export my data</Text>
              <Text className="text-[11.5px] text-ink-500">
                Everything Cheeku holds, as a JSON file
              </Text>
            </View>
            <ChevronRight size={17} color={ink[300]} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={busy !== null}
            onPress={() => {
              setConfirmation("");
              setMessage(null);
              setConfirmOpen(true);
            }}
            className="flex-row items-center gap-3.5 px-3.5 py-3"
            style={{ borderTopWidth: 1, borderTopColor: surface.line }}
          >
            <View
              className="h-9 w-9 items-center justify-center rounded-tile"
              style={{ backgroundColor: semantic.dangerBg }}
            >
              <Trash2 size={17} color={semantic.danger} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[14.5px] font-semibold" style={{ color: semantic.dangerText }}>
                Delete my account
              </Text>
              <Text className="text-[11.5px] text-ink-500">
                Removes every record and file. Permanent
              </Text>
            </View>
            <ChevronRight size={17} color={ink[300]} />
          </Pressable>
        </View>

        {message ? (
          <Text accessibilityRole="alert" className="mx-5 mt-2 text-[12.5px] font-medium text-danger-text">
            {message}
          </Text>
        ) : null}
      </View>

      <Modal
        visible={confirmOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setConfirmOpen(false)}
      >
        <Pressable
          accessibilityLabel="Cancel"
          onPress={() => setConfirmOpen(false)}
          className="flex-1"
          style={{ backgroundColor: "rgba(15,16,48,0.4)" }}
        />
        <View
          className="rounded-t-sheet bg-canvas px-5 pt-4"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <Text className="text-[19px] font-bold text-ink-900">Delete your account?</Text>
          <Text className="mt-2 text-[13px] leading-[19px] text-ink-700">
            Every document, lab value, conversation and file is removed permanently. This cannot be
            undone, and Cheeku keeps no copy to restore from.
          </Text>
          <Text className="mt-3 text-[12.5px] text-ink-500">
            Export your data first if you want to keep it.
          </Text>

          <Text className="mt-4 text-[13px] font-medium text-ink-700">Type DELETE to confirm</Text>
          <TextInput
            value={confirmation}
            onChangeText={setConfirmation}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="DELETE"
            placeholderTextColor={ink[300]}
            accessibilityLabel="Type DELETE to confirm"
            className="mt-1.5 rounded-tile bg-surface px-4"
            style={{
              height: 52,
              fontSize: 15,
              color: ink[900],
              fontFamily: "Inter_400Regular",
              borderWidth: 1,
              borderColor: surface.line,
            }}
          />

          {message ? (
            <Text accessibilityRole="alert" className="mt-2 text-[12.5px] font-medium text-danger-text">
              {message}
            </Text>
          ) : null}

          <View className="mt-4 gap-2">
            <Pressable
              accessibilityRole="button"
              // Disabled until the word is right, so the destructive button
              // cannot be reached by a stray tap on a sheet that just appeared.
              disabled={confirmation.trim().toUpperCase() !== "DELETE" || busy !== null}
              onPress={() => void runDelete()}
              className="h-12 items-center justify-center rounded-pill"
              style={{
                backgroundColor: semantic.danger,
                opacity: confirmation.trim().toUpperCase() === "DELETE" && !busy ? 1 : 0.4,
              }}
            >
              {busy === "delete" ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-[15px] font-bold text-white">Delete everything</Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirmOpen(false)}
              className="h-12 items-center justify-center rounded-pill bg-surface"
              style={{ borderWidth: 1, borderColor: surface.line }}
            >
              <Text className="text-[15px] font-semibold text-ink-700">Keep my account</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mt-6">
      <Text className="px-5 text-[12px] font-bold uppercase tracking-wide text-ink-300">
        {label}
      </Text>
      <View className="mx-5 mt-2 overflow-hidden rounded-card bg-surface" style={shadow.e1}>
        {children}
      </View>
    </View>
  );
}

function Row({
  icon: Icon,
  title,
  body,
  href,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  href: string;
}) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body}`}
      onPress={() => router.push(href as never)}
      className="flex-row items-center gap-3.5 px-3.5 py-3"
      style={{ borderBottomWidth: 1, borderBottomColor: surface.line }}
    >
      <View className="h-9 w-9 items-center justify-center rounded-tile bg-brand-50">
        <Icon size={17} color={brand[600]} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[14.5px] font-semibold leading-tight text-ink-900">{title}</Text>
        <Text className="mt-0.5 text-[11.5px] text-ink-500" numberOfLines={1}>
          {body}
        </Text>
      </View>
      <ChevronRight size={17} color={ink[300]} />
    </Pressable>
  );
}
