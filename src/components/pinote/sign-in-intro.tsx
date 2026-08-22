import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/pinote/button';
import { colors } from '@/constants/colors';
import { APPLE_READY, GOOGLE_READY, useAuthStore } from '@/store/useAuthStore';

type Props = {
  /** Called after the overlay finishes its exit animation and should unmount. */
  onDone: () => void;
};

/**
 * First-run sign-in prompt. Shown as a full-screen overlay right after the theme
 * choice, cross-fading in as that screen fades out (no jarring map flash / modal
 * pop). Sign-in is optional — "あとで" continues into the app.
 */
export function SignInIntro({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const busy = useAuthStore((s) => s.busy);
  const signInWithApple = useAuthStore((s) => s.signInWithApple);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signInAnonymously = useAuthStore((s) => s.signInAnonymously);

  // Enters via a fade + rise; leaves via a fade + gentle zoom that reveals the map.
  const enter = useSharedValue(0);
  const leave = useSharedValue(0);
  const leaving = useRef(false);

  const style = useAnimatedStyle(() => ({
    opacity: enter.value * (1 - leave.value),
    transform: [{ translateY: (1 - enter.value) * 24 }, { scale: 1 + leave.value * 0.08 }],
  }));

  // Play the entrance once mounted.
  useEffect(() => {
    enter.value = withTiming(1, { duration: 420 });
  }, [enter]);

  const dismiss = () => {
    if (leaving.current) return;
    leaving.current = true;
    leave.value = withTiming(1, { duration: 420 }, (finished) => {
      if (finished) runOnJS(onDone)();
    });
  };

  const onGuest = async () => {
    try {
      await signInAnonymously();
    } finally {
      dismiss();
    }
  };

  // Sign in, then slide into the app on success. Cancels are swallowed by the store.
  const onProvider = async (fn: () => Promise<void>) => {
    try {
      await fn();
      dismiss();
    } catch (e) {
      Alert.alert('サインインに失敗しました', String((e as Error)?.message ?? e));
    }
  };

  return (
    <Animated.View
      style={[
        styles.overlay,
        { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 28 },
        style,
      ]}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Ionicons name="people" size={38} color={colors.onAccent} />
        </View>
        <Text style={styles.title}>友達と地図をシェア</Text>
        <Text style={styles.subtitle}>
          サインインすると、グループを作って友達・家族とメモを共有できます。あとでも設定できます。
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          label={APPLE_READY ? 'Appleでサインイン' : 'Appleでサインイン（準備中）'}
          onPress={() => void onProvider(signInWithApple)}
          disabled={!APPLE_READY || busy}
        />
        <Button
          label={GOOGLE_READY ? 'Googleでサインイン' : 'Googleでサインイン（設定待ち）'}
          variant="ghost"
          onPress={() => void onProvider(signInWithGoogle)}
          disabled={!GOOGLE_READY || busy}
        />
        <View style={styles.divider} />
        <Button
          label="テスト用ログイン（匿名）"
          variant="ghost"
          onPress={() => void onGuest()}
          loading={busy}
        />
        <Pressable onPress={dismiss} hitSlop={8} style={styles.skip}>
          <Text style={styles.skipText}>あとで</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 95,
    backgroundColor: colors.surface,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },
  header: { alignItems: 'center', gap: 10, marginTop: 24 },
  badge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 26, fontWeight: '900', color: colors.ink },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.subInk,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  actions: { gap: 12 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginVertical: 2 },
  skip: { alignSelf: 'center', paddingVertical: 10, marginTop: 2 },
  skipText: { fontSize: 15, fontWeight: '700', color: colors.subInk },
});
