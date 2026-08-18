'use strict';

/**
 * Configurator for the README widget. Deliberately dependency-free and
 * build-step-free: it is one page whose entire job is to assemble a URL string,
 * so a framework and a bundler would be pure overhead.
 */

/** Mirrors isValidUsername on the server; legacy Last.fm names vary widely. */
const USERNAME_MAX_LENGTH = 100;
const USERNAME_CONTROL_RE = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/;

function isValidUsername(user) {
  const length = [...user].length;
  return length > 0 && length <= USERNAME_MAX_LENGTH && !USERNAME_CONTROL_RE.test(user);
}

/** Mirrors parseHexColor on the server: hex digits only, no leading hash. */
const HEX_RE = /^([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * Prefilled so the page opens with a real card rather than an empty frame -
 * the preview is the whole point of this page, and it cannot draw one without
 * a username. `rj` is Last.fm's own example account (their first user), so it
 * is public, always populated, and not anyone's private listening.
 */
const SAMPLE_USER = 'rj';

const DEFAULTS = {
  theme: 'dark',
  bg_color: '',
  text_color: '',
  artist_color: '',
  meta_color: '',
  accent_color: '',
  loved_color: '',
  logo_color: '',
  count: 5,
  width: 400,
  radius: 10,
  art: true,
  header: true,
  time: true,
  logo: true,
  profile: 'header',
  username: true,
  avatar: true,
  stats: 'off',
  footer: 'off',
  loved: 'time',
};

/**
 * Each color control: its element id prefix, its URL parameter, and where its
 * default comes from - a theme field, or a fixed value for the wordmark, which
 * is a trademark rather than part of any palette. One table so the swatches,
 * resets, placeholders and URL builder cannot disagree about what a field means.
 */
const COLORS = [
  { id: 'bg-color', param: 'bg_color', themeKey: 'bg' },
  { id: 'text-color', param: 'text_color', themeKey: 'title' },
  { id: 'artist-color', param: 'artist_color', themeKey: 'artist' },
  { id: 'meta-color', param: 'meta_color', themeKey: 'meta' },
  { id: 'accent-color', param: 'accent_color', themeKey: 'accent' },
  { id: 'loved-color', param: 'loved_color', themeKey: 'loved' },
  { id: 'logo-color', param: 'logo_color', fixed: '#d51007' },
];

const COLOR_BY_PARAM = new Map(COLORS.map((c) => [c.param, c]));

const MIN_CONTRAST = 4.5;

/**
 * How far past the artist line the timestamp sits, toward the background. The
 * presets put the artist at 31% of the way from the title and the timestamp at
 * 48%, so from the artist it is a further 25% of what remains.
 */
const META_FROM_ARTIST = 0.25;

/**
 * How far a theme's own timestamp may sit from that relationship and still
 * count as linked. The presets land at 2-6 when they follow it, 21 and 41 when
 * they don't, so anything between separates them.
 */
const LINK_TOLERANCE = 10;

/**
 * Each theme's settable colors, mirrored from themes.ts so a swatch can show
 * what is actually rendering. `transparent` has no background, so it seeds from
 * the card it is usually laid over.
 */
const THEME_COLORS = {
  dark: {
    bg: '#151b23',
    title: '#e9eef5',
    artist: '#9fadbd',
    meta: '#7d8b9c',
    accent: '#d51007',
    loved: '#e02d24',
  },
  legacy: {
    bg: '#212121',
    title: '#f0f0f0',
    artist: '#b0b0b0',
    meta: '#8a8a8a',
    accent: '#d51007',
    loved: '#e02d24',
  },
  light: {
    bg: '#ffffff',
    title: '#1f2328',
    artist: '#59636e',
    meta: '#818b98',
    accent: '#d51007',
    loved: '#d51007',
  },
  nord: {
    bg: '#2e3440',
    title: '#eceff4',
    artist: '#88c0d0',
    meta: '#7b88a1',
    accent: '#88c0d0',
    loved: '#bf616a',
  },
  catppuccin: {
    bg: '#1e1e2e',
    title: '#cdd6f4',
    artist: '#cba6f7',
    meta: '#7f849c',
    accent: '#f38ba8',
    loved: '#f38ba8',
  },
  transparent: {
    bg: '#0d1117',
    title: '#8b949e',
    artist: '#8b949e',
    meta: '#6e7681',
    accent: '#d51007',
    loved: '#d51007',
  },
  dracula: {
    bg: '#282a36',
    title: '#f8f8f2',
    artist: '#bd93f9',
    meta: '#808db4',
    accent: '#ff79c6',
    loved: '#ff5555',
  },
  tokyonight: {
    bg: '#1a1b26',
    title: '#c0caf5',
    artist: '#7aa2f7',
    meta: '#767fa9',
    accent: '#bb9af7',
    loved: '#f7768e',
  },
};

const el = (id) => document.getElementById(id);

const controls = {
  user: el('user'),
  theme: el('theme'),
  bg_color: el('bg-color'),
  text_color: el('text-color'),
  artist_color: el('artist-color'),
  meta_color: el('meta-color'),
  accent_color: el('accent-color'),
  loved_color: el('loved-color'),
  logo_color: el('logo-color'),
  count: el('count'),
  width: el('width'),
  radius: el('radius'),
  art: el('art'),
  header: el('header'),
  time: el('time'),
  logo: el('logo'),
  profile: el('profile'),
  username: el('username'),
  avatar: el('avatar'),
  stats: el('stats'),
  footer: el('footer'),
  loved: el('loved'),
};

const out = {
  count: el('count-out'),
  width: el('width-out'),
  radius: el('radius-out'),
  snippet: el('snippet-out'),
  userError: el('user-error'),
  colorStatus: el('color-status'),
  colorCount: el('color-count'),
  preview: el('preview'),
  previewEmpty: el('preview-empty'),
  previewScale: el('preview-scale'),
  copy: el('copy'),
  copyUrl: el('copy-url'),
};

let activeTab = 'markdown';

/**
 * The image URL behind the current snippet. Held here rather than printed a
 * second time: "Copy URL" is the only thing that ever needed it, and a second
 * code box saying almost what the first one says is noise.
 */
let currentUrl = '';

/** The controls as they stand, before the artist/timestamp link is applied. */
function readRawState() {
  const state = {
    user: controls.user.value.trim(),
    theme: controls.theme.value,
    count: Number(controls.count.value),
    width: Number(controls.width.value),
    radius: Number(controls.radius.value),
    art: controls.art.checked,
    header: controls.header.checked,
    time: controls.time.checked,
    logo: controls.logo.checked,
    profile: controls.profile.value,
    username: controls.username.checked,
    avatar: controls.avatar.checked,
    stats: controls.stats.value,
    footer: controls.footer.value,
    loved: controls.loved.value,
  };
  for (const { param } of COLORS) {
    state[param] = controls[param].value.trim().toLowerCase().replace(/^#/, '');
  }
  return state;
}

function readState() {
  const state = readRawState();
  // The timestamp is the artist color's to give while they are linked - but
  // only once there is something to derive from, so an untouched theme keeps
  // its own pair rather than a computed approximation of it.
  if (isLinked(state) && (customized.has('artist_color') || !themeIsLinked(state.theme))) {
    state.meta_color = linkedMetaValue(state);
    customized.add('meta_color');
  }
  return state;
}

/** Builds the widget URL, omitting anything left at its default to keep it short. */
function buildUrl(state, overrides = {}) {
  const merged = { ...state, ...overrides };
  const params = new URLSearchParams();
  params.set('user', merged.user);

  const forceTheme = Object.prototype.hasOwnProperty.call(overrides, 'theme');
  if (forceTheme || merged.theme !== DEFAULTS.theme) params.set('theme', merged.theme);
  if (merged.count !== DEFAULTS.count) params.set('count', String(merged.count));
  if (merged.width !== DEFAULTS.width) params.set('width', String(merged.width));
  if (merged.radius !== DEFAULTS.radius) params.set('radius', String(merged.radius));
  if (merged.art !== DEFAULTS.art) params.set('art', merged.art ? '1' : '0');
  if (merged.header !== DEFAULTS.header) params.set('header', merged.header ? '1' : '0');
  if (merged.time !== DEFAULTS.time) params.set('time', merged.time ? '1' : '0');
  if (merged.logo !== DEFAULTS.logo) params.set('logo', merged.logo ? '1' : '0');
  if (merged.profile !== DEFAULTS.profile) params.set('profile', merged.profile);
  if (merged.username !== DEFAULTS.username)
    params.set('username', merged.username ? '1' : '0');
  if (merged.avatar !== DEFAULTS.avatar) params.set('avatar', merged.avatar ? '1' : '0');
  if (merged.stats !== DEFAULTS.stats) params.set('stats', merged.stats);
  // A footer profile *is* the footer, so an extra `footer` would be dead weight.
  if (merged.footer !== DEFAULTS.footer && !merged.profile.startsWith('footer-'))
    params.set('footer', merged.footer);
  if (merged.loved !== DEFAULTS.loved) params.set('loved', merged.loved);
  // Only colors that differ from the theme, so the fields can sit filled in
  // without every card carrying six redundant parameters.
  for (const { param } of COLORS) {
    if (HEX_RE.test(merged[param]) && isCustom(param, merged)) params.set(param, merged[param]);
  }

  return `${location.origin}/svg?${params.toString()}`;
}

/** In HTML attributes an unescaped `&` is a malformed entity; escape it. */
const attr = (url) => url.replace(/&/g, '&amp;');

function buildSnippet(state) {
  const url = buildUrl(state);
  const profile = `https://www.last.fm/user/${encodeURIComponent(state.user)}`;
  const alt = 'Last.fm recently played';

  switch (activeTab) {
    case 'linked':
      return `[![${alt}](${url})](${profile})`;

    case 'html':
      return `<a href="${profile}">\n  <img src="${attr(url)}" alt="${alt}" width="${state.width}" />\n</a>`;

    case 'adaptive': {
      const dark = attr(buildUrl(state, { theme: 'dark' }));
      const light = attr(buildUrl(state, { theme: 'light' }));
      return [
        '<picture>',
        `  <source media="(prefers-color-scheme: dark)" srcset="${dark}" />`,
        `  <source media="(prefers-color-scheme: light)" srcset="${light}" />`,
        `  <img src="${dark}" alt="${alt}" width="${state.width}" />`,
        '</picture>',
      ].join('\n');
    }

    case 'markdown':
    default:
      return `![${alt}](${url})`;
  }
}

let previewTimer = null;

function schedulePreview(url) {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    out.preview.src = url;
    out.preview.hidden = false;
    out.previewEmpty.hidden = true;
  }, 300);
}

/* -------------------------------------------------------------------------- */
/* Colors                                                                      */
/* -------------------------------------------------------------------------- */

/*
 * A small mirror of src/render/color.ts, duplicated because this page has no
 * build step. It drives the swatches, placeholders and contrast readout only -
 * the rendered card always comes from the Worker.
 */

/** Expands the short forms, so a swatch can be seeded from any accepted hex. */
function toSixDigit(value) {
  if (!HEX_RE.test(value)) return null;
  const hex = value.length <= 4 ? [...value].map((c) => c + c).join('') : value;
  return `#${hex.slice(0, 6)}`;
}

function channels(sixDigit) {
  return [1, 3, 5].map((i) => Number.parseInt(sixDigit.slice(i, i + 2), 16));
}

function mixHex(from, to, t) {
  const a = channels(from);
  const b = channels(to);
  const hex = a.map((v, i) =>
    Math.round(v + (b[i] - v) * t)
      .toString(16)
      .padStart(2, '0'),
  );
  return `#${hex.join('')}`;
}

/** WCAG relative luminance. */
function luminance(sixDigit) {
  const [r, g, b] = channels(sixDigit).map((raw) => {
    const c = raw / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function themeColors(theme) {
  return THEME_COLORS[theme] ?? THEME_COLORS.dark;
}

/**
 * The color a field falls back to, as `#rrggbb`, or null where the theme has
 * none to offer - only `transparent`'s background, which the card does not
 * draw at all.
 */
function themeDefault(param, state) {
  const { themeKey, fixed } = COLOR_BY_PARAM.get(param);
  if (fixed) return fixed;
  if (param === 'bg_color' && state.theme === 'transparent') return null;
  return themeColors(state.theme)[themeKey];
}

/** What the card will use for a color, given what is typed and which theme. */
function effectiveColor(param, state) {
  return (
    toSixDigit(state[param]) ??
    themeDefault(param, state) ??
    themeColors(state.theme).bg
  );
}

/** Whether a field is carrying anything other than its theme default. */
function isCustom(param, state) {
  if (!customized.has(param)) return false;
  return state[param] !== '' && HEX_RE.test(state[param]);
}

/**
 * The color fields a user has actually set.
 *
 * Tracked rather than inferred by comparing against the theme, because the
 * fields are filled in with the theme's own values: a comparison cannot tell
 * "untouched" from "deliberately set to the same color", and every field would
 * turn custom the moment the theme changed under it.
 */
const customized = new Set();

/* -------------------------------------------------------------------------- */
/* Artist / timestamp link                                                     */
/* -------------------------------------------------------------------------- */

/*
 * The two are one relationship in the neutral themes and deliberately unalike
 * in nord and catppuccin, so the page offers a link rather than the API. The
 * URL always carries both colors in full: the Worker needs no notion of
 * linking, and a hand-edited URL cannot reach a state this form cannot show.
 */

/** Null until the toggle is used, so the theme answers for itself until then. */
let linkChoice = null;

/** The timestamp color implied by an artist color. */
function derivedMeta(artist, bg) {
  return mixHex(artist, bg, META_FROM_ARTIST);
}

/** Whether a theme's own pair already follows that relationship. */
function themeIsLinked(theme) {
  const colors = themeColors(theme);
  const derived = channels(derivedMeta(colors.artist, colors.bg));
  return channels(colors.meta).every((v, i) => Math.abs(v - derived[i]) <= LINK_TOLERANCE);
}

function isLinked(state) {
  return linkChoice ?? themeIsLinked(state.theme);
}

/**
 * The timestamp color the link implies. Always a value now that the fields are
 * filled in - whether it reaches the URL is decided by `isCustom`.
 */
function linkedMetaValue(state) {
  return derivedMeta(
    effectiveColor('artist_color', state),
    effectiveColor('bg_color', state),
  ).replace(/^#/, '');
}

/**
 * Writes the state back onto the controls: swatches, placeholders, validity,
 * the link, and the contrast readout.
 *
 * Contrast warns rather than blocks. Low contrast can be deliberate, and the
 * server quietly rescues unreadable combinations - saying nothing would make
 * that look like the color being ignored.
 */
function syncColors(state) {
  const linked = isLinked(state);
  el('link-artist-meta').setAttribute('aria-pressed', String(linked));

  let invalid = 0;

  for (const { id, param } of COLORS) {
    const raw = state[param];
    const bad = raw !== '' && !HEX_RE.test(raw);
    if (bad) invalid++;

    const input = controls[param];
    input.setAttribute('aria-invalid', String(bad));

    // Fields carry the value the card is using rather than a placeholder, so a
    // theme's palette can be read and copied straight out. Untouched fields
    // follow the theme; `transparent` has no background to name, so that one
    // field stays empty.
    const fallback = themeDefault(param, state);
    if (!customized.has(param)) input.value = fallback ? fallback.slice(1) : '';
    else if (param === 'meta_color' && linked) input.value = state.meta_color;
    input.placeholder = fallback ? '' : 'none';

    const row = document.querySelector(`.color-row[data-color="${id}"]`);
    row.dataset.unset = String(!isCustom(param, state));
    if (param === 'meta_color') {
      row.dataset.linked = String(linked);
      // Readonly rather than disabled, so the derived value can still be
      // selected and copied.
      input.readOnly = linked;
    }

    // A chequer means transparency, which only 4- and 8-digit hex carries.
    row.querySelector('.swatch-wrap').dataset.alpha = String(
      raw.length === 4 || raw.length === 8,
    );

    const swatch = el(`${id}-swatch`);
    // Not while the pointer is inside the native picker, which would fight it.
    if (document.activeElement !== swatch) swatch.value = effectiveColor(param, state);
  }

  if (invalid > 0) {
    out.colorStatus.dataset.level = 'error';
    out.colorStatus.textContent = 'Hex digits only, e.g. 212121 or 212121cc';
    return;
  }

  const ratio = contrast(effectiveColor('bg_color', state), effectiveColor('text_color', state));
  const readable = ratio >= MIN_CONTRAST;
  out.colorStatus.dataset.level = readable ? 'ok' : 'warn';
  out.colorStatus.textContent = readable
    ? `Text contrast ${ratio.toFixed(1)}:1`
    : `Text contrast ${ratio.toFixed(1)}:1 - the card will adjust the text to stay readable.`;
}

/**
 * Counts the colors in play on the collapsed section's summary, so customising
 * one is not hidden by closing it.
 */
function updateColorBadge(state) {
  const set = COLORS.filter(({ param }) => isCustom(param, state)).length;
  out.colorCount.hidden = set === 0;
  out.colorCount.textContent = String(set);
}

function render() {
  const state = readState();

  out.count.textContent = String(state.count);
  out.width.textContent = String(state.width);
  out.radius.textContent = String(state.radius);

  const valid = isValidUsername(state.user);
  const empty = state.user === '';

  controls.user.setAttribute('aria-invalid', String(!empty && !valid));
  // Only say something when something is wrong.
  out.userError.textContent = empty || valid ? '' : 'Not a valid username';

  syncColors(state);
  updateColorBadge(state);

  // The footer holds one thing. If the profile is down there, it is the footer.
  controls.footer.disabled = state.profile.startsWith('footer-');

  if (!valid) {
    out.snippet.textContent = 'Enter a username';
    currentUrl = '';
    out.copy.disabled = true;
    out.copyUrl.disabled = true;
    out.preview.hidden = true;
    out.previewEmpty.hidden = false;
    clearTimeout(previewTimer);
    return;
  }

  const url = buildUrl(state);
  out.snippet.textContent = buildSnippet(state);
  currentUrl = url;
  out.copy.disabled = false;
  out.copyUrl.disabled = false;
  schedulePreview(url);
}

async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Clipboard API needs a secure context; fall back to a hidden textarea.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(ta);
    }
  }

  const original = button.textContent;
  button.textContent = 'Copied';
  button.classList.add('copied');
  setTimeout(() => {
    button.textContent = original;
    button.classList.remove('copied');
  }, 1400);
}

const COLOR_PARAMS = new Set(COLORS.map((c) => c.param));

for (const [name, control] of Object.entries(controls)) {
  // A color field claims itself as the user's before anything re-renders from
  // it - otherwise the render would overwrite what was just typed.
  if (COLOR_PARAMS.has(name)) {
    control.addEventListener('input', () => {
      if (control.value.trim() === '') customized.delete(name);
      else customized.add(name);
    });
  }
  control.addEventListener('input', render);
  control.addEventListener('change', render);
}

/*
 * Swatches bind to `change`, not `input`: a native picker fires `input`
 * continuously while dragging, and every preview is a request to the Worker.
 */
for (const { id, param } of COLORS) {
  const swatch = el(`${id}-swatch`);

  swatch.addEventListener('change', () => {
    controls[param].value = swatch.value.replace(/^#/, '');
    customized.add(param);
    render();
  });

  // Resetting hands the field back to the theme; the next render fills it with
  // the theme's own value, which then stays out of the URL.
  document.querySelector(`.reset[data-reset="${id}"]`).addEventListener('click', () => {
    customized.delete(param);
    if (param === 'artist_color' || param === 'meta_color') {
      linkChoice = null;
      customized.delete('meta_color');
    }
    render();
    controls[param].focus();
  });
}

el('link-artist-meta').addEventListener('click', () => {
  // Taken from what is currently showing, so the first click always visibly
  // does something whichever way the theme started.
  linkChoice = !isLinked(readState());
  render();
});

for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => {
    activeTab = tab.dataset.tab;
    for (const other of document.querySelectorAll('.tab')) {
      other.setAttribute('aria-selected', String(other === tab));
    }
    render();
  });
}

out.copy.addEventListener('click', () => copyText(out.snippet.textContent, out.copy));
out.copyUrl.addEventListener('click', () => copyText(currentUrl, out.copyUrl));

// The sample username is there to be replaced, so selecting it on first focus
// saves clearing the field by hand. Only while it is untouched - once someone
// has typed their own name, re-focusing should place the caret as usual.
controls.user.addEventListener('focus', () => {
  if (controls.user.value === SAMPLE_USER) controls.user.select();
});

out.preview.addEventListener('error', () => {
  out.preview.hidden = true;
  out.previewEmpty.hidden = false;
  out.previewEmpty.textContent = 'Preview failed to load';
});

/**
 * Says so when the card is being shown smaller than it will render. Without it
 * a wide card just looks like it has small type, and the width slider appears
 * to do nothing beyond a certain point.
 */
out.preview.addEventListener('load', () => {
  const natural = out.preview.naturalWidth;
  const shown = out.preview.clientWidth;
  const scaled = natural > 0 && shown > 0 && shown < natural - 1;

  out.previewScale.hidden = !scaled;
  if (scaled) {
    out.previewScale.textContent = `Shown at ${Math.round((shown / natural) * 100)}% - the card is ${natural}px wide.`;
  }
});

// Deep-link support: /?user=foo&theme=nord prefills the form.
(function hydrateFromQuery() {
  const q = new URLSearchParams(location.search);
  controls.user.value = q.has('user') ? q.get('user') : SAMPLE_USER;
  if (q.has('theme')) controls.theme.value = q.get('theme');
  if (q.has('count')) controls.count.value = q.get('count');
  if (q.has('width')) controls.width.value = q.get('width');
  if (q.has('radius')) controls.radius.value = q.get('radius');
  if (q.has('loved')) controls.loved.value = q.get('loved');
  if (q.has('footer')) controls.footer.value = q.get('footer');
  if (q.has('profile')) controls.profile.value = q.get('profile');
  // A color in the URL was chosen deliberately, so it counts as the user's.
  for (const { param } of COLORS) {
    if (!q.has(param)) continue;
    controls[param].value = q.get(param);
    customized.add(param);
  }
  if (q.has('stats')) {
    // `stats=1` still means "show them", as the endpoint accepts.
    const raw = q.get('stats');
    controls.stats.value = ['1', 'true', 'yes', 'on'].includes(raw) ? 'block' : raw;
  }

  const bool = (v) => v === '1' || v === 'true' || v === 'yes' || v === 'on';
  for (const name of ['art', 'header', 'time', 'logo', 'username', 'avatar']) {
    if (q.has(name)) controls[name].checked = bool(q.get(name));
  }

  // Open the colors section when a link arrives with colors already set,
  // so the controls that produced the card are the ones on screen.
  if (COLORS.some(({ param }) => q.has(param))) {
    el('colors-details').open = true;
  }

  // A shared link carries both colors whether or not they were linked here.
  // Read the controls before the link is applied and ask whether the timestamp
  // is exactly what the artist color implies; if not, it was chosen
  // deliberately and must not be overwritten.
  if (q.has('meta_color')) {
    const raw = readRawState();
    linkChoice = raw.meta_color === linkedMetaValue(raw);
  }

  render();

  focusUsernameIfHelpful(q.has('user'));
})();

/**
 * Puts the caret in the username field on load, since replacing the sample name
 * is the first thing anyone does here. Skipped on a deep link, where the form is
 * already what someone came to see, and on touch, where focusing a text input
 * raises the keyboard unasked. `preventScroll` keeps the heading in view.
 */
function focusUsernameIfHelpful(deepLinked) {
  if (deepLinked) return;
  if (window.matchMedia?.('(pointer: coarse)').matches) return;

  controls.user.focus({ preventScroll: true });
  controls.user.select();
}
