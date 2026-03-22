# 卡牌数据格式规范

## 卡牌类型

### 1. Event Cards (事件卡) - 绿色
触发各种事件，有正面或负面效果。

### 2. Item Cards (物品卡) - 蓝色
可收集使用的物品，提供特殊能力。

### 3. Omen Cards (预兆卡) - 紫色
可能触发作祟的卡牌，也是物品。

## Card 接口

```typescript
interface Card {
  id: string;
  name: string;
  nameEn: string;
  type: 'event' | 'item' | 'omen';
  description: string;
  effect?: string;
  svg: string;
}
```

## 事件卡列表

| ID | 名称 | 效果 |
|----|------|------|
| event-bloodwall | 血墙 | 恐怖事件 |
| event-chill | 寒意 | 理智伤害 |
| event-creature | 生物 | 遭遇怪物 |
| event-door | 门 | 发现秘密门 |
| event-footprints | 脚印 | 追踪线索 |
| event-hallucination | 幻觉 | 精神影响 |
| event-memory | 记忆 | 恢复知识 |
| event-shadow | 阴影 | 恐惧效果 |
| event-shaking | 摇晃 | 物理影响 |
| event-space | 空间 | 空间扭曲 |
| event-time | 时间 | 时间异常 |
| event-voices | 声音 | 听到低语 |

## 物品卡列表

| ID | 名称 | 效果 |
|----|------|------|
| item-camera | 相机 | 拍摄证据 |
| item-candle | 蜡烛 | 照明 |
| item-compass | 指南针 | 导航 |
| item-cross | 十字架 | 驱邪 |
| item-food | 食物 | 恢复属性 |
| item-holywater | 圣水 | 对抗邪恶 |
| item-key | 钥匙 | 开锁 |
| item-matches | 火柴 | 点火 |
| item-medkit | 医疗包 | 治疗 |
| item-pistol | 手枪 | 武器 |
| item-rope | 绳索 | 攀爬 |
| item-tools | 工具 | 修理 |

## 预兆卡列表

| ID | 名称 | 效果 |
|----|------|------|
| omen-book | 书 | 知识加成 |
| omen-crystal | 水晶 | 预知 |
| omen-dagger | 匕首 | 武器 |
| omen-dog | 狗 | 伙伴 |
| omen-ghostcandle | 鬼烛 | 见鬼 |
| omen-mirror | 镜子 | 反射 |
| omen-necklace | 项链 | 保护 |
| omen-portrait | 肖像 | 灵魂 |
| omen-ring | 戒指 | 力量 |
| omen-talisman | 护身符 | 防御 |

## 抽卡规则

根据房间符号抽卡：
- **E** → 抽事件卡
- **I** → 抽物品卡
- **O** → 抽预兆卡 + 作祟检定
- **null** → 不抽卡

## SVG 文件位置

`/apps/web/public/gallery/cards/{card_id}.svg`
