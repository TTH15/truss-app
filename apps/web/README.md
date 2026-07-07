This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### Truss: Google 認証が `localhost` に飛ぶとき（本番 URL 固定）

1. **Vercel** の Environment Variables に次を追加（Production にチェック）:
   - `NEXT_PUBLIC_APP_URL` = `https://trussapp-alpha.vercel.app`（末尾スラッシュなし）
   - 再デプロイ後、OAuth の `redirectTo` は常にこのオリジンになります。

2. **Supabase** → Authentication → URL Configuration:
   - **Site URL** を `https://trussapp-alpha.vercel.app` にする（`localhost` のままだとリダイレクトが localhost 側に寄りやすいです）。
   - **Redirect URLs** に次を必ず含める:
     - `https://trussapp-alpha.vercel.app/auth/callback`
     - ローカル開発用なら `http://localhost:3000/auth/callback` も追加可。

3. **Google Cloud Console**（OAuth クライアント）では、リダイレクト URI は **`https://<project-ref>.supabase.co/auth/v1/callback`**（Supabase が案内する URL）を登録します。アプリの Vercel URL はここではなく、上記 Supabase の Redirect URLs で許可します。
