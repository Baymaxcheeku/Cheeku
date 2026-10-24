import {
  Activity,
  ArrowRight,
  Baby,
  Droplet,
  FlaskConical,
  Flower2,
  HeartPulse,
  Leaf,
  Package,
  Star,
  Sun,
  Thermometer,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Tap } from "@/components/ui/tap";
import { Sheet } from "@/components/ui/sheet";
import { Glass, Gradient, glassShadow } from "@/components/ui/glass";
import { PillButton } from "@/components/ui/screen";
import type { LabPartner, LabTest } from "@/lib/labs/logic";
import type { Rating, Review } from "@/lib/labs/queries";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * The pieces every provider screen shares: stars, lab badges, test art, the
 * cart bar, and reviews.
 *
 * STARS ARE INK, NOT GOLD. Gold sits next to the caution amber this app keeps
 * for health meaning (PLAN.md rule 3); monochrome stars read just as fast and
 * keep the palette honest.
 */

export function rupees(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 1 }} accessibilityLabel={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} color={ink[900]} fill={i <= Math.round(rating) ? ink[900] : "transparent"} strokeWidth={1.6} />
      ))}
    </View>
  );
}

export function RatingLine({ rating, dim }: { rating?: Rating; dim?: boolean }) {
  if (!rating) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <Star size={13} color={ink[900]} fill={ink[900]} />
      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[900] }}>{rating.rating.toFixed(1)}</Text>
      <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: dim ? ink[300] : ink[500] }}>
        ({rating.reviews} {rating.reviews === 1 ? "review" : "reviews"})
      </Text>
    </View>
  );
}

export function PartnerBadge({ partner, size = 52 }: { partner: Pick<LabPartner, "monogram" | "color">; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: partner.color, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(15,16,48,0.06)" }}>
      <Text style={{ fontFamily: font.bold, fontSize: size * 0.3, letterSpacing: 0.5, color: ink[900] }}>{partner.monogram}</Text>
    </View>
  );
}

/*
 * A pastel tile per test, standing in for the photography the reference uses.
 * Photos of needles and blood are exactly what a nervous parent does not want
 * to scroll past, so it is soft colour and one clear icon.
 */
const ART: { match: (t: LabTest) => boolean; Icon: LucideIcon; from: string; to: string; fg: string }[] = [
  { match: (t) => t.kind === "package" && t.categories.includes("senior"), Icon: Leaf, from: "#e3f5ef", to: "#f3fbf7", fg: "#0f7a5c" },
  { match: (t) => t.kind === "package" && t.categories.includes("women"), Icon: Flower2, from: "#ffdcee", to: "#fff0f7", fg: "#c22a6b" },
  { match: (t) => t.kind === "package", Icon: Package, from: "#ece6ff", to: "#f6f3ff", fg: brand[600] },
  { match: (t) => t.categories.includes("diabetes"), Icon: Activity, from: "#dcecff", to: "#eef6ff", fg: "#1a6fc2" },
  { match: (t) => t.categories.includes("heart"), Icon: HeartPulse, from: "#ffe3e6", to: "#fff2f3", fg: "#c2334a" },
  { match: (t) => t.categories.includes("vitamins"), Icon: Sun, from: "#fff1d6", to: "#fff8ea", fg: "#b7700a" },
  { match: (t) => t.categories.includes("women"), Icon: Baby, from: "#ffdcee", to: "#fff0f7", fg: "#c22a6b" },
  { match: (t) => t.categories.includes("fever"), Icon: Thermometer, from: "#ffe3d3", to: "#fff1e9", fg: "#c2650b" },
  { match: (t) => t.sample.startsWith("Blood"), Icon: Droplet, from: "#f0e2ff", to: "#f8f1ff", fg: "#7b3fd4" },
];

export function artFor(t: LabTest) {
  return ART.find((a) => a.match(t)) ?? { Icon: FlaskConical, from: "#dfe6ff", to: "#f0f3ff", fg: "#3f5bd9" };
}

export function TestArt({ test, size = 64, radius = 20 }: { test: LabTest; size?: number; radius?: number }) {
  const a = artFor(test);
  return (
    <View style={{ width: size, height: size, borderRadius: radius, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
      <Gradient from={a.from} to={a.to} glow="#ffffff" />
      <View style={{ width: size * 0.62, height: size * 0.62, borderRadius: size, backgroundColor: "rgba(255,255,255,0.8)", alignItems: "center", justifyContent: "center" }}>
        <a.Icon size={size * 0.34} color={a.fg} strokeWidth={1.8} />
      </View>
    </View>
  );
}

export function SampleNote({ text = "Preview · sample labs, prices and reviews. Nothing is charged." }: { text?: string }) {
  return <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[300], textAlign: "center" }}>{text}</Text>;
}

