# @platform/ui

表示専用の共有 UI コンポーネント(出自: truss-app の shadcn 構成)。データ取得・業務ロジック禁止。

| モジュール | 内容 |
|---|---|
| `utils` | `cn()`(clsx + tailwind-merge) |
| `button` | shadcn Button + `buttonVariants` |
| `popover` | shadcn Popover(Radix ラッパー) |
| `calendar` | react-day-picker v9 ベースのカレンダー |
| `date-picker` | Button + Popover + Calendar を束ねた単一日付ピッカー |

## 消費側が満たすべき契約

1. **React >= 18.3**(コンポーネントは forwardRef を維持し、19 専用 API は使わない)
2. **Tailwind CSS v4**(`origin-(--var)` / `outline-hidden` 等の v4 構文を含む。v3 プロジェクトは v4 化してから採用する)
3. **Tailwind のソース走査に本パッケージを追加**(vendor コピーはアプリの `src/` 外にあるため自動検出されない):
   ```css
   /* apps/web/src/app/globals.css など、@import "tailwindcss" と同じファイルに */
   @source "../../../../packages/ui/src";
   ```
4. **shadcn デザイントークンの定義**: `@theme inline` で `--color-*` にマッピングされた
   `--primary` `--primary-foreground` `--accent` `--accent-foreground` `--background` `--foreground`
   `--popover` `--popover-foreground` `--border` `--input` `--ring` `--muted-foreground` `--destructive` `--secondary` `--secondary-foreground`
5. peerDependencies(react-day-picker v9, radix popover/slot, lucide-react)をアプリ側にインストールする
6. Next.js は `transpilePackages` に `@platform/ui` を追加する

## 方針

- 「純正(ネイティブ)に迫る使い心地」を目標に、date-picker / time-picker 系をここで育てる。
- hakotora には月・年ホイール付きカレンダー実装があり、Tailwind v4 化後にここへ統合する予定。
