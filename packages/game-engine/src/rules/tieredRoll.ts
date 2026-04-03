/**
 * Tiered Roll Results System - Issue #234
 * 
 * 分層擲骰結果系統
 * 支援事件卡根據擲骰總和決定不同結果層級
 * 
 * 規則書參考：事件卡效果基於擲骰範圍
 */

import { TieredOutcome, StatType } from '@betrayal/shared';

/**
 * 解析分層結果
 * 根據擲骰總和找到對應的結果層級
 * 
 * @param rollTotal - 擲骰總和
 * @param outcomes - 分層結果陣列
 * @returns 匹配的 TieredOutcome 或 null
 * 
 * @example
 * const outcome = resolveTieredOutcome(3, [
 *   { minRoll: 5, maxRoll: 8, effect: "Gain 1 Sanity" },
 *   { minRoll: 2, maxRoll: 4, effect: "Take 1 Mental damage" },
 *   { minRoll: 0, maxRoll: 1, effect: "Take 2 Mental damage" }
 * ]);
 * // Returns: { minRoll: 2, maxRoll: 4, effect: "Take 1 Mental damage" }
 */
export function resolveTieredOutcome(
  rollTotal: number,
  outcomes: TieredOutcome[]
): TieredOutcome | null {
  if (!outcomes || outcomes.length === 0) {
    return null;
  }

  // 找到匹配擲骰範圍的結果
  const matchedOutcome = outcomes.find(
    (outcome) => rollTotal >= outcome.minRoll && rollTotal <= outcome.maxRoll
  );

  return matchedOutcome || null;
}

/**
 * 檢查卡片是否使用分層結果系統
 * 
 * @param tieredOutcomes - 分層結果陣列
 * @returns 是否為分層結果卡片
 */
export function hasTieredOutcomes(
  tieredOutcomes: TieredOutcome[] | undefined
): boolean {
  return !!tieredOutcomes && tieredOutcomes.length > 0;
}

/**
 * 取得所有可能的結果描述（用於 UI 顯示）
 * 
 * @param outcomes - 分層結果陣列
 * @returns 格式化的結果描述陣列
 * 
 * @example
 * getOutcomeDescriptions(outcomes)
 * // Returns: [
 * //   { range: "5+", effect: "Gain 1 Sanity" },
 * //   { range: "2-4", effect: "Take 1 Mental damage" },
 * //   { range: "0-1", effect: "Take 2 Mental damage" }
 * // ]
 */
export function getOutcomeDescriptions(
  outcomes: TieredOutcome[]
): { range: string; effect: string; isHighlighted?: boolean }[] {
  if (!outcomes || outcomes.length === 0) {
    return [];
  }

  return outcomes.map((outcome) => {
    const range = formatRollRange(outcome.minRoll, outcome.maxRoll);
    return {
      range,
      effect: outcome.effect,
    };
  });
}

/**
 * 格式化擲骰範圍顯示
 * 
 * @param minRoll - 最小擲骰值
 * @param maxRoll - 最大擲骰值
 * @returns 格式化的範圍字串
 * 
 * @example
 * formatRollRange(5, 8) // "5+"
 * formatRollRange(2, 4) // "2-4"
 * formatRollRange(0, 1) // "0-1"
 * formatRollRange(4, 4) // "4"
 */
export function formatRollRange(minRoll: number, maxRoll: number): string {
  // 如果最大擲骰值大於等於 8（理論最大值），顯示為 "X+"
  if (maxRoll >= 8) {
    return `${minRoll}+`;
  }
  
  // 如果最小值等於最大值，只顯示單一數字
  if (minRoll === maxRoll) {
    return `${minRoll}`;
  }
  
  // 否則顯示範圍
  return `${minRoll}-${maxRoll}`;
}

/**
 * 判斷特定擲骰值是否匹配某個結果
 * 
 * @param rollTotal - 擲骰總和
 * @param outcome - 分層結果
 * @returns 是否匹配
 */
export function isRollInOutcomeRange(
  rollTotal: number,
  outcome: TieredOutcome
): boolean {
  return rollTotal >= outcome.minRoll && rollTotal <= outcome.maxRoll;
}

/**
 * 取得擲骰值對應的結果索引
 * 用於 UI 高亮顯示
 * 
 * @param rollTotal - 擲骰總和
 * @param outcomes - 分層結果陣列
 * @returns 結果索引，如果沒有匹配則返回 -1
 */
export function getOutcomeIndex(
  rollTotal: number,
  outcomes: TieredOutcome[]
): number {
  return outcomes.findIndex(
    (outcome) => rollTotal >= outcome.minRoll && rollTotal <= outcome.maxRoll
  );
}

/**
 * 應用分層結果的效果
 * 返回屬性變化和傷害的摘要
 * 
 * @param outcome - 分層結果
 * @returns 效果摘要
 */
export function applyTieredOutcome(outcome: TieredOutcome): {
  statChange?: { stat: StatType; amount: number };
  damage?: { type: 'physical' | 'mental' | 'general'; amount: number };
  description: string;
} {
  return {
    statChange: outcome.statChange,
    damage: outcome.damage,
    description: outcome.effect,
  };
}

/**
 * 驗證分層結果配置是否有效
 * 檢查是否有重疊的範圍或缺失的範圍
 * 
 * @param outcomes - 分層結果陣列
 * @returns 驗證結果
 */
export function validateTieredOutcomes(
  outcomes: TieredOutcome[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!outcomes || outcomes.length === 0) {
    return { valid: true, errors: [] };
  }

  // 檢查範圍重疊
  for (let i = 0; i < outcomes.length; i++) {
    for (let j = i + 1; j < outcomes.length; j++) {
      const a = outcomes[i];
      const b = outcomes[j];
      
      // 檢查是否有重疊
      if (
        (a.minRoll <= b.maxRoll && a.maxRoll >= b.minRoll) ||
        (b.minRoll <= a.maxRoll && b.maxRoll >= a.minRoll)
      ) {
        errors.push(
          `範圍重疊: [${a.minRoll}-${a.maxRoll}] 和 [${b.minRoll}-${b.maxRoll}]`
        );
      }
    }
  }

  // 檢查最小值是否大於最大值
  outcomes.forEach((outcome, index) => {
    if (outcome.minRoll > outcome.maxRoll) {
      errors.push(
        `結果 ${index + 1}: 最小值 (${outcome.minRoll}) 大於最大值 (${outcome.maxRoll})`
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
