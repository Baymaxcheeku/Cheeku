import { View, Text } from "react-native";

export default function Splash() {
  return (
    <View className="flex-1 items-center justify-center bg-canvas">
      <Text className="text-[28px] font-bold text-ink-900">Baymax</Text>
      <Text className="mt-2 text-[14px] text-ink-500">Your family&apos;s health companion</Text>
    </View>
  );
}
