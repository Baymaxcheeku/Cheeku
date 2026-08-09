import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";

import { OfflineBanner } from "@/components/app/offline-banner";
import { RecordsHeader, StatsCard } from "@/components/records/chrome";
import { FilterBar, type Filters } from "@/components/records/filter-bar";
import { RecordsView } from "@/components/records/records-view";
import { activeProfile, selectableProfiles } from "@/lib/profiles/context";
import { sinceFromPeriod } from "@/lib/records/filters";
import { listRecords, statsFrom } from "@/lib/records/queries";
import { brand } from "@/theme/tokens";

/**
 * D1 — every document the reader can see, newest first.
 *
 * The scope rule is the same one Home enforces, and it is the reason this
 * screen does not simply list everything: the list follows the family member
 * selected on Home unless the reader explicitly widens it. Defaulting to
 * everyone would mean switching to Amma on Home and still seeing Athar's
 * reports here — the exact cross-member bleed rule 3 exists to prevent.
 */
export default function Records() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Filters>({ sort: "newest" });

  const context = useQuery({
    queryKey: ["records-context"],
    queryFn: async () => {
      const [active, allowed] = await Promise.all([activeProfile(), selectableProfiles()]);
      return { active, allowed };
    },
  });

  const allowed = context.data?.allowed ?? [];
  const activeId = context.data?.active?.id;
  const canSeeEveryone = allowed.length > 1;

  /*
   * The member filter is re-checked against the plan rather than trusted.
   *
   * Two ways past the plan existed on web and both apply here the moment this
   * value can come from anywhere but a fresh tap: a member id the plan cannot
   * open scopes the list straight to them (RLS permits it, because the family
   * shares one account), and "all" drops the scope entirely, which on a
   * one-seat plan means every member's reports under one heading. Both fall
   * back to the active profile rather than erroring — a stale selection should
   * quietly show the reader their own records.
   */
  const requested = filters.profileId;
  const requestedIsAllowed =
    requested === "all" ? canSeeEveryone : allowed.some((p) => p.id === requested);
  const effective = requestedIsAllowed ? requested : undefined;
  const scopeId = effective === "all" ? undefined : (effective ?? activeId);

  const query = {
    profileId: scopeId,
    docType: filters.docType,
    since: sinceFromPeriod(filters.period),
    sort: filters.sort,
  };

  const records = useQuery({
    queryKey: ["records-list", query],
    // Without a resolved scope this would list the whole account, which is the
    // widening the block above exists to prevent.
    enabled: Boolean(context.data) && (Boolean(scopeId) || effective === "all"),
    queryFn: () => listRecords(query),
  });

  const list = records.data ?? [];
  const filtered = Boolean(effective ?? filters.docType ?? filters.period);

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={records.isFetching && !records.isPending}
          onRefresh={() => {
            void queryClient.invalidateQueries({ queryKey: ["records-context"] });
            void queryClient.invalidateQueries({ queryKey: ["records-list"] });
          }}
          tintColor={brand[600]}
        />
      }
    >
      <RecordsHeader title="My Records" subtitle="All your health documents in one place." />

      <OfflineBanner updatedAt={records.dataUpdatedAt} />

      <FilterBar
        profiles={allowed}
        defaultProfileId={activeId}
        allowAllMembers={canSeeEveryone}
        filters={filters}
        onChange={setFilters}
      />

      <StatsCard stats={statsFrom(list)} />

      {records.isPending ? (
        <View className="mt-10 items-center">
          <ActivityIndicator color={brand[600]} />
        </View>
      ) : records.isError ? (
        /* Same rule as Home: a failed fetch is not an empty account, and
           saying "no records" here would be a claim about someone's data that
           the app has no basis for. */
        <View className="mx-5 mt-8 items-center">
          <Text className="text-[15px] font-semibold text-ink-900">Could not load your records</Text>
          <Text className="mt-1 text-center text-[13px] leading-[18px] text-ink-500">
            Pull down to try again. Nothing has been changed.
          </Text>
        </View>
      ) : (
        <RecordsView records={list} filtered={filtered} />
      )}
    </ScrollView>
  );
}
