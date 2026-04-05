/**
 * Corpse Looting System (Issue #242)
 * 
 * 當玩家死亡時，其物品會成為可搜刮的屍體。
 * 其他玩家可以在同一位置搜刮屍體並拿走物品。
 * 
 * Rulebook Reference: Page 9, 19 - Player Death
 */

import { Card, Player, Position3D } from '../types';

// ==================== 屍體數據結構 ====================

/**
 * 屍體
 * 代表死亡玩家留下的可搜刮容器
 */
export interface Corpse {
  /** 屍體唯一 ID */
  id: string;
  /** 死亡玩家 ID */
  playerId: string;
  /** 死亡玩家名稱 */
  playerName: string;
  /** 屍體位置 */
  position: Position3D;
  /** 持有的物品卡 */
  items: Card[];
  /** 持有的預兆卡 */
  omens: Card[];
  /** 屍體創建時間戳 */
  createdAt: number;
}

/**
 * 屍體狀態
 */
export interface CorpseState {
  /** 所有屍體列表 */
  corpses: Corpse[];
}

/**
 * 搜刮結果
 */
export interface LootResult {
  /** 是否成功 */
  success: boolean;
  /** 獲得的物品（成功時） */
  item?: Card;
  /** 錯誤訊息（失敗時） */
  error?: string;
}

/**
 * 搜刮驗證結果
 */
export interface LootValidation {
  /** 是否可以搜刮 */
  canLoot: boolean;
  /** 原因（無法搜刮時） */
  reason?: string;
}

// ==================== CorpseManager ====================

/**
 * 屍體管理器
 * 管理所有屍體的創建、查詢和搜刮操作
 */
export class CorpseManager {
  private corpses: Corpse[] = [];

  /**
   * 創建屍體
   * @param player - 死亡玩家
   * @param position - 死亡位置
   * @returns 創建的屍體
   */
  createCorpse(player: Player, position: Position3D): Corpse {
    const corpse: Corpse = {
      id: `corpse_${player.id}_${Date.now()}`,
      playerId: player.id,
      playerName: player.name,
      position: { ...position },
      items: [...player.items],
      omens: [...player.omens],
      createdAt: Date.now(),
    };

    this.corpses.push(corpse);
    return corpse;
  }

  /**
   * 獲取指定位置的所有屍體
   * @param position - 目標位置
   * @returns 該位置的屍體列表
   */
  getCorpsesAtPosition(position: Position3D): Corpse[] {
    return this.corpses.filter(
      corpse =>
        corpse.position.x === position.x &&
        corpse.position.y === position.y &&
        corpse.position.floor === position.floor
    );
  }

  /**
   * 根據 ID 獲取屍體
   * @param corpseId - 屍體 ID
   * @returns 屍體或 undefined
   */
  getCorpseById(corpseId: string): Corpse | undefined {
    return this.corpses.find(corpse => corpse.id === corpseId);
  }

  /**
   * 獲取所有屍體
   * @returns 所有屍體列表
   */
  getAllCorpses(): Corpse[] {
    return [...this.corpses];
  }

  /**
   * 從屍體中搜刮物品
   * @param corpseId - 屍體 ID
   * @param itemId - 物品 ID
   * @returns 被搜刮的物品，如果不存在則返回 undefined
   */
  lootItem(corpseId: string, itemId: string): Card | undefined {
    const corpse = this.getCorpseById(corpseId);
    if (!corpse) return undefined;

    // 先從 items 中尋找
    const itemIndex = corpse.items.findIndex(item => item.id === itemId);
    if (itemIndex !== -1) {
      const [item] = corpse.items.splice(itemIndex, 1);
      this.checkAndRemoveEmptyCorpse(corpseId);
      return item;
    }

    // 再從 omens 中尋找
    const omenIndex = corpse.omens.findIndex(omen => omen.id === itemId);
    if (omenIndex !== -1) {
      const [omen] = corpse.omens.splice(omenIndex, 1);
      this.checkAndRemoveEmptyCorpse(corpseId);
      return omen;
    }

    return undefined;
  }

  /**
   * 搜刮特定類型的物品（從 items 或 omens）
   * @param corpseId - 屍體 ID
   * @param itemId - 物品 ID
   * @param cardType - 卡牌類型
   * @returns 被搜刮的物品
   */
  lootItemByType(
    corpseId: string,
    itemId: string,
    cardType: 'item' | 'omen'
  ): Card | undefined {
    const corpse = this.getCorpseById(corpseId);
    if (!corpse) return undefined;

    if (cardType === 'item') {
      const index = corpse.items.findIndex(item => item.id === itemId);
      if (index !== -1) {
        const [item] = corpse.items.splice(index, 1);
        this.checkAndRemoveEmptyCorpse(corpseId);
        return item;
      }
    } else {
      const index = corpse.omens.findIndex(omen => omen.id === itemId);
      if (index !== -1) {
        const [omen] = corpse.omens.splice(index, 1);
        this.checkAndRemoveEmptyCorpse(corpseId);
        return omen;
      }
    }

    return undefined;
  }

