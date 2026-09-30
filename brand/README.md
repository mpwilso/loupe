# Loupe brand: Facet

Every SVG here is drawn from code by `scripts/brand.ts`, from `palette.json` and `wordmark-paths.json`. To change one, edit those, then run `node scripts/brand.ts`. A test fails if a file and the script disagree.

## The mark

A hexagon cut into six facets. Five are filled, from deep to light, clockwise from the top. The sixth stays open, a dashed outline: the unknown. It must always show.

The filled facets fade in once, one after another, and hold. Viewers who ask for reduced motion see the finished mark straight away.

| File | Use |
|---|---|
| [mark.svg](mark.svg) | Dark pages. Animated, with a Mint open facet. |
| [mark-light.svg](mark-light.svg) | Light pages. Animated, with an Emerald open facet, since Mint is too faint on white. |
| [mark-small.svg](mark-small.svg) | 32px and under. Still, cropped close, with a solid Emerald open facet, since dashes vanish when this small. |

## The lockup

The mark and the word LOUPE. Use [lockup-dark.svg](lockup-dark.svg) on dark pages and [lockup-light.svg](lockup-light.svg) on light ones. An image can't see the page's theme, so a web page picks the file:

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="lockup-dark.svg">
  <img src="lockup-light.svg" alt="Loupe" width="360">
</picture>

## PNG exports

Each is the final, fully filled frame. They are rendered outside the repository, so the project keeps no dependencies.

- [png/lockup-dark.png](png/lockup-dark.png) and [png/lockup-light.png](png/lockup-light.png): the lockups at 2x, on a transparent background.
- [png/mark-512.png](png/mark-512.png): the mark, 512 by 512, transparent.
- [png/social-preview.png](png/social-preview.png): 1280 by 640, the dark lockup centered on Night.

## Palette

The colors are in [palette.json](palette.json).

| Name | Hex | Use |
|---|---|---|
| night | `#10151C` | Text on light pages, the social preview's background, and the "You" steps on light pages. |
| emerald | `#1F8A6E` | Known facts: box edges in the diagram. The open facet's stroke on light pages and in the small mark. |
| mint | `#7BD9B8` | The open facet's stroke on dark pages, and the "Automatic" steps. Too faint for strokes on light pages. |
| frost | `#E9EEF0` | Text on dark pages, and the "You" steps on dark pages. |
| facet-1 | `#0E5E4E` | Facet 1, at the top, and the "Loupe" steps in the diagram. |
| facet-2 | `#1F8A6E` | Facet 2. |
| facet-3 | `#2FA383` | Facet 3. |
| facet-4 | `#57C29D` | Facet 4. |
| facet-5 | `#7BD9B8` | Facet 5. Facet 6 stays open: the unknown. |

## Type

The word LOUPE is set in Unbounded SemiBold (weight 600), with letter-spacing of 0.10em. It is stored as outlines in [wordmark-paths.json](wordmark-paths.json), because an image on GitHub can't load a web font.

Unbounded is by The Unbounded Project Authors, licensed under the SIL Open Font License, Version 1.1: [github.com/google/fonts/tree/main/ofl/unbounded](https://github.com/google/fonts/tree/main/ofl/unbounded).
