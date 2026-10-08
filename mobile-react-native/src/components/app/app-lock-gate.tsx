import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Fingerprint, ShieldCheck } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus, Platform, Pressable, Text, View } from "react-native";

import { MascotBust } from "@/components/illustrations/sprout";
import { signOutAndWipe } from "@/lib/privacy/local-data";
import { authenticate, isLockEnabled, lockDelay, onLockSettingsChanged } from "@/lib/security/app-lock";
import { DEFAULT_LOCK_DELAY, shouldLock, type LockDelay } from "@/lib/security/lock-timing";
import { brand, ink, surface } from "@/theme/tokens";
import { Brand } from "@/components/ui/brand";

/*
 * Holds the app behind a biometric challenge when the lock is on.
 *
 * Wraps the whole navigator rather than living on a screen, because the thing
 * being protected is "the app was left open on a table", and that can happen on
 * any screen. Putting the gate on one route means every other route is the way
 * around it.
 *
 * There are two separate covers here and they do different jobs:
 *
 *   THE LOCK SCREEN is shown after the app has been away and needs a pass to
 *   come back.
 *
 *   THE PRIVACY SHIELD is shown the instant the app goes inactive, before it
 *   is backgrounded. iOS photographs the screen for the app switcher, and
 *   without this the switcher thumbnail is somebody's lab results — visible to
 *   anyone who double-taps the home bar, with no challenge at all. That
 *   screenshot is the leak the lock is supposed to prevent, so it has to be
 *   covered on `inactive`, not on `background`, which arrives too late.
 */