  /**
   * 移除屍體
   * @param corpseId - 屍體 ID
   * @returns 是否成功移除
   */
  removeCorpse(corpseId: string): boolean {
    const index = this.corpses.findIndex(corpse => corpse.id === corpseId);
    if (index === -1) return false;

    this.corpses.splice(index, 1);
    return true;
  }

  /**
   * 檢查並移除空屍體（當所有物品都被搜刮完時）
   * @param corpseId - 屍體 ID
   */
  private checkAndRemoveEmptyCorpse(corpseId: string): void {
    const corpse = this.getCorpseById(corpseId);
    if (corpse && corpse.items.length === 0 && corpse.omens.length === 0) {
      this.removeCorpse(corpseId);
    }
  }

  /**
   * 獲取屍體中的所有物品（items + omens）
   * @param corpseId - 屍體 ID
   * @returns 所有物品列表
   */
  getCorpseInventory(corpseId: string): Card[] {
    const corpse = this.getCorpseById(corpseId);
    if (!corpse) return [];
    return [...corpse.items, ...corpse.omens];
  }

  /**
   * 檢查屍體是否為空
   * @param corpseId - 屍體 ID
   * @returns 是否為空
   */
  isCorpseEmpty(corpseId: string): boolean {
    const corpse = this.getCorpseById(corpseId);
    if (!corpse) return true;
    return corpse.items.length === 0 && corpse.omens.length === 0;
  }

  /**
   * 獲取屍體中的物品數量
   * @param corpseId - 屍體 ID
   * @returns 物品總數
   */
  getCorpseItemCount(corpseId: string): number {
    const corpse = this.getCorpseById(corpseId);
    if (!corpse) return 0;
    return corpse.items.length + corpse.omens.length;
  }

  /**
   * 清除所有屍體（用於重置遊戲）
   */
  clearAllCorpses(): void {
    this.corpses = [];
  }
}

// ==================== 搜刮函數 ====================

/**
   * 檢查是否可以搜刮屍體
   * Rulebook Reference: Page 19 - "A player's body can be looted by other players 
   * who enter the room where the character died."
   * @param corpse - 目標屍體
   * @param looterPosition - 搜刮者位置
   * @returns 是否可以搜刮
   */
export function canLootCorpse(
  corpse: Corpse,
  looterPosition: Position3D
): boolean {
  return (
    corpse.position.x === looterPosition.x &&
    corpse.position.y === looterPosition.y &&
    corpse.position.floor === looterPosition.floor
  );
}

/**
 * 檢查是否可以搜刮屍體（帶詳細原因）
 * @param corpse - 目標屍體
 * @param looterPosition - 搜刮者位置
 * @returns 驗證結果
 */
export function validateLootCorpse(
  corpse: Corpse,
  looterPosition: Position3D
): LootValidation {
  const isSamePosition =
    corpse.position.x === looterPosition.x &&
    corpse.position.y === looterPosition.y &&
    corpse.position.floor === looterPosition.floor;

  if (!isSamePosition) {
    return {
      canLoot: false,
      reason: '你必須與屍體在同一位置才能搜刮',
    };
  }

  if (corpse.items.length === 0 && corpse.omens.length === 0) {
    return {
      canLoot: false,
      reason: '屍體上沒有物品可以搜刮',
    };
  }

  return { canLoot: true };
}

/**
 * 從屍體搜刮物品
 * @param corpseId - 屍體 ID
 * @param itemId - 物品 ID
 * @param corpseManager - 屍體管理器實例
 * @param looterPosition - 搜刮者位置
 * @returns 搜刮結果
 */
export function lootItemFromCorpse(
  corpseId: string,
  itemId: string,
  corpseManager: CorpseManager,
  looterPosition: Position3D
): LootResult {
  // 驗證屍體存在
  const corpse = corpseManager.getCorpseById(corpseId);
  if (!corpse) {
    return {
      success: false,
      error: '找不到指定的屍體',
    };
  }

  // 驗證位置
  if (!canLootCorpse(corpse, looterPosition)) {
    return {
      success: false,
      error: '你必須與屍體在同一位置才能搜刮',
    };
  }

  // 搜刮物品
  const item = corpseManager.lootItem(corpseId, itemId);
  if (!item) {
    return {
      success: false,
      error: '找不到指定的物品',
    };
  }

  return {
    success: true,
    item,
  };
}

