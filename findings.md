# Findings & Research

## Known Dependencies
- **lunar-typescript**: The project uses this for Bazi/Qimen, so it should be used for Wannianli to ensure consistency in GanZhi/Lunar calculations.

## UI/UX Considerations

- **Style**:
  - **Shared Classes**:
    - Card: `bg-card rounded-xl border border-[hsl(var(--border-light))] dark:border-border`
    - Main Container: `px-6 pb-6 pt-6 grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-6` (Adjusted to 6:4 ratio for Calendar)
    - Font: `font-display` for headers.
  - **Layout**: 
    - Full screen flex container.
    - Side-by-side grid similar to `BaziChart` + `InfoPanel`.
- **Layout Recommendation**:
  - Adopt a similar 2-column layout for Wannianli (Left: Calendar/Navigation, Right: Daily Details) to fit the "grid + detail" pattern.
  - Use `AdvancedDatePicker` for consistent date navigation.

## Component Design (Simulated ui-ux-pro-max results)
- **Calendar Grid**:
  - 7-column layout (Sun-Sat).
  - Cell Structure: Top-left Solar Date (Large), Bottom-right Lunar/Term (Small/Muted).
  - "Today" State: Primary color ring or solid circle background.
  - "Selected" State: Solid background (Primary/Secondary).
  - "Other Month": Opacity 0.3.
- **Detail Panel**:
  - Components: GanZhi Pill, Yi/Ji List (Green/Red indicators), Auspicious Directions Compass (optional visual).
