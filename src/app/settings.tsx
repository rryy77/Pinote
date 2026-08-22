import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';

/**
 * Settings hub, opened from the top-right tools menu. Groups the less-frequent
 * controls — account/sign-in, light/dark, and the app's main color — so the map
 * tools stay minimal.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const displayName = useAuthStore((s) => s.displayName);
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  const accountSub = user ? displayName || 'サインイン済み' : '新規登録・ログイン';

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '設定',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Ionicons name="close" size={26} color={colors.brand} />
            </Pressable>
          ),
        }}
      />

      <View style={styles.group}>
        <Row
          icon="people-outline"
          label="アカウント"
          sub={accountSub}
          onPress={() => router.push('/account')}
        />
      </View>

      <View style={styles.group}>
        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: colors.brandSoft }]}>
            <Ionicons name={mode === 'dark' ? 'moon' : 'sunny'} size={20} color={colors.brand} />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowLabel}>テーマ</Text>
            <Text style={styles.rowSub}>{mode === 'dark' ? 'ダークモード' : 'ライトモード'}</Text>
          </View>
          <View style={styles.segment}>
            <Pressable
              onPress={() => setMode('light')}
              style={[styles.segBtn, mode === 'light' && styles.segBtnOn]}>
              <Ionicons name="sunny" size={16} color={mode === 'light' ? colors.onAccent : colors.subInk} />
            </Pressable>
            <Pressable
              onPress={() => setMode('dark')}
              style={[styles.segBtn, mode === 'dark' && styles.segBtnOn]}>
              <Ionicons name="moon" size={16} color={mode === 'dark' ? colors.onAccent : colors.subInk} />
            </Pressable>
          </View>
        </View>

        <View style={styles.divider} />

        <Row
          icon="color-palette-outline"
          label="アプリの基本色"
          sub="メインカラーを変更"
          onPress={() => router.push('/appearance')}
        />
      </View>
    </View>
  );
}

function Row({
  icon,
  label,
  sub,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.brandSoft }]}>
        <Ionicons name={icon} size={20} color={colors.brand} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16, gap: 16 },
  group: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 16, fontWeight: '700', color: colors.ink },
  rowSub: { fontSize: 13, color: colors.subInk, marginTop: 1 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginLeft: 64 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: 999,
    padding: 3,
    gap: 2,
  },
  segBtn: {
    width: 40,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segBtnOn: { backgroundColor: colors.brand },
  pressed: { opacity: 0.7 },
});
