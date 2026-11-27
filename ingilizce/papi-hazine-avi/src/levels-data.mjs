/**
 * Papi Hazine Avı — Expanded 6-Island Roadmap & Functional Multi-Region Levels 1–3 (v2)
 */

export const ISLANDS = [
  {
    id: 'papagan-adasi',
    index: 1,
    name: 'Papağan Adası',
    enName: 'Parrot Island',
    subtitle: 'Liman iskelesi, köy bahçesi, nehir köprüsü, şelale ve antik avlu',
    levelCount: 10,
    playableCount: 3,
    unlocked: true,
    accent: '#18b8d4',
    badgeName: 'Papağan Adası Kaşifi',
    badgeIcon: '🦜'
  },
  {
    id: 'zumrut-ormani',
    index: 2,
    name: 'Zümrüt Ormanı',
    enName: 'Emerald Forest',
    subtitle: 'Dev yağmur ormanı ağaçları, asma köprüler ve doğa kelimeleri',
    levelCount: 15,
    playableCount: 0,
    unlocked: false,
    accent: '#2fb869',
    badgeName: 'Zümrüt Orman Rehberi',
    badgeIcon: '🌿'
  },
  {
    id: 'mercan-korfezi',
    index: 3,
    name: 'Mercan Körfezi',
    enName: 'Coral Bay',
    subtitle: 'Turkuaz mercan resifleri, deniz canlıları ve yüzme görevleri',
    levelCount: 15,
    playableCount: 0,
    unlocked: false,
    accent: '#ff7058',
    badgeName: 'Mercan Dalgıcı',
    badgeIcon: '🐚'
  },
  {
    id: 'kayip-sehir',
    index: 4,
    name: 'Kayıp Şehir',
    enName: 'Lost City',
    subtitle: 'Antik taş meydanlar, gizli geçitler ve yön tarifleri',
    levelCount: 20,
    playableCount: 0,
    unlocked: false,
    accent: '#d99a2b',
    badgeName: 'Kayıp Şehir Bilgini',
    badgeIcon: '🏛️'
  },
  {
    id: 'kristal-daglari',
    index: 5,
    name: 'Kristal Dağları',
    enName: 'Crystal Mountains',
    subtitle: 'Işıltılı mağaralar, yüksek geçitler ve bulmacalar',
    levelCount: 20,
    playableCount: 0,
    unlocked: false,
    accent: '#7a5cff',
    badgeName: 'Kristal Tırmanıcısı',
    badgeIcon: '💎'
  },
  {
    id: 'antik-tapinak',
    index: 6,
    name: 'Antik Tapınak',
    enName: 'Ancient Temple',
    subtitle: 'Büyük hazine tapınağı ve usta kaşif sınavı',
    levelCount: 20,
    playableCount: 0,
    unlocked: false,
    accent: '#f5b82e',
    badgeName: 'Büyük Hazine Ustası',
    badgeIcon: '👑'
  }
];

export function computeExplorerLevel(totalXp) {
  let level = 1;
  let needed = 20;
  let rem = Math.max(0, totalXp);
  while (level < 50 && rem >= needed) {
    rem -= needed;
    level++;
    needed = Math.round(20 + (level - 1) * 8);
  }
  return { level, currentXp: rem, nextLevelXp: needed, totalXp };
}

