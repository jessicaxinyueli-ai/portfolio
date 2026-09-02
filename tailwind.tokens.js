/* ============================================================
   Jess Li — Tailwind theme tokens (mirror of tokens.css)
   Single source of truth for a Tailwind build. Every value here
   is the same decision expressed in tokens.css; keep them in sync.

   Usage (tailwind.config.js):
     const tokens = require('./tailwind.tokens.js');
     module.exports = { theme: { extend: tokens } };

   In markup you can then use e.g.  class="text-ink bg-paper font-display
   rounded-pill shadow-lg duration-base ease-standard z-nav max-w-reading"
   ============================================================ */

module.exports = {
  colors: {
    ink:        '#141416',
    'ink-2':    '#3a3a3f',
    muted:      '#54545b',
    'muted-2':  '#86868d',
    paper:      '#fbfbfc',
    surface:    '#f4f4f6',
    'surface-2':'#eeeef0',
    line:       'rgba(20,20,22,0.13)',
    'line-strong':'#141416',
    accent:     '#141416',
    selection:  '#bcdafc',
    'selection-ink':'#1b7af7',
    success:    '#2f6b4f',
    warning:    '#8a6d2f',
    error:      '#8a3a3a',
  },

  fontFamily: {
    display: ['Archivo Expanded', 'sans-serif'],
    sans:    ['Archivo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
    cjk:     ['Noto Sans SC', 'sans-serif'],
    mono:    ['Space Mono', 'monospace'],
  },

  fontSize: {
    display: ['clamp(48px, 8.8vw, 124px)', { lineHeight: '0.86', letterSpacing: '-0.02em' }],
    h1:      ['clamp(40px, 7vw, 96px)',    { lineHeight: '0.9',  letterSpacing: '-0.02em' }],
    h2:      ['clamp(30px, 4.6vw, 60px)',  { lineHeight: '1.02', letterSpacing: '-0.018em' }],
    h3:      ['clamp(22px, 2.8vw, 34px)',  { lineHeight: '1.08' }],
    h4:      ['22px', { lineHeight: '1.1' }],
    'body-lg':['18px', { lineHeight: '1.7' }],
    body:    ['15px', { lineHeight: '1.75' }],
    'body-sm':['13px', { lineHeight: '1.7' }],
    caption: ['11px', { lineHeight: '1.4', letterSpacing: '0.16em' }],
    micro:   ['10.5px', { lineHeight: '1.4', letterSpacing: '0.14em' }],
  },

  fontWeight: {
    regular:  '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
    black:    '800',
  },

  letterSpacing: {
    tight:       '-0.02em',
    normal:      '0',
    label:       '0.16em',
    'label-wide':'0.22em',
  },

  lineHeight: {
    display: '0.86',
    tight:   '1.02',
    snug:    '1.1',
    body:    '1.6',
    relaxed: '1.75',
  },

  spacing: {
    0:  '0',
    1:  '4px',
    2:  '8px',
    3:  '12px',
    4:  '16px',
    6:  '24px',
    8:  '32px',
    10: '40px',
    12: '48px',
    16: '64px',
    20: '80px',
    30: '120px',
    section: 'clamp(48px, 8vw, 104px)',
    gutter:  'clamp(24px, 6vw, 80px)',
  },

  borderRadius: {
    none: '0',
    xs:   '2px',
    sm:   '3px',
    md:   '8px',
    lg:   '14px',
    pill: '999px',
  },

  boxShadow: {
    none: 'none',
    sm:   '0 2px 8px rgba(20,20,22,0.08)',
    md:   '0 14px 38px rgba(20,20,22,0.16)',
    lg:   '0 24px 60px rgba(20,20,22,0.14)',
  },

  transitionDuration: {
    fast:   '200ms',
    base:   '300ms',
    slow:   '600ms',
    reveal: '820ms',
    hero:   '1050ms',
  },

  transitionTimingFunction: {
    standard: 'cubic-bezier(0.2,0.7,0.2,1)',
    'in-out': 'cubic-bezier(0.62,0,0.24,1)',
    out:      'cubic-bezier(0.16,1,0.3,1)',
  },

  zIndex: {
    base:    '1',
    raised:  '8',
    sticky:  '100',
    nav:     '1000',
    overlay: '2000',
    editor:  '2147483000',
  },

  maxWidth: {
    index:   '1340px',
    reading: '1180px',
    doc:     '1000px',
    measure: '65ch',
  },

  screens: {
    sm: '430px',
    md: '620px',
    lg: '960px',
    xl: '1280px',
  },
};
