# Truss App Design Concept v0.3

## コンセプト

**Trussはイベントアプリではない。**

TrussのMissionは、

> **「人と人との縁を生み出すこと」**

である。

アプリはその縁を

* 記録する
* 育てる
* 長く続ける

ためのインフラである。

---

# 世界観

## Passport

会員証ではない。

学生証でもない。

**人生のJourneyを記録するPassport。**

Passportは一生有効。

退会という概念はなく、

Trussとの関わり方だけが変わっていく。

---

## Journey

イベント参加ではなく

**Journey**

という考え方。

例えば

* BBQ
* Hiking
* LEC
* Christmas

すべてJourneyとして記録される。

---

## Connections

友達一覧ではない。

**「人生で出会った人」**

を記録するページ。

DM機能は持たない。

LINE

WhatsApp

Instagram

などへ繋ぐ。

Trussは

**出会うところまで責任を持つ。**

---

## Memories

写真と思い出。

Journeyと紐付く。

---

# Bottom Navigation

```
🏠 Home

🗺 Journey

📷 Memories

🤝 Connections

🛂 Passport
```

---

# Passport構成

## 1ページ目

プロフィール

Passport風デザイン

* Passport Number
* Name
* Member Since
* Connections
* Journey Count

---

## 2ページ目以降

Journey Stamps

イベントへ参加すると

デジタルスタンプが増える。

紙ではなく、

Passportに押されるような演出。

---

## Contributions

コミュニティへの貢献

例

* Event Staff
* Event Leader
* President
* Mentor

役職ではなく

**Contribution**

として記録する。

---

## Current Roles

現在の役割

例

* Active Member
* Supporter
* Mentor
* Host

複数保持可能。

---

# Membership思想

卒業という概念はシステムでは管理しない。

代わりに

現在の関わり方だけ管理する。

例

```
Passport Holder

+

Active Member

+

Supporter

+

Mentor

+

Host
```

---

Passport Holder

↓

全員

---

Active Member

↓

現在活動中

---

Supporter

↓

Trussを金銭的に支援

---

Mentor

↓

後輩相談

---

Host

↓

海外・地方でTrussメンバーを歓迎

---

# Support制度

金額でランクは作らない。

例

```
Support Truss

金額は自由

(おすすめ ¥3,000)
```

重要なのは

**支援すること**

であり

支援額ではない。

---

支援方法も複数

* 金銭
* Mentor
* Host
* App Contributor
* Event Volunteer

---

# Communication

ユーザー同士DM

❌ 作らない

理由

* LINE
* WhatsApp
* Instagram

の方が優れているため。

---

Trussが持つチャット

✅ 運営とのみ

例

```
Truss Embassy

・問い合わせ

・イベント相談

・入会

・困りごと
```

運営との公式窓口。

---

# Electronic Stamp

イベント受付ではない。

**Journeyを刻む儀式。**

---

BLEスタンプ

木製スタンプ型デバイス

↓

スマホへ軽く押す

↓

BLE通信

↓

Passportへ

スタンプが

ジュワッ

と押される。

重要なのは

Bluetoothではなく

**スタンプを押す体験。**

---

# Connection Bump

名刺交換ではない。

**縁が生まれる瞬間の儀式。**

---

出会った二人が

スマホを軽く振る

↓

近くの端末を検知

↓

二人とも「はい」と応えて

↓

Connectionsに

お互いが刻まれる

---

同じ人と

別の日に

3回出会うと

**Friends**

になる。

一度の飲み会で

連打しても

Friendsにはならない。

**時間をかけた縁だけが**

Friendsとして記録される。

---

そして数年後。

「あの日、出会った人」

を思い出させてくれる通知が届く。

Trussは

**出会った瞬間だけでなく**

**縁が続いていることも**

記録し続ける。

---

# UI Direction

キーワード

* Passport
* Journal
* Journey
* Watercolor
* Hand Drawn
* Warm
* Stamp
* Vintage
* Cream
* Soft Blue

---

デザイン

* ベージュ背景
* Truss Blue
* 手書き文字
* 少し掠れたアイコン
* 水彩
* スタンプ
* 橋のイラスト

---

# アイコンデザイン

目指す方向

