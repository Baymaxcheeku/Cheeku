import { CloudOff } from "lucide-react-native";
import { Text, View } from "react-native";

import { formatSyncedAt, useIsOnline } from "@/lib/offline/status";
import { ink, semantic } from "@/theme/tokens";

/**
 * Says the app is offline, and how old what you are looking at is.
 *
 * AMBER, NOT RED, and this is the one place the semantic palette is spent on
 * something that is not a health value. Being offline is a caution: the
 * records on screen are real and were true when they arrived. Red would read
 * as a warning about the reader's health, which is what red means everywhere
 * else in this app.
 *
 * The timestamp is the load-bearing part. "Offline" alone tells someone the
 * network is down; "last synced 09:14" tells them whether the result they are
 * about to quote to a doctor predates this morning's test.
 */
export function OfflineBanner({ updatedAt }: { updatedAt?: number }) {
  const online = useIsOnline();
  if (online) return null;

  const synced = formatSyncedAt(updatedAt);

  return (
    <View
      accessibilityRole="alert"
      className="mx-5 mb-3 flex-row items-center gap-2.5 rounded-tile px-3.5 py-2.5"
      style={{ backgroundColor: semantic.cautionBg }}
    >
      <CloudOff size={15} color={semantic.cautionText} />
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-semibold" style={{ color: semantic.cautionText }}>
          You&apos;re offline
        </Text>
        <Text className="mt-0.5 text-xs" style={{ color: ink[500] }}>
          {synced ? `${synced}. New records won't appear until you reconnect.` : "Showing what was saved on this device."}
        </Text>
      </View>
    </View>
  );
}