export function AppLockGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const [shielded, setShielded] = useState(false);
  const [prompting, setPrompting] = useState(false);
  const [failed, setFailed] = useState(false);

  /*
   * Read as a ref as well as state. The AppState listener is registered once
   * and would otherwise close over the value from its first render, which is
   * always `false` — so the app would never lock no matter what the setting
   * said. This is the whole bug class that makes lock features quietly inert.
   */
  const enabledRef = useRef(false);
  const lockedRef = useRef(false);
  const delayRef = useRef<LockDelay>(DEFAULT_LOCK_DELAY);
  /** When the app last stopped being active. Null while it is in front. */
  const awayAtRef = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [on, delay] = await Promise.all([isLockEnabled(), lockDelay()]);
      if (!alive) return;
      enabledRef.current = on;
      delayRef.current = delay;
      setEnabled(on);
      // A cold start with the lock on is locked. The app was not "away", it was
      // not running, which is strictly further away. The delay does not apply.
      if (on) {
        lockedRef.current = true;
        setLocked(true);
      }
    })();

    /*
     * Changes made in Settings while the app is open. The person changing them
     * has just passed the challenge to do it, so this never locks on the spot;
     * it only makes the next departure count.
     */
    const off = onLockSettingsChanged(() => {
      void Promise.all([isLockEnabled(), lockDelay()]).then(([on, delay]) => {
        if (!alive) return;
        enabledRef.current = on;
        delayRef.current = delay;
        setEnabled(on);
        if (!on) {
          lockedRef.current = false;
          setLocked(false);
          setShielded(false);
        }
      });
    });

    return () => {
      alive = false;
      off();
    };
  }, []);

  const unlock = useCallback(async () => {
    setPrompting(true);
    const passed = await authenticate("Unlock Cheeku AI");
    setPrompting(false);
    if (passed) {
      lockedRef.current = false;
      setLocked(false);
      setFailed(false);
      return;
    }
    // Stays locked. `failed` only changes the copy, so the reader knows the
    // prompt was dismissed rather than never shown.
    setFailed(true);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (!enabledRef.current) return;

      if (next === "active") {
        const awayAt = awayAtRef.current;
        awayAtRef.current = null;
        if (awayAt !== null && !lockedRef.current && shouldLock(Date.now() - awayAt, delayRef.current)) {
          lockedRef.current = true;
          setLocked(true);
        }
        setShielded(false);
        return;
      }

      /*
       * Both `inactive` and `background` raise the shield, always, whatever
       * the delay: the switcher snapshot is taken now, not when the delay runs
       * out. `inactive` alone covers the snapshot and the notification shade;
       * `background` is the actual departure.
       *
       * With no delay the lock arms here too, on the earlier of the two, which
       * costs a challenge after a dismissed control centre: the correct side to
       * err on. With a delay, the clock starts on the first of the two and the
       * lock is decided on the way back in.
       */
      setShielded(true);
      if (awayAtRef.current === null) awayAtRef.current = Date.now();
      if (delayRef.current === 0) {
        lockedRef.current = true;
        setLocked(true);
      }
    });
    return () => sub.remove();
  }, []);

  /*
   * The way out for someone whose biometrics have genuinely stopped working.
   *
   * Signing out is destructive to the session but not to the data: everything
   * is on the server and comes back on the next sign-in. Without this, a
   * cracked fingerprint sensor means a reinstall to reach your own medical
   * records, and people in that position are usually the ones who need them.
   */
  async function escapeBySigningOut() {
    // The same full sign-out as Settings: session, push token, and everything
    // on the phone that is about this person.
    await signOutAndWipe(queryClient);
    lockedRef.current = false;
    setLocked(false);
    router.replace("/welcome");
  }

  return (
    <View style={{ flex: 1 }}>
      {children}

      {/*
       * Rendered over the children rather than instead of them. Unmounting the
       * navigator would tear down every screen's state and drop the reader back
       * at the root each time they glanced at a notification.
       */}
      {enabled && (locked || shielded) ? (
        <View
          // The shield alone is not interactive; the lock screen is.
          pointerEvents={locked ? "auto" : "none"}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: surface.canvas,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 32,
          }}
        >
          <MascotBust size={148} moment="idle" move="float" />

          {locked ? (
            <>
              <Text className="mt-5 text-center text-[21px] font-bold text-ink-900">
                <Brand ai /> is locked
              </Text>
              <Text className="mt-2 text-center text-[13.5px] leading-[20px] text-ink-500">
                {failed
                  ? "That did not go through. Try again when you are ready."
                  : "Your family's records are private. Unlock to open them."}
              </Text>

              <Pressable
                accessibilityRole="button"
                disabled={prompting}
                onPress={() => void unlock()}
                className="mt-6 h-12 flex-row items-center justify-center gap-2 rounded-pill px-7"
                style={{ backgroundColor: brand[600], opacity: prompting ? 0.6 : 1 }}
              >
                <Fingerprint size={18} color="#fff" />
                <Text className="text-[15.5px] font-bold text-white">Unlock</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => void escapeBySigningOut()}
                hitSlop={8}
                className="mt-4"
              >
                <Text className="text-[13px] font-medium text-ink-500">
                  Can&apos;t unlock? Sign out
                </Text>
              </Pressable>
            </>
          ) : (
            /* The shield. Deliberately says nothing about what is underneath —
               this is the frame that ends up in the app switcher. */
            <View className="mt-5 flex-row items-center gap-2">
              <ShieldCheck size={16} color={ink[300]} />
              <Text className="text-[13px] text-ink-300"><Brand ai /></Text>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

/**
 * On web the gate is a passthrough.
 *
 * `expo-local-authentication` has no web implementation, so a lock there would
 * render a screen with an Unlock button that can never succeed. The preview is
 * the only place this app runs on web.
 *
 * Branching INSIDE the component rather than picking one at module scope
 * (`const AppLock = isWeb ? PassThrough : AppLockGate`). That version threw
 * `ReferenceError: AppLock is not defined` under Metro: the const is in its
 * temporal dead zone while the importing module is still evaluating, and a
 * function declaration is hoisted where a const is not.
 */
export function AppLock({ children }: { children: React.ReactNode }) {
  if (Platform.OS === "web") return <>{children}</>;
  return <AppLockGate>{children}</AppLockGate>;
}
