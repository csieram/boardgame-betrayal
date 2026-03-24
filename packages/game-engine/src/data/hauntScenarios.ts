/**
 * Haunt 劇本資料定義
 * 
 * 定義所有可用的 Haunt 劇本，包含目標、規則和設定
 * Rulebook Reference: Page 14-15, Haunt 階段
 */

/** Haunt 類型 */
export type HauntScenarioType = 
  | 'single_traitor'  // 單叛徒模式
  | 'cooperative'     // 合作模式（無叛徒）
  | 'hidden_traitor'  // 隱藏叛徒模式
  | 'free_for_all';   // 各自為戰

/** 玩家陣營 */
export type PlayerSide = 'hero' | 'traitor' | 'neutral';

/** Haunt 劇本定義 */
export interface HauntScenario {
  /** 劇本編號 */
  id: number;
  /** 劇本名稱 */
  name: string;
  /** 劇本英文名稱 */
  nameEn: string;
  /** 劇本描述 */
  description: string;
  /** Haunt 類型 */
  type: HauntScenarioType;
  /** 英雄方目標 */
  heroObjective: string;
  /** 叛徒方目標（如適用） */
  traitorObjective?: string;
  /** 叛徒獲勝條件描述 */
  traitorWinCondition: string;
  /** 英雄獲勝條件描述 */
  heroWinCondition: string;
  /** 特殊規則 */
  specialRules?: string[];
  /** 建議玩家數量 */
  recommendedPlayerCount: number;
  /** 難度等級 1-5 */
  difficulty: number;
}

/** 劇本 1: 木乃伊 (The Mummy) */
const THE_MUMMY: HauntScenario = {
  id: 1,
  name: '木乃伊',
  nameEn: 'The Mummy',
  description: '一名玩家成為木乃伊的控制者，試圖將所有英雄變成木乃伊僕從。英雄們必須找到古老的護身符才能擊敗木乃伊。',
  type: 'single_traitor',
  heroObjective: '找到「聖甲蟲護身符」並用它來摧毀木乃伊',
  traitorObjective: '將所有英雄變成木乃伊僕從或消滅他們',
  traitorWinCondition: '所有英雄死亡或成為僕從',
  heroWinCondition: '使用聖甲蟲護身符擊敗木乃伊',
  specialRules: [
    '叛徒控制木乃伊怪物',
    '木乃伊每回合可以移動 3 格',
    '英雄被木乃伊攻擊失敗會受到詛咒',
  ],
  recommendedPlayerCount: 3,
  difficulty: 2,
};

/** 劇本 2: 女巫 (The Witch) */
const THE_WITCH: HauntScenario = {
  id: 2,
  name: '女巫',
  nameEn: 'The Witch',
  description: '一名玩家成為邪惡女巫，正在準備一個強大的詛咒儀式。英雄們必須在儀式完成前摧毀女巫的大鍋。',
  type: 'single_traitor',
  heroObjective: '找到並摧毀女巫的大鍋',
  traitorObjective: '完成詛咒儀式或消滅所有英雄',
  traitorWinCondition: '完成儀式（收集 6 個魔法標記）或所有英雄死亡',
  heroWinCondition: '摧毀大鍋（需要 Knowledge 檢定 5+）',
  specialRules: [
    '叛徒每回合可以召喚一個使魔',
    '大鍋位於女巫開始的房間',
    '英雄可以在廚房找到摧毀大鍋的道具',
  ],
  recommendedPlayerCount: 4,
  difficulty: 3,
};

/** 劇本 3: 殭屍 (The Zombie) */
const THE_ZOMBIE: HauntScenario = {
  id: 3,
  name: '殭屍',
  nameEn: 'The Zombie',
  description: '一名玩家成為死靈法師，正在喚醒房子裡的死者。英雄們必須在殭屍大軍淹沒他們之前逃離房子。',
  type: 'single_traitor',
  heroObjective: '所有英雄必須逃離房子（回到入口大廳並離開）',
  traitorObjective: '消滅所有英雄或將他們變成殭屍',
  traitorWinCondition: '所有英雄死亡或變成殭屍',
  heroWinCondition: '所有存活的英雄逃離房子',
  specialRules: [
    '叛徒每回合可以召喚 1d3 個殭屍',
    '殭屍移動速度為 2',
    '被殭屍殺死的英雄變成殭屍（叛徒控制）',
  ],
  recommendedPlayerCount: 5,
  difficulty: 3,
};

/** 所有可用劇本 */
export const HAUNT_SCENARIOS: HauntScenario[] = [
  THE_MUMMY,
  THE_WITCH,
  THE_ZOMBIE,
];

/** 根據 ID 取得劇本 */
export function getScenarioById(id: number): HauntScenario | undefined {
  return HAUNT_SCENARIOS.find(s => s.id === id);
}

/** 根據玩家數量取得推薦劇本 */
export function getRecommendedScenarios(playerCount: number): HauntScenario[] {
  return HAUNT_SCENARIOS.filter(s => 
    s.recommendedPlayerCount <= playerCount + 1 && 
    s.recommendedPlayerCount >= playerCount - 1
  );
}

/** 隨機選擇劇本 */
export function getRandomScenario(rng: { nextInt: (min: number, max: number) => number }): HauntScenario {
  const index = rng.nextInt(0, HAUNT_SCENARIOS.length);
  return HAUNT_SCENARIOS[index];
}

/** 取得劇本總數 */
export function getScenarioCount(): number {
  return HAUNT_SCENARIOS.length;
}
