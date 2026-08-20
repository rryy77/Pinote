# Pinote

GPS で「今いる場所」にメモを残せる位置メモアプリ。行ったお店の感想、気になるお店、
空いている駐車場など、地図のピンから見返せる。メモはこの端末内（SQLite）にのみ保存され、
オフラインでも動作する。

## 技術スタック

- **Expo (SDK 57) + React Native + TypeScript**
- **Expo Router**（ファイルベースのルーティング, `src/app`）
- **expo-maps** — iOS は Apple Maps（APIキー不要）、Android は Google Maps
- **expo-location** — 現在地取得（フォアグラウンドのみ）
- **expo-sqlite** — 端末内データ保存
- **Zustand** — メモ一覧のインメモリキャッシュ

## ディレクトリ構成

```
src/
  app/                     # 画面（Expo Router）
    (tabs)/                # タブ: index=地図 / list=一覧 / settings=設定
    memo/new.tsx           # メモ作成（モーダル）
    memo/[id].tsx          # メモ詳細・編集・削除
  components/pinote/       # PinoteMap, CategoryPicker, Button
  db/                      # client.ts(接続/マイグレーション) + memos.ts(CRUD)
  store/useMemoStore.ts    # Zustand ストア
  location/                # 現在地フック
  utils/distance.ts        # 距離計算(Haversine)
  constants/categories.ts  # カテゴリ定義（絵文字/ピン色/SFシンボル）
  types/memo.ts
```

データの入出力はすべて `src/db/memos.ts` を経由する（将来クラウド同期を足す拡張点）。

## 開発の始め方

> ⚠️ 地図・SQLite はネイティブモジュールのため **Expo Go では動作しません**。
> **開発ビルド (development build)** で実行してください。

### iOS シミュレータ / 実機で開発ビルドを起動（Mac + Xcode 必須）

```bash
npx expo run:ios
```

初回はネイティブプロジェクトの生成と CocoaPods のインストールが走る。
以降 JS の変更は `npx expo start --dev-client` でホットリロードされる。

### シミュレータでの位置情報テスト

iOS シミュレータの **Features > Location > Custom Location…** で座標を設定すると、
現在地の取得・メモ作成を確認できる。

## App Store への配布

1. **Apple Developer Program** に登録（$99/年）。
2. `app.json` の `ios.bundleIdentifier`（現在 `com.pinote.app`）を自分のユニークな ID に変更。
3. EAS でビルド／申請：
   ```bash
   npx eas build --platform ios --profile production
   npx eas submit --platform ios --profile production
   ```
4. App Store Connect の「App Privacy」で位置情報の利用（端末内のみ・トラッキングなし）を申告。

位置情報の利用目的は `app.json` の `expo-location` / `expo-maps` プラグインで
日本語表記済み（`Info.plist` の `NSLocationWhenInUseUsageDescription`）。