/**
 * 從屍體搜刮特定類型的物品
 * @param corpseId - 屍體 ID
 * @param itemId - 物品 ID
 * @param cardType - 卡牌類型
 * @param corpseManager - 屍體管理器實例
 * @param looterPosition - 搜刮者位置
 * @returns 搜刮結果
 */
export function lootItemFromCorpseByType(
  corpseId: string,
  itemId: string,
  cardType: 'item' | 'omen',
  corpseManager: CorpseManager,
  looterPosition: Position3D
): LootResult {
  // 驗證屍體存在
  const corpse = corpseManager.getCorpseById(corpseId);
  if (!corpse) {
    return {
      success: false,
      error: '找不到指定的屍體',
    };
  }

  // 驗證位置
  if (!canLootCorpse(corpse, looterPosition)) {
    return {
      success: false,
      error: '你必須與屍體在同一位置才能搜刮',
    };
  }

  // 搜刮物品
  const item = corpseManager.lootItemByType(corpseId, itemId, cardType);
  if (!item) {
    return {
      success: false,
      error: `找不到指定的${cardType === 'item' ? '物品' : '預兆'}`,
    };
  }

  return {
    success: true,
    item,
  };
}

// ==================== 輔助函數 ====================

/**
 * 創建屍體狀態
 * @returns 空的屍體狀態
 */
export function createCorpseState(): CorpseState {
  return {
    corpses: [],
  };
}

/**
 * 檢查位置是否有可搜刮的屍體
 * @param position - 目標位置
 * @param corpseManager - 屍體管理器實例
 * @returns 是否有可搜刮的屍體
 */
export function hasLootableCorpseAtPosition(
  position: Position3D,
  corpseManager: CorpseManager
): boolean {
  const corpses = corpseManager.getCorpsesAtPosition(position);
  return corpses.some(
    corpse => corpse.items.length > 0 || corpse.omens.length > 0
  );
}

/**
 * 獲取位置上的可搜刮物品總數
 * @param position - 目標位置
 * @param corpseManager - 屍體管理器實例
 * @returns 可搜刮物品總數
 */
export function getLootableItemCountAtPosition(
  position: Position3D,
  corpseManager: CorpseManager
): number {
  const corpses = corpseManager.getCorpsesAtPosition(position);
  return corpses.reduce(
    (total, corpse) => total + corpse.items.length + corpse.omens.length,
    0
  );
}

/**
 * 格式化屍體描述
 * @param corpse - 屍體
 * @returns 描述文字
 */
export function formatCorpseDescription(corpse: Corpse): string {
  const itemCount = corpse.items.length;
  const omenCount = corpse.omens.length;
  const totalCount = itemCount + omenCount;

  if (totalCount === 0) {
    return `${corpse.playerName} 的屍體（已被搜刮一空）`;
  }

  const parts: string[] = [];
  if (itemCount > 0) parts.push(`${itemCount} 個物品`);
  if (omenCount > 0) parts.push(`${omenCount} 個預兆`);

  return `${corpse.playerName} 的屍體（${parts.join('、')}）`;
}

/**
 * 檢查玩家是否可以搜刮任何屍體
 * @param looterPosition - 搜刮者位置
 * @param corpseManager - 屍體管理器實例
 * @returns 是否可以搜刮
 */
export function canLootAnyCorpse(
  looterPosition: Position3D,
  corpseManager: CorpseManager
): boolean {
  const corpses = corpseManager.getCorpsesAtPosition(looterPosition);
  return corpses.some(
    corpse => corpse.items.length > 0 || corpse.omens.length > 0
  );
}

/**
 * 獲取搜刮者可見的所有可搜刮物品
 * @param looterPosition - 搜刮者位置
 * @param corpseManager - 屍體管理器實例
 * @returns 可搜刮物品列表（包含屍體 ID 和物品）
 */
export function getLootableItemsAtPosition(
  looterPosition: Position3D,
  corpseManager: CorpseManager
): Array<{ corpseId: string; corpseName: string; item: Card }> {
  const corpses = corpseManager.getCorpsesAtPosition(looterPosition);
  const lootableItems: Array<{ corpseId: string; corpseName: string; item: Card }> = [];

  for (const corpse of corpses) {
    for (const item of corpse.items) {
      lootableItems.push({
        corpseId: corpse.id,
        corpseName: corpse.playerName,
        item,
      });
    }
    for (const omen of corpse.omens) {
      lootableItems.push({
        corpseId: corpse.id,
        corpseName: corpse.playerName,
        item: omen,
      });
    }
  }

  return lootableItems;
}
