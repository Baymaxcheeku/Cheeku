import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddMemberSheet } from "@/components/app/add-member-sheet";
import { FamilyTray } from "@/components/app/family-tray";
import { Paywall } from "@/components/billing/paywall";
import { FamilySwitcher } from "@/components/app/family-switcher";
import { OfflineBanner } from "@/components/app/offline-banner";
import { AskHero } from "@/components/home/ask-hero";
import { BookWithCheeku } from "@/components/home/book-with-cheeku";
import { FileStrip, PriorityPill, ReadsStrip } from "@/components/home/strips";
import { knowledgeFeed } from "@/lib/knowledge/queries";
import { NotificationsBell } from "@/components/app/notifications-bell";
import { Button } from "@/components/ui/button";
import { StaggerItem } from "@/components/ui/motion";
import { allowsFamily } from "@/lib/billing/plans";
import { getEntitlement } from "@/lib/billing/quota";
import { deriveNotifications } from "@/lib/notifications/derive";
import { activeProfile, profileAccess, switchProfile } from "@/lib/profiles/context";
import { formatEventDate } from "@/lib/records/grouping";
import { EMPTY_OVERVIEW, useHealthOverview } from "@/lib/records/use-overview";
import { listProfileRecords, statsFrom } from "@/lib/records/queries";
import { brand } from "@/theme/tokens";
import { type } from "@/theme/type";

/** "Athar Ali" → "Athar". Home talks to a person, not a record. */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

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

  const knowledge = useQuery({ queryKey: ["knowledge-feed"], queryFn: () => knowledgeFeed(5) });

  const overview = useHealthOverview();

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
      {/*
       * ┌─ THE LAYOUT, REDESIGNED 2026-09-29 ──────────────────────────────────┐
       * │                                                                     │
       * │ One hero and small pointers. Ask Cheeku is the product, so it is    │
       * │ the only large, dark surface; everything else is one line tall and  │
       * │ exists to send the reader somewhere else.                           │
       * │                                                                     │
       * │   who  →  greeting, family switcher                                 │
       * │   now  →  priority pill (how the file reads)                        │
       * │   ask  →  Ask Cheeku, with the memory count                         │
       * │   next →  Book with Cheeku (coming soon, honest about it)           │
       * │   more →  reads as pills, the health file as one row                │
       * │                                                                     │
       * └─────────────────────────────────────────────────────────────────────┘
       */}
      <StaggerItem index={0}>
        <View className="flex-row items-center gap-3 px-5">
          <View className="min-w-0 flex-1">
            <Text style={[type.caption, { fontSize: 13 }]}>{greeting()}</Text>
            <Text style={[type.title, { fontSize: 26, lineHeight: 31 }]} numberOfLines={1}>
              {profile.isPrimary ? firstName(profile.name) : `${firstName(profile.name)}'s health`}
            </Text>
          </View>
          <NotificationsBell notifications={deriveNotifications(list)} />
        </View>
      </StaggerItem>

      <OfflineBanner updatedAt={context.dataUpdatedAt} />

      <StaggerItem index={1}>
        <View className="mt-4">
          {/* Only what the plan can open, plus a count of what it cannot. */}
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
      </StaggerItem>

      <StaggerItem index={2}>
        <PriorityPill
          total={stats.total}
          needsReview={needsReview}
          topRecordId={list.find((r) => r.severity !== "normal")?.id}
          latest={newest ? formatEventDate(newest.eventDate) : undefined}
        />
      </StaggerItem>

      <StaggerItem index={3}>
        <AskHero name={firstName(profile.name)} isSelf={profile.isPrimary} remembered={stats.total} />
      </StaggerItem>

      <StaggerItem index={4}>
        <BookWithCheeku />
      </StaggerItem>

      <StaggerItem index={5}>
        <ReadsStrip articles={knowledge.data ?? []} />
        <FileStrip overview={overview.data ?? EMPTY_OVERVIEW} />
      </StaggerItem>

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
        Cheeku needs someone to keep records for before it can show you anything.
      </Text>
      <View className="mt-5">
        <Button onPress={() => router.push("/profile")}>
          <Text className="text-[16px] font-bold text-white">Create a profile</Text>
        </Button>
      </View>
    </View>
  );
}
