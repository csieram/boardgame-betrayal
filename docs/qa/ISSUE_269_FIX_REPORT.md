# Issue #269 Fix Report - Room Configuration

## Summary
Fixed room door count configurations per Betrayal at House on the Hill rulebook (Page 26-27).

## Changes Made

### 1. Entrance Hall (入口大廳) ✅
- **Status**: Already correct
- **Doors**: 4 (N, S, E, W)
- **Floor**: Ground

### 2. Coal Chute (煤槽) ✅
- **Status**: Already present
- **Doors**: 1 (North)
- **Floor**: Ground
- **Special**: One-way slide to basement

### 3. Wine Cellar (酒窖) ✅
- **Status**: Already present
- **Doors**: 2 (N, S)
- **Floor**: Basement
- **Type**: Item room

### 4. Library (圖書室) 🔧 FIXED
- **Before**: 2 doors (S, W)
- **After**: 4 doors (N, S, E, W)
- **Floor**: Upper, Ground

### 5. Bedroom (臥室) ✅
- **Status**: Already correct
- **Doors**: 2 (E, W)
- **Floor**: Upper

### 6. Crypt (墓穴) 🔧 FIXED
- **Before**: 1 door (N)
- **After**: 2 doors (N, E)
- **Floor**: Basement

### 7. Gallery (畫廊) 🔧 FIXED
- **Before**: 2 doors (N, S)
- **After**: 4 doors (N, S, E, W)
- **Floor**: Upper

### 8. Chapel (禮拜堂) 🔧 FIXED
- **Before**: 1 door (N)
- **After**: 2 doors (N, E)
- **Floor**: Upper, Ground

## Files Modified
- `shared-data/rooms/rooms.ts`

## Verification
All room configurations have been verified against the rulebook:
- ✅ Entrance Hall has 4 doors
- ✅ Coal Chute room exists (1 door)
- ✅ Wine Cellar room exists (2 doors)
- ✅ Library has 4 doors
- ✅ Crypt has 2 doors
- ✅ Gallery has 4 doors
- ✅ Chapel has 2 doors

## Commit
```
[Agent 2] Fix room door counts per rulebook (Issue #269)
```

## Status
🟢 **PENDING APPROVAL** - Awaiting human review