/** The sticky bottom bar once something is in the cart. */
export function CartBar({ count, from, label, onPress, bottom }: { count: number; from: number | null; label: string; onPress: () => void; bottom: number }) {
  return (
    <View style={{ position: "absolute", left: 16, right: 16, bottom: bottom + 12 }}>
      <Tap
        accessibilityRole="button"
        onPress={onPress}
        style={[glassShadow, {
          height: 64,
          borderRadius: 999,
          backgroundColor: ink[900],
          flexDirection: "row",
          alignItems: "center",
          paddingLeft: 22,
          paddingRight: 8,
          shadowOpacity: 0.25,
        }]}
        scale={0.98}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: "#fff" }}>
            {count} {count === 1 ? "test" : "tests"} in cart
          </Text>
          {from !== null ? <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: "rgba(255,255,255,0.7)", marginTop: 1 }}>from {rupees(from)} with home collection</Text> : null}
        </View>
        <View style={{ height: 48, paddingHorizontal: 18, borderRadius: 999, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 14.5, color: ink[900] }}>{label}</Text>
          <ArrowRight size={16} color={ink[900]} />
        </View>
      </Tap>
    </View>
  );
}

export function ReviewList({ reviews, empty }: { reviews: Review[]; empty: string }) {
  if (reviews.length === 0) {
    return <Text style={{ fontFamily: font.regular, fontSize: 13.5, color: ink[500] }}>{empty}</Text>;
  }
  const sample = reviews.some((r) => r.isSample);
  return (
    <View style={{ gap: 10 }}>
      {reviews.map((r) => (
        <Glass key={r.id} strong className="rounded-[22px] p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2.5">
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 14, color: brand[700] }}>{r.author[0]}</Text>
              </View>
              <View>
                <Text style={{ fontFamily: font.semibold, fontSize: 14, color: ink[900] }}>{r.mine ? "You" : r.author}</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>
                  {[r.city, new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })].filter(Boolean).join(" · ")}
                </Text>
              </View>
            </View>
            <Stars rating={r.rating} size={12} />
          </View>
          <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink[700], marginTop: 10 }}>{r.body}</Text>
        </Glass>
      ))}
      {sample ? <SampleNote text="Sample reviews for the preview. Real ones appear as people book." /> : null}
    </View>
  );
}

/** Rate and review, in a sheet. One per person per provider; posting again edits it. */
export function ReviewSheet({
  open,
  title,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (rating: number, body: string) => string | null | Promise<string | null>;
}) {
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const labels = ["", "Poor", "Not great", "Okay", "Good", "Loved it"];

  async function send() {
    setBusy(true);
    setError(null);
    const err = await onSubmit(rating, body);
    setBusy(false);
    if (err) setError(err);
    else {
      setBody("");
      onClose();
    }
  }

  return (
    <Sheet open={open} onClose={onClose} label="Close">
      <View style={{ borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: "#fafafe", padding: 22, paddingBottom: insets.bottom + 16 }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 22, letterSpacing: -0.5, color: ink[900] }}>{title}</Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 16, alignItems: "center" }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Pressable key={i} accessibilityRole="button" accessibilityLabel={`${i} star${i === 1 ? "" : "s"}`} onPress={() => setRating(i)} hitSlop={6}>
              <Star size={32} color={ink[900]} fill={i <= rating ? ink[900] : "transparent"} strokeWidth={1.4} />
            </Pressable>
          ))}
          <Text style={{ fontFamily: font.medium, fontSize: 14, color: ink[500], marginLeft: 4 }}>{labels[rating]}</Text>
        </View>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="What should the next family know?"
          placeholderTextColor={ink[300]}
          multiline
          maxLength={600}
          style={{ marginTop: 16, minHeight: 110, padding: 14, borderRadius: 18, backgroundColor: "#fff", borderWidth: 1.5, borderColor: surface.line, fontFamily: font.regular, fontSize: 15, color: ink[900], textAlignVertical: "top" }}
        />
        {error ? <Text style={{ fontFamily: font.medium, fontSize: 13, color: "#c00a1c", marginTop: 8 }}>{error}</Text> : null}
        <PillButton tone="dark" loading={busy} onPress={() => void send()} style={{ marginTop: 16 }}>
          Post review
        </PillButton>
      </View>
    </Sheet>
  );
}
