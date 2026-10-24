import {
  CalendarRange,
  Check,
  ChevronDown,
  Layers,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Sheet, useSheetMax } from "@/components/ui/sheet";
import { DOC_TYPE_LABEL, DOC_TYPES, type DocType } from "@/lib/records/types";
import { brand, ink, shadow, surface } from "@/theme/tokens";

/*
 * FILTER STATE LIVES IN THE SCREEN, not in a URL.
 *
 * On web it had to be in the URL so a filtered list survived the back button
 * from a record detail — the single most common navigation here. Native gets
 * that property for free: pushing a detail screen leaves this one mounted, so
 * state survives the pop. Same guarantee, no query string.
 */

export type Filters = {
  /** A profile id, "all", or undefined for "whoever is active on Home". */
  profileId?: string;
  docType?: DocType;
  period?: string;
  sort: "newest" | "oldest";
};


const PERIODS = [
  { value: "", label: "All time" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 3 months" },
  { value: "365", label: "Last year" },
] as const;

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
] as const;

export function FilterBar({
  profiles,
  defaultProfileId,
  allowAllMembers = true,
  filters,
  onChange,
}: {
  /** ONLY the members this plan can open — see `selectableProfiles`. */
  profiles: readonly { id: string; name: string }[];
  /** The member selected on Home; the list is scoped to them unless widened. */
  defaultProfileId?: string;
  /**
   * Whether "All members" is offered. False on the one-seat plans, where a
   * combined list would be a list of one person filed under a plural label.
   */
  allowAllMembers?: boolean;
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  const [sheet, setSheet] = useState<null | "member" | "docType" | "period" | "sort">(null);

  const profileId = filters.profileId ?? defaultProfileId ?? "";
  const memberLabel =
    profileId === "all"
      ? "All members"
      : (profiles.find((p) => p.id === profileId)?.name.trim().split(/\s+/)[0] ?? "Member");

  /*
   * Scoping to the active member is the app's normal state, not something the
   * reader chose here, so it does not count towards the badge. Only widening to
   * everyone, or narrowing to a different member, is a filter.
   */
  const memberIsFilter = profileId !== "" && profileId !== defaultProfileId;
  const activeCount = [
    filters.docType,
    memberIsFilter ? profileId : "",
    filters.period,
  ].filter(Boolean).length;

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 4, gap: 6 }}
        className="mt-4 grow-0"
      >
        <Chip label={memberLabel} on={memberIsFilter} onPress={() => setSheet("member")} icon={Users} />
        <Chip
          label={filters.docType ? DOC_TYPE_LABEL[filters.docType] : "All types"}
          on={Boolean(filters.docType)}
          onPress={() => setSheet("docType")}
          icon={Layers}
        />
        <Chip
          label={PERIODS.find((p) => p.value === (filters.period ?? ""))?.label ?? "All time"}
          on={Boolean(filters.period)}
          onPress={() => setSheet("period")}
          icon={CalendarRange}
        />
        <Chip
          label={filters.sort === "oldest" ? "Oldest" : "Newest"}
          on={filters.sort === "oldest"}
          onPress={() => setSheet("sort")}
          icon={SlidersHorizontal}
        />
        {activeCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear filters"
            onPress={() =>
              onChange({ profileId: undefined, docType: undefined, period: undefined, sort: filters.sort })
            }
            className="h-9 flex-row items-center gap-1.5 rounded-pill px-3.5"
            style={{ backgroundColor: ink[900] }}
          >
            <X size={13} color="#ffffff" />
            <Text className="text-[12px] font-semibold text-white">Clear {activeCount}</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <OptionSheet
        open={sheet === "member"}
        title="Family member"
        onClose={() => setSheet(null)}
        options={[
          ...(allowAllMembers ? [{ value: "all", label: "All members" }] : []),
          ...profiles.map((p) => ({ value: p.id, label: p.name })),
        ]}
        value={profileId}
        onSelect={(value) => onChange({ ...filters, profileId: value })}
      />

      <OptionSheet
        open={sheet === "docType"}
        title="Document type"
        onClose={() => setSheet(null)}
        options={[
          { value: "", label: "All types" },
          ...DOC_TYPES.map((t) => ({ value: t, label: DOC_TYPE_LABEL[t] })),
        ]}
        value={filters.docType ?? ""}
        onSelect={(value) => onChange({ ...filters, docType: (value || undefined) as DocType | undefined })}
      />

      <OptionSheet
        open={sheet === "period"}
        title="Time period"
        onClose={() => setSheet(null)}
        options={PERIODS.map((p) => ({ value: p.value, label: p.label }))}
        value={filters.period ?? ""}
        onSelect={(value) => onChange({ ...filters, period: value || undefined })}
      />

      <OptionSheet
        open={sheet === "sort"}
        title="Sort by"
        onClose={() => setSheet(null)}
        options={SORTS.map((s) => ({ value: s.value, label: s.label }))}
        value={filters.sort}
        onSelect={(value) => onChange({ ...filters, sort: value === "oldest" ? "oldest" : "newest" })}
      />
    </>
  );
}

