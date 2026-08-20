import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Stack, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/pinote/button';
import { colors } from '@/constants/colors';
import { importBackup, writeBackupFile } from '@/db/backup';
import { useMemoStore } from '@/store/useMemoStore';

export default function BackupScreen() {
  const router = useRouter();
  const count = useMemoStore((s) => s.memos.length);
  const load = useMemoStore((s) => s.load);
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);

  const onExport = async () => {
    setBusy('export');
    try {
      const uri = await writeBackupFile();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/json',
          dialogTitle: 'Pinote バックアップ',
        });
      } else {
        Alert.alert('共有できません', 'この端末では共有機能が使えません。');
      }
    } catch (e) {
      Alert.alert('書き出しに失敗しました', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const onImport = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets[0]) return;
      setBusy('import');
      const n = await importBackup(res.assets[0].uri);
      await load();
      Alert.alert('復元しました', `${n} 件のメモを読み込みました。`);
    } catch (e) {
      Alert.alert('読み込みに失敗しました', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'バックアップ',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Ionicons name="close" size={26} color={colors.brand} />
            </Pressable>
          ),
        }}
      />

      <View style={styles.card}>
        <Ionicons name="shield-checkmark-outline" size={26} color={colors.brand} />
        <Text style={styles.cardText}>
          メモはこの端末内だけに保存されています。機種変更や故障で消えないよう、ときどき書き出して安全な場所（ファイル / iCloud Drive）に保管しましょう。
        </Text>
      </View>

      <Text style={styles.count}>保存中のメモ：{count} 件</Text>

      <View style={styles.actions}>
        <Button
          label="バックアップを書き出す"
          onPress={onExport}
          loading={busy === 'export'}
          disabled={busy !== null || count === 0}
        />
        <Button
          label="バックアップから復元"
          variant="ghost"
          onPress={onImport}
          loading={busy === 'import'}
          disabled={busy !== null}
        />
      </View>

      <Text style={styles.note}>
        復元すると、バックアップ内のメモが現在のメモに追加されます（上書きはされません）。
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 20,
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.bg,
  },
  cardText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: '#3C4149',
  },
  count: {
    marginTop: 20,
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  actions: {
    marginTop: 16,
    gap: 12,
  },
  note: {
    marginTop: 16,
    fontSize: 12,
    color: colors.subInk,
    lineHeight: 18,
  },
});
