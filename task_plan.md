# Wannianli Implementation Plan

**Goal:** Implement a comprehensive Wannianli (Perpetual Calendar) module in the Orbis application.
**Key Features:** Solar/Lunar calendar, GanZhi view, Festival/Solar Terms, Auspicious/Inauspicious activities (Yi/Ji).
**Architecture:** React + Tailwind + lunar-typescript (assumed library).

## Phases

### Phase 1: Preparation & Design
- [ ] Research `lunar-typescript` capabilities for Wannianli data <!-- id: 1 -->
- [ ] Design UI layout (Calendar Grid + Side Panel) <!-- id: 2 -->
- [ ] Create `WannianliPage` scaffold <!-- id: 3 -->

### Phase 2: Core Calendar Grid
- [ ] Implement `CalendarHeader` (Year/Month selector) <!-- id: 4 -->
- [ ] Implement `CalendarGrid` (Date cells with Lunar/Solar info) <!-- id: 5 -->
- [ ] Add navigation logic (Prev/Next Month) <!-- id: 6 -->

### Phase 3: Detailed View & Features
- [ ] Implement `DayDetailPanel` (Selected date deep dive) <!-- id: 7 -->
- [ ] Display Solar Terms (JieQi) visually <!-- id: 8 -->
- [ ] Display Yi/Ji (Almanac data) <!-- id: 9 -->

### Phase 4: Integration & Polish
- [ ] Integrate into `App.tsx` routing/navigation <!-- id: 10 -->
- [ ] Verify light/dark mode support <!-- id: 11 -->
- [ ] Manual verification flow <!-- id: 12 -->

## Current Context
- **Status:** Initialized.
- **Blockers:** None.
