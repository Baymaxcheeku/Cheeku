import { Check, Globe } from "lucide-react-native";
import { Text, View } from "react-native";

import { Panel, SettingsScreen } from "@/components/settings/chrome";
import { PopIn, StaggerItem } from "@/components/ui/motion";
import { brand, shadow, surface } from "@/theme/tokens";

/*
 * Every other Indian language is SHOWN rather than hidden.
 *
 * Someone deciding whether Cheeku will work for their family — often for a
 * parent who does not read English — should see the roadmap, not an empty
 * list with English ticked. The honest answer is "not yet, and here is the
 * queue", which is a different message from "no".
 */
const COMING_SOON = [
  ["हिंदी", "Hindi"],
  ["বাংলা", "Bengali"],
  ["मराठी", "Marathi"],
  ["தமிழ்", "Tamil"],
  ["తెలుగు", "Telugu"],
  ["ગુજરાતી", "Gujarati"],
  ["ಕನ್ನಡ", "Kannada"],
  ["മലയാളം", "Malayalam"],
  ["ਪੰਜਾਬੀ", "Punjabi"],
  ["ଓଡ଼ିଆ", "Odia"],
  ["অসমীয়া", "Assamese"],
] as const;

export default function Language() {
  return (
    <SettingsScreen title="Language" eyebrow="Choose your preferred language" icon={Globe}>
      <View className="mt-4">
        <Panel>
          <Text className="text-[17px] font-bold leading-[21px] text-ink-900">
            Your language, <Text className="text-brand-600">your experience</Text>
          </Text>
          <Text className="mt-1.5 text-[12.5px] leading-[18px] text-ink-500">
            We&apos;re working hard to bring Cheeku AI to more languages.
          </Text>
        </Panel>
      </View>

      <View className="mt-5 px-5">
        <Text className="text-[15px] font-semibold text-ink-700">
          Available now
        </Text>
        {/* `alignSelf: stretch` because PopIn's animated wrapper otherwise
            shrinks to its content, leaving this card narrower than the list
            below it. */}
        <PopIn index={0} style={{ alignSelf: "stretch" }}>
          <View
            className="mt-2 flex-row items-center gap-3 rounded-card bg-brand-50 p-3.5"
            style={{ borderWidth: 2, borderColor: brand[500] }}
          >
            <View className="h-9 w-9 items-center justify-center rounded-pill bg-surface">
              <Text className="text-[12px] font-bold text-brand-600">EN</Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[14px] font-semibold text-ink-900">English</Text>
              <Text className="text-[12px] font-medium text-brand-600">Default language</Text>
            </View>
            <View className="h-6 w-6 items-center justify-center rounded-pill bg-brand-600">
              <Check size={14} color="#fff" />
            </View>
          </View>
        </PopIn>
      </View>

      <View className="mt-5 px-5">
        <Text className="text-[15px] font-semibold text-ink-700">
          Coming soon
        </Text>
        <View className="mt-2 overflow-hidden rounded-card bg-surface" style={shadow.e1}>
          {COMING_SOON.map(([native, name], i) => (
            <StaggerItem key={name} index={i}>
              <View
                className="flex-row items-center gap-3 p-3"
                style={{
                  opacity: 0.7,
                  ...(i > 0 ? { borderTopWidth: 1, borderTopColor: surface.line } : null),
                }}
              >
                <View className="h-9 w-9 items-center justify-center rounded-pill bg-brand-50">
                  <Text className="text-[13px] font-semibold text-brand-600">
                    {native.charAt(0)}
                  </Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[14px] font-semibold text-ink-900">{native}</Text>
                  <Text className="text-[12px] text-ink-500">{name}</Text>
                </View>
                <View className="rounded-pill bg-brand-50 px-2.5 py-1">
                  <Text className="text-[11px] font-semibold text-brand-600">Coming soon</Text>
                </View>
              </View>
            </StaggerItem>
          ))}
        </View>
      </View>

      <View className="mx-5 mt-4 flex-row items-start gap-2 rounded-card bg-brand-50 px-3.5 py-3">
        <Globe size={15} color={brand[500]} style={{ marginTop: 1 }} />
        <Text className="flex-1 text-[12px] leading-[17px] text-ink-500">
          We&apos;re constantly adding more languages to make Cheeku AI accessible for everyone.
        </Text>
      </View>
    </SettingsScreen>
  );
}