* 完璧なベクターではない
* 少し歪みがある
* インクが掠れる
* スタンプ風
* 手描き感

---

# 将来構想

卒業後も

Passportは有効。

Connectionsも消えない。

Journeyも増え続ける。

Supportもできる。

Mentorにもなれる。

Hostにもなれる。

Trussは

**「学生サークル」ではなく、一生続くコミュニティ**になる。

---

## デザインキーワード（Claude Design向け）

> A warm, premium mobile app inspired by a travel passport and personal journal. Soft cream background, Truss blue accent color, hand-drawn textured icons, slightly distressed handwritten typography, watercolor illustrations, rubber stamp aesthetics, vintage passport pages, bridge illustrations, generous white space, calm and emotional atmosphere. The UI should feel like documenting a lifelong journey rather than managing events. Avoid corporate or overly modern SaaS aesthetics. Emphasize warmth, memories, human connections, and storytelling.

---

## ビジュアルリファレンス（ムードボード, 2026-07-03追加）

`docs/`配下の `ChatGPT Image *.png`（6枚）。ChatGPT Images 2.0で生成した**探索的なムードボード**であり、確定UIではない。方向性の参考として以下を抽出。

### ブランドアイデンティティ
- ロゴ: 三角形（橋の主塔がモチーフ）+ 「Truss」ロゴタイプ
- 英字フォント: Playfair Display（見出し）/ 手書き風フォント（アクセントコピー: "The journey continues." 等）
- 和文フォント: Noto Sans JP

### カラーパレット（確定: パステル・ジャーナル系）
- Blue `#6DB9E7` / Green `#B7D8C1` / Peach `#F3C7B6` / Navy `#3D4756`、背景はクリーム `#F7F5F1`
- ヴィンテージ・レザー系（`#F5EDE0` 〜 `#BA6A4A` の茶〜ネイビー、革表紙・古い地図調のトーン）は不採用

### スタンプのアイコン体系
イベント種別ごとに色とアイコンを対応させる案（BBQ=青い橋、International Mixer=緑の人型、Cafe Meetup=オレンジのコーヒーカップ、LEC Session=紫の本、Hiking Trip=山、Christmas Party=赤いツリー、New Year=花火、Volunteer Day=手、Summer Camp=テント）。実装時は `event_icons.ts` の拡張、または `event_categories` マスタとして整理する

### Connectionsのネットワーク表示
一覧だけでなく、人と人のつながりをノード＋線のグラフで見せる案。各Connectionの詳細に「どこで出会ったか（イベント名・日付）」を表示する案があり、これは8節で設計した `connection_events.event_id` / `occurred_at` とそのまま対応する

### BLEスタンプのハードウェア仕様（ムードボードより）
- 直径60mm × 高さ40mm、重量約80g、BLEモジュールは ESP32-C3、USB-C充電のリチウムイオンバッテリー、木製ケース（レーザー刻印）。デザインバリエーションとして木製（ナチュラル/ダーク）とアクリル（透明/Truss Blue）
- **プロトコル**: スタンプデバイスは固定の「デバイスID」をBLEで送信するだけ。「このデバイスIDが今日どのイベントのスタンプか」は**サーバー側のマッピング（デバイスID × 日付 → イベントID）で管理**し、デバイス自体の再プログラムは不要。これによりPhase 5（Electronic Stamp）の実装は「BLEでデバイスIDを受信→サーバーに問い合わせ→該当イベントのスタンプをPassportに記録」というシンプルなフローになる

### 将来構想として確定: Print & Send（卒業後の物理Passport郵送）
貯めたスタンプをPDFの冊子にまとめ、支援者やメンターへの感謝メッセージを添えて印刷・郵送できる機能。デザインコンセプトの「支援すること」というテーマを、卒業後に物理的な形で返す体験。v0.3のテキストには無かった新規アイデアだが、Trussの将来構想の一つとして正式にロードマップ（`plan.md` Phase 7）に採用。実装時期・方式（PDF生成、印刷・配送方法）はMVP後に詳細検討する

### ボトムナビ（確定: v0.3案を採用）
下部タブは v0.3どおり Home / Journey / Memories / Connections / Passport の5タブで確定。ムードボードの画面モック（ホーム/イベント/パスポート/メンバー/メニュー）は参考にとどめ、採用しない
