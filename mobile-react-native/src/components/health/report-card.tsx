import { useRouter } from "expo-router";
import { ChevronDown, ChevronUp, ClipboardList, Hourglass, Leaf, MessageCircle, Pill, Stethoscope, type LucideIcon } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { SectionHead } from "@/components/health/file-parts";
import { Enter } from "@/components/ui/motion";
import { Glass } from "@/components/ui/glass";
import { Tap } from "@/components/ui/tap";
import type { Habit, HealthReport } from "@/lib/health/report";
import { shortDate } from "@/lib/records/details";
import { brand, hue, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * THE HEALTH REPORT, ON THE HEALTH FILE (int-ai-api).
 *
 * Folded by default: the summary, then "See the full report". The flagged
 * values and the medicine list already have their own sections below, so
 * this card holds only what is new: what each medicine is for, habits for a
 * longer and better life tied to this person's file, and what to take to the
 * doctor. No semantic colour here: habits are not a health reading, so they
 * wear the neutral ink and one brand action, as Rule 3 asks.
 */

export function ReportCard({ report, firstName, isPrimary }: { report: HealthReport; firstName: string; isPrimary: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const whose = isPrimary ? "your" : `${firstName}'s`;

  return (
    <>
      <SectionHead
        title="Health report"
        note={report.generatedAt ? `Read from ${whose} records, updated ${shortDate(report.generatedAt.slice(0, 10))}.` : `Read from ${whose} records.`}
      />
      <Glass strong className="overflow-hidden rounded-xl">
        <View style={{ flexDirection: "row", gap: 12, padding: 16 }}>
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
            <ClipboardList size={17} color={brand[700]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: ink[900] }}>{report.summary}</Text>
            {report.unverified ? (
              <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500], marginTop: 6 }}>
                Some values are still waiting for a check, so they are marked as unverified.
              </Text>
            ) : null}
          </View>
        </View>

        {report.hasMore ? (
          <Tap
            scale={0.98}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            accessibilityLabel={open ? "Show less of the report" : "See the full report"}
            onPress={() => setOpen((v) => !v)}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, minHeight: 44, borderTopWidth: 1, borderTopColor: surface.line }}
          >
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[700] }}>{open ? "Show less" : "See the full report"}</Text>
            {open ? <ChevronUp size={16} color={brand[700]} /> : <ChevronDown size={16} color={brand[700]} />}
          </Tap>
        ) : null}
      </Glass>

      {open ? (
        <Enter kind="quick">
          {report.medicines.length ? (
            <Group icon={Pill} tint={hue.plum} title="Medicines, explained">
              {report.medicines.map((m, i) => (
                <Row key={`${m.name}-${i}`} first={i === 0}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>
                    {m.name}
                    {m.salts.length ? <Text style={{ fontFamily: font.regular, color: ink[500] }}>{`  ${m.salts.join(", ")}`}</Text> : null}
                  </Text>
                  {m.purpose ? <Line>{m.purpose}</Line> : null}
                  {m.howToTake ? <Line muted>{`As written: ${m.howToTake}`}</Line> : null}
                  {[...m.tips, ...m.watch].map((t, k) => (
                    <Line key={k} bullet>{t}</Line>
                  ))}
                  {m.unverified ? <Line muted>Not checked yet.</Line> : null}
                </Row>
              ))}
            </Group>
          ) : null}

          {report.longevity.length ? <HabitGroup icon={Hourglass} title="For the long run" items={report.longevity} /> : null}
          {report.lifestyle.length ? <HabitGroup icon={Leaf} title="Day to day" items={report.lifestyle} /> : null}

          {report.discuss.length ? (
            <Group icon={Stethoscope} tint={hue.blue} title="To discuss with the doctor">
              {report.discuss.map((d, i) => (
                <Row key={i} first={i === 0}>
                  <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[900] }}>{d}</Text>
                </Row>
              ))}
            </Group>
          ) : null}

          {report.questions.length ? (
            <Group icon={MessageCircle} tint={hue.blue} title="Questions to ask">
              {report.questions.map((q, i) => (
                <Row key={i} first={i === 0}>
                  <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[900] }}>{q}</Text>
                </Row>
              ))}
            </Group>
          ) : null}

          <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500], marginTop: 10 }}>{report.note}</Text>
          <Tap
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/ask", params: { q: `Walk me through ${isPrimary ? "my" : `${firstName}'s`} health report.` } })}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 8, minHeight: 36, borderRadius: 999, backgroundColor: brand[50] }}
          >
            <MessageCircle size={14} color={brand[600]} />
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[700] }}>Ask Cheeku about it</Text>
          </Tap>
        </Enter>
      ) : null}
    </>
  );
}

function HabitGroup({ icon, title, items }: { icon: LucideIcon; title: string; items: Habit[] }) {
  return (
    <Group icon={icon} tint={hue.teal} title={title}>
      {items.map((h, i) => (
        <Row key={`${h.title}-${i}`} first={i === 0}>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{h.title}</Text>
          <Line>{h.action}</Line>
          <Line muted>{`Why: ${h.why}`}</Line>
        </Row>
      ))}
    </Group>
  );
}

function Group({ icon: Icon, tint, title, children }: { icon: LucideIcon; tint: { fg: string; bg?: string }; title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: tint.bg ?? surface.tint, alignItems: "center", justifyContent: "center" }}>
          <Icon size={13} color={tint.fg} />
        </View>
        <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 13, color: ink[700] }}>{title}</Text>
      </View>
      <Glass strong className="overflow-hidden rounded-xl">{children}</Glass>
    </View>
  );
}

function Row({ first, children }: { first: boolean; children: React.ReactNode }) {
  return <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 4, borderTopWidth: first ? 0 : 1, borderTopColor: surface.line }}>{children}</View>;
}

function Line({ children, muted, bullet }: { children: string; muted?: boolean; bullet?: boolean }) {
  return (
    <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: muted ? ink[500] : ink[700] }}>
      {bullet ? "•  " : ""}
      {children}
    </Text>
  );
}
