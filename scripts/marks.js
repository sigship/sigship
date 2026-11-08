// The SIGSHIP marks, drawn once and used by the site, the favicon and the brand files.
// Flag P stays blue with a white centre, on a staff so it never reads as upside down. Only the colours passed in change.

// Flag P (the Blue Peter) flying from a staff: the logo in the header and the brand files.
export const mark = ({ blue, paper, ink }, attrs = '') =>
  `<svg viewBox="0 0 34 28"${attrs}><rect x="1" width="2.4" height="28" rx="1.2" fill="${ink}"/><rect x="3.4" y="2" width="29.6" height="20" rx="1" fill="${blue}"/><rect x="13.27" y="8.67" width="9.87" height="6.67" fill="${paper}"/></svg>`;

// The same staff and flag on a dark tile, for favicons, app icons and avatars.
export const icon = ({ blue, paper, ink }, attrs = '') =>
  `<svg viewBox="0 0 64 64"${attrs}><rect width="64" height="64" rx="14" fill="${ink}"/><rect x="11" y="12" width="3.4" height="42" rx="1.7" fill="${paper}"/><rect x="14.4" y="15" width="39" height="26" rx="1.5" fill="${blue}"/><rect x="27.4" y="23.67" width="13" height="8.67" fill="${paper}"/></svg>`;

// Reads a colour token from site/style.css, the one source for the brand.
export const tokens = (css) => (name) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`))[1];
