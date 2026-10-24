import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HomeSkeleton } from "@/components/ui/skeleton";
import { FamilyTray, FamilyUpsellSheet } from "@/components/family/tray";
import { SwitchPulse } from "@/components/family/switch-pulse";
import { Paywall } from "@/components/billing/paywall";
import { OfflineBanner } from "@/components/app/offline-banner";
import { AskBar, CheekuCard, HomeHeadline, ProfileChip, firstName } from "@/components/home/ask-hero";
import { CareSection } from "@/components/home/care";
import { AskRow, DueThisWeek, FamilyAlertCard, LockedPreview, PlanPreview, ProgressStrip, StepCard, TodayHeadline, UnlockCard, UnlockMoment } from "@/components/home/today";
import { AppointmentCard } from "@/components/booking/appointment-card";
import { isUpcoming, startsAt, useAppointmentList } from "@/lib/booking/appointments";
import { FileCard, ReadsStrip } from "@/components/home/strips";
import { MascotFigure } from "@/components/illustrations/sprout";
import { Gradient } from "@/components/ui/glass";
import { knowledgeFeed } from "@/lib/knowledge/queries";
import { NotificationsBell } from "@/components/app/notifications-bell";
import { Button } from "@/components/ui/button";
import { StaggerItem } from "@/components/ui/motion";
import { seatsFor } from "@/lib/billing/plans";
import { familyMode, prefetchMembers, refreshRoster, useFamily, useSwitchMember } from "@/lib/profiles/family";
import { useHealthFile } from "@/lib/health/queries";
import { listProfileRecords, statsFrom } from "@/lib/records/queries";
import { milestoneFor } from "@/lib/home/content";
import { logStep, markUnlockSeen, recheckHomeStage, unlogStep, useHomeStage, useTodayLog } from "@/lib/home/stage";
import type { PlanTask } from "@/lib/home/plan";
import { dueRows, familyAlerts, pillarsThisWeek, routeFor, streakOf, weekOf, type DueRow } from "@/lib/home/today";
import { usePlan } from "@/lib/home/use-plan";
import { todayIso } from "@/lib/memory/clock";
import type { DueItem } from "@/lib/home/rules";
import type { TodayAction } from "@/lib/home/today";
import type { ActiveProfile } from "@/lib/profiles/context";
import { brand, lilac, surface } from "@/theme/tokens";
import { Brand } from "@/components/ui/brand";
import { feel } from "@/lib/feel";

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
  const router = useRouter();
  const appointments = useAppointmentList();
  // The next one only. A list of appointments on Home would be a second
  // Appointments screen; one card is a reminder.
  const next = appointments.items
    .filter((a) => isUpcoming(a))
    .sort((a, b) => startsAt(a).getTime() - startsAt(b).getTime())[0];
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);
  const [upsellOpen, setUpsellOpen] = useState(false);

  // The family, from the one query every screen shares (lib/profiles/family).
  const context = useFamily();
  const switchMember = useSwitchMember();

  const profileId = context.data?.profile?.id;

  /*
   * WHICH HOME. Starter and building ask for the latest record; Today is the
   * daily plan. The server decides (migration 0033) and the phone remembers
   * its last answer, so a returning family lands on the right one with no
   * flash. Re-checked whenever Home comes back into view while still locked,
   * which is the moment after a first upload.
   */
  const home = useHomeStage();
  const stage = home.stage;
  const onToday = stage === "today";
  const { refetch: recheck } = home;
  useFocusEffect(
    useCallback(() => {
      if (stage && stage !== "today") void recheck();
    }, [stage, recheck]),
  );
  const log = useTodayLog(onToday);
  const [celebrating, setCelebrating] = useState<PlanTask | null>(null);
  useEffect(() => setCelebrating(null), [profileId]);

  // Both follow the member: "for you" depends on whose profile is in view,
  // and the file is theirs.
  const knowledge = useQuery({ queryKey: ["knowledge-feed", profileId], queryFn: () => knowledgeFeed(profileId, 8), enabled: Boolean(profileId), placeholderData: (prev) => prev });
  const file = useHealthFile(profileId);

  const records = useQuery({
    queryKey: ["records", profileId],
    // `enabled` rather than a default id: querying with no profile would return
    // the whole account's documents, which is exactly the widening this screen
    // exists to prevent.
    enabled: Boolean(profileId),
    queryFn: () => listProfileRecords(profileId as string),
    // Keep the last member's list up while the next one loads, rather than
    // flashing empty; the header has already moved, so nothing is misnamed
    // for more than a beat, and prefetch usually makes this instant anyway.
    placeholderData: (prev) => prev,
  });

  function openFamily() {
    const d = context.data;
    if (!d) return;
    if (familyMode(d.entitlement.tier) === "family") {
      // Warm everyone's records now, so the switch lands on a full screen.
      prefetchMembers(queryClient, d.access.selectable);
      setTrayOpen(true);
    } else {
      setUpsellOpen(true);
    }
  }

  if (context.isPending) {
    return (
      <HomeSkeleton topInset={insets.top} />
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
    // Only a settled, fresh answer may say there is no profile. A cached "no
    // profile" that is being refreshed (an old session's, say) keeps the
    // loader up instead of flashing onboarding at someone with a family.
    if (context.isFetching) {
      return <HomeSkeleton topInset={insets.top} />;
    }
    return <NoProfile topInset={insets.top} />;
  }

  const list = records.data ?? [];
  const stats = statsFrom(list);
  const needsReview = stats.borderline + stats.highRisk;
  const access = data.access;
  const mode = familyMode(data.entitlement.tier);

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 16 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={records.isFetching && !records.isPending}
          onRefresh={() => {
            refreshRoster(queryClient);
            recheckHomeStage(queryClient);
          }}
          tintColor={brand[600]}
        />
      }
    >
      {/* A soft violet wash behind the top of the screen, so the glass has
          something to sit on. Scrolls with the content. */}
      <View pointerEvents="none" style={{ position: "absolute", top: -insets.top - 40, left: 0, right: 0, height: 520 }}>
        <Gradient from={lilac.base} to={surface.canvas} angle="vertical" />
      </View>

      {/*
       * ┌─ THE LAYOUT, REDESIGNED AGAIN 2026-09-29 ────────────────────────────┐
       * │                                                                     │
       * │ After the owner's reference ("Smart Home, Smooth Services"):        │
       * │                                                                     │
       * │   profile chip (the family switcher) · bell                         │
       * │   editorial headline, italic violet second line                     │
       * │   ask bar, shaped like search                                       │
       * │   Cheeku hero card: status pill · 24/7 · memory line · Start a chat │
       * │   Book care: filter chips + pastel cards (coming soon, honest)      │
       * │   Worth knowing pills · Health file row                             │
       * │                                                                     │
       * │ Everything is scoped to the active member, as before.               │
       * └─────────────────────────────────────────────────────────────────────┘
       */}
      <StaggerItem index={0}>
        <View className="flex-row items-center gap-3 px-5">
          <ProfileChip
            active={profile}
            others={access.selectable.filter((p) => p.id !== profile.id)}
            greeting={greeting()}
            locked={mode !== "family"}
            onPress={openFamily}
          />
          <View className="flex-1" />
          <NotificationsBell />
        </View>
      </StaggerItem>

      <SwitchPulse />
      <OfflineBanner updatedAt={context.dataUpdatedAt} />

      {onToday ? (
        <TodayBody
          profile={profile}
          members={access.selectable}
          serverDue={home.state?.due ?? []}
          serverDone={home.state?.doneDays ?? []}
          log={log.data ?? []}
          celebrating={celebrating}
          setCelebrating={setCelebrating}
          next={next ? <AppointmentCard appt={next} hero /> : null}
          onOpenRow={(r) => {
            // Someone else's item opens on them, so a booking lands on the right person.
            if (!r.mine) void switchMember(r.profileId);
            router.push(routeFor(r) as never);
          }}
        />
      ) : (
        <>
          <StaggerItem index={1}>
            <View className="mt-6 px-5">
              <HomeHeadline name={firstName(profile.name)} isSelf={profile.isPrimary} />
            </View>
          </StaggerItem>

          <StaggerItem index={2}>
            <View className="mt-5 px-5">
              <AskBar />
            </View>
          </StaggerItem>

          {/*
           * An upcoming appointment outranks everything below the ask bar: on the
           * day, it is the reason the app was opened. Absent when there is none,
           * with no empty state — Home is not the place to sell booking twice.
           */}
          {next ? (
            <StaggerItem index={3}>
              <View className="mt-4 px-5">
                <AppointmentCard appt={next} hero />
              </View>
            </StaggerItem>
          ) : null}

          {/*
           * Not on Today yet: the hero asks for the latest record, because one
           * record is what turns this screen into the daily plan. Until the
           * stage is known (the very first launch only) the old hero holds the
           * space, so nothing jumps.
           */}
          <StaggerItem index={3}>
            <View className="mt-4 px-5">
              {stage === "starter" || stage === "building" ? (
                <UnlockCard stage={stage} signals={home.state?.signals ?? {}} />
              ) : (
                <CheekuCard
                  name={firstName(profile.name)}
                  isSelf={profile.isPrimary}
                  remembered={stats.total}
                  needsReview={needsReview}
                  onStatus={() => {
                    const top = list.find((r) => r.severity !== "normal")?.id;
                    router.push((stats.total === 0 ? "/scan" : top ? `/records/${top}` : "/records") as never);
                  }}
                />
              )}
            </View>
          </StaggerItem>

          {stage === "starter" || stage === "building" ? (
            <StaggerItem index={4}>
              <View className="mt-6 px-5">
                <LockedPreview />
              </View>
            </StaggerItem>
          ) : null}
        </>
      )}

      <StaggerItem index={onToday ? 6 : 5}>
        <CareSection />
      </StaggerItem>

      <StaggerItem index={onToday ? 7 : 6}>
        <ReadsStrip articles={knowledge.data ?? []} />
        <FileCard file={file.data} member={profile} loading={file.isPending} />
      </StaggerItem>

      <UnlockMoment open={onToday && home.unlockOwed} via={home.state?.via ?? null} onClose={() => void markUnlockSeen(queryClient)} />

      <FamilyTray
        open={trayOpen}
        onClose={() => setTrayOpen(false)}
        profiles={access.selectable}
        pausedCount={access.lockedCount}
        seats={seatsFor(data.entitlement.tier)}
        activeId={profile.id}
        onSelect={(id) => void switchMember(id)}
        onAdd={() => router.push("/family/add")}
        onManage={() => router.push("/family")}
        onUpgrade={() => setPaywallOpen(true)}
      />

      {mode !== "family" ? (
        <FamilyUpsellSheet
          open={upsellOpen}
          mode={mode}
          me={profile}
          onClose={() => setUpsellOpen(false)}
          onUpgrade={() => setPaywallOpen(true)}
          onCompare={() => router.push("/settings/subscription")}
        />
      ) : null}

      <Paywall
        open={paywallOpen}
        reason="family"
        onClose={() => setPaywallOpen(false)}
        onActivated={() => {
          setPaywallOpen(false);
          // A new plan changes who can be opened, so everything that depends
          // on the roster refetches together.
          refreshRoster(queryClient);
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
      {/* Worried with you, at his desk; never about anyone's health here. */}
      <View className="mb-4 items-center">
        <MascotFigure size={120} moment="worried" hop />
      </View>
      <Text className="text-center text-xl font-bold text-ink-900">
        Could not load your records
      </Text>
      <Text className="mt-2 text-center text-base leading-[20px] text-ink-500">
        Check your connection and try again. Nothing has been changed.
      </Text>
      <View className="mt-5">
        <Button onPress={onRetry}>
          <Text className="text-lg font-bold text-white">Try again</Text>
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
      <Text className="text-center text-xl font-bold text-ink-900">Set up a profile first</Text>
      <Text className="mt-2 text-center text-base leading-[20px] text-ink-500">
        <Brand /> needs someone to keep records for before it can show you anything.
      </Text>
      <View className="mt-5">
        <Button onPress={() => router.push("/profile")}>
          <Text className="text-lg font-bold text-white">Create a profile</Text>
        </Button>
      </View>
    </View>
  );
}


