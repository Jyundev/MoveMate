import QueryProvider from '@/shared/components/QueryProvider';
import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'MoveMate',
  description: '서울 도착 후 마지막 이동을 도와주는 서비스',
  // PWA 관련
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MoveMate',
  },
};

// 앱 뷰포트 설정 (안드로이드 필수)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,       // 핀치줌 방지
  userScalable: false,   // 더블탭 줌 방지
  viewportFit: 'cover',  // 노치/펀치홀 영역까지 확장
  themeColor: '#3b82f6', // 안드로이드 상단 상태바 색상
  interactiveWidget: 'resizes-content', // 키보드 올라올 때 뷰 밀어올리기
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
