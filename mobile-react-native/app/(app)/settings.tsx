import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  Bell,
  CalendarDays,
  FolderHeart,
  ChevronRight,
  CircleHelp,
  Crown,
  Download,
  Globe,
  HardDrive,
  HeartPulse,
  LockKeyhole,
  Info,
  LogOut,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  type LucideIcon,
  MapPin,
} from "lucide-react-native";
import { useState } from "react";

import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Pressable } from "@/components/ui/pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  deleteAccountData,
  discardExport,
  exportAccount,
  shareExport,
} from "@/lib/account/actions";
import { Tap } from "@/components/ui/tap";
import { Sheet } from "@/components/ui/sheet";
import { CheekuPeek } from "@/components/mascot/lottie";
import { Avatar } from "@/components/ui/avatar";
import { Glass, Gradient, glass, glassShadow } from "@/components/ui/glass";
import { Backdrop } from "@/components/ui/screen";
import { font } from "@/theme/type";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { logActivity } from "@/lib/privacy/activity";
import { signOutAndWipe } from "@/lib/privacy/local-data";
import { Paywall } from "@/components/billing/paywall";
import { allowsFamily, planFor, seatsFor } from "@/lib/billing/plans";
import { getEntitlement } from "@/lib/billing/quota";
import {
  assertSignedIn,
  profileAccess,
  activeProfile,
  type ActiveProfile,
} from "@/lib/profiles/context";
import { listProfileRecords, statsFrom } from "@/lib/records/queries";
import { useNearbyPlace } from "@/lib/location/live";
import { freshness } from "@/lib/location/rules";
import { refreshRoster, useFamily } from "@/lib/profiles/family";
import { brand, hue, ink, lilac, semantic, shadow, surface } from "@/theme/tokens";
import { Brand, brandify } from "@/components/ui/brand";
import { feel } from "@/lib/feel";
import { DetailSkeleton, ListSkeleton, ScreenSkeleton } from "@/components/ui/skeleton";
import { startFresh } from "@/lib/nav/start-fresh";

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
  const [signOutOpen, setSignOutOpen] = useState(false);

  const context = useQuery({
    queryKey: ["settings-context"],
    queryFn: async () => {
      await assertSignedIn();
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
    /*
     * One function for every way out (here, the lock screen, the consent
     * sheet). It removes this phone's push token while the session still
     * exists, ends the session, then wipes everything on the phone that is
     * about this person: offline records, saved addresses, appointments,
     * scheduled reminders, picked photos. See lib/privacy/local-data.ts.
     */
    await signOutAndWipe(queryClient);
    startFresh(router, "/welcome");
  }

  if (context.isPending) {
    return (
      <ScreenSkeleton header={false}>
        <DetailSkeleton hero={150} round />
        <ListSkeleton rows={5} />
      </ScreenSkeleton>
    );
  }

  const data = context.data;
  if (!data?.profile && context.isFetching) {
    // A cached "no profile" being refreshed is not an answer yet.
    return (
      <ScreenSkeleton header={false}>
        <DetailSkeleton hero={150} round />
        <ListSkeleton rows={5} />
      </ScreenSkeleton>
    );
  }
  if (!data?.profile) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-10">
        <Text className="text-center text-base text-ink-500">Set up a profile first.</Text>
      </View>
    );
  }

  const { profile, entitlement, access, stats } = data;
  const plan = planFor(entitlement.tier);
  // Family is the top tier; there is nothing to sell above it.
  const canUpgrade = entitlement.tier !== "family";

  return (
    <View className="flex-1 bg-canvas">
    <Backdrop height={460} />
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <Text accessibilityRole="header" style={{ paddingHorizontal: 20, fontFamily: font.semibold, fontSize: 28, letterSpacing: -0.8, color: ink[900] }}>
        Profile
      </Text>

      {/*
       * Who, and on what plan, in one glass card. The plan row is the upgrade
       * entry point for people who came looking for one; on Family it says
       * "Manage", because someone on the top tier still needs a way to cancel.
       */}
      {/*
       * Cheeku peeks over the top edge of the person's card, in the space
       * beside the title, every few seconds: glances about, ducks back. He
       * sits behind the card so only his head and shoulders ever show.
       */}
      <View className="mx-5 mt-4">
        <CheekuPeek size={80} moment="idle" style={{ position: "absolute", right: 22, top: -44 }} />
      <View className="overflow-hidden rounded-2xl p-4" style={glassShadow}>
        <Gradient from="#ffffff" to={lilac.base} glow="#ffffff" />
        <View className="flex-row items-center gap-3.5">
          <Avatar svg={profile.avatar} photo={profile.photo} image={profile.avatarImage} background={profile.avatarBackground ?? undefined} size={68} />
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.4, color: ink[900] }}>
              {profile.name}
            </Text>
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 2 }}>
              {profile.isPrimary ? "Primary profile" : (profile.relationship ?? "Family member")} · {stats.total}{" "}
              {stats.total === 1 ? "record" : "records"}
            </Text>
          </View>
        </View>

        <Tap
          accessibilityRole="button"
          accessibilityLabel={`${plan.name}. Opens your subscription`}
          onPress={() => router.push("/settings/subscription")}
          style={[
            glassShadow,
            {
              marginTop: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 10,
              paddingRight: 14,
              borderRadius: 24,
              backgroundColor: glass.fillStrong,
              borderWidth: 1,
              borderColor: glass.rim,
            },
          ]}
          scale={0.98}
        >
          <View className="h-10 w-10 items-center justify-center rounded-pill" style={{ backgroundColor: brand[600] }}>
            <Crown size={17} color="#fff" />
          </View>
          <View className="min-w-0 flex-1">
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{plan.name}</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>
              {entitlement.chatsRemaining === null
                ? "Unlimited Ask Cheeku"
                : `${entitlement.chatsRemaining} of ${entitlement.limit} chats left today`}
            </Text>
          </View>
          <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[600] }}>{canUpgrade ? "Upgrade" : "Manage"}</Text>
          <ChevronRight size={15} color={brand[600]} />
        </Tap>
      </View>
      </View>

      {/* Your care: the two places people come back to, as tiles. */}
      <View className="mx-5 mt-4 flex-row gap-3">
        <CareTile icon={CalendarDays} title="Appointments" line="Visits and video calls" tint={lilac.base} fg={brand[600]} href="/appointments" />
        <CareTile icon={FolderHeart} title="Health file" line="Everything filed" tint={hue.blue.bg} fg={hue.blue.fg} href="/health-file" />
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
        onOpen={() => router.push("/family")}
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
        <LocationRow />
        <Row icon={ShieldCheck} title="Security" body="App lock, password and sign-ins" href="/settings/security" />
        <Row icon={LockKeyhole} title="Privacy & consent" body="Your choices, documents and rights" href="/settings/privacy" />
        <Row icon={Crown} title="Subscription" body="Your plan, seats and billing" href="/settings/subscription" />
      </Group>

      <Group label="Preferences">
        {/* The settings, not the inbox: the inbox has the bell on Home, and a link at the foot of this page. */}
        <Row icon={Bell} title="Notifications" body="Reminders, nudges and alerts" href="/settings/notifications" />
        <Row icon={Globe} title="Language" body="English" href="/settings/language" />
        <Row icon={HardDrive} title="Storage & cache" body="Offline copies and what's on this phone" href="/settings/storage" />
      </Group>

      <Group label="Support">
        <Row icon={CircleHelp} title="Help & support" body="Guides, FAQs and reporting an issue" href="/settings/help" />
        <Row icon={Info} title="About Cheeku AI" body="Version and information" href="/settings/about" />
      </Group>

      <AccountData onDeleted={signOut} />

      <Glass strong className="mx-5 mt-6 overflow-hidden rounded-xl">
        <Tap
          accessibilityRole="button"
          onPress={() => setSignOutOpen(true)}
          className="flex-row items-center gap-3.5 px-4 py-3.5"
        >
          <View className="h-10 w-10 items-center justify-center rounded-md" style={{ backgroundColor: surface.canvas }}>
            <LogOut size={18} color={ink[500]} />
          </View>
          <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>Sign out</Text>
        </Tap>
      </Glass>

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

      <Paywall
        open={paywallOpen}
        reason="upgrade"
        onClose={() => setPaywallOpen(false)}
        onActivated={() => {
          setPaywallOpen(false);
          // Seats, the locked rows and the chat allowance all read from the
          // entitlement, so the whole screen is refetched rather than patched.
          refreshRoster(queryClient);
        }}
      />

      <View className="mx-5 mt-6 flex-row items-start gap-2">
        <ShieldCheck size={14} color={ink[300]} style={{ marginTop: 2 }} />
        <Text className="flex-1 text-xs leading-[17px] text-ink-300">
          <Brand /> never sells your data or uses it for ads. It gives helpful
          information, not medical advice.
        </Text>
      </View>
    </ScrollView>
    </View>
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
  onOpen,
}: {
  profiles: readonly ActiveProfile[];
  activeId: string;
  seats: number;
  canAdd: boolean;
  onOpen: () => void;
}) {
  const reachable = profiles.slice(0, seats);
  const paused = Math.max(0, profiles.length - reachable.length);
  const active = profiles.find((p) => p.id === activeId);

  /*
   * One card, one tap into Manage family. The roster, faces, seats, adding
   * and removing all live there now; this only has to say who is being viewed
   * and how full the plan is. On Free and Solo it is the way into Family.
   */
  return (
    <View className="mt-6">
      <Text style={{ paddingHorizontal: 20, fontFamily: font.semibold, fontSize: 15, color: ink[700] }}>Family</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={canAdd ? "Manage family" : "Add your family with the Family plan"}
        onPress={onOpen}
        style={({ pressed }) => [
          glassShadow,
          {
            marginHorizontal: 20,
            marginTop: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            padding: 14,
            borderRadius: 24,
            backgroundColor: pressed ? "#ffffff" : glass.fillStrong,
            borderWidth: 1,
            borderColor: glass.rim,
          },
        ]}
      >
        <View className="flex-row">
          {reachable.slice(0, 3).map((p, i) => (
            <View key={p.id} style={{ marginLeft: i === 0 ? 0 : -10 }}>
              <Avatar svg={p.avatar} photo={p.photo} image={p.avatarImage} background={p.avatarBackground ?? undefined} size={38} ring={surface.base} />
            </View>
          ))}
          {!canAdd ? (
            <View style={{ marginLeft: -10, width: 38, height: 38, borderRadius: 999, borderWidth: 2, borderColor: "#fff", backgroundColor: brand[600], alignItems: "center", justifyContent: "center" }}>
              <UserPlus size={15} color="#fff" />
            </View>
          ) : null}
        </View>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>
            {canAdd ? (active ? `Viewing ${active.name.split(" ")[0]}` : "Your family") : "Add your family"}
          </Text>
          <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>
            {canAdd
              ? `${reachable.length} of ${seats} seats used`
              : paused > 0
                ? `${paused} paused · Family opens them again`
                : "Up to 4 people with the Family plan"}
          </Text>
        </View>
        <ChevronRight size={18} color={ink[300]} />
      </Pressable>
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
      void logActivity("data_exported");
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
    feel.thud();
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
        <Text className="px-5 text-xs font-bold uppercase tracking-wide text-ink-300">
          Your data
        </Text>
        <View className="mx-5 mt-2 overflow-hidden rounded-card bg-surface" style={shadow.e1}>
          <Tap
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
              <Text className="text-base font-semibold text-ink-900">Export my data</Text>
              <Text className="text-xs text-ink-500">
                Everything <Brand /> holds, as a JSON file
              </Text>
            </View>
            <ChevronRight size={17} color={ink[300]} />
          </Tap>

          <Tap
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
              <Text className="text-base font-semibold" style={{ color: semantic.dangerText }}>
                Delete my account
              </Text>
              <Text className="text-xs text-ink-500">
                Removes every record and file. Permanent
              </Text>
            </View>
            <ChevronRight size={17} color={ink[300]} />
          </Tap>
        </View>

        {message ? (
          <Text accessibilityRole="alert" className="mx-5 mt-2 text-sm font-medium text-danger-text">
            {message}
          </Text>
        ) : null}
      </View>

      <Sheet open={confirmOpen} onClose={() => setConfirmOpen(false)} label="Cancel">
        <View
          className="rounded-t-sheet bg-canvas px-5 pt-4"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <Text className="text-xl font-bold text-ink-900">Delete your account?</Text>
          <Text className="mt-2 text-sm leading-[19px] text-ink-700">
            Every document, lab value, conversation and file is removed permanently, and so is your
            sign-in. This cannot be undone, and <Brand /> keeps no copy to restore from.
          </Text>
          <Text className="mt-3 text-sm text-ink-500">
            Export your data first if you want to keep it.
          </Text>

          <Text className="mt-4 text-sm font-medium text-ink-700">Type DELETE to confirm</Text>
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
            <Text accessibilityRole="alert" className="mt-2 text-sm font-medium text-danger-text">
              {message}
            </Text>
          ) : null}

          <View className="mt-4 gap-2">
            <Tap
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
                <Text className="text-base font-bold text-white">Delete everything</Text>
              )}
            </Tap>
            <Tap
              accessibilityRole="button"
              onPress={() => setConfirmOpen(false)}
              className="h-12 items-center justify-center rounded-pill bg-surface"
              style={{ borderWidth: 1, borderColor: surface.line }}
            >
              <Text className="text-base font-semibold text-ink-700">Keep my account</Text>
            </Tap>
          </View>
        </View>
      </Sheet>
    </>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mt-6">
      <Text style={{ paddingHorizontal: 20, fontFamily: font.semibold, fontSize: 15, color: ink[700] }}>{label}</Text>
      <Glass strong className="mx-5 mt-2.5 overflow-hidden rounded-xl">
        {children}
      </Glass>
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
    <Tap
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body}`}
      onPress={() => router.push(href as never)}
      className="flex-row items-center gap-3.5 px-4 py-3.5"
      style={{ borderBottomWidth: 1, borderBottomColor: "rgba(15,16,48,0.05)" }}
    >
      <View className="h-10 w-10 items-center justify-center rounded-md" style={{ backgroundColor: brand[50] }}>
        <Icon size={18} color={brand[600]} strokeWidth={1.9} />
      </View>
      <View className="min-w-0 flex-1">
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{brandify(title)}</Text>
        <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>
          {body}
        </Text>
      </View>
      <ChevronRight size={17} color={ink[300]} />
    </Tap>
  );
}

/** Location, with the live place in the line so Profile shows it at a glance. */
function LocationRow() {
  const near = useNearbyPlace(useFamily().data?.access.all.find((m) => m.isPrimary)?.id);
  const body = near.place ? `${near.place.label} · ${freshness(near.updatedAt)}` : near.locating ? "Finding you" : "Not set: tap to share or pick a place";
  return <Row icon={MapPin} title="Location" body={body} href="/settings/location" />;
}

/** A quick tile for the places people return to. */
function CareTile({
  icon: Icon,
  title,
  line,
  tint,
  fg,
  href,
}: {
  icon: LucideIcon;
  title: string;
  line: string;
  tint: string;
  fg: string;
  href: string;
}) {
  const router = useRouter();
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${line}`}
      onPress={() => router.push(href as never)}
      style={{ flex: 1 }}
    >
      <View className="overflow-hidden rounded-xl p-3.5" style={glassShadow}>
        <Gradient from={tint} to="#ffffff" />
        <View className="h-11 w-11 items-center justify-center rounded-lg bg-white">
          <Icon size={20} color={fg} strokeWidth={1.8} />
        </View>
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900], marginTop: 12 }}>{title}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>{line}</Text>
      </View>
    </Tap>
  );
}
