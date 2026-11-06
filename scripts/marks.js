// The SIGSHIP marks, drawn once and used by the site, the favicon and the brand files.
// Flag P stays blue with a white centre. Only the colours passed in change.

// Flag P hanging from a rope, as it flies in the hero.
export const mark = ({ blue, paper, ink }, attrs = '') =>
  `<svg viewBox="0 0 90 80"${attrs}><rect width="90" height="3" fill="${ink}"/><rect x="16" width="3" height="20" fill="${ink}"/><rect x="71" width="3" height="20" fill="${ink}"/><rect y="20" width="90" height="60" fill="${blue}"/><rect x="30" y="40" width="30" height="20" fill="${paper}"/></svg>`;

// The mark on a dark tile, for favicons, app icons and avatars.
export const icon = ({ blue, paper, ink }, attrs = '') =>
  `<svg viewBox="0 0 64 64"${attrs}><rect width="64" height="64" rx="14" fill="${ink}"/><rect x="8" y="14" width="48" height="3" fill="${paper}"/><rect x="16" y="14" width="3" height="9" fill="${paper}"/><rect x="45" y="14" width="3" height="9" fill="${paper}"/><rect x="7" y="22" width="50" height="34" fill="${paper}"/><rect x="8" y="23" width="48" height="32" fill="${blue}"/><rect x="24" y="33.67" width="16" height="10.67" fill="${paper}"/></svg>`;

// Reads a colour token from site/style.css, the one source for the brand.
export const tokens = (css) => (name) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`))[1];