export const PARROT_ISLAND_LEVELS = [
  {
    id: 'island1_level1',
    islandId: 'papagan-adasi',
    number: 1,
    title: 'Liman ve Köy Keşfi',
    enTitle: 'Sunny Harbor & Village',
    mood: 'morning',
    unitTag: 'Renkler, Tabela & Doğa (A1)',
    spawn: { x: 2.0, z: 29.5, facing: Math.PI }, // Starts right on the Wooden Harbor Pier!
    chestPos: { x: 6.5, z: -13.5 },
    rewardCollectible: {
      id: 'golden_compass',
      name: 'Altın Pusula',
      enName: 'Golden Compass',
      icon: '🧭',
      description: 'Papağan Adası 1. Bölüm hazinesi — yönünü asla şaşırma!'
    },
    props: [
      { id: 'blue_key',   model: 'key', color: '#2196ff', emissive: '#0c4fa8', x: -3.5, z: 8.5,  label: 'Blue Key',   tr: 'mavi anahtar' },
      { id: 'red_key',    model: 'key', color: '#ff3b3b', emissive: '#991212', x: 6.2,  z: 12.2, label: 'Red Key',    tr: 'kırmızı anahtar' },
      { id: 'yellow_key', model: 'key', color: '#ffd426', emissive: '#9c7800', x: -1.8, z: -1.5, label: 'Yellow Key', tr: 'sarı anahtar' },
      { id: 'flower_1',   model: 'flower', color: '#ff5ea0', x: 5.5,  z: 6.2,  label: 'Pink Flower',   tr: 'pembe çiçek' },
      { id: 'flower_2',   model: 'flower', color: '#ff9633', x: -2.8, z: -5.2, label: 'Orange Flower', tr: 'turuncu çiçek' },
      { id: 'flower_3',   model: 'flower', color: '#a866ff', x: 11.2, z: 4.5,  label: 'Purple Flower', tr: 'mor çiçek' }
    ],
    missions: [
      {
        id: 'm1_signpost',
        type: 'interact_landmark',
        landmark: 'signpost',
        prompt: 'Read the wooden signpost.',
        hintTr: 'İskeleden sahil patikası boyunca ilerle ve yol tabelasını (wooden signpost) incele.',
        pos: { x: 1.6, z: 5.2 },
        radius: 2.8,
        actionAnim: 'collect'
      },
      {
        id: 'm1_key',
        type: 'collect',
        prompt: 'Find the blue key.',
        hintTr: 'Mavi anahtarı (blue key) bul ve al (kırmızı ve sarı anahtarlara dikkat!).',
        targetIds: ['blue_key'],
        distractorIds: ['red_key', 'yellow_key'],
        carryOnCollect: true,
        actionAnim: 'collect'
      },
      {
        id: 'm1_door',
        type: 'interact_landmark',
        landmark: 'door',
        prompt: 'Open the wooden door.',
        hintTr: 'Doğudaki kulübenin ahşap kapısına (wooden door) git ve aç.',
        pos: { x: 11.2, z: -0.6 },
        radius: 3.0,
        actionAnim: 'openDoor'
      },
      {
        id: 'm1_flowers',
        type: 'collect_count',
        count: 3,
        prompt: 'Collect three flowers.',
        hintTr: 'Çayırdaki üç çiçeği (three flowers) topla.',
        targetIds: ['flower_1', 'flower_2', 'flower_3'],
        actionAnim: 'collect'
      },
      {
        id: 'm1_rabbit',
        type: 'interact_landmark',
        landmark: 'rabbit',
        prompt: 'Find the white rabbit.',
        hintTr: 'Zıplayan beyaz tavşanı (white rabbit) bul ve yanına git.',
        pos: { x: 8.8, z: -11.5 },
        radius: 2.8,
        actionAnim: 'collect'
      },
      {
        id: 'm1_chest',
        type: 'open_chest',
        prompt: 'Open the treasure chest.',
        hintTr: 'Hazine sandığını (treasure chest) aç!',
        pos: { x: 6.5, z: -13.5 },
        radius: 2.8,
        actionAnim: 'openChest'
      }
    ]
  },

  {
    id: 'island1_level2',
    islandId: 'papagan-adasi',
    number: 2,
    title: 'Nehir Köprüsü ve Bahçe',
    enTitle: 'River Bridge & Orchard',
    mood: 'noon',
    unitTag: 'Yönler, Meyveler & Eşyalar (A1)',
    spawn: { x: 2.0, z: 14.5, facing: Math.PI },
    chestPos: { x: -17.5, z: -6.5 },
    rewardCollectible: {
      id: 'emerald_feather',
      name: 'Zümrüt Tüy',
      enName: 'Emerald Feather',
      icon: '🪶',
      description: 'Nehir Köprüsü kaşif ödülü — rüzgarla süzül!'
    },
    props: [
      { id: 'red_apple',    model: 'apple', color: '#e82525', x: -17.8, z: 6.2,  label: 'Red Apple',    tr: 'kırmızı elma' },
      { id: 'green_apple',  model: 'apple', color: '#68cf34', x: -16.5, z: -1.5, label: 'Green Apple',  tr: 'yeşil elma' },
      { id: 'yellow_apple', model: 'apple', color: '#f5cb24', x: 16.5,  z: 3.5,  label: 'Yellow Apple', tr: 'sarı elma' },
      { id: 'blue_book',    model: 'book',  color: '#256ae0', x: 0.5,   z: 18.2, label: 'Blue Book',    tr: 'mavi kitap' },
      { id: 'shell_1',      model: 'seashell', color: '#ffc9a6', x: -12.5, z: 18.5, label: 'Seashell', tr: 'deniz kabuğu' },
      { id: 'shell_2',      model: 'seashell', color: '#ffd9b8', x: -3.5,  z: 24.5, label: 'Seashell', tr: 'deniz kabuğu' },
      { id: 'shell_3',      model: 'seashell', color: '#ffbfa0', x: 8.8,   z: 22.8, label: 'Seashell', tr: 'deniz kabuğu' }
    ],
    missions: [
      {
        id: 'm2_bridge',
        type: 'reach_zone',
        prompt: 'Turn left at the bridge.',
        hintTr: 'Batıdaki kemerli ahşap köprüden geç ve sola (left) dön.',
        pos: { x: -16.8, z: 4.5 },
        radius: 3.2
      },
      {
        id: 'm2_apple',
        type: 'collect',
        prompt: 'Find the red apple.',
        hintTr: 'Meyve ağacının altındaki kırmızı elmayı (red apple) bul.',
        targetIds: ['red_apple'],
        distractorIds: ['green_apple', 'yellow_apple'],
        carryOnCollect: true,
        actionAnim: 'collect'
      },
      {
        id: 'm2_house',
        type: 'deliver_landmark',
        landmark: 'cottage',
        prompt: 'Bring the apple to the house.',
        hintTr: 'Elmayı doğudaki kulübeye (house) götür.',
        pos: { x: 11.2, z: -0.6 },
        radius: 3.2,
        actionAnim: 'openDoor'
      },
      {
        id: 'm2_book_take',
        type: 'collect',
        prompt: 'Pick up the blue book.',
        hintTr: 'Sahil yakınındaki mavi kitabı (blue book) al.',
        targetIds: ['blue_book'],
        carryOnCollect: true,
        actionAnim: 'collect'
      },
      {
        id: 'm2_book_table',
        type: 'deliver_landmark',
        landmark: 'table',
        prompt: 'Put the book on the table.',
        hintTr: 'Kitabı piknik masasının (table) üzerine bırak.',
        pos: { x: 7.8, z: 3.6 },
        radius: 2.8,
        placePropOnTable: true,
        actionAnim: 'collect'
      },
      {
        id: 'm2_shells',
        type: 'collect_count',
        count: 3,
        prompt: 'Collect three seashells.',
        hintTr: 'Güney kumsalı boyunca üç deniz kabuğu (three seashells) topla.',
        targetIds: ['shell_1', 'shell_2', 'shell_3'],
        actionAnim: 'collect'
      },
      {
        id: 'm2_chest',
        type: 'open_chest',
        prompt: 'Open the treasure chest.',
        hintTr: 'Köprünün karşı kıyısındaki hazine sandığını aç!',
        pos: { x: -17.5, z: -6.5 },
        radius: 2.8,
        actionAnim: 'openChest'
      }
    ]
  },

  {
    id: 'island1_level3',
    islandId: 'papagan-adasi',
    number: 3,
    title: 'Gün Batımı Şelalesi ve Sihirli Kapı',
    enTitle: 'Sunset Waterfall & Magic Gate',
    mood: 'sunset',
    unitTag: 'Doğa, Zıplama Taşları & Antik Hazine (A1+)',
    spawn: { x: 1.5, z: 12.0, facing: Math.PI },
    chestPos: { x: 6.5, z: -22.2 },
    rewardCollectible: {
      id: 'parrot_island_map',
      name: 'Papağan Adası Haritası',
      enName: 'Parrot Island Map',
      icon: '🗺️',
      description: 'İlk 3 bölümü tamamlayan gerçek kaşiflerin efsanevi ada haritası!'
    },
    props: [
      { id: 'gold_lantern', model: 'lantern', color: '#f5b832', x: 5.8,   z: 1.5,   label: 'Golden Lantern', tr: 'altın fener' },
      { id: 'yellow_key3',  model: 'key',     color: '#ffd82b', emissive: '#997500', x: -15.5, z: -10.5, label: 'Yellow Key', tr: 'sarı anahtar' },
      { id: 'blue_key3',    model: 'key',     color: '#2196ff', emissive: '#0c4fa8', x: -3.2,  z: -11.2, label: 'Blue Key',   tr: 'mavi anahtar' },
      { id: 'crystal_1',    model: 'crystal', color: '#42f2ff', x: 3.5,   z: -20.2, label: 'Blue Crystal',   tr: 'mavi kristal' },
      { id: 'crystal_2',    model: 'crystal', color: '#64ffda', x: 9.5,   z: -20.0, label: 'Cyan Crystal',   tr: 'turkuaz kristal' },
      { id: 'crystal_3',    model: 'crystal', color: '#a878ff', x: 6.5,   z: -15.5, label: 'Purple Crystal', tr: 'mor kristal' }
    ],
    missions: [
      {
        id: 'm3_lantern',
        type: 'collect',
        prompt: 'Find the golden lantern.',
        hintTr: 'Gün batımında parlayan altın feneri (golden lantern) bul ve al.',
        targetIds: ['gold_lantern'],
        carryOnCollect: true,
        actionAnim: 'collect'
      },
      {
        id: 'm3_waterfall',
        type: 'reach_zone',
        prompt: 'Go to the waterfall.',
        hintTr: 'Nehirdeki zıplama taşlarından veya köprüden geçip şelalenin (waterfall) önüne git.',
        pos: { x: -10.8, z: -11.2 },
        radius: 3.6
      },
      {
        id: 'm3_key',
        type: 'collect',
        prompt: 'Find the yellow key.',
        hintTr: 'Şelale kıyısındaki sarı anahtarı (yellow key) bul.',
        targetIds: ['yellow_key3'],
        distractorIds: ['blue_key3'],
        carryOnCollect: true,
        actionAnim: 'collect'
      },
      {
        id: 'm3_arch',
        type: 'deliver_landmark',
        landmark: 'magic_gate',
        prompt: 'Open the ancient magic gate.',
        hintTr: 'Sarı anahtarı meşaleli antik taş kemere (magic gate) götür ve geçidi aç!',
        pos: { x: 6.5, z: -17.2 },
        radius: 3.2,
        actionAnim: 'openDoor'
      },
      {
        id: 'm3_crystals',
        type: 'collect_count',
        count: 3,
        prompt: 'Collect three crystals.',
        hintTr: 'Açılan antik avludaki üç kristali (three crystals) topla.',
        targetIds: ['crystal_1', 'crystal_2', 'crystal_3'],
        actionAnim: 'collect'
      },
      {
        id: 'm3_chest',
        type: 'open_chest',
        prompt: 'Open the ancient treasure chest.',
        hintTr: 'Antik kemerin arkasındaki büyük hazine sandığını aç!',
        pos: { x: 6.5, z: -22.2 },
        radius: 2.8,
        actionAnim: 'openChest'
      }
    ]
  }
];
