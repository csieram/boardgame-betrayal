# GitHub Issues - Solo Game Enhancement

## Issue #1: Show map of current room tiles and player position
**Labels:** enhancement, solo-game

### Description
Display a visual map showing:
- Current room tiles discovered
- Player position on the map
- Grid-based layout (9x9 or 11x11 view)

### Acceptance Criteria
- [ ] Show grid map in game UI
- [ ] Mark player position with emoji/icon
- [ ] Show discovered rooms on map
- [ ] Update map in real-time as player moves

---

## Issue #2: Show room tile pile (deck)
**Labels:** enhancement, solo-game

### Description
Display the room tile pile according to rulebook:
- One unified pile for all room tiles
- Show remaining count
- Draw from pile when discovering new rooms

### Acceptance Criteria
- [ ] Show room deck UI component
- [ ] Display remaining room count
- [ ] Draw rooms from deck (not random)
- [ ] Separate by floor (basement/ground/upper)

---

## Issue #3: Show player items inventory
**Labels:** enhancement, solo-game

### Description
Display items that player has collected:
- Item cards with SVG images
- Item count
- Item types (weapon, tool, etc.)

### Acceptance Criteria
- [ ] Show items panel in game UI
- [ ] Display item SVG images
- [ ] Show item count
- [ ] Update when items are acquired

---

## Issue #4: Room placement with rotation
**Labels:** enhancement, solo-game

### Description
When discovering a new room:
1. Draw first available room tile from deck
2. Allow player to rotate room (0°, 90°, 180°, 270°)
3. Match doors with previous room
4. Confirm placement

### Acceptance Criteria
- [ ] Draw room from deck (not random)
- [ ] Show room rotation controls
- [ ] Visual feedback for rotation
- [ ] Confirm placement button
- [ ] Match door connections

---

## Issue #5: Fix React hydration for solo game
**Labels:** bug, solo-game

### Description
Solo game page shows blank/empty content due to React Server Component hydration issues in static export.

### Current Behavior
- Page renders only static content (character select)
- Game state changes don't update UI
- `4:null` in HTML indicates hydration failure

### Expected Behavior
- Full React interactivity
- State updates reflect in UI
- Game phases work correctly

### Acceptance Criteria
- [ ] Fix React hydration
- [ ] Ensure client-side rendering works
- [ ] Test all game phases

---

*Created: 2026-03-21*
