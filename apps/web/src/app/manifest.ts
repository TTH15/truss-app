import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Truss',
    short_name: 'Truss',
    description:
      '神戸大学 留学生支援サークル Truss の公式アプリ / Official app of Truss, the international student support club at Kobe University',
    start_url: '/',
    display: 'standalone',
    background_color: '#F5F1E8',
    theme_color: '#F5F1E8',
    icons: [
      { src: '/icons/truss-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/truss-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/truss-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
