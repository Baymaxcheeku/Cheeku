import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "expo-router";
import {
  CalendarDays,
  ChevronRight,
  FileText,
  HeartPulse,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react-native";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddMemberSheet } from "@/components/app/add-member-sheet";
import { FamilyTray } from "@/components/app/family-tray";
import { Paywall } from "@/components/billing/paywall";
import { FamilySwitcher } from "@/components/app/family-switcher";
import { OfflineBanner } from "@/components/app/offline-banner";
import { HealthFile } from "@/components/health/health-file";
import { KnowledgeRail } from "@/components/knowledge/knowledge-rail";
import { knowledgeFeed } from "@/lib/knowledge/queries";
import { HomeAskBox } from "@/components/app/home-ask-box";
import { NotificationsBell } from "@/components/app/notifications-bell";
import { RecordRow } from "@/components/records/chrome";
import { Button } from "@/components/ui/button";
import { allowsFamily } from "@/lib/billing/plans";
import { getEntitlement } from "@/lib/billing/quota";
import { deriveNotifications } from "@/lib/notifications/derive";
import { activeProfile, profileAccess, switchProfile } from "@/lib/profiles/context";
import { formatEventDate } from "@/lib/records/grouping";
import { healthOverview, type HealthOverview } from "@/lib/records/overview";
import { listProfileRecords, statsFrom } from "@/lib/records/queries";
import { brand, ink, semantic, shadow, surface } from "@/theme/tokens";

/** Deliberately time-of-day aware, like the frame. */
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * B1 — the daily loop's front door.
 *
 * Everything on this screen is scoped to the active family member. That is the
 * visible half of rule 3: switching to Amma must change the greeting, the
 * counts, the insight and the recent records TOGETHER, or the screen is telling
 * the reader something untrue about whose health they are looking at.
 *
 * Which is why the records query is keyed on the profile id and the switch
 * invalidates it, rather than each piece fetching on its own schedule — a
 * half-switched screen is worse than a slow one.
 */
export default function Home() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const knowledge = useQuery({ queryKey: ["knowledge-feed"], queryFn: () => knowledgeFeed(3) });

  const overview = useQuery({
    queryKey: ["health-overview"],
    queryFn: async () => {
      const active = await activeProfile();
      return healthOverview(active?.id ?? null);
    },
  });

  const context = useQuery({
    queryKey: ["home-context"],
    queryFn: async () => {
      const [access, profile, entitlement] = await Promise.all([
        profileAccess(),
        activeProfile(),
        getEntitlement(),
      ]);
      return { access, profile, entitlement };
    },
  });

  const profileId = context.data?.profile?.id;

  const records = useQuery({
    queryKey: ["records", profileId],
    // `enabled` rather than a default id: querying with no profile would return
    // the whole account's documents, which is exactly the widening this screen
    // exists to prevent.
    enabled: Boolean(profileId),
    queryFn: () => listProfileRecords(profileId as string),
  });

  async function onSelectProfile(id: string) {
    const ok = await switchProfile(id);
    if (!ok) return;
    // Both, together. Invalidating only the records would leave the greeting
    // naming the previous member above their sibling's results.
    await queryClient.invalidateQueries({ queryKey: ["home-context"] });
    await queryClient.invalidateQueries({ queryKey: ["records"] });
  }

  if (context.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={brand[600]} />
      </View>
    );
  }

  /*
   * A failed fetch is NOT an empty account.
   *
   * Both end up with no data in hand, and collapsing them would tell someone
   * whose connection dropped that they have no profile — inviting them to
   * create a second one on top of the family they already have. The two states
   * say different things and offer different actions.
   */
  if (context.isError) {
    return <LoadFailed topInset={insets.top} onRetry={() => void context.refetch()} />;
  }

  // Narrowed once, here, rather than re-checked at each use.
  const data = context.data;
  const profile = data?.profile;

  if (!data || !profile) {
    return <NoProfile topInset={insets.top} />;
  }

  const list = records.data ?? [];
  const stats = statsFrom(list);
  const needsReview = stats.borderline + stats.highRisk;
  const newest = list[0];
  const access = data.access;

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 16 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={records.isFetching && !records.isPending}
          onRefresh={() => {
            void queryClient.invalidateQueries({ queryKey: ["home-context"] });
            void queryClient.invalidateQueries({ queryKey: ["records"] });
          }}
          tintColor={brand[600]}
        />
      }
    >
      <View className="flex-row items-start gap-3 px-5">
        <View className="min-w-0 flex-1">
          <Text className="text-[20px] leading-tight text-ink-900">{greeting()},</Text>
          <Text
            className="text-[28px] font-bold leading-tight tracking-tight text-brand-600"
            numberOfLines={1}
          >
            {profile.name} 👋
          </Text>
          <Text className="mt-1 text-[14px] text-ink-500">
            Clarity and calm, for every health question.
          </Text>
        </View>
        <NotificationsBell notifications={deriveNotifications(list)} />
      </View>

      <OfflineBanner updatedAt={context.dataUpdatedAt} />

      <View className="mt-5">
        <Text className="px-5 text-[12px] font-bold uppercase tracking-wide text-ink-300">
          Family
        </Text>
        <View className="mt-1.5">
          {/* Only what the plan can open, plus a count of what it cannot — the
              switcher draws padlocks for the rest rather than faces it would
              refuse to switch to. */}
          <FamilySwitcher
            profiles={access.selectable}
            activeId={profile.id}
            tier={data.entitlement.tier}
            lockedCount={access.lockedCount}
            onSelect={onSelectProfile}
            onUpgrade={() => setPaywallOpen(true)}
            onViewAll={() => setTrayOpen(true)}
          />
        </View>
      </View>

      <InsightRow
        total={stats.total}
        needsReview={needsReview}
        topRecordId={list.find((r) => r.severity !== "normal")?.id}
        latest={
          newest
            ? {
                date: formatEventDate(newest.eventDate),
                facility: newest.facility,
              }
            : undefined
        }
      />

      {/*
       * Ask Baymax above Health Summary and given the mascot's own breathing
       * room: for the anxious or pregnant reader this card is the reason they
       * opened the app, not a footnote below a stats row.
       */}
      <HomeAskBox />

      <KnowledgeRail articles={knowledge.data ?? []} />

      <HealthFile overview={overview.data ?? EMPTY_OVERVIEW} />

      <FamilyTray
        open={trayOpen}
        onClose={() => setTrayOpen(false)}
        profiles={access.selectable}
        lockedCount={access.lockedCount}
        activeId={profile.id}
        canAdd={allowsFamily(data.entitlement.tier)}
        onSelect={(id) => void onSelectProfile(id)}
        onAdd={() => setAddOpen(true)}
        onUpgrade={() => setPaywallOpen(true)}
      />

      <AddMemberSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => {
          setAddOpen(false);
          void queryClient.invalidateQueries();
        }}
        onUpgrade={() => setPaywallOpen(true)}
      />

      <Paywall
        open={paywallOpen}
        reason="family"
        onClose={() => setPaywallOpen(false)}
        onActivated={() => {
          setPaywallOpen(false);
          // The switcher's locked count and the greeting both derive from the
          // entitlement, so the whole context is refetched rather than patched.
          void queryClient.invalidateQueries({ queryKey: ["home-context"] });
          void queryClient.invalidateQueries({ queryKey: ["entitlement"] });
        }}
      />
    </ScrollView>
  );
}


