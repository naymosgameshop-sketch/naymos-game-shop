import type { Metadata } from 'next';
import { Prompt } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { MusicPlayerProvider } from '@/components/music/MusicPlayerContext';
import { GlobalBGMPlayer } from '@/components/music/GlobalBGMPlayer';

const prompt = Prompt({
  variable: '--font-prompt',
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: {
    default: 'NayMos GameShop | บริการเติมเกมออนไลน์ ปลอดภัย รวดเร็ว 100%',
    template: '%s | NayMos GameShop',
  },
  description:
    'ยินดีต้อนรับสู่ NayMos GameShop บริการเติม Free Fire, RoV, Mobile Legends, Valorant และอื่นๆ ราคาถูก รับประกันความปลอดภัย 100% เปิดให้บริการ 24 ชม.',
  openGraph: {
    title: 'NayMos GameShop — บริการเติมเกมออนไลน์',
    description: 'เติมเกมถูก รวดเร็ว ปลอดภัย 100% ประทับใจ ได้รับของแน่นอน',
    type: 'website',
    locale: 'th_TH',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={`${prompt.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans bg-[#f0f9ff] text-slate-800" suppressHydrationWarning>
        <QueryProvider>
          <MusicPlayerProvider>
            <GlobalBGMPlayer />
            {children}
          </MusicPlayerProvider>
        </QueryProvider>
        <Toaster theme="light" position="top-center" richColors />
      </body>
    </html>
  );
}
