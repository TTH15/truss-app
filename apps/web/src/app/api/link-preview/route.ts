import { NextResponse } from "next/server";

// チャット本文に貼られたURLのOGPメタタグを取得し、LINEのようなリンクプレビューカードに使う。
// 任意のURLを取得するプロキシになるため、SSRF対策としてローカル/プライベートアドレスへの
// アクセスは拒否する。

const BLOCKED_HOSTNAMES = new Set(["localhost", "0.0.0.0", "[::1]"]);

function isPrivateIPv4(hostname: string): boolean {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const [a, b] = [Number(match[1]), Number(match[2])];
  if (a === 127) return true; // loopback
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 169 && b === 254) return true; // link-local
  return false;
}

function isBlockedUrl(url: URL): boolean {
  if (url.protocol !== "http:" && url.protocol !== "https:") return true;
  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) return true;
  if (hostname.endsWith(".local")) return true;
  if (isPrivateIPv4(hostname)) return true;
  return false;
}

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (isBlockedUrl(target)) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(target.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TrussLinkPreview/1.0; +https://truss.app)",
        Accept: "text/html",
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return NextResponse.json(
        { title: null, description: null, image: null, siteName: target.hostname },
        { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" } }
      );
    }

    // OGPタグは通常<head>内にあるため、全文パースせず先頭のみ読む（大きすぎるページ対策）
    const reader = res.body?.getReader();
    let html = "";
    if (reader) {
      const decoder = new TextDecoder();
      while (html.length < 100_000) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
      }
      void reader.cancel().catch(() => {});
    }

    const titleTagMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    let image = extractMeta(html, "og:image") ?? extractMeta(html, "twitter:image");
    if (image && !/^https?:\/\//i.test(image)) {
      try {
        image = new URL(image, target.origin).toString();
      } catch {
        image = null;
      }
    }

    const data = {
      title: decodeHtmlEntities(extractMeta(html, "og:title") ?? titleTagMatch?.[1]?.trim() ?? target.hostname),
      description: decodeHtmlEntities(extractMeta(html, "og:description") ?? extractMeta(html, "description") ?? ""),
      image,
      siteName: decodeHtmlEntities(extractMeta(html, "og:site_name") ?? target.hostname),
    };

    return NextResponse.json(data, {
      headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch preview" }, { status: 502 });
  }
}