/**
 * The fetch failed. Deliberately says nothing about whether records exist.
 *
 * No health data has been read at this point, so the copy stays about the
 * connection — speculating ("your records may be out of date") in a state where
 * the app knows nothing is how a medical app frightens someone for no reason.
 */
function LoadFailed({ topInset, onRetry }: { topInset: number; onRetry: () => void }) {
  return (
    <View className="flex-1 justify-center bg-canvas px-8" style={{ paddingTop: topInset }}>
      <Text className="text-center text-[20px] font-bold text-ink-900">
        Could not load your records
      </Text>
      <Text className="mt-2 text-center text-[14px] leading-[20px] text-ink-500">
        Check your connection and try again. Nothing has been changed.
      </Text>
      <View className="mt-5">
        <Button onPress={onRetry}>
          <Text className="text-[16px] font-bold text-white">Try again</Text>
        </Button>
      </View>
    </View>
  );
}

/** The account exists but has no profile yet — the one dead end onboarding can leave. */
function NoProfile({ topInset }: { topInset: number }) {
  const router = useRouter();
  return (
    <View className="flex-1 justify-center bg-canvas px-8" style={{ paddingTop: topInset }}>
      <Text className="text-center text-[22px] font-bold text-ink-900">Set up a profile first</Text>
      <Text className="mt-2 text-center text-[14px] leading-[20px] text-ink-500">
        Baymax needs someone to keep records for before it can show you anything.
      </Text>
      <View className="mt-5">
        <Button onPress={() => router.push("/profile")}>
          <Text className="text-[16px] font-bold text-white">Create a profile</Text>
        </Button>
      </View>
    </View>
  );
}

