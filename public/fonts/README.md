# Self-hosted fonts — adbot-ai /docs page

**Placed by**: DEVOPS 🚀 — 2026-04-18
**For**: FRONTEND to switch CSS from Google CDN → local files
**Spec**: `~/shared/docs-page-design-spec.md` §4 (v2.1)

## Files (5 total)

| File | Size | Notes |
|---|---|---|
| `Inter-variable.woff2` | 48 KB | **Variable font — covers weights 100–900.** Google Fonts v20 ships Inter only as variable; a single file replaces 4 static weights with smaller total payload. |
| `IBMPlexSansThaiLooped-400.woff2` | 9.5 KB | Thai subset only (U+02D7, U+0303, U+0331, U+0E01-0E5B, U+200C-200D, U+25CC) — Latin falls through to Inter via stack |
| `IBMPlexSansThaiLooped-500.woff2` | 9.9 KB | |
| `IBMPlexSansThaiLooped-600.woff2` | 10 KB | |
| `IBMPlexSansThaiLooped-700.woff2` | 9.9 KB | Included even though §4 says "never font-bold 700" — reserved for future opt-in, tiny marginal cost. |

## Delta vs spec-table count

v2.1 summary table said "8 files: 2 families × 4 weights × WOFF2". Actual = 5 files because Inter is now variable (1 file, all weights). Net smaller payload, same coverage.

## Drop-in @font-face (for FRONTEND)

```css
/* src/index.css — add next to existing Inter @font-face (if any) */

@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-variable.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'IBM Plex Sans Thai Looped';
  src: url('/fonts/IBMPlexSansThaiLooped-400.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  unicode-range: U+02D7, U+0303, U+0331, U+0E01-0E5B, U+200C-200D, U+25CC;
}

@font-face {
  font-family: 'IBM Plex Sans Thai Looped';
  src: url('/fonts/IBMPlexSansThaiLooped-500.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
  unicode-range: U+02D7, U+0303, U+0331, U+0E01-0E5B, U+200C-200D, U+25CC;
}

@font-face {
  font-family: 'IBM Plex Sans Thai Looped';
  src: url('/fonts/IBMPlexSansThaiLooped-600.woff2') format('woff2');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
  unicode-range: U+02D7, U+0303, U+0331, U+0E01-0E5B, U+200C-200D, U+25CC;
}

@font-face {
  font-family: 'IBM Plex Sans Thai Looped';
  src: url('/fonts/IBMPlexSansThaiLooped-700.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
  unicode-range: U+02D7, U+0303, U+0331, U+0E01-0E5B, U+200C-200D, U+25CC;
}

/* Then in @theme or a scoped layer */
@theme {
  --font-docs: 'IBM Plex Sans Thai Looped', 'Inter', system-ui, sans-serif;
}
.docs-body {
  font-family: var(--font-docs);
  line-height: 1.75;
  letter-spacing: 0;
}
```

## Stack behavior (expected)

Browsers try the first family whose `unicode-range` covers the character:
- Thai glyphs (U+0E01-0E5B etc.) → IBM Plex Sans Thai Looped
- Everything else → Inter (via stack fallback)
- Unknown to both → system-ui

## Licensing

- **Inter** — SIL Open Font License 1.1 (rsms/inter). Self-host OK.
- **IBM Plex Sans Thai Looped** — SIL Open Font License 1.1. Self-host OK.

Both are MIT/OFL compatible with commercial self-host.

## Minor caveat

Comment in spec: "Alternative if team already pays: LINE Seed Sans TH". We did not use that (not on Google Fonts, spec says skip for v1).

COMMANDER's dispatch used the word "Sarabun" as paraphrase; spec §4 is authoritative = IBM Plex Sans Thai Looped. Flagged non-blocking.
