import { SeededRng } from '../core/GameState';
import { Room } from '@betrayal/shared';

// 簡化的 Room 資料用於測試
const testRooms: Room[] = [
  { id: 'room-1', name: 'Room 1', nameEn: 'Room 1', floor: 'ground', doors: ['north', 'south'], symbol: null, description: '', color: '', icon: '', isOfficial: true, gallerySvg: '' },
  { id: 'room-2', name: 'Room 2', nameEn: 'Room 2', floor: 'ground', doors: ['east', 'west'], symbol: null, description: '', color: '', icon: '', isOfficial: true, gallerySvg: '' },
  { id: 'room-3', name: 'Room 3', nameEn: 'Room 3', floor: 'ground', doors: ['north', 'east'], symbol: null, description: '', color: '', icon: '', isOfficial: true, gallerySvg: '' },
  { id: 'room-4', name: 'Room 4', nameEn: 'Room 4', floor: 'ground', doors: ['south', 'west'], symbol: null, description: '', color: '', icon: '', isOfficial: true, gallerySvg: '' },
  { id: 'room-5', name: 'Room 5', nameEn: 'Room 5', floor: 'ground', doors: ['north', 'south', 'east'], symbol: null, description: '', color: '', icon: '', isOfficial: true, gallerySvg: '' },
];

describe('SeededRng', () => {
  it('應該使用相同 seed 產生相同的隨機序列', () => {
    const rng1 = new SeededRng('test-seed-123');
    const rng2 = new SeededRng('test-seed-123');

    const results1 = Array.from({ length: 10 }, () => rng1.next());
    const results2 = Array.from({ length: 10 }, () => rng2.next());

    expect(results1).toEqual(results2);
  });

  it('應該使用不同 seed 產生不同的隨機序列', () => {
    const rng1 = new SeededRng('seed-1');
    const rng2 = new SeededRng('seed-2');

    const results1 = Array.from({ length: 10 }, () => rng1.next());
    const results2 = Array.from({ length: 10 }, () => rng2.next());

    expect(results1).not.toEqual(results2);
  });

  it('應該使用 Date.now() 產生不同的序列', () => {
    const seed1 = Date.now().toString();
    // 等待 1ms 確保不同時間戳
    const seed2 = (Date.now() + 1).toString();

    const rng1 = new SeededRng(seed1);
    const rng2 = new SeededRng(seed2);

    const results1 = Array.from({ length: 10 }, () => rng1.next());
    const results2 = Array.from({ length: 10 }, () => rng2.next());

    expect(results1).not.toEqual(results2);
  });
});

describe('Room Deck Randomization', () => {
  it('應該正確洗牌', () => {
    const rng = new SeededRng('shuffle-test');
    const shuffled = rng.shuffle([...testRooms]);

    // 檢查所有房間都在洗牌後的牌堆中
    expect(shuffled).toHaveLength(testRooms.length);
    expect(shuffled.map(r => r.id).sort()).toEqual(testRooms.map(r => r.id).sort());
  });

  it('相同 seed 應該產生相同的洗牌結果', () => {
    const rng1 = new SeededRng('same-seed');
    const rng2 = new SeededRng('same-seed');

    const shuffled1 = rng1.shuffle([...testRooms]);
    const shuffled2 = rng2.shuffle([...testRooms]);

    expect(shuffled1.map(r => r.id)).toEqual(shuffled2.map(r => r.id));
  });

  it('不同 seed 應該產生不同的洗牌結果（高機率）', () => {
    const rng1 = new SeededRng('seed-a');
    const rng2 = new SeededRng('seed-b');

    const shuffled1 = rng1.shuffle([...testRooms]);
    const shuffled2 = rng2.shuffle([...testRooms]);

    // 檢查順序是否不同（有極小機率相同，但對於 5! = 120 種排列來說機率很低）
    const order1 = shuffled1.map(r => r.id);
    const order2 = shuffled2.map(r => r.id);

    expect(order1).not.toEqual(order2);
  });
});

describe('3 Consecutive Games Test', () => {
  it('3 場連續遊戲應該有不同的房間順序', () => {
    const game1Seed = Date.now().toString();
    const game2Seed = (Date.now() + 1).toString();
    const game3Seed = (Date.now() + 2).toString();

    const rng1 = new SeededRng(game1Seed);
    const rng2 = new SeededRng(game2Seed);
    const rng3 = new SeededRng(game3Seed);

    const deck1 = rng1.shuffle([...testRooms]);
    const deck2 = rng2.shuffle([...testRooms]);
    const deck3 = rng3.shuffle([...testRooms]);

    const order1 = deck1.map(r => r.id);
    const order2 = deck2.map(r => r.id);
    const order3 = deck3.map(r => r.id);

    // 驗證三場遊戲的順序都不同
    expect(order1).not.toEqual(order2);
    expect(order2).not.toEqual(order3);
    expect(order1).not.toEqual(order3);
  });
});