/**
 * Home on Today: the step, today's action plan, the streak, what is due
 * across the family, and an alert when someone else's test has slipped. The
 * step and the plan are for the member in view; the due list and alerts are
 * the family's.
 */
function TodayBody({
  profile,
  members,
  serverDue,
  serverDone,
  log,
  celebrating,
  setCelebrating,
  next,
  onOpenRow,
}: {
  profile: ActiveProfile;
  members: readonly ActiveProfile[];
  serverDue: readonly DueItem[];
  serverDone: readonly string[];
  log: readonly TodayAction[];
  celebrating: PlanTask | null;
  setCelebrating: (s: PlanTask | null) => void;
  next: React.ReactNode;
  onOpenRow: (r: DueRow) => void;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const today = todayIso();
  const { plan, ctx } = usePlan(profile.id, serverDue);

  const names = useMemo(() => new Map(members.map((m) => [m.id, m.isPrimary ? "You" : firstName(m.name)])), [members]);
  const rows = useMemo(() => dueRows({ server: serverDue, loops: ctx?.loops ?? [], activeId: profile.id, names, today }), [serverDue, ctx, profile.id, names, today]);
  const step = plan?.hero ?? null;

  const doneDays = useMemo(() => new Set([...serverDone, ...log.filter((a) => a.status === "done").map((a) => a.day)]), [serverDone, log]);
  const streak = streakOf(doneDays, today);
  const week = weekOf(doneDays, today);
  const pillars = pillarsThisWeek(log, today);

  const alerts = familyAlerts(rows);
  const byId = new Map(members.map((m) => [m.id, m]));

  async function mark(s: PlanTask, status: "done" | "later") {
    if (status === "done") setCelebrating(s);
    const r = await logStep(queryClient, { profileId: profile.id, stepKey: s.key, status });
    if (!r.ok && status === "done") setCelebrating(null);
  }

  return (
    <>
      <StaggerItem index={1}>
        <View className="mt-6 px-5">
          <TodayHeadline name={firstName(profile.name)} isSelf={profile.isPrimary} />
        </View>
      </StaggerItem>

      <StaggerItem index={2}>
        <View className="mt-5 px-5">
          <StepCard
            step={step}
            doneStep={celebrating}
            streak={streak}
            milestone={celebrating ? (milestoneFor(streak.count)?.line ?? null) : null}
            forName={profile.isPrimary ? null : firstName(profile.name)}
            onDone={(s) => {
              feel.tap();
              void mark(s, "done");
            }}
            onLater={(s) => void mark(s, "later")}
            onUndo={(s) => {
              setCelebrating(null);
              void unlogStep(queryClient, { profileId: profile.id, stepKey: s.key });
            }}
            onMore={celebrating && step ? () => setCelebrating(null) : null}
          />
        </View>
      </StaggerItem>

      {plan ? (
        <StaggerItem index={3}>
          <View className="mt-4 px-5">
            <PlanPreview plan={plan} skip={step?.key ?? null} onOpen={(href) => router.push(href as never)} />
          </View>
        </StaggerItem>
      ) : null}

      <StaggerItem index={3}>
        <View className="mt-4 px-5">
          <ProgressStrip streak={streak} week={week} pillars={pillars} onPillar={(p) => router.push(`/today?pillar=${p}` as never)} />
        </View>
      </StaggerItem>

      {alerts.length ? (
        <StaggerItem index={4}>
          <View className="mt-4 gap-3 px-5">
            {alerts.map((a) => (
              <FamilyAlertCard key={a.id} row={a} member={byId.get(a.profileId) ?? null} onPress={() => onOpenRow(a)} />
            ))}
          </View>
        </StaggerItem>
      ) : null}

      {next ? (
        <StaggerItem index={4}>
          <View className="mt-4 px-5">{next}</View>
        </StaggerItem>
      ) : null}

      <StaggerItem index={5}>
        <View className="mt-6 px-5">
          <DueThisWeek rows={rows} onPress={onOpenRow} />
        </View>
        <View className="mt-4 px-5">
          <AskRow />
        </View>
      </StaggerItem>
    </>
  );
}
