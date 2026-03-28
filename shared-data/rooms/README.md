# 房间数据格式规范

## Room 接口

```typescript
interface Room {
  id: string;           // 唯一标识
  name: string;         // 中文名称
  nameEn: string;       // 英文名称
  floor: 'ground' | 'upper' | 'basement';  // 楼层
  symbol: 'E' | 'I' | 'O' | null;  // 符号：事件/物品/预兆/无
  doors: ('north' | 'south' | 'east' | 'west')[];  // 门的方向
  description: string;  // 描述
  color: string;        // 颜色代码
  icon: string;         // SVG 图标（简化版）
  isOfficial: boolean;  // 是否官方房间
  gallerySvg: string;   // 完整 SVG 路径
  notes?: string;       // 备注
}
```

## 房间列表

### 地下室 (Basement) - 18 个
- abandoned_room - 废弃房间 (O)
- arsenal - 军械库 (I)
- bloody_room - 血迹房间 (E)
- catacombs - 地下墓穴 (null)
- cavern - 洞穴 (E)
- charred_room - 烧焦房间 (O)
- chasm - 深渊 (null)
- crypt - 墓穴 (I)
- dungeon - 地牢 (null)
- furnace_room - 锅炉房 (O)
- graveyard - 墓地 (null)
- larder - 储藏室 (I)
- operating_lab - 手术室 (I)
- pentagram_chamber - 五芒星密室 (O)
- research_lab - 研究实验室 (I)
- servants_quarters - 仆人房 (null)
- underground_lake - 地下湖 (null)
- vault - 金库 (I)

### 地面层 (Ground) - 12 个
- ballroom - 舞厅 (null)
- chapel - 礼拜堂 (O)
- dining_room - 餐厅 (I)
- entrance_hall - 入口大厅 (null)
- foyer - 玄关 (null)
- garden - 花园 (E)
- gymnasium - 健身房 (E)
- kitchen - 厨房 (I)
- library - 图书室 (I)
- patio - 庭院 (null)
- storeroom - 储藏室 (I)
- tower - 塔楼 (null)

### 上层 (Upper) - 10 个
- attic - 阁楼 (I)
- balcony - 阳台 (null)
- bedroom - 卧室 (O)
- gallery - 画廊 (null)
- junk_room - 杂物间 (O)
- master_bedroom - 主卧 (O)
- nursery - 婴儿房 (O)
- walkway - 走道 (null)
- library_upper - 图书室(二楼) (I)
- tower_upper - 塔楼(二楼) (null)

### 跨楼层 - 12 个

#### 樓梯類 (Stairs)
- grand_staircase - 大楼梯 (Ground ↔ Upper)
- stairs_from_basement - 地下室楼梯 (Basement → Ground)
- stairs_from_ground - 一楼楼梯(下) (Ground → Basement)
- stairs_from_upper - 二楼楼梯 (Upper → Ground)

#### 電梯/升降類 (Elevator/Lift)
- mystic_elevator - 神秘电梯 (任意樓層)
- dumbwaiter - 升降機 (Ground ↔ Upper)
- service_elevator - 服務電梯 (Basement ↔ Ground)

#### 特殊通道 (Special Passages)
- collapsed_room - 坍塌房间 (Upper → Basement, 掉落)
- secret_chute - 秘密滑道 (Upper → Basement)
- ventilation_shaft - 通風管道 (Basement ↔ Ground ↔ Upper)
- mirror_portal - 鏡子傳送門 (任意有鏡子的房間)
- fireplace_flue - 煙囪通道 (Ground ↔ Upper)
- rope_ladder - 繩梯 (Ground ↔ Upper, 需物品)

## 符号说明

| 符号 | 含义 | 动作 |
|------|------|------|
| E | Event | 抽事件卡 |
| I | Item | 抽物品卡 |
| O | Omen | 抽预兆卡 + 作祟检定 |
| null | 无 | 不抽卡 |

## SVG 文件位置

`/apps/web/public/gallery/rooms/{room_id}.svg`
