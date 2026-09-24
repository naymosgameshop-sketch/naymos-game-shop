export type MockGame = {
  slug: string;
  name: string;
  category: string;
  description: string;
  color: string;
  icon?: string;
  fields: { name: string; label: string; placeholder: string; required: boolean }[];
  packages: { id: string; name: string; price: number; amount?: string }[];
};

export const GAME_COVERS: Record<string, string> = {
  'free-fire': 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
  'rov': 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=800&auto=format&fit=crop',
  'mobile-legends': 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=800&auto=format&fit=crop',
  'valorant': 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop',
  'genshin-impact': 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=800&auto=format&fit=crop',
  'pubg-mobile': 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?q=80&w=800&auto=format&fit=crop',
};

export const MOCK_GAMES: MockGame[] = [
  {
    slug: 'free-fire',
    name: 'Free Fire',
    category: 'Battle Royale',
    description: 'เติมเกม Free Fire ฟรอยด์เพชร ปลอดภัย ได้รับทันที',
    color: 'from-orange-600 to-red-700',
    icon: GAME_COVERS['free-fire'],
    fields: [{ name: 'uid', label: 'Player ID (UID)', placeholder: 'กรอก UID 9-10 หลัก', required: true }],
    packages: [
      { id: 'ff-100', name: '100 เพชร', price: 29, amount: '100' },
      { id: 'ff-310', name: '310 เพชร', price: 89, amount: '310' },
      { id: 'ff-520', name: '520 เพชร', price: 149, amount: '520' },
      { id: 'ff-1060', name: '1,060 เพชร', price: 299, amount: '1060' },
      { id: 'ff-2180', name: '2,180 เพชร', price: 599, amount: '2180' },
      { id: 'ff-5600', name: '5,600 เพชร', price: 1499, amount: '5600' },
    ],
  },
  {
    slug: 'rov',
    name: 'RoV',
    category: 'MOBA',
    description: 'เติมคูปอง RoV (Arena of Valor) รวดเร็วทันใจ',
    color: 'from-blue-600 to-indigo-700',
    icon: GAME_COVERS['rov'],
    fields: [{ name: 'openid', label: 'Open ID', placeholder: 'กรอก Open ID จากหน้าโปรไฟล์เกม', required: true }],
    packages: [
      { id: 'rov-35', name: '35 คูปอง', price: 35, amount: '35' },
      { id: 'rov-90', name: '90 คูปอง', price: 90, amount: '90' },
      { id: 'rov-230', name: '230 คูปอง', price: 230, amount: '230' },
      { id: 'rov-470', name: '470 คูปอง', price: 470, amount: '470' },
      { id: 'rov-950', name: '950 คูปอง', price: 950, amount: '950' },
    ],
  },
  {
    slug: 'mobile-legends',
    name: 'Mobile Legends',
    category: 'MOBA',
    description: 'เติม Diamonds MLBB สะดวก รวดเร็ว',
    color: 'from-cyan-600 to-blue-700',
    icon: GAME_COVERS['mobile-legends'],
    fields: [
      { name: 'user_id', label: 'User ID', placeholder: 'กรอก User ID', required: true },
      { name: 'zone_id', label: 'Zone ID', placeholder: 'กรอก Zone ID', required: true },
    ],
    packages: [
      { id: 'ml-86', name: '86 Diamonds', price: 29, amount: '86' },
      { id: 'ml-172', name: '172 Diamonds', price: 55, amount: '172' },
      { id: 'ml-257', name: '257 Diamonds', price: 79, amount: '257' },
      { id: 'ml-344', name: '344 Diamonds', price: 105, amount: '344' },
      { id: 'ml-706', name: '706 Diamonds', price: 209, amount: '706' },
      { id: 'ml-2195', name: '2,195 Diamonds', price: 629, amount: '2195' },
    ],
  },
  {
    slug: 'valorant',
    name: 'Valorant',
    category: 'FPS',
    description: 'เติม Valorant Points ผ่าน Riot ID',
    color: 'from-red-600 to-rose-800',
    icon: GAME_COVERS['valorant'],
    fields: [
      { name: 'riot_id', label: 'Riot ID', placeholder: 'ชื่อในเกม', required: true },
      { name: 'tagline', label: 'Tagline', placeholder: 'เช่น TH1', required: true },
      { name: 'region', label: 'Region', placeholder: 'AP / EU / NA', required: true },
    ],
    packages: [
      { id: 'val-475', name: '475 VP', price: 159, amount: '475' },
      { id: 'val-1000', name: '1,000 VP', price: 319, amount: '1000' },
      { id: 'val-2050', name: '2,050 VP', price: 639, amount: '2050' },
      { id: 'val-3650', name: '3,650 VP', price: 1119, amount: '3650' },
      { id: 'val-5350', name: '5,350 VP', price: 1599, amount: '5350' },
    ],
  },
  {
    slug: 'genshin-impact',
    name: 'Genshin Impact',
    category: 'RPG',
    description: 'เติม Genesis Crystals / Blessing of the Welkin Moon',
    color: 'from-amber-500 to-orange-600',
    icon: GAME_COVERS['genshin-impact'],
    fields: [
      { name: 'uid', label: 'UID', placeholder: 'UID 8-9 หลัก', required: true },
      { name: 'server', label: 'Server', placeholder: 'Asia / Europe / America', required: true },
    ],
    packages: [
      { id: 'gi-60', name: '60 Genesis Crystals', price: 35, amount: '60' },
      { id: 'gi-300', name: '300 Genesis Crystals', price: 175, amount: '300' },
      { id: 'gi-980', name: '980 Genesis Crystals', price: 559, amount: '980' },
      { id: 'gi-1980', name: '1,980 Genesis Crystals', price: 1119, amount: '1980' },
      { id: 'gi-3280', name: '3,280 Genesis Crystals', price: 1839, amount: '3280' },
      { id: 'gi-welkin', name: 'Blessing of the Welkin Moon', price: 159, amount: '1' },
    ],
  },
  {
    slug: 'pubg-mobile',
    name: 'PUBG Mobile',
    category: 'Battle Royale',
    description: 'เติม UC PUBG Mobile รวดเร็วทันใจ',
    color: 'from-yellow-600 to-amber-800',
    icon: GAME_COVERS['pubg-mobile'],
    fields: [{ name: 'uid', label: 'Player ID', placeholder: 'กรอก Player ID', required: true }],
    packages: [
      { id: 'pubg-60', name: '60 UC', price: 29, amount: '60' },
      { id: 'pubg-325', name: '325 UC', price: 149, amount: '325' },
      { id: 'pubg-660', name: '660 UC', price: 299, amount: '660' },
      { id: 'pubg-1800', name: '1,800 UC', price: 749, amount: '1800' },
      { id: 'pubg-3850', name: '3,850 UC', price: 1499, amount: '3850' },
    ],
  },
];

export function getGameBySlug(slug: string): MockGame | undefined {
  return MOCK_GAMES.find((g) => g.slug === slug);
}