/**
 * A filter pill.
 *
 * The set previously read as four identical dropdowns — same white, same
 * border, same chevron — so the one carrying an active filter looked exactly
 * like the three that were not, and "All members" (a real narrowing) was
 * indistinguishable from "All time" (no filter at all).
 *
 * An active pill is now FILLED, and it carries a small dot rather than a
 * chevron. Fill is the only difference that survives a glance at arm's length;
 * a border tint does not. The leading icon names the axis so the row can be
 * read without opening anything.
 */
function Chip({
  label,
  on,
  onPress,
  icon: Icon = ChevronDown,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  icon?: typeof ChevronDown;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={on ? `${label}, filter applied` : label}
      onPress={onPress}
      className="h-9 flex-row items-center gap-1.5 rounded-pill px-3.5"
      style={{
        backgroundColor: on ? brand[600] : surface.base,
        borderWidth: 1,
        borderColor: on ? brand[600] : surface.line,
      }}
    >
      <Icon size={13} color={on ? "#ffffff" : ink[300]} />
      <Text
        className="text-[12.5px] font-medium"
        numberOfLines={1}
        style={{ color: on ? "#ffffff" : ink[700] }}
      >
        {label}
      </Text>
      {on ? (
        <View
          style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.8)" }}
        />
      ) : (
        <ChevronDown size={13} color={ink[300]} />
      )}
    </Pressable>
  );
}

/*
 * One sheet component for all four controls.
 *
 * The frames show a dropdown per chip. A dropdown anchored to a chip inside a
 * horizontal scroller lands off-screen as soon as the chip has been scrolled,
 * so on a phone these are sheets — same choice, always fully visible, and a
 * 44pt row per option instead of a 28pt menu item.
 */
function OptionSheet({
  open,
  title,
  options,
  value,
  onSelect,
  onClose,
}: {
  open: boolean;
  title: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const sheetMax70 = useSheetMax(0.70);

  return (
    <Sheet open={open} onClose={onClose} label="Close">
      <View
        className="rounded-t-sheet bg-canvas px-5 pt-2"
        style={{ maxHeight: sheetMax70, paddingBottom: insets.bottom + 16 }}
      >
        <Text className="mt-3 text-[18px] font-bold text-ink-900">{title}</Text>

        <ScrollView className="mt-3 rounded-card bg-surface" style={shadow.e1}>
          {options.map((option, i) => {
            const on = option.value === value;
            return (
              <Pressable
                key={option.value || "none"}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                aria-checked={on}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
                className="flex-row items-center gap-3 px-4 py-3.5"
                style={i > 0 ? { borderTopWidth: 1, borderTopColor: surface.line } : undefined}
              >
                <Text
                  className="flex-1 text-[15px]"
                  style={{ color: on ? brand[700] : ink[900], fontWeight: on ? "600" : "400" }}
                >
                  {option.label}
                </Text>
                {on ? <Check size={17} color={brand[600]} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Sheet>
  );
}
