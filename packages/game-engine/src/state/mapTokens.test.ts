/**
 * Map Token System Tests - 地圖標記系統測試
 * Issue #235 - Secret Passages
 * 
 * 測試項目：
 * - Token creation (all types)
 * - TokenManager functionality
 * - Secret passage linking
 * - Token validation
 * - Movement integration with secret passages
 */

import {
  MapToken,
  TokenType,
  TokenManager,
  createSecretPassage,
  createBlockedToken,
  createTrapToken,
  createSafeToken,
  validateSecretPassagePositions,
  validateTokenPlacement,
  TOKEN_TYPE_NAMES,
  TOKEN_TYPE_DESCRIPTIONS,
} from './mapTokens';
import { Position3D } from '../types';

// ==================== 測試輔助函數 ====================

const createMockPosition = (x: number, y: number, floor: string): Position3D => ({
  x,
  y,
  floor: floor as any,
});

// ==================== Token Creation Tests ====================

describe('Token Creation', () => {
  describe('createSecretPassage', () => {
    it('應該創建兩個互相連接的秘密通道標記', () => {
      const pos1 = createMockPosition(5, 5, 'ground');
      const pos2 = createMockPosition(8, 8, 'ground');
      const playerId = 'player-1';

      const tokens = createSecretPassage(pos1, pos2, playerId);

      expect(tokens).toHaveLength(2);
      
      // 檢查第一個標記
      expect(tokens[0].type).toBe('secret_passage');
      expect(tokens[0].position).toEqual(pos1);
      expect(tokens[0].linkedPosition).toEqual(pos2);
      expect(tokens[0].placedBy).toBe(playerId);
      
      // 檢查第二個標記
      expect(tokens[1].type).toBe('secret_passage');
      expect(tokens[1].position).toEqual(pos2);
      expect(tokens[1].linkedPosition).toEqual(pos1);
      expect(tokens[1].placedBy).toBe(playerId);
    });

    it('應該為每個標記生成唯一 ID', () => {
      const pos1 = createMockPosition(5, 5, 'ground');
      const pos2 = createMockPosition(8, 8, 'ground');
      
      const tokens = createSecretPassage(pos1, pos2, 'player-1');

      expect(tokens[0].id).toBeDefined();
      expect(tokens[1].id).toBeDefined();
      expect(tokens[0].id).not.toBe(tokens[1].id);
    });

    it('應該為兩個標記設置相同的創建時間', () => {
      const pos1 = createMockPosition(5, 5, 'ground');
      const pos2 = createMockPosition(8, 8, 'ground');
      
      const beforeTime = Date.now();
      const tokens = createSecretPassage(pos1, pos2, 'player-1');
      const afterTime = Date.now();

      expect(tokens[0].createdAt).toBe(tokens[1].createdAt);
      expect(tokens[0].createdAt).toBeGreaterThanOrEqual(beforeTime);
      expect(tokens[0].createdAt).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('createBlockedToken', () => {
    it('應該創建阻擋標記', () => {
      const pos = createMockPosition(5, 5, 'ground');
      const playerId = 'player-1';

      const token = createBlockedToken(pos, playerId);

      expect(token.type).toBe('blocked');
      expect(token.position).toEqual(pos);
      expect(token.placedBy).toBe(playerId);
      expect(token.id).toBeDefined();
    });

    it('應該支援方向描述', () => {
      const pos = createMockPosition(5, 5, 'ground');
      const token = createBlockedToken(pos, 'player-1', 'north');

      expect(token.effectDescription).toContain('north');
    });
  });

  describe('createTrapToken', () => {
    it('應該創建陷阱標記', () => {
      const pos = createMockPosition(5, 5, 'ground');
      const playerId = 'player-1';
      const effect = '造成 2 點物理傷害';

      const token = createTrapToken(pos, playerId, effect);

      expect(token.type).toBe('trap');
      expect(token.position).toEqual(pos);
      expect(token.placedBy).toBe(playerId);
      expect(token.effectDescription).toBe(effect);
      expect(token.triggered).toBe(false);
    });
  });

  describe('createSafeToken', () => {
    it('應該創建安全區域標記', () => {
      const pos = createMockPosition(5, 5, 'ground');
      const playerId = 'player-1';

      const token = createSafeToken(pos, playerId);

      expect(token.type).toBe('safe');
      expect(token.position).toEqual(pos);
      expect(token.placedBy).toBe(playerId);
      expect(token.effectDescription).toContain('安全區域');
    });
  });
});

// ==================== TokenManager Tests ====================

describe('TokenManager', () => {
  let manager: TokenManager;

  beforeEach(() => {
    manager = new TokenManager();
  });

  describe('addToken / getAllTokens', () => {
    it('應該能夠新增和取得標記', () => {
      const token = createSafeToken(createMockPosition(5, 5, 'ground'), 'player-1');
      
      manager.addToken(token);
      
      const allTokens = manager.getAllTokens();
      expect(allTokens).toHaveLength(1);
      expect(allTokens[0]).toEqual(token);
    });

    it('應該能夠新增多個標記', () => {
      const tokens = [
        createSafeToken(createMockPosition(5, 5, 'ground'), 'player-1'),
        createSafeToken(createMockPosition(6, 6, 'ground'), 'player-1'),
      ];
      
      manager.addTokens(tokens);
      
      expect(manager.getAllTokens()).toHaveLength(2);
    });
  });

  describe('getTokensByType', () => {
    it('應該能夠按類型過濾標記', () => {
      manager.addToken(createSafeToken(createMockPosition(5, 5, 'ground'), 'player-1'));
      manager.addToken(createSafeToken(createMockPosition(6, 6, 'ground'), 'player-1'));
      manager.addToken(createTrapToken(createMockPosition(7, 7, 'ground'), 'player-1', '傷害'));

      const safeTokens = manager.getTokensByType('safe');
      expect(safeTokens).toHaveLength(2);

      const trapTokens = manager.getTokensByType('trap');
      expect(trapTokens).toHaveLength(1);
    });
  });

  describe('getTokensAtPosition', () => {
    it('應該能夠取得特定位置的標記', () => {
      const pos1 = createMockPosition(5, 5, 'ground');
      const pos2 = createMockPosition(6, 6, 'ground');
      
      manager.addToken(createSafeToken(pos1, 'player-1'));
      manager.addToken(createTrapToken(pos1, 'player-1', '傷害'));
      manager.addToken(createSafeToken(pos2, 'player-1'));

      const tokensAtPos1 = manager.getTokensAtPosition(pos1);
      expect(tokensAtPos1).toHaveLength(2);

      const tokensAtPos2 = manager.getTokensAtPosition(pos2);
      expect(tokensAtPos2).toHaveLength(1);
    });
  });

  describe('getTokenById', () => {
    it('應該能夠通過 ID 取得標記', () => {
      const token = createSafeToken(createMockPosition(5, 5, 'ground'), 'player-1');
      manager.addToken(token);

      const found = manager.getTokenById(token.id);
      expect(found).toEqual(token);
    });

    it('找不到標記時應該返回 undefined', () => {
      const found = manager.getTokenById('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('removeToken', () => {
    it('應該能夠移除標記', () => {
      const token = createSafeToken(createMockPosition(5, 5, 'ground'), 'player-1');
      manager.addToken(token);

      const removed = manager.removeToken(token.id);
      
      expect(removed).toBe(true);
      expect(manager.getAllTokens()).toHaveLength(0);
    });

    it('移除不存在的標記應該返回 false', () => {
      const removed = manager.removeToken('non-existent-id');
      expect(removed).toBe(false);
    });
  });

  describe('removeTokensAtPosition', () => {
    it('應該能夠移除特定位置的所有標記', () => {
      const pos = createMockPosition(5, 5, 'ground');
      manager.addToken(createSafeToken(pos, 'player-1'));
      manager.addToken(createTrapToken(pos, 'player-1', '傷害'));
      manager.addToken(createSafeToken(createMockPosition(6, 6, 'ground'), 'player-1'));

      const removedCount = manager.removeTokensAtPosition(pos);
      
      expect(removedCount).toBe(2);
      expect(manager.getAllTokens()).toHaveLength(1);
    });
  });

  describe('Secret Passage Methods', () => {
    it('應該能夠檢查位置是否有秘密通道', () => {
      const pos1 = createMockPosition(5, 5, 'ground');
      const pos2 = createMockPosition(8, 8, 'ground');
      
      const [token1, token2] = createSecretPassage(pos1, pos2, 'player-1');
      manager.addToken(token1);
      manager.addToken(token2);

      expect(manager.hasSecretPassage(pos1)).toBe(true);
      expect(manager.hasSecretPassage(pos2)).toBe(true);
      expect(manager.hasSecretPassage(createMockPosition(1, 1, 'ground'))).toBe(false);
    });

    it('應該能夠取得秘密通道的連接位置', () => {
      const pos1 = createMockPosition(5, 5, 'ground');
      const pos2 = createMockPosition(8, 8, 'ground');
      
      const [token1, token2] = createSecretPassage(pos1, pos2, 'player-1');
      manager.addToken(token1);
      manager.addToken(token2);

      const dest = manager.getSecretPassageDestination(pos1);
      expect(dest).toEqual(pos2);

      const dest2 = manager.getSecretPassageDestination(pos2);
      expect(dest2).toEqual(pos1);
    });
  });

  describe('Trap Methods', () => {
    it('應該能夠標記陷阱為已觸發', () => {
      const token = createTrapToken(createMockPosition(5, 5, 'ground'), 'player-1', '傷害');
      manager.addToken(token);

      expect(token.triggered).toBe(false);

      const triggered = manager.triggerTrap(token.id);
      
      expect(triggered).toBe(true);
      expect(token.triggered).toBe(true);
    });

    it('應該能夠檢查位置是否有未觸發的陷阱', () => {
      const pos = createMockPosition(5, 5, 'ground');
      const token = createTrapToken(pos, 'player-1', '傷害');
      manager.addToken(token);

      const foundTrap = manager.hasTrap(pos);
      expect(foundTrap).toBeDefined();
      expect(foundTrap?.id).toBe(token.id);

      // 觸發後應該找不到
      manager.triggerTrap(token.id);
      const foundAfterTrigger = manager.hasTrap(pos);
      expect(foundAfterTrigger).toBeUndefined();
    });
  });

  describe('Other Token Checks', () => {
    it('應該能夠檢查位置是否被阻擋', () => {
      const pos = createMockPosition(5, 5, 'ground');
      manager.addToken(createBlockedToken(pos, 'player-1'));

      expect(manager.isBlocked(pos)).toBe(true);
      expect(manager.isBlocked(createMockPosition(1, 1, 'ground'))).toBe(false);
    });

    it('應該能夠檢查位置是否為安全區域', () => {
      const pos = createMockPosition(5, 5, 'ground');
      manager.addToken(createSafeToken(pos, 'player-1'));

      expect(manager.isSafeZone(pos)).toBe(true);
      expect(manager.isSafeZone(createMockPosition(1, 1, 'ground'))).toBe(false);
    });
  });

  describe('State Management', () => {
    it('應該能夠取得和載入狀態', () => {
      const tokens = [
        createSafeToken(createMockPosition(5, 5, 'ground'), 'player-1'),
        createTrapToken(createMockPosition(6, 6, 'ground'), 'player-1', '傷害'),
      ];
      manager.addTokens(tokens);

      const state = manager.getState();
      expect(state.tokens).toHaveLength(2);

      const newManager = new TokenManager();
      newManager.loadState(state);
      expect(newManager.getAllTokens()).toHaveLength(2);
    });

    it('應該能夠清除所有標記', () => {
      manager.addToken(createSafeToken(createMockPosition(5, 5, 'ground'), 'player-1'));
      manager.clear();

      expect(manager.getAllTokens()).toHaveLength(0);
    });
  });
});

// ==================== Validation Tests ====================

describe('Validation', () => {
  describe('validateSecretPassagePositions', () => {
    it('應該接受有效的兩個不同位置', () => {
      const pos1 = createMockPosition(5, 5, 'ground');
      const pos2 = createMockPosition(8, 8, 'ground');

      const result = validateSecretPassagePositions(pos1, pos2);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('應該拒絕相同的位置', () => {
      const pos = createMockPosition(5, 5, 'ground');

      const result = validateSecretPassagePositions(pos, pos);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('相同');
    });

    it('應該拒絕無效的位置', () => {
      const validPos = createMockPosition(5, 5, 'ground');
      const invalidPos = createMockPosition(20, 5, 'ground'); // 超出範圍

      const result = validateSecretPassagePositions(validPos, invalidPos);
      
      expect(result.valid).toBe(false);
    });
  });

  describe('validateTokenPlacement', () => {
    it('應該接受有效的位置', () => {
      const pos = createMockPosition(5, 5, 'ground');
      const existingTokens: MapToken[] = [];

      const result = validateTokenPlacement(pos, 'safe', existingTokens);
      
      expect(result.valid).toBe(true);
    });

    it('應該拒絕無效的位置', () => {
      const pos = createMockPosition(20, 5, 'ground'); // 超出範圍
      const existingTokens: MapToken[] = [];

      const result = validateTokenPlacement(pos, 'safe', existingTokens);
      
      expect(result.valid).toBe(false);
    });

    it('應該拒絕已有相同類型標記的位置', () => {
      const pos = createMockPosition(5, 5, 'ground');
      const existingToken = createSafeToken(pos, 'player-1');

      const result = validateTokenPlacement(pos, 'safe', [existingToken]);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('已經有');
    });
  });
});

// ==================== Constants Tests ====================

describe('Constants', () => {
  it('應該有所有標記類型的名稱', () => {
    expect(TOKEN_TYPE_NAMES.secret_passage).toBeDefined();
    expect(TOKEN_TYPE_NAMES.blocked).toBeDefined();
    expect(TOKEN_TYPE_NAMES.trap).toBeDefined();
    expect(TOKEN_TYPE_NAMES.safe).toBeDefined();
  });

  it('應該有所有標記類型的描述', () => {
    expect(TOKEN_TYPE_DESCRIPTIONS.secret_passage).toBeDefined();
    expect(TOKEN_TYPE_DESCRIPTIONS.blocked).toBeDefined();
    expect(TOKEN_TYPE_DESCRIPTIONS.trap).toBeDefined();
    expect(TOKEN_TYPE_DESCRIPTIONS.safe).toBeDefined();
  });
});
