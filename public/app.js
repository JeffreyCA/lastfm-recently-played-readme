'use strict';

/**
 * Configurator for the README widget. Deliberately dependency-free and
 * build-step-free: it is one page whose entire job is to assemble a URL string,
 * so a framework and a bundler would be pure overhead.
 */

const USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9_-]{1,29}$/;
/** Mirrors parseHexColour on the server: hex digits only, no leading hash. */
const HEX_RE = /^([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const DEFAULTS = {
  theme: 'dark',
  bg_color: '',
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

const el = (id) => document.getElementById(id);

const controls = {
  user: el('user'),
  theme: el('theme'),
  bg_color: el('bg-color'),
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
  url: el('url-out'),
  userError: el('user-error'),
  bgColorError: el('bg-color-error'),
  preview: el('preview'),
  previewEmpty: el('preview-empty'),
  copy: el('copy'),
  copyUrl: el('copy-url'),
};

let activeTab = 'markdown';

function readState() {
  return {
    user: controls.user.value.trim(),
    theme: controls.theme.value,
    bg_color: controls.bg_color.value.trim().replace(/^#/, ''),
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
  // Only emit a colour once it's actually valid, so a half-typed hex doesn't
  // produce a snippet that renders differently from the preview.
  if (HEX_RE.test(merged.bg_color)) params.set('bg_color', merged.bg_color);

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

function render() {
  const state = readState();

  out.count.textContent = String(state.count);
  out.width.textContent = String(state.width);
  out.radius.textContent = String(state.radius);

  const valid = USERNAME_RE.test(state.user);
  const empty = state.user === '';

  controls.user.setAttribute('aria-invalid', String(!empty && !valid));
  // Only say something when something is wrong.
  out.userError.textContent = empty || valid ? '' : 'Not a valid username';

  const colour = state.bg_color;
  out.bgColorError.textContent =
    colour === '' || HEX_RE.test(colour) ? '' : 'Hex digits only, e.g. 212121';
  controls.bg_color.setAttribute(
    'aria-invalid',
    String(colour !== '' && !HEX_RE.test(colour)),
  );

  // The footer holds one thing. If the profile is down there, it is the footer.
  controls.footer.disabled = state.profile.startsWith('footer-');

  if (!valid) {
    out.snippet.textContent = 'Enter a username';
    out.url.textContent = '-';
    out.copy.disabled = true;
    out.copyUrl.disabled = true;
    out.preview.hidden = true;
    out.previewEmpty.hidden = false;
    clearTimeout(previewTimer);
    return;
  }

  const url = buildUrl(state);
  out.snippet.textContent = buildSnippet(state);
  out.url.textContent = url;
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

for (const control of Object.values(controls)) {
  control.addEventListener('input', render);
  control.addEventListener('change', render);
}

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
out.copyUrl.addEventListener('click', () => copyText(out.url.textContent, out.copyUrl));

out.preview.addEventListener('error', () => {
  out.preview.hidden = true;
  out.previewEmpty.hidden = false;
  out.previewEmpty.textContent = 'Preview failed to load';
});

// Deep-link support: /?user=foo&theme=nord prefills the form.
(function hydrateFromQuery() {
  const q = new URLSearchParams(location.search);
  if (q.has('user')) controls.user.value = q.get('user');
  if (q.has('theme')) controls.theme.value = q.get('theme');
  if (q.has('count')) controls.count.value = q.get('count');
  if (q.has('width')) controls.width.value = q.get('width');
  if (q.has('radius')) controls.radius.value = q.get('radius');
  if (q.has('loved')) controls.loved.value = q.get('loved');
  if (q.has('footer')) controls.footer.value = q.get('footer');
  if (q.has('profile')) controls.profile.value = q.get('profile');
  if (q.has('bg_color')) controls.bg_color.value = q.get('bg_color');
  if (q.has('stats')) {
    // `stats=1` still means "show them", as the endpoint accepts.
    const raw = q.get('stats');
    controls.stats.value = ['1', 'true', 'yes', 'on'].includes(raw) ? 'block' : raw;
  }

  const bool = (v) => v === '1' || v === 'true' || v === 'yes' || v === 'on';
  for (const name of ['art', 'header', 'time', 'logo', 'username', 'avatar']) {
    if (q.has(name)) controls[name].checked = bool(q.get(name));
  }
  render();
})();
