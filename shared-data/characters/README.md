# 角色数据格式规范

## Character 接口

```typescript
interface Character {
  id: string;           // 唯一标识
  name: string;         // 中文名称
  nameEn: string;       // 英文名称
  age: number;          // 年龄
  description: string;  // 背景描述
  color: string;        // 主题色
  portraitSvg?: string; // 肖像 SVG 路径
  fullSvg?: string;     // 全身 SVG 路径
  stats: {
    speed: [number, number];      // [初始值, 当前值]
    might: [number, number];
    sanity: [number, number];
    knowledge: [number, number];
  };
  statTrack: {
    speed: number[];    // 属性轨道 [0,1,2,3,4,5,6,7]
    might: number[];
    sanity: number[];
    knowledge: number[];
  };
}
```

## 角色列表

### 1. Missy (米西·杜波依斯)
- 年龄：9岁
- 颜色：#FF69B4 (粉色)
- 特点：高理智 (4)，适合探索
- 属性：Speed 3, Might 2, Sanity 4, Knowledge 3

### 2. Zoe (柔伊·卡斯特罗)
- 年龄：21岁
- 颜色：#9370DB (紫色)
- 特点：高知识 (5)，学生
- 属性：Speed 4, Might 2, Sanity 3, Knowledge 5

### 3. Brandon (布兰登·凯恩)
- 年龄：35岁
- 颜色：#4682B4 (蓝色)
- 特点：高力量 (5)，前军人
- 属性：Speed 3, Might 5, Sanity 2, Knowledge 2

### 4. Vivian (薇薇安·洛佩兹)
- 年龄：42岁
- 颜色：#DC143C (红色)
- 特点：高理智 (5)，灵媒
- 属性：Speed 3, Might 2, Sanity 5, Knowledge 4

### 5. Peter (彼得·艾金森)
- 年龄：58岁
- 颜色：#8B4513 (棕色)
- 特点：平衡型，退休警探
- 属性：Speed 3, Might 3, Sanity 4, Knowledge 4

### 6. Madame Zostra (萨拉夫人)
- 年龄：67岁
- 颜色：#4B0082 (靛蓝色)
- 特点：高理智+知识，算命师
- 属性：Speed 2, Might 2, Sanity 5, Knowledge 5

## 属性说明

| 属性 | 英文 | 用途 |
|------|------|------|
| 速度 | Speed | 移动距离 |
| 力量 | Might | 物理攻击/防御 |
| 理智 | Sanity | 精神攻击/防御 |
| 知识 | Knowledge | 智力检定 |

## 属性轨道

每个属性有 8 个等级（索引 0-7）：
- 索引 0：临界值（骷髅符号）
- 索引 1-2：低
- 索引 3-4：中
- 索引 5-6：高
- 索引 7：最高

## SVG 文件位置

- 肖像：`/apps/web/public/gallery/characters/char-{id}-portrait.svg`
- 全身：`/apps/web/public/gallery/characters/char-{id}-full.svg`
