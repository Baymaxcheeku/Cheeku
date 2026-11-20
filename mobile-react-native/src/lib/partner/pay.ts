import * as WebBrowser from "expo-web-browser";
import { Linking } from "react-native";

/*
 * Opens the partner's payment page in an in-app browser sheet. Resolves when
 * the person closes it, so the screen behind can check straight away whether
 * the payment went through. Falls back to the system browser.
 */
export async function openPayment(link: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(link, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET, dismissButtonStyle: "done" });
  } catch {
    await Linking.openURL(link).catch(() => undefined);
  }
}

/** "12 min" or "1 min" until the link lapses; null once it has. */
export function minutesLeft(dueAt: string | null, now = Date.now()): number | null {
  if (!dueAt) return null;
  const ms = new Date(dueAt).getTime() - now;
  return ms > 0 ? Math.max(1, Math.ceil(ms / 60_000)) : null;
}
