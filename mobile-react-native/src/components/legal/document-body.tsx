import { Info, PenLine } from "lucide-react-native";
import { Text, View } from "react-native";

import { hasPlaceholders, LEGAL_ENTITY } from "@/lib/legal/entity";
import type { LegalDocument } from "@/lib/legal/documents";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

/**
 * A legal document, readable.
 *
 * Reading comfort is the point: 15px body at 23px leading, headings that a
 * thumb can find while scrolling, the summary first so someone who reads one
 * paragraph reads the right one, and notes (emergencies, "never sold") set
 * apart so they are seen even by people who skim.
 *
 * Used by the full-screen route and by the reader inside the consent sheet,
 * so the text is identical wherever it is opened.
 */
export function DocumentBody({ doc }: { doc: LegalDocument }) {
  return (
    <View className="px-5">
      <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500] }}>
        Version {doc.version} · Effective {longDate(doc.effectiveOn)}
      </Text>

      <View className="mt-3 rounded-xl p-4" style={{ backgroundColor: brand[50], borderWidth: 1, borderColor: brand[100] }}>
        <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 1.2, color: brand[700] }}>IN SHORT</Text>
        <Text style={{ fontFamily: font.medium, fontSize: 15, lineHeight: 22, color: ink[900], marginTop: 6 }}>{doc.summary}</Text>
      </View>

      {doc.changes.length ? (
        <View className="mt-3 rounded-xl p-4" style={{ backgroundColor: surface.base, borderWidth: 1, borderColor: surface.line }}>
          <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 1.2, color: ink[500] }}>WHAT CHANGED</Text>
          {doc.changes.map((c) => (
            <Bullet key={c} text={c} />
          ))}
        </View>
      ) : null}

      {hasPlaceholders() ? (
        /* Neutral, not amber: amber means a health caution in this app. */
        <View className="mt-3 flex-row gap-2.5 rounded-lg p-3.5" style={{ backgroundColor: surface.tint, borderWidth: 1, borderColor: surface.line }}>
          <PenLine size={15} color={ink[500]} style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500] }}>
            Draft: company details in square brackets are filled in once {LEGAL_ENTITY.brand} is incorporated.
          </Text>
        </View>
      ) : null}

      {doc.sections.map((s) => (
        <View key={s.id} className="mt-6">
          <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 17, lineHeight: 23, letterSpacing: -0.2, color: ink[900] }}>
            {s.heading}
          </Text>
          {s.blocks.map((b, i) => {
            if ("p" in b) {
              return (
                <Text key={i} style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 23, color: ink[700], marginTop: 8 }}>
                  {b.p}
                </Text>
              );
            }
            if ("list" in b) {
              return (
                <View key={i} className="mt-2">
                  {b.list.map((item) => (
                    <Bullet key={item} text={item} />
                  ))}
                </View>
              );
            }
            return (
              <View key={i} className="mt-3 flex-row gap-2.5 rounded-lg p-3.5" style={{ backgroundColor: surface.base, borderWidth: 1, borderColor: brand[100] }}>
                <Info size={16} color={ink[900]} style={{ marginTop: 2 }} />
                <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, lineHeight: 21, color: ink[900] }}>{b.note}</Text>
              </View>
            );
          })}
        </View>
      ))}

      <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 18, color: ink[300], marginTop: 28 }}>
        Questions about this document: {LEGAL_ENTITY.grievanceOfficer}, Grievance Officer, {LEGAL_ENTITY.privacyEmail}.
      </Text>
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View className="mt-2 flex-row gap-2.5">
      <View className="mt-[9px] h-[5px] w-[5px] rounded-full" style={{ backgroundColor: brand[400] }} />
      <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 15, lineHeight: 23, color: ink[700] }}>{text}</Text>
    </View>
  );
}
