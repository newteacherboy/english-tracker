/**
 * Papi Hazine Avı — Full 6-Island, 100-Level Adventure Catalog
 * - Islands 1–3 (40 Levels): FREE for all students!
 * - Islands 4–6 (60 Levels): Requires Diji-Medu PREMIUM PRO (`premium_pro`)!
 * - Every single level (1..100) has 5–7 interactive English comprehension tasks,
 *   distractors with educational feedback, and deterministic chest collectibles.
 */

export const LAUNCH_AT_ISO = '2026-12-10T19:00:00+03:00';
export const LAUNCH_AT_MS  = Date.parse(LAUNCH_AT_ISO);

export const ISLANDS = [
  {
    id: 'papagan-adasi',
    index: 1,
    name: 'Papağan Adası',
    enName: 'Parrot Island',
    subtitle: 'Liman iskelesi, köy bahçesi, nehir köprüsü ve şelale',
    levelCount: 10,
    requiresPro: false,
    accent: '#18b8d4',
    badgeId: 'badge_parrot_island',
    badgeName: 'Papağan Adası Kaşifi',
    badgeIcon: '🦜'
  },
  {
    id: 'zumrut-ormani',
    index: 2,
    name: 'Zümrüt Ormanı',
    enName: 'Emerald Forest',
    subtitle: 'Dev yağmur ormanı ağaçları, parlayan mantarlar ve totemler',
    levelCount: 15,
    requiresPro: false,
    accent: '#2fb869',
    badgeId: 'badge_emerald_forest',
    badgeName: 'Zümrüt Orman Rehberi',
    badgeIcon: '🌿'
  },
  {
    id: 'mercan-korfezi',
    index: 3,
    name: 'Mercan Körfezi',
    enName: 'Coral Bay',
    subtitle: 'Deniz feneri, renkli mercan resifleri ve turkuaz lagün',
    levelCount: 15,
    requiresPro: false,
    accent: '#ff7058',
    badgeId: 'badge_coral_bay',
    badgeName: 'Mercan Dalgıcı',
    badgeIcon: '🐚'
  },
  {
    id: 'kayip-sehir',
    index: 4,
    name: 'Kayıp Şehir',
    enName: 'Lost City',
    subtitle: 'Basamaklı antik piramit, dikilitaşlar ve vaha kanalları',
    levelCount: 20,
    requiresPro: true,
    accent: '#d99a2b',
    badgeId: 'badge_lost_city',
    badgeName: 'Kayıp Şehir Bilgini',
    badgeIcon: '🏛️'
  },
  {
    id: 'kristal-daglari',
    index: 5,
    name: 'Kristal Dağları',
    enName: 'Crystal Mountains',
    subtitle: 'Karlı geçitler, dev ametist kristalleri ve buzul nehri',
    levelCount: 20,
    requiresPro: true,
    accent: '#7a5cff',
    badgeId: 'badge_crystal_mountains',
    badgeName: 'Kristal Tırmanıcısı',
    badgeIcon: '💎'
  },
  {
    id: 'antik-tapinak',
    index: 6,
    name: 'Antik Tapınak',
    enName: 'Ancient Temple',
    subtitle: 'Altın-obsidyen büyük tapınak, kutsal meşaleler ve son hazine',
    levelCount: 20,
    requiresPro: true,
    accent: '#f5b82e',
    badgeId: 'badge_ancient_temple',
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

// ─── Handcrafted Signature Levels 1–3 on Island 1 ────────────────────────────
const HANDCRAFTED_ISLAND_1 = [
  {
    id: 'island1_level1',
    globalNumber: 1,
    islandId: 'papagan-adasi',
    number: 1,
    title: 'Liman ve Köy Keşfi',
    enTitle: 'Sunny Harbor & Village',
    mood: 'default',
    spawn: { x: 2.0, z: 29.5, facing: Math.PI },
    chestPos: { x: 6.5, z: -13.5 },
    locksMagicGate: false,
    rewardCollectible: {
      id: 'relic_1_1', name: 'Altın Pusula', enName: 'Golden Compass', icon: '🧭',
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
      { id: 'm1_signpost', type: 'interact_landmark', landmark: 'signpost', prompt: 'Read the wooden signpost.', hintTr: 'İskeleden sahil patikası boyunca ilerle ve yol tabelasını (wooden signpost) incele.', pos: { x: 1.6, z: 5.2 }, radius: 2.8, actionAnim: 'collect' },
      { id: 'm1_key', type: 'collect', prompt: 'Find the blue key.', hintTr: 'Mavi anahtarı (blue key) bul ve al.', targetIds: ['blue_key'], distractorIds: ['red_key', 'yellow_key'], carryOnCollect: true, actionAnim: 'collect' },
      { id: 'm1_door', type: 'interact_landmark', landmark: 'door', prompt: 'Open the wooden door.', hintTr: 'Doğudaki kulübenin ahşap kapısına (wooden door) git ve aç.', pos: { x: 11.2, z: -0.6 }, radius: 3.0, actionAnim: 'openDoor' },
      { id: 'm1_flowers', type: 'collect_count', count: 3, prompt: 'Collect three flowers.', hintTr: 'Çayırdaki üç çiçeği (three flowers) topla.', targetIds: ['flower_1', 'flower_2', 'flower_3'], actionAnim: 'collect' },
      { id: 'm1_rabbit', type: 'interact_landmark', landmark: 'rabbit', prompt: 'Find the white rabbit.', hintTr: 'Zıplayan beyaz tavşanı (white rabbit) bul.', pos: { x: 8.8, z: -11.5 }, radius: 2.8, actionAnim: 'collect' },
      { id: 'm1_chest', type: 'open_chest', prompt: 'Open the treasure chest.', hintTr: 'Hazine sandığını (treasure chest) aç!', pos: { x: 6.5, z: -13.5 }, radius: 2.8, actionAnim: 'openChest' }
    ]
  },
  {
    id: 'island1_level2',
    globalNumber: 2,
    islandId: 'papagan-adasi',
    number: 2,
    title: 'Nehir Köprüsü ve Bahçe',
    enTitle: 'River Bridge & Orchard',
    mood: 'noon',
    spawn: { x: 2.0, z: 14.5, facing: Math.PI },
    chestPos: { x: -17.5, z: -6.5 },
    locksMagicGate: false,
    rewardCollectible: {
      id: 'relic_1_2', name: 'Zümrüt Tüy', enName: 'Emerald Feather', icon: '🪶',
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
      { id: 'm2_bridge', type: 'reach_zone', prompt: 'Turn left at the bridge.', hintTr: 'Batıdaki kemerli ahşap köprüden geç ve sola (left) dön.', pos: { x: -16.8, z: 4.5 }, radius: 3.2 },
      { id: 'm2_apple', type: 'collect', prompt: 'Find the red apple.', hintTr: 'Meyve ağacının altındaki kırmızı elmayı (red apple) bul.', targetIds: ['red_apple'], distractorIds: ['green_apple', 'yellow_apple'], carryOnCollect: true, actionAnim: 'collect' },
      { id: 'm2_house', type: 'deliver_landmark', landmark: 'cottage', prompt: 'Bring the apple to the house.', hintTr: 'Elmayı doğudaki kulübeye (house) götür.', pos: { x: 11.2, z: -0.6 }, radius: 3.2, actionAnim: 'openDoor' },
      { id: 'm2_book_take', type: 'collect', prompt: 'Pick up the blue book.', hintTr: 'Sahil yakınındaki mavi kitabı (blue book) al.', targetIds: ['blue_book'], carryOnCollect: true, actionAnim: 'collect' },
      { id: 'm2_book_table', type: 'deliver_landmark', landmark: 'table', prompt: 'Put the book on the table.', hintTr: 'Kitabı piknik masasının (table) üzerine bırak.', pos: { x: 7.8, z: 3.6 }, radius: 2.8, placePropOnTable: true, actionAnim: 'collect' },
      { id: 'm2_shells', type: 'collect_count', count: 3, prompt: 'Collect three seashells.', hintTr: 'Güney kumsalı boyunca üç deniz kabuğu (three seashells) topla.', targetIds: ['shell_1', 'shell_2', 'shell_3'], actionAnim: 'collect' },
      { id: 'm2_chest', type: 'open_chest', prompt: 'Open the treasure chest.', hintTr: 'Köprünün karşı kıyısındaki hazine sandığını aç!', pos: { x: -17.5, z: -6.5 }, radius: 2.8, actionAnim: 'openChest' }
    ]
  },
  {
    id: 'island1_level3',
    globalNumber: 3,
    islandId: 'papagan-adasi',
    number: 3,
    title: 'Gün Batımı Şelalesi ve Sihirli Kapı',
    enTitle: 'Sunset Waterfall & Magic Gate',
    mood: 'sunset',
    spawn: { x: 1.5, z: 12.0, facing: Math.PI },
    chestPos: { x: 6.5, z: -22.2 },
    locksMagicGate: true,
    rewardCollectible: {
      id: 'relic_1_3', name: 'Papağan Adası Haritası', enName: 'Parrot Island Map', icon: '🗺️',
      description: 'Antik geçidi açan kaşiflerin efsanevi ada haritası!'
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
      { id: 'm3_lantern', type: 'collect', prompt: 'Find the golden lantern.', hintTr: 'Altın feneri (golden lantern) bul ve al.', targetIds: ['gold_lantern'], carryOnCollect: true, actionAnim: 'collect' },
      { id: 'm3_waterfall', type: 'reach_zone', prompt: 'Go to the waterfall.', hintTr: 'Zıplama taşlarından veya köprüden geçip şelalenin (waterfall) önüne git.', pos: { x: -10.8, z: -11.2 }, radius: 3.6 },
      { id: 'm3_key', type: 'collect', prompt: 'Find the yellow key.', hintTr: 'Şelale kıyısındaki sarı anahtarı (yellow key) bul.', targetIds: ['yellow_key3'], distractorIds: ['blue_key3'], carryOnCollect: true, actionAnim: 'collect' },
      { id: 'm3_arch', type: 'deliver_landmark', landmark: 'magic_gate', prompt: 'Open the ancient magic gate.', hintTr: 'Sarı anahtarı meşaleli antik taş kemere (magic gate) götür.', pos: { x: 6.5, z: -17.2 }, radius: 3.2, actionAnim: 'openDoor' },
      { id: 'm3_crystals', type: 'collect_count', count: 3, prompt: 'Collect three crystals.', hintTr: 'Açılan antik avludaki üç kristali (three crystals) topla.', targetIds: ['crystal_1', 'crystal_2', 'crystal_3'], actionAnim: 'collect' },
      { id: 'm3_chest', type: 'open_chest', prompt: 'Open the ancient treasure chest.', hintTr: 'Antik kemerin arkasındaki hazine sandığını aç!', pos: { x: 6.5, z: -22.2 }, radius: 2.8, actionAnim: 'openChest' }
    ]
  }
];

// ─── Deterministic Generator for All Remaining 97 Levels Across All 6 Islands ─
const LEVEL_THEMES = {
  'papagan-adasi': [
    ['Mercan Koyu', 'Coral Cove'], ['Palmiye Patikası', 'Palm Trail'], ['Rüzgarlı İskele', 'Windy Pier'],
    ['Gizli Bahçe', 'Secret Garden'], ['Korsan Gözetlemesi', 'Pirate Lookout'], ['Altın Kumsal', 'Golden Shore'], ['Ada Finali', 'Island Finale']
  ],
  'zumrut-ormani': [
    ['Sarmaşık Vadisi', 'Vine Valley'], ['Parlayan Mantarlar', 'Glowing Mushrooms'], ['Totem Meydanı', 'Totem Clearing'],
    ['Yağmur Kanyonu', 'Rain Canyon'], ['Yosunlu Taşlar', 'Mossy Stones'], ['Zümrüt Şelale', 'Emerald Falls'],
    ['Ulu Ağaç', 'Elder Tree'], ['Orman Kulübesi', 'Forest Cabin'], ['Kelebek Çayırı', 'Butterfly Meadow'],
    ['Sisli Köprü', 'Misty Bridge'], ['Gece Feneri', 'Night Lantern'], ['Gizli Geçit', 'Hidden Pass'],
    ['Zümrüt Anahtar', 'Emerald Key'], ['Antik Kökler', 'Ancient Roots'], ['Orman Tacı', 'Crown of the Forest']
  ],
  'mercan-korfezi': [
    ['Deniz Feneri Koyu', 'Lighthouse Bay'], ['Sığ Lagün', 'Shallow Lagoon'], ['Pembe Mercanlar', 'Pink Corals'],
    ['Yelkenli Limanı', 'Sailboat Harbor'], ['İnci Sahili', 'Pearl Beach'], ['Dalga Köprüsü', 'Wave Bridge'],
    ['Yıldız Kabukları', 'Star Shells'], ['Kaptan Pusulası', 'Captain Compass'], ['Turkuaz Boğaz', 'Turquoise Strait'],
    ['Mercan Bahçesi', 'Coral Garden'], ['Gelgit Taşları', 'Tide Stones'], ['Fener Nöbeti', 'Beacon Watch'],
    ['Mavi Mağara', 'Blue Grotto'], ['Denizci Sandığı', 'Sailor Chest'], ['Körfez Ustası', 'Bay Master']
  ],
  'kayip-sehir': [
    ['Kum Kapısı', 'Sand Gate'], ['Güneş Piramidi', 'Sun Pyramid'], ['Dikilitaş Yolu', 'Obelisk Way'],
    ['Vaha Köprüsü', 'Oasis Bridge'], ['Altın Tablet', 'Golden Book'], ['Antik Pazar', 'Ancient Market'],
    ['Rünlü Kemer', 'Rune Arch'], ['Çöl Feneri', 'Desert Lantern'], ['Kayıp Kütüphane', 'Lost Library'],
    ['Sfenks Bahçesi', 'Oasis Orchard'], ['Meşaleli Avlu', 'Torch Courtyard'], ['Kanyon Geçidi', 'Canyon Crossing'],
    ['Kraliyet Anahtarı', 'Royal Key'], ['Gizli Hazine', 'Hidden Vault'], ['Kehribar Yolu', 'Amber Road'],
    ['Kum Fırtınası', 'Dune Breeze'], ['Yıldız Gözlemevi', 'Star Terrace'], ['Taş Muhafız', 'Stone Guardian'],
    ['Firavun Mührü', 'Sun Seal'], ['Kayıp Şehir Tacı', 'Lost City Crown']
  ],
  'kristal-daglari': [
    ['Karlı Patika', 'Snowy Trail'], ['Ametist Vadisi', 'Amethyst Valley'], ['Buzul Köprüsü', 'Glacier Bridge'],
    ['Kuzey Işıkları', 'Aurora Peak'], ['Kuvars Mağarası', 'Quartz Cave'], ['Çam Korusu', 'Pine Grove'],
    ['Donmuş Şelale', 'Frozen Waterfall'], ['Kristal Anahtar', 'Crystal Key'], ['Dağ Kulübesi', 'Alpine Cabin'],
    ['Parlayan Dikitler', 'Shining Spires'], ['Gümüş Tavşan', 'Snow Rabbit'], ['Rüzgar Sırtı', 'Wind Ridge'],
    ['Mavi Prizma', 'Blue Prism'], ['Buz Taşları', 'Ice Stepping Stones'], ['Yıldız Feneri', 'Starlight Lantern'],
    ['Zirve Tabelası', 'Summit Signpost'], ['Sihirli Geçit', 'Mystic Gate'], ['Elmas Avlu', 'Diamond Court'],
    ['Buzul Hazinesi', 'Glacier Vault'], ['Kristal Zirve', 'Crystal Summit']
  ],
  'antik-tapinak': [
    ['Kutsal Merdiven', 'Sacred Steps'], ['Obsidyen Avlu', 'Obsidian Court'], ['Altın Sütunlar', 'Golden Columns'],
    ['Alev Meşaleleri', 'Flame Braziers'], ['Bilgelik Kitabı', 'Book of Wisdom'], ['Tapınak Köprüsü', 'Temple Bridge'],
    ['Rünlü Kapı', 'Runic Gate'], ['Zümrüt Sunak', 'Emerald Altar'], ['Şelale Tapınağı', 'Waterfall Shrine'],
    ['Muhafız Yolu', 'Guardian Path'], ['Kraliyet Feneri', 'Royal Lantern'], ['Kutsal Kristaller', 'Sacred Crystals'],
    ['Üç Anahtar', 'Three Keys'], ['Gizli Sığınak', 'Inner Sanctum'], ['Altın Meyve', 'Golden Fruit'],
    ['Gökkuşağı Çiçeği', 'Rainbow Blossoms'], ['Efsanevi Geçit', 'Legendary Arch'], ['Büyük Sınav', 'Grand Trial'],
    ['Kadim Mühür', 'Ancient Seal'], ['Büyük Hazine Odası', 'Grand Treasure Chamber']
  ]
};

const RELIC_ICONS = ['🧭', '🪶', '🗺️', '🐚', '🔮', '👑', '💎', '🏺', '🗝️', '🌟', '🛡️', '📜'];

const COLOR_VARIANTS = [
  { name: 'blue',   tr: 'mavi',    hex: '#2196ff', em: '#0c4fa8' },
  { name: 'red',    tr: 'kırmızı', hex: '#ef3333', em: '#991212' },
  { name: 'yellow', tr: 'sarı',    hex: '#ffd426', em: '#9c7800' },
  { name: 'green',  tr: 'yeşil',   hex: '#3fd44e', em: '#167322' },
  { name: 'purple', tr: 'mor',     hex: '#a65eff', em: '#4e1699' }
];

const SAFE_SPOTS = [
  { x: -3.5, z: 8.5 }, { x: 6.2, z: 11.8 }, { x: -2.2, z: -2.5 },
  { x: 5.2, z: 6.4 },  { x: -16.8, z: 5.5 }, { x: -15.8, z: -2.2 },
  { x: 16.2, z: 3.2 }, { x: 0.8, z: 16.5 },  { x: -5.5, z: 15.2 },
  { x: 9.2, z: 14.2 }, { x: -3.5, z: -10.5 },{ x: 3.8, z: -11.5 }
];

const CHEST_SPOTS = [
  { x: 6.5, z: -13.5 }, { x: -17.5, z: -6.5 }, { x: 6.5, z: -22.2 },
  { x: 15.2, z: -9.5 }, { x: -4.2, z: 18.2 }
];

const SPAWN_SPOTS = [
  { x: 2.0, z: 19.5, facing: Math.PI },
  { x: -2.0, z: 15.5, facing: Math.PI },
  { x: 4.5, z: 14.0, facing: Math.PI }
];

function buildProceduralLevel(island, islandIdx, localNum, globalNum) {
  const seed = globalNum * 37 + islandIdx * 101;
  const pickSpot = (idx) => SAFE_SPOTS[(seed + idx * 3) % SAFE_SPOTS.length];
  const moods = ['default', 'noon', 'sunset'];
  const mood = moods[(localNum - 1) % 3];

  const themeList = LEVEL_THEMES[island.id] || [];
  const themePair = themeList[(localNum - (island.index === 1 ? 4 : 1)) % Math.max(1, themeList.length)] || [`Keşif ${localNum}`, `Discovery ${localNum}`];

  const keyTarget = COLOR_VARIANTS[globalNum % COLOR_VARIANTS.length];
  const keyDist1  = COLOR_VARIANTS[(globalNum + 1) % COLOR_VARIANTS.length];
  const keyDist2  = COLOR_VARIANTS[(globalNum + 2) % COLOR_VARIANTS.length];

  const fruitTarget = COLOR_VARIANTS[(globalNum + 2) % 4];
  const fruitDist   = COLOR_VARIANTS[(globalNum + 3) % 4];

  const collectSets = [
    { model: 'flower',   enPl: 'flowers',   trPl: 'çiçek',        label: 'Flower',   hex: '#ff5ea0' },
    { model: 'seashell', enPl: 'seashells', trPl: 'deniz kabuğu', label: 'Seashell', hex: '#ffcba8' },
    { model: 'crystal',  enPl: 'crystals',  trPl: 'kristal',      label: 'Crystal',  hex: '#47f0ff' }
  ];
  const cSet = collectSets[globalNum % collectSets.length];

  const s0 = pickSpot(0), s1 = pickSpot(1), s2 = pickSpot(2);
  const s3 = pickSpot(3), s4 = pickSpot(4);
  const s5 = pickSpot(5), s6 = pickSpot(6), s7 = pickSpot(7);
  const s8 = pickSpot(8);

  const locksGate = (localNum % 2 === 0);
  const chestPos = locksGate ? { x: 6.5, z: -22.2 } : CHEST_SPOTS[globalNum % CHEST_SPOTS.length];
  const spawn = (island.id === 'papagan-adasi' || island.id === 'mercan-korfezi') && localNum % 3 === 1
    ? { x: 2.0, z: 28.5, facing: Math.PI }
    : SPAWN_SPOTS[globalNum % SPAWN_SPOTS.length];

  const props = [
    { id: 'k_ok', model: 'key', color: keyTarget.hex, emissive: keyTarget.em, x: s0.x, z: s0.z, label: `${keyTarget.name.toUpperCase()} Key`, tr: `${keyTarget.tr} anahtar` },
    { id: 'k_d1', model: 'key', color: keyDist1.hex,  emissive: keyDist1.em,  x: s1.x, z: s1.z, label: `${keyDist1.name.toUpperCase()} Key`,  tr: `${keyDist1.tr} anahtar` },
    { id: 'k_d2', model: 'key', color: keyDist2.hex,  emissive: keyDist2.em,  x: s2.x, z: s2.z, label: `${keyDist2.name.toUpperCase()} Key`,  tr: `${keyDist2.tr} anahtar` },
    { id: 'f_ok', model: 'apple', color: fruitTarget.hex, x: s3.x, z: s3.z, label: `${fruitTarget.name.toUpperCase()} Apple`, tr: `${fruitTarget.tr} elma` },
    { id: 'f_d1', model: 'apple', color: fruitDist.hex,   x: s4.x, z: s4.z, label: `${fruitDist.name.toUpperCase()} Apple`,   tr: `${fruitDist.tr} elma` },
    { id: 'c_1',  model: cSet.model, color: cSet.hex, x: s5.x, z: s5.z, label: cSet.label, tr: cSet.trPl },
    { id: 'c_2',  model: cSet.model, color: cSet.hex, x: s6.x, z: s6.z, label: cSet.label, tr: cSet.trPl },
    { id: 'c_3',  model: cSet.model, color: cSet.hex, x: s7.x, z: s7.z, label: cSet.label, tr: cSet.trPl },
    { id: 'item_carry', model: globalNum % 2 === 0 ? 'book' : 'lantern', color: '#256ae0', x: s8.x, z: s8.z, label: globalNum % 2 === 0 ? 'Book' : 'Golden Lantern', tr: globalNum % 2 === 0 ? 'kitap' : 'altın fener' }
  ];

  const zoneTask = globalNum % 3 === 0
    ? { id: 'm_zone', type: 'reach_zone', prompt: 'Go to the waterfall.', hintTr: 'Kuzeybatıdaki akan şelalenin (waterfall) önüne git.', pos: { x: -10.8, z: -11.2 }, radius: 3.6 }
    : globalNum % 3 === 1
      ? { id: 'm_zone', type: 'reach_zone', prompt: 'Cross the wooden bridge.', hintTr: 'Batıdaki kemerli ahşap köprüden (wooden bridge) karşıya geç.', pos: { x: -16.5, z: 2.2 }, radius: 3.4 }
      : { id: 'm_zone', type: 'interact_landmark', landmark: 'rabbit', prompt: 'Find the white rabbit.', hintTr: 'Zıplayan beyaz tavşanı (white rabbit) bul.', pos: { x: 8.8, z: -11.5 }, radius: 2.8, actionAnim: 'collect' };

  const gateOrSanctuaryTask = locksGate
    ? { id: 'm_gate', type: 'deliver_landmark', landmark: 'magic_gate', prompt: 'Open the ancient magic gate.', hintTr: 'Anahtarı antik taş kemere (magic gate) götür.', pos: { x: 6.5, z: -17.2 }, radius: 3.2, actionAnim: 'openDoor' }
    : { id: 'm_sanctuary', type: 'deliver_landmark', landmark: 'cottage', prompt: island.index >= 4 ? 'Bring the key to the sanctuary.' : 'Bring the key to the house.', hintTr: 'Anahtarı doğudaki yapıya götür.', pos: { x: 11.0, z: -0.6 }, radius: 3.4, actionAnim: 'openDoor' };

  const carryName = globalNum % 2 === 0 ? 'book' : 'golden lantern';
  const carryTr   = globalNum % 2 === 0 ? 'kitabı' : 'altın feneri';

  const missions = [
    zoneTask,
    {
      id: 'm_key', type: 'collect',
      prompt: `Find the ${keyTarget.name} key.`,
      hintTr: `${keyTarget.tr[0].toUpperCase() + keyTarget.tr.slice(1)} anahtarı (${keyTarget.name} key) bul.`,
      targetIds: ['k_ok'], distractorIds: ['k_d1', 'k_d2'], carryOnCollect: true, actionAnim: 'collect'
    },
    gateOrSanctuaryTask,
    {
      id: 'm_fruit', type: 'collect',
      prompt: `Find the ${fruitTarget.name} apple.`,
      hintTr: `${fruitTarget.tr[0].toUpperCase() + fruitTarget.tr.slice(1)} elmayı (${fruitTarget.name} apple) bul.`,
      targetIds: ['f_ok'], distractorIds: ['f_d1'], carryOnCollect: false, actionAnim: 'collect'
    },
    {
      id: 'm_take_item', type: 'collect',
      prompt: `Pick up the ${carryName}.`,
      hintTr: `Yerdeki ${carryTr} (${carryName}) al.`,
      targetIds: ['item_carry'], carryOnCollect: true, actionAnim: 'collect'
    },
    {
      id: 'm_put_table', type: 'deliver_landmark', landmark: 'table',
      prompt: `Put the ${carryName} on the table.`,
      hintTr: `Eşyayı ahşap masanın (table) üzerine koy.`,
      pos: { x: 7.8, z: 3.6 }, radius: 2.8, placePropOnTable: globalNum % 2 === 0, actionAnim: 'collect'
    },
    {
      id: 'm_count', type: 'collect_count', count: 3,
      prompt: `Collect three ${cSet.enPl}.`,
      hintTr: `Adadaki üç ${cSet.trPl} (three ${cSet.enPl}) topla.`,
      targetIds: ['c_1', 'c_2', 'c_3'], actionAnim: 'collect'
    },
    {
      id: 'm_chest', type: 'open_chest',
      prompt: 'Open the treasure chest.',
      hintTr: 'Hazine sandığını (treasure chest) aç!',
      pos: chestPos, radius: 2.8, actionAnim: 'openChest'
    }
  ];

  // Keep early levels 6 missions, mid/late levels 7–8 missions for smooth pedagogical progression!
  const trimmedMissions = globalNum <= 25
    ? missions.filter((m) => m.id !== 'm_take_item' && m.id !== 'm_put_table')
    : missions;

  return {
    id: `island${island.index}_level${localNum}`,
    globalNumber: globalNum,
    islandId: island.id,
    number: localNum,
    title: themePair[0],
    enTitle: themePair[1],
    mood,
    spawn,
    chestPos,
    locksMagicGate: locksGate,
    rewardCollectible: {
      id: `relic_${island.index}_${localNum}`,
      name: `${island.name} Yadigârı #${localNum}`,
      enName: `${island.enName} Relic #${localNum}`,
      icon: RELIC_ICONS[globalNum % RELIC_ICONS.length],
      description: `${island.name} ${localNum}. Bölüm kaşif koleksiyon parçası.`
    },
    props,
    missions: trimmedMissions
  };
}

// Build complete 100-level catalog across all 6 islands!
export const ALL_LEVELS = [];
{
  let globalNum = 1;
  ISLANDS.forEach((isl, islIdx) => {
    for (let localNum = 1; localNum <= isl.levelCount; localNum++) {
      if (isl.index === 1 && localNum <= 3) {
        ALL_LEVELS.push(HANDCRAFTED_ISLAND_1[localNum - 1]);
      } else {
        ALL_LEVELS.push(buildProceduralLevel(isl, islIdx, localNum, globalNum));
      }
      globalNum++;
    }
  });
}

export function getLevelsForIsland(islandId) {
  return ALL_LEVELS.filter((l) => l.islandId === islandId);
}

export function getLevelById(levelId) {
  return ALL_LEVELS.find((l) => l.id === levelId) || null;
}

export function getNextLevel(levelId) {
  const cur = getLevelById(levelId);
  if (!cur) return null;
  return ALL_LEVELS.find((l) => l.globalNumber === cur.globalNumber + 1) || null;
}
