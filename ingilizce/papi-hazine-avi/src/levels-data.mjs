/**
 * Papi Hazine Avı — 6-Island 100-Level Roadmap & Parrot Island Levels 1–3
 * Deterministic rewards (no RNG!), interactive English comprehension tasks,
 * and helpful educational feedback on distractors.
 */

export const ISLANDS = [
  {
    id: 'papagan-adasi',
    index: 1,
    name: 'Papağan Adası',
    enName: 'Parrot Island',
    subtitle: 'Altın sahiller, şelale ve ilk keşifler',
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
    subtitle: 'Dev ağaçlar, asma köprüler ve doğa kelimeleri',
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
    subtitle: 'Turkuaz lagün, deniz canlıları ve yüzme görevleri',
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
    subtitle: 'Taş sokaklar, gizli geçitler ve yön tarifleri',
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
    subtitle: 'Işıltılı mağaralar, yankılı bulmacalar',
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
    subtitle: 'Büyük hazine ve usta kaşif sınavı',
    levelCount: 20,
    playableCount: 0,
    unlocked: false,
    accent: '#f5b82e',
    badgeName: 'Büyük Hazine Ustası',
    badgeIcon: '👑'
  }
];

/** 50-Level Independent Papi Explorer Level Progression */
export function computeExplorerLevel(totalXp) {
  // Smooth curve: Level 1 at 0 XP up to Level 50
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

/**
 * Parrot Island — First 3 Complete, Handcrafted, Playable Levels
 * Every prop uses a real GLB model from ./assets/models/
 */
export const PARROT_ISLAND_LEVELS = [
  {
    id: 'island1_level1',
    islandId: 'papagan-adasi',
    number: 1,
    title: 'Sahil Keşfi',
    enTitle: 'Sunny Beach Discovery',
    unitTag: 'Renkler, Nesneler & Doğa (A1)',
    spawn: { x: 0, z: 11.5, facing: Math.PI },
    chestPos: { x: 2.5, z: -10.5 },
    rewardCollectible: {
      id: 'golden_compass',
      name: 'Altın Pusula',
      enName: 'Golden Compass',
      icon: '🧭',
      description: 'Papağan Adası 1. Bölüm hazinesi — yönünü asla şaşırma!'
    },
    props: [
      // Blue Key (target) + Red & Yellow Keys (educational distractors!)
      { id: 'blue_key',   model: 'key', color: '#2196ff', emissive: '#0c4fa8', x: -3.2, z: 5.5,  label: 'Blue Key',   tr: 'mavi anahtar' },
      { id: 'red_key',    model: 'key', color: '#ff3b3b', emissive: '#991212', x: 3.8,  z: 7.2,  label: 'Red Key',    tr: 'kırmızı anahtar' },
      { id: 'yellow_key', model: 'key', color: '#ffd426', emissive: '#9c7800', x: -1.5, z: -0.5, label: 'Yellow Key', tr: 'sarı anahtar' },
      // Three Tropical Flowers
      { id: 'flower_1',   model: 'flower', color: '#ff5ea0', x: 2.8,  z: 4.0,  label: 'Pink Flower',   tr: 'pembe çiçek' },
      { id: 'flower_2',   model: 'flower', color: '#ff9633', x: -2.2, z: -3.8, label: 'Orange Flower', tr: 'turuncu çiçek' },
      { id: 'flower_3',   model: 'flower', color: '#a866ff', x: 6.0,  z: 5.6,  label: 'Purple Flower', tr: 'mor çiçek' }
    ],
    missions: [
      {
        id: 'm1_key',
        type: 'collect',
        prompt: 'Find the blue key.',
        hintTr: 'Mavi anahtarı (blue key) bul ve al.',
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
        hintTr: 'Kulübenin ahşap kapısına (wooden door) git ve aç.',
        pos: { x: 7.2, z: -1.3 },
        radius: 2.5,
        actionAnim: 'openDoor'
      },
      {
        id: 'm1_flowers',
        type: 'collect_count',
        count: 3,
        prompt: 'Collect three flowers.',
        hintTr: 'Adadaki üç çiçeği (three flowers) topla.',
        targetIds: ['flower_1', 'flower_2', 'flower_3'],
        actionAnim: 'collect'
      },
      {
        id: 'm1_rabbit',
        type: 'interact_landmark',
        landmark: 'rabbit',
        prompt: 'Find the rabbit.',
        hintTr: 'Zıplayan beyaz tavşanı (rabbit) bul ve yanına git.',
        pos: { x: 4.5, z: -9.2 },
        radius: 2.4,
        actionAnim: 'collect'
      },
      {
        id: 'm1_chest',
        type: 'open_chest',
        prompt: 'Open the treasure chest.',
        hintTr: 'Hazine sandığını (treasure chest) aç!',
        pos: { x: 2.5, z: -10.5 },
        radius: 2.5,
        actionAnim: 'openChest'
      }
    ]
  },

  {
    id: 'island1_level2',
    islandId: 'papagan-adasi',
    number: 2,
    title: 'Şelale Köprüsü',
    enTitle: 'Waterfall Bridge Trail',
    unitTag: 'Yönler, Meyveler & Günlük Nesneler (A1)',
    spawn: { x: 1.5, z: 9.5, facing: Math.PI },
    chestPos: { x: -12.8, z: -3.2 },
    rewardCollectible: {
      id: 'emerald_feather',
      name: 'Zümrüt Tüy',
      enName: 'Emerald Feather',
      icon: '🪶',
      description: 'Şelale Köprüsü kaşif ödülü — rüzgarla süzül!'
    },
    props: [
      // Red apple (target) + green apple (distractor!)
      { id: 'red_apple',   model: 'apple', color: '#e82525', x: -12.4, z: 4.8,  label: 'Red Apple',   tr: 'kırmızı elma' },
      { id: 'green_apple', model: 'apple', color: '#68cf34', x: -11.5, z: -0.6, label: 'Green Apple', tr: 'yeşil elma' },
      // English Book
      { id: 'blue_book',   model: 'book',  color: '#256ae0', x: -1.8,  z: 3.5,  label: 'Blue Book',   tr: 'mavi kitap' },
      // Three Seashells along the shallow turquoise shoreline
      { id: 'shell_1',     model: 'seashell', color: '#ffc9a6', x: -10.2, z: 9.8, label: 'Seashell', tr: 'deniz kabuğu' },
      { id: 'shell_2',     model: 'seashell', color: '#ffd9b8', x: -4.2,  z: 14.5, label: 'Seashell', tr: 'deniz kabuğu' },
      { id: 'shell_3',     model: 'seashell', color: '#ffbfa0', x: 5.2,   z: 13.8, label: 'Seashell', tr: 'deniz kabuğu' }
    ],
    missions: [
      {
        id: 'm2_bridge',
        type: 'reach_zone',
        prompt: 'Turn left at the bridge.',
        hintTr: 'Ahşap köprüden geç ve sola (left) dönerek patikaya ilerle.',
        pos: { x: -12.2, z: 3.2 },
        radius: 2.8
      },
      {
        id: 'm2_apple',
        type: 'collect',
        prompt: 'Find the red apple.',
        hintTr: 'Kırmızı elmayı (red apple) bul ve al.',
        targetIds: ['red_apple'],
        distractorIds: ['green_apple'],
        carryOnCollect: true,
        actionAnim: 'collect'
      },
      {
        id: 'm2_house',
        type: 'deliver_landmark',
        landmark: 'cottage',
        prompt: 'Bring the apple to the house.',
        hintTr: 'Elmayı kulübeye (house) götür.',
        pos: { x: 7.2, z: -1.3 },
        radius: 2.8,
        actionAnim: 'openDoor'
      },
      {
        id: 'm2_book_take',
        type: 'collect',
        prompt: 'Pick up the book.',
        hintTr: 'Mavi kitabı (book) yerden al.',
        targetIds: ['blue_book'],
        carryOnCollect: true,
        actionAnim: 'collect'
      },
      {
        id: 'm2_book_table',
        type: 'deliver_landmark',
        landmark: 'table',
        prompt: 'Put the book on the table.',
        hintTr: 'Kitabı ahşap masanın (table) üzerine koy.',
        pos: { x: 4.2, z: 2.2 },
        radius: 2.4,
        actionAnim: 'collect'
      },
      {
        id: 'm2_shells',
        type: 'collect_count',
        count: 3,
        prompt: 'Collect three seashells.',
        hintTr: 'Sahil boyunca üç deniz kabuğu (three seashells) topla.',
        targetIds: ['shell_1', 'shell_2', 'shell_3'],
        actionAnim: 'collect'
      },
      {
        id: 'm2_chest',
        type: 'open_chest',
        prompt: 'Open the treasure chest.',
        hintTr: 'Köprünün ötesindeki hazine sandığını aç!',
        pos: { x: -12.8, z: -3.2 },
        radius: 2.5,
        actionAnim: 'openChest'
      }
    ]
  },

  {
    id: 'island1_level3',
    islandId: 'papagan-adasi',
    number: 3,
    title: 'Antik Kemer ve Şelale',
    enTitle: 'Ancient Arch & Waterfall',
    unitTag: 'Keşif, Doğa & Hazine Avı (A1+)',
    spawn: { x: -1.0, z: 10.5, facing: Math.PI },
    chestPos: { x: 2.5, z: -14.8 },
    rewardCollectible: {
      id: 'parrot_island_map',
      name: 'Papağan Adası Haritası',
      enName: 'Parrot Island Map',
      icon: '🗺️',
      description: 'İlk 3 bölümü tamamlayan gerçek kaşiflerin efsanevi ada haritası!'
    },
    props: [
      { id: 'gold_lantern', model: 'lantern', color: '#f5b832', x: 5.5,  z: 3.2,   label: 'Golden Lantern', tr: 'altın fener' },
      { id: 'yellow_key3',  model: 'key',     color: '#ffd82b', emissive: '#997500', x: -4.2, z: -7.5,  label: 'Yellow Key', tr: 'sarı anahtar' },
      { id: 'blue_key3',    model: 'key',     color: '#2196ff', emissive: '#0c4fa8', x: -10.5, z: -5.8, label: 'Blue Key',   tr: 'mavi anahtar' },
      { id: 'crystal_1',    model: 'crystal', color: '#42f2ff', x: -0.5, z: -11.5, label: 'Blue Crystal',   tr: 'mavi kristal' },
      { id: 'crystal_2',    model: 'crystal', color: '#64ffda', x: 6.2,  z: -11.2, label: 'Cyan Crystal',   tr: 'turkuaz kristal' },
      { id: 'crystal_3',    model: 'crystal', color: '#a878ff', x: 2.2,  z: -6.2,  label: 'Purple Crystal', tr: 'mor kristal' }
    ],
    missions: [
      {
        id: 'm3_lantern',
        type: 'collect',
        prompt: 'Find the golden lantern.',
        hintTr: 'Altın feneri (golden lantern) bul ve al.',
        targetIds: ['gold_lantern'],
        carryOnCollect: true,
        actionAnim: 'collect'
      },
      {
        id: 'm3_waterfall',
        type: 'reach_zone',
        prompt: 'Go to the waterfall.',
        hintTr: 'Kuzeydeki akan şelalenin (waterfall) önüne git.',
        pos: { x: -7.6, z: -7.2 },
        radius: 3.2
      },
      {
        id: 'm3_key',
        type: 'collect',
        prompt: 'Find the yellow key.',
        hintTr: 'Sarı anahtarı (yellow key) bul (mavi olana dikkat!).',
        targetIds: ['yellow_key3'],
        distractorIds: ['blue_key3'],
        carryOnCollect: true,
        actionAnim: 'collect'
      },
      {
        id: 'm3_arch',
        type: 'deliver_landmark',
        landmark: 'arch',
        prompt: 'Bring the key to the ancient gate.',
        hintTr: 'Anahtarı antik taş kemere (ancient gate) götür.',
        pos: { x: 2.5, z: -12.6 },
        radius: 2.8,
        actionAnim: 'openDoor'
      },
      {
        id: 'm3_crystals',
        type: 'collect_count',
        count: 3,
        prompt: 'Collect three crystals.',
        hintTr: 'Antik kemer çevresindeki üç kristali (three crystals) topla.',
        targetIds: ['crystal_1', 'crystal_2', 'crystal_3'],
        actionAnim: 'collect'
      },
      {
        id: 'm3_chest',
        type: 'open_chest',
        prompt: 'Open the ancient treasure chest.',
        hintTr: 'Antik kemerin arkasındaki büyük hazine sandığını aç!',
        pos: { x: 2.5, z: -14.8 },
        radius: 2.6,
        actionAnim: 'openChest'
      }
    ]
  }
];
