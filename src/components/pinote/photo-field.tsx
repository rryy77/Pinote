import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  /** Current photo uri (stored or freshly picked), or null. */
  uri: string | null;
  onChange: (uri: string | null) => void;
};

/** Attach / preview / remove a single memo photo via the OS image picker. */
export function PhotoField({ uri, onChange }: Props) {
  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        '写真へのアクセスが必要です',
        '設定 > Pinote から写真の許可をしてください。',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) onChange(result.assets[0].uri);
  };

  if (uri) {
    return (
      <View style={styles.wrap}>
        <Image source={{ uri }} style={styles.image} contentFit="cover" />
        <Pressable style={styles.remove} onPress={() => onChange(null)} hitSlop={8}>
          <Ionicons name="close" size={18} color="#FFFFFF" />
        </Pressable>
        <Pressable style={styles.change} onPress={pick}>
          <Ionicons name="camera" size={15} color="#FFFFFF" />
          <Text style={styles.changeText}>変更</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable style={styles.add} onPress={pick}>
      <Ionicons name="camera-outline" size={22} color="#FF5B4A" />
      <Text style={styles.addText}>写真を追加</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E9EDF2',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  remove: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  change: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  changeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  add: {
    height: 96,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#B9C0C8',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F7F8FA',
  },
  addText: {
    color: '#FF5B4A',
    fontSize: 15,
    fontWeight: '700',
  },
});