/*
 * ONE insight, in the frame's shape: eyebrow, headline, a detail line.
 *
 * The frame's CONTENT is an appointment reminder ("Time for your thyroid
 * checkup, 15 May, Fortis Hospital"). Scheduling does not exist in V1, and
 * inventing a due date for a medical test is a fabricated clinical prompt —
 * exactly what rule 4 forbids. So the row keeps the frame's shape and fills it
 * with what the records genuinely say.
 *
 * A single tappable row rather than a card with its own headline, body and
 * button: this is a pointer to something else in the app, not a destination,
 * and the full-height version competed with Ask Baymax for the first thing the
 * eye landed on.
 */
function InsightRow({
  total,
  needsReview,
  topRecordId,
  latest,
}: {
  total: number;
  needsReview: number;
  topRecordId?: string;
  latest?: { date: string; facility: string | null };
}) {
  const router = useRouter();

  const content =
    total === 0
      ? {
          eyebrow: "Get started",
          title: "Add your first record",
          meta: "Upload a report and Baymax will organise it for you.",
          href: "/scan",
          icon: FileText,
          fg: brand[600],
          bg: brand[50],
        }
      : needsReview === 0
        ? {
            eyebrow: "All clear",
            title: "Everything is in range",
            meta: `${total} record${total === 1 ? "" : "s"} reviewed`,
            href: "/records",
            icon: ShieldCheck,
            fg: semantic.safe,
            bg: semantic.safeBg,
          }
        : {
            eyebrow: "Worth a look",
            title: `${needsReview} record${needsReview === 1 ? "" : "s"} to review`,
            meta: latest
              ? `${latest.date}${latest.facility ? ` · ${latest.facility}` : ""}`
              : undefined,
            href: topRecordId ? `/records/${topRecordId}` : "/records",
            icon: HeartPulse,
            fg: semantic.danger,
            bg: semantic.dangerBg,
          };

  const Icon = content.icon;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${content.eyebrow}. ${content.title}`}
      onPress={() => router.push(content.href as never)}
      className="mx-5 mt-3 flex-row items-center gap-3 rounded-tile bg-surface px-3.5 py-3"
      style={shadow.e1}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-pill"
        style={{ backgroundColor: content.bg }}
      >
        <Icon size={18} color={content.fg} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[10px] font-bold uppercase tracking-wide text-ink-300">
          {content.eyebrow}
        </Text>
        <Text className="text-[14px] font-bold leading-tight text-ink-900" numberOfLines={1}>
          {content.title}
        </Text>
        {content.meta ? (
          <View className="mt-0.5 flex-row items-center gap-1">
            <CalendarDays size={11} color={ink[500]} />
            <Text className="flex-1 text-[11.5px] text-ink-500" numberOfLines={1}>
              {content.meta}
            </Text>
          </View>
        ) : null}
      </View>
      <ChevronRight size={17} color={ink[300]} />
    </Pressable>
  );
}


/*
 * Shown while the overview is still loading. An empty file renders the
 * "add your first report" state, which is the right thing to show for one
 * frame — a spinner where a card will be makes the whole screen jump.
 */
const EMPTY_OVERVIEW: HealthOverview = {
  byType: [],
  totalDocuments: 0,
  needsReview: 0,
  dataPoints: 0,
  flagged: [],
  medications: [],
  vaccinations: 0,
  facilities: [],
  doctors: [],
  lastEvent: null,
};
