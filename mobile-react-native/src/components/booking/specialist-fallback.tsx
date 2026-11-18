import { ArrowRight } from "lucide-react-native";
import { Text, View } from "react-native";

import { glassCard, PILLAR_TONE } from "@/components/today/palette";
import { Icon3D } from "@/components/ui/icon3d";
import { Tap } from "@/components/ui/tap";
import { doctorsFor, SPECIALTIES, type Mode, type SpecialtyId } from "@/lib/booking/catalog";
import { LIVE } from "@/lib/partner/labstack";
import { useLiveDoctors } from "@/lib/partner/use-doctors";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * WHEN THE SPECIALIST ISN'T THERE.
 *
 * The partner network doesn't have every department in every mode. Rather
 * than a dead end ("0 doctors"), Cheeku offers the two honest ways forward:
 * a general physician, who sees most things first and refers on when a
 * specialist is really needed, and the other way to meet (online or clinic)
 * if that one has the specialist.
 *
 * It never says the GP is "as good as" the specialist. It says what a GP
 * does, and lets the person choose.
 */

/** How many doctors there are for a department and mode, live or from the sample list. */
export function useSupply(specialty: SpecialtyId, mode: Mode): { count: number; loading: boolean; error: boolean } {
  const live = useLiveDoctors(specialty, mode);
  if (!LIVE) return { count: doctorsFor(specialty, mode).length, loading: false, error: false };
  if (live.needsPlace) return { count: 0, loading: false, error: false };
  return { count: live.doctors.length, loading: live.loading && !live.noDepartment, error: Boolean(live.error) };
}

export function SpecialistFallback({
  specialty,
  mode,
  onGp,
  onOtherMode,
}: {
  specialty: SpecialtyId;
  mode: Mode;
  onGp: () => void;
  onOtherMode: () => void;
}) {
  const sp = SPECIALTIES[specialty];
  const other: Mode = mode === "online" ? "clinic" : "online";
  const otherSupply = useSupply(specialty, other);
  const gpSupply = useSupply("gp", mode);
  const where = mode === "online" ? "online" : "with clinic slots";

  return (
    <View style={[glassCard("#ffffff", "#0f1030"), { borderRadius: 26, padding: 16, shadowOpacity: 0.05 }]}>
      <Text style={{ fontFamily: font.semibold, fontSize: 18, lineHeight: 23, letterSpacing: -0.3, color: ink[900] }}>
        No {sp.plural.toLowerCase()} {where} right now
      </Text>
      <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink[500], marginTop: 4 }}>
        A general physician can see you {mode === "online" ? "on video today" : "at a clinic"}, look at your note, and refer you to a {sp.label.toLowerCase()} if you need one.
      </Text>

      <Option
        art="doctor"
        tint={PILLAR_TONE.sleep.bg}
        title="See a general physician"
        line={gpSupply.loading ? "Checking who's free" : gpSupply.count ? `${gpSupply.count} ${gpSupply.count === 1 ? "doctor" : "doctors"} ${mode === "online" ? "online" : "near you"}` : "Your note goes with you"}
        primary
        onPress={onGp}
      />
      {otherSupply.count > 0 ? (
        <Option
          art={other === "online" ? "video" : "hospital"}
          tint={other === "online" ? PILLAR_TONE.check.bg : PILLAR_TONE.eat.bg}
          title={other === "online" ? `${sp.label} on video` : `${sp.label} at a clinic`}
          line={`${otherSupply.count} ${otherSupply.count === 1 ? "doctor" : "doctors"} ${other === "online" ? "online" : "near you"}`}
          onPress={onOtherMode}
        />
      ) : null}
    </View>
  );
}

function Option({ art, tint, title, line, primary, onPress }: { art: "doctor" | "video" | "hospital"; tint: string; title: string; line: string; primary?: boolean; onPress: () => void }) {
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${line}`}
      onPress={onPress}
      scale={0.98}
      style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12, padding: 10, paddingRight: 12, borderRadius: 20, backgroundColor: primary ? PILLAR_TONE.sleep.glass : "#fff", borderWidth: 1, borderColor: primary ? "transparent" : surface.line }}
    >
      <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: primary ? "#fff" : tint, alignItems: "center", justifyContent: "center" }}>
        <Icon3D name={art} size={34} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{title}</Text>
        <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>{line}</Text>
      </View>
      <View style={{ width: 36, height: 36, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: primary ? brand[600] : brand[50] }}>
        <ArrowRight size={16} color={primary ? "#fff" : brand[600]} />
      </View>
    </Tap>
  );
}
