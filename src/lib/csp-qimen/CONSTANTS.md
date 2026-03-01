# csp-qimen constants convention

## Layering

- Put cross-file reusable data constants in `constants.ts`.
- Keep algorithm-only helper maps private inside the file that uses them.
- Prefer importing shared domain constants from `../xuan-bazi/constants` instead of deep `maps/*` paths.

## Naming

- Use `UPPER_SNAKE_CASE` for constant maps and arrays.
- Keep semantic prefixes explicit, for example: `GONG_*`, `MEN_*`, `XING_*`, `WUXING_*`.

## Do and do not

- Do reuse: `GONG_WUXING`, `MEN_WUXING`, `XING_WUXING`, `WUXING_KE` from `constants.ts`.
- Do not re-declare equivalent maps in feature files.
- Do not couple status/feature modules to unrelated utility implementations when a pure constant import is enough.

## Migration checklist for new changes

1. Search existing constants before adding a new one.
2. If reused in 2+ files, move to `constants.ts`.
3. Update all imports to single source.
4. Run `npx tsc -b` and `npm run build`.
