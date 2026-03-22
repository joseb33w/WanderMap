import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(
  'https://xhhmxabftbyxrirvvihn.supabase.co',
  'sb_publishable_NZHoIxqqpSvVBP8MrLHCYA_gmg1AbN-'
);

const T_USERS = 'uNMexs7BYTXQ2_wandermap_app_users';
const T_LOGS = 'uNMexs7BYTXQ2_wandermap_adventure_logs';
const T_UPVOTES = 'uNMexs7BYTXQ2_wandermap_log_upvotes';
const T_COMMENTS = 'uNMexs7BYTXQ2_wandermap_log_comments';
const T_BUCKET = 'uNMexs7BYTXQ2_wandermap_bucket_list';

const NASA_APOD = 'https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY';
const REST_COUNTRIES = 'https://restcountries.com/v3.1';
const OPEN_METEO_GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search';
const OPEN_METEO_FORECAST = 'https://api.open-meteo.com/v1/forecast';
const EMAIL_REDIRECT = 'https://sling-gogiapp.web.app/email-confirmed.html';

const TAG_OPTIONS = ['food', 'nightlife', 'culture', 'nature'];
const WORLD_REGIONS = [
  { code: 'US', name: 'United States', path: 'M120 160 L220 160 L240 220 L180 250 L110 220 Z' },
  { code: 'CA', name: 'Canada', path: 'M105 110 L210 95 L255 145 L205 170 L120 160 Z' },
  { code: 'MX', name: 'Mexico', path: 'M145 250 L200 240 L230 290 L185 320 L145 290 Z' },
  { code: 'BR', name: 'Brazil', path: 'M300 290 L360 255 L410 310 L385 390 L330 420 L290 360 Z' },
  { code: 'AR', name: 'Argentina', path: 'M350 430 L390 420 L405 520 L370 575 L335 520 Z' },
  { code: 'GB', name: 'United Kingdom', path: 'M520 115 L545 110 L550 145 L530 160 L515 140 Z' },
  { code: 'FR', name: 'France', path: 'M545 175 L585 170 L600 205 L565 225 L535 205 Z' },
  { code: 'ES', name: 'Spain', path: 'M505 195 L545 190 L555 220 L510 225 L492 205 Z' },
  { code: 'DE', name: 'Germany', path: 'M580 150 L615 150 L622 185 L592 205 L572 182 Z' },
  { code: 'IT', name: 'Italy', path: 'M610 205 L640 210 L650 250 L628 270 L610 240 Z' },
  { code: 'NG', name: 'Nigeria', path: 'M560 320 L600 320 L615 360 L585 385 L555 360 Z' },
  { code: 'EG', name: 'Egypt', path: 'M640 250 L690 250 L700 300 L655 305 L632 280 Z' },
  { code: 'ZA', name: 'South Africa', path: 'M610 485 L675 475 L700 530 L645 565 L590 535 Z' },
  { code: 'IN', name: 'India', path: 'M760 245 L820 240 L840 290 L795 330 L752 295 Z' },
  { code: 'CN', name: 'China', path: 'M820 185 L930 175 L965 250 L905 295 L820 270 L790 220 Z' },
  { code: 'JP', name: 'Japan', path: 'M980 205 L1005 220 L995 270 L972 250 Z' },
  { code: 'AU', name: 'Australia', path: 'M880 455 L980 452 L1010 520 L955 575 L865 555 L845 500 Z' }
];

let currentUser = null;
let currentScreen = 'loading';
let currentView = 'home';
let currentCity = null;
let apod = null;
let selectedSearch = null;
let citySearchResults = [];
let logs = [];
let upvotes = [];
let comments = [];
let bucketList = [];
let currentProfile = null;

const app = document.getElementById('app');

function esc(value) {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}

function showToast(message) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

function fmtDate(value) {
  if (!value) return 'Unknown date';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(value) {
  if (!value) return 'just now';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.max(1, Math.floor(diff / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function getDisplayName(user = currentUser) {
  if (!user) return 'Traveler';
  return user.email?.split('@')[0] || 'Traveler';
}

function clampRating(value) {
  const n = Number(value || 0);
  return Math.max(1, Math.min(5, n));
}

function getRank(totalLogs) {
  if (totalLogs >= 31) return { name: 'Globetrotter', icon: 'fa-earth-americas', badge: '🌍' };
  if (totalLogs >= 16) return { name: 'Adventurer', icon: 'fa-mountain-sun', badge: '🏕️' };
  if (totalLogs >= 6) return { name: 'Explorer', icon: 'fa-compass', badge: '🧭' };
  return { name: 'Tourist', icon: 'fa-camera-retro', badge: '📸' };
}

function trendingScore(log) {
  const ageHours = Math.max(1, (Date.now() - new Date(log.created_at).getTime()) / 36e5);
  const up = Number(log.upvotes_count || 0);
  const com = Number(log.comments_count || 0);
  const rating = Number(log.rating || 0);
  return Number(((up * 4 + com * 2 + rating * 1.5) / Math.pow(ageHours + 2, 0.32)).toFixed(2));
}

async function ensureAppUser(user) {
  try {
    const { data, error } = await supabase.from(T_USERS).select('*').eq('user_id', user.id).limit(1);
    if (error) throw error;
    if (!data || data.length === 0) {
      await supabase.from(T_USERS).insert({
        email: user.email,
        display_name: user.email.split('@')[0],
        avatar_emoji: '🧭',
        home_city: ''
      });
    }
    const { data: fresh } = await supabase.from(T_USERS).select('*').eq('user_id', user.id).limit(1);
    currentProfile = fresh?.[0] || null;
  } catch (e) {
    console.error('ensureAppUser', e);
  }
}

async function fetchApod() {
  try {
    const res = await fetch(NASA_APOD);
    const data = await res.json();
    apod = data;
  } catch (e) {
    console.error('apod', e);
    apod = null;
  }
}

function renderLoading() {
  const bg = apod?.media_type === 'image' ? `style="background-image:url('${apod.url}')"` : '';
  app.innerHTML = `
    <div class="loading-screen">
      <div class="loading-card card stamp-card">
        <div class="loading-media" ${bg}>
          <div class="loading-overlay"></div>
        </div>
        <div class="loading-copy">
          <div class="kicker">Daily space dispatch</div>
          <h1 class="title" style="text-align:left; font-size:2rem; margin-top:10px;">WanderMap</h1>
          <p class="subtitle" style="text-align:left; margin-top:10px;">
            ${esc(apod?.title || 'Loading today\'s cosmic postcard...')}<br>
            Plan your next city story while today\'s NASA APOD sets the mood.
          </p>
        </div>
      </div>
    </div>
  `;
}

function renderSignUp() {
  currentScreen = 'signup';
  app.innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card card stamp-card">
        <div class="brand-mark"><i class="fa-solid fa-compass"></i></div>
        <h1 class="title">WanderMap</h1>
        <p class="subtitle">Collect city stories, discover top adventures, and build your passport rank.</p>
        <div class="form-stack" style="margin-top:20px;">
          <div>
            <label class="label">Email</label>
            <input class="input" id="su-email" type="email" placeholder="you@example.com">
          </div>
          <div>
            <label class="label">Password</label>
            <input class="input" id="su-pass" type="password" placeholder="Minimum 6 characters">
          </div>
          <div class="auth-error" id="su-error"></div>
          <button class="btn btn-primary" id="su-btn">Create account</button>
          <button class="auth-switch" id="goto-si">Already have an account? <strong>Sign in</strong></button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('goto-si').addEventListener('click', renderSignIn);
  document.getElementById('su-btn').addEventListener('click', handleSignUp);
}

async function handleSignUp() {
  try {
    const email = document.getElementById('su-email').value.trim();
    const password = document.getElementById('su-pass').value;
    const err = document.getElementById('su-error');
    err.textContent = '';
    if (!email) return err.textContent = 'Enter your email.';
    if (password.length < 6) return err.textContent = 'Password must be at least 6 characters.';
    const btn = document.getElementById('su-btn');
    btn.disabled = true;
    btn.textContent = 'Creating...';

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: EMAIL_REDIRECT }
    });

    if (error) {
      if (error.message.includes('already') || error.message.includes('registered')) {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) {
          err.textContent = 'This email already exists and that password did not match.';
          btn.disabled = false;
          btn.textContent = 'Create account';
          return;
        }
        currentUser = signInData.user;
        await ensureAppUser(currentUser);
        await loadAppData();
        renderAppShell();
        return;
      }
      throw error;
    }

    renderCheckEmail(email);
  } catch (e) {
    document.getElementById('su-error').textContent = e.message || 'Could not create account.';
    const btn = document.getElementById('su-btn');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Create account';
    }
  }
}

function renderCheckEmail(email) {
  currentScreen = 'check-email';
  app.innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card card stamp-card">
        <div class="brand-mark"><i class="fa-regular fa-envelope"></i></div>
        <h1 class="title" style="font-size:1.9rem;">Check your email</h1>
        <p class="subtitle">We sent a confirmation link to <strong>${esc(email)}</strong>. Tap it, then come back and sign in to start exploring.</p>
        <div style="margin-top:20px; display:grid; gap:12px;">
          <button class="btn btn-primary" id="goto-signin-email">Go to sign in</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('goto-signin-email').addEventListener('click', renderSignIn);
}

function renderSignIn() {
  currentScreen = 'signin';
  app.innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card card stamp-card">
        <div class="brand-mark"><i class="fa-solid fa-map-location-dot"></i></div>
        <h1 class="title">Welcome back</h1>
        <p class="subtitle">Sign in to your travel journal and discovery feed.</p>
        <div class="form-stack" style="margin-top:20px;">
          <div>
            <label class="label">Email</label>
            <input class="input" id="si-email" type="email" placeholder="you@example.com">
          </div>
          <div>
            <label class="label">Password</label>
            <input class="input" id="si-pass" type="password" placeholder="Your password">
          </div>
          <div class="auth-error" id="si-error"></div>
          <button class="btn btn-primary" id="si-btn">Sign in</button>
          <button class="auth-switch" id="goto-su">Need an account? <strong>Sign up</strong></button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('goto-su').addEventListener('click', renderSignUp);
  document.getElementById('si-btn').addEventListener('click', handleSignIn);
}

async function handleSignIn() {
  try {
    const email = document.getElementById('si-email').value.trim();
    const password = document.getElementById('si-pass').value;
    const err = document.getElementById('si-error');
    err.textContent = '';
    if (!email || !password) return err.textContent = 'Fill in both fields.';
    const btn = document.getElementById('si-btn');
    btn.disabled = true;
    btn.textContent = 'Signing in...';

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Email not confirmed') || error.message.includes('not confirmed')) {
        err.textContent = 'Please confirm your email first.';
      } else {
        err.textContent = error.message;
      }
      btn.disabled = false;
      btn.textContent = 'Sign in';
      return;
    }

    currentUser = data.user;
    await ensureAppUser(currentUser);
    await loadAppData();
    renderAppShell();
  } catch (e) {
    const err = document.getElementById('si-error');
    if (err) err.textContent = e.message || 'Could not sign in.';
    const btn = document.getElementById('si-btn');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Sign in';
    }
  }
}

async function loadAppData() {
  try {
    const [logsRes, upvotesRes, commentsRes, bucketRes, profileRes] = await Promise.all([
      supabase.from(T_LOGS).select('*').order('created_at', { ascending: false }),
      supabase.from(T_UPVOTES).select('*'),
      supabase.from(T_COMMENTS).select('*').order('created_at', { ascending: false }),
      currentUser ? supabase.from(T_BUCKET).select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
      currentUser ? supabase.from(T_USERS).select('*').eq('user_id', currentUser.id).limit(1) : Promise.resolve({ data: [] })
    ]);

    logs = (logsRes.data || []).map(log => ({ ...log, trending_score: trendingScore(log) }))
      .sort((a, b) => b.trending_score - a.trending_score);
    upvotes = upvotesRes.data || [];
    comments = commentsRes.data || [];
    bucketList = bucketRes.data || [];
    currentProfile = profileRes.data?.[0] || currentProfile;
  } catch (e) {
    console.error('loadAppData', e);
  }
}

function renderAppShell() {
  currentScreen = 'app';
  app.innerHTML = `
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <div class="brand-icon"><i class="fa-solid fa-compass-drafting"></i></div>
          <div>
            <h1>WanderMap</h1>
            <p>Adventure logs, city weather, and traveler ranks</p>
          </div>
        </div>
        <div class="top-actions">
          <button class="btn btn-ghost" id="quick-city-btn"><i class="fa-solid fa-city"></i> Pick city</button>
          <button class="btn btn-secondary" id="signout-btn"><i class="fa-solid fa-right-from-bracket"></i> Sign out</button>
        </div>
      </div>
      <div class="nav-tabs">
        <button class="nav-tab ${currentView === 'home' ? 'active' : ''}" data-view="home">Discovery</button>
        <button class="nav-tab ${currentView === 'city' ? 'active' : ''}" data-view="city">City page</button>
        <button class="nav-tab ${currentView === 'create' ? 'active' : ''}" data-view="create">New log</button>
        <button class="nav-tab ${currentView === 'profile' ? 'active' : ''}" data-view="profile">Profile</button>
        <button class="nav-tab ${currentView === 'stats' ? 'active' : ''}" data-view="stats">Global stats</button>
      </div>
    </header>
    <main class="page-shell" id="page-shell"></main>
  `;

  document.getElementById('signout-btn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    currentUser = null;
    currentProfile = null;
    renderSignIn();
  });

  document.getElementById('quick-city-btn').addEventListener('click', () => openCityPickerModal());

  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentView = btn.dataset.view;
      renderAppShell();
    });
  });

  renderCurrentView();
}

function renderCurrentView() {
  const shell = document.getElementById('page-shell');
  if (!shell) return;
  if (currentView === 'home') return renderHome(shell);
  if (currentView === 'city') return renderCityPage(shell);
  if (currentView === 'create') return renderCreateLog(shell);
  if (currentView === 'profile') return renderProfile(shell);
  if (currentView === 'stats') return renderStats(shell);
}

function getPublicLogs() {
  return logs.filter(log => log.is_public !== false);
}

function getLogComments(logId) {
  return comments.filter(c => c.log_id === logId);
}

function hasUpvoted(logId) {
  return upvotes.some(v => v.log_id === logId && v.user_id === currentUser?.id);
}

function renderStars(rating) {
  return '★'.repeat(clampRating(rating)) + '☆'.repeat(5 - clampRating(rating));
}

function renderLogCard(log, compact = false) {
  const commentCount = getLogComments(log.id).length;
  const author = log.user_id === currentUser?.id ? (currentProfile?.display_name || getDisplayName()) : 'Traveler';
  return `
    <article class="log-card card stamp-card">
      <div class="log-head">
        <div>
          <h3 style="font-size:${compact ? '1.05rem' : '1.25rem'};">${esc(log.title)}</h3>
          <div class="log-city"><i class="fa-solid fa-location-dot"></i> ${esc(log.city_name)}, ${esc(log.country_name || '')}</div>
        </div>
        <div style="text-align:right;">
          <div style="color:var(--gold); font-weight:800;">${esc(renderStars(log.rating))}</div>
          <div class="small">Visited ${esc(fmtDate(log.visit_date))}</div>
        </div>
      </div>
      <p class="log-notes">${esc(log.notes)}</p>
      <div class="tag-row">${(log.tags || []).map(tag => `<span class="tag">#${esc(tag)}</span>`).join('')}</div>
      <div class="meta-row">
        <span class="meta-chip"><i class="fa-solid fa-fire"></i> Trending ${log.trending_score}</span>
        <span class="meta-chip"><i class="fa-solid fa-thumbs-up"></i> ${log.upvotes_count || 0} upvotes</span>
        <span class="meta-chip"><i class="fa-solid fa-comments"></i> ${commentCount} comments</span>
        <span class="meta-chip"><i class="fa-regular fa-clock"></i> ${timeAgo(log.created_at)}</span>
        <span class="meta-chip"><i class="fa-solid fa-passport"></i> ${esc(author)}</span>
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:16px;">
        <button class="btn btn-primary upvote-btn" data-log="${log.id}">${hasUpvoted(log.id) ? 'Upvoted' : 'Upvote'}</button>
        <button class="btn btn-secondary comment-btn" data-log="${log.id}">Comment</button>
        <button class="btn btn-ghost city-link-btn" data-city="${esc(log.city_name)}" data-country="${esc(log.country_name || '')}">Open city</button>
      </div>
      <div class="comment-list">${getLogComments(log.id).slice(0, 3).map(c => `<div class="comment-item"><strong>${c.user_id === currentUser?.id ? 'You' : 'Traveler'}:</strong> ${esc(c.comment_text)}</div>`).join('')}</div>
    </article>
  `;
}

function bindLogActions(root = document) {
  root.querySelectorAll('.upvote-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const logId = btn.dataset.log;
      if (hasUpvoted(logId)) return showToast('You already upvoted this log.');
      try {
        const log = logs.find(l => l.id === logId);
        if (!log) return;
        const { error } = await supabase.from(T_UPVOTES).insert({ log_id: logId, log_owner_id: log.user_id });
        if (error) throw error;
        await supabase.from(T_LOGS).update({
          upvotes_count: (log.upvotes_count || 0) + 1,
          trending_score: trendingScore({ ...log, upvotes_count: (log.upvotes_count || 0) + 1 })
        }).eq('id', logId);
        await loadAppData();
        renderAppShell();
        showToast('Adventure log upvoted.');
      } catch (e) {
        console.error('upvote', e);
        showToast('Could not upvote right now.');
      }
    });
  });

  root.querySelectorAll('.comment-btn').forEach(btn => {
    btn.addEventListener('click', () => openCommentModal(btn.dataset.log));
  });

  root.querySelectorAll('.city-link-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await selectCityByName(btn.dataset.city, btn.dataset.country);
    });
  });
}

function renderHome(container) {
  const publicLogs = getPublicLogs();
  const topLogs = publicLogs.slice(0, 6);
  const topCities = [...publicLogs.reduce((map, log) => {
    const key = `${log.city_name}|${log.country_name}`;
    if (!map.has(key)) map.set(key, { city: log.city_name, country: log.country_name, count: 0 });
    map.get(key).count += 1;
    return map;
  }, new Map()).values()].sort((a, b) => b.count - a.count).slice(0, 5);

  container.innerHTML = `
    <section class="hero">
      <div class="hero-grid">
        <div class="hero-main card stamp-card">
          <div class="kicker">Discovery feed</div>
          <h2 class="hero-title">Find the world\'s most loved city adventures.</h2>
          <p class="hero-copy">WanderMap blends live weather, country facts, and community travel journals into one discovery feed. Browse trending logs, jump into a city page, and start building your own passport rank.</p>
          <div class="hero-actions">
            <button class="btn btn-primary" id="hero-create-btn">Write a log</button>
            <button class="btn btn-secondary" id="hero-pick-btn">Choose a city</button>
          </div>
          <div class="mini-stats">
            <div class="stat-pill"><strong>${publicLogs.length}</strong><span>Public logs</span></div>
            <div class="stat-pill"><strong>${new Set(publicLogs.map(l => l.city_name)).size}</strong><span>Cities explored</span></div>
            <div class="stat-pill"><strong>${upvotes.length}</strong><span>Total upvotes</span></div>
          </div>
        </div>
        <aside class="hero-side card stamp-card">
          <div class="section-title" style="margin-bottom:10px;">
            <h2 style="font-size:1.3rem;">Top cities</h2>
          </div>
          <div class="log-list">
            ${topCities.length ? topCities.map((item, idx) => `
              <div class="city-result top-city-item" data-city="${esc(item.city)}" data-country="${esc(item.country)}">
                <strong>${idx + 1}. ${esc(item.city)}</strong>
                <div class="small">${esc(item.country)} · ${item.count} logs</div>
              </div>
            `).join('') : '<div class="empty">No cities logged yet.</div>'}
          </div>
        </aside>
      </div>
    </section>

    <section class="section">
      <div class="section-title">
        <div>
          <h2>Trending now</h2>
          <p>The home feed ranks logs by upvotes, comments, rating, and freshness.</p>
        </div>
      </div>
      <div class="grid feed-grid">
        <div class="log-list" id="home-log-list">
          ${topLogs.length ? topLogs.map(log => renderLogCard(log)).join('') : '<div class="card empty">No public logs yet. Be the first to add one.</div>'}
        </div>
        <div class="side-stack">
          <div class="city-search-card card stamp-card">
            <div class="section-title" style="margin-bottom:10px;"><h2 style="font-size:1.3rem;">Search cities</h2></div>
            <div class="city-search-row">
              <input class="input" id="home-city-input" placeholder="Search a city like Lisbon or Kyoto">
              <button class="btn btn-primary" id="home-city-search">Search</button>
            </div>
            <div class="city-results" id="home-city-results"></div>
          </div>
          <div class="stats-card card stamp-card">
            <div class="section-title" style="margin-bottom:10px;"><h2 style="font-size:1.3rem;">Passport ranks</h2></div>
            <div class="log-list">
              <div class="meta-chip">📸 Tourist · 0–5 logs</div>
              <div class="meta-chip">🧭 Explorer · 6–15 logs</div>
              <div class="meta-chip">🏕️ Adventurer · 16–30 logs</div>
              <div class="meta-chip">🌍 Globetrotter · 31+ logs</div>
            </div>
          </div>
        </div>
      </div>
    </section>
    <div class="footer-space"></div>
  `;

  document.getElementById('hero-create-btn').addEventListener('click', () => {
    currentView = 'create';
    renderAppShell();
  });
  document.getElementById('hero-pick-btn').addEventListener('click', () => openCityPickerModal());
  document.getElementById('home-city-search').addEventListener('click', async () => {
    const q = document.getElementById('home-city-input').value.trim();
    await searchCities(q, document.getElementById('home-city-results'));
  });

  container.querySelectorAll('.top-city-item').forEach(el => {
    el.addEventListener('click', async () => {
      await selectCityByName(el.dataset.city, el.dataset.country);
    });
  });

  bindLogActions(container);
}

async function searchCities(query, resultsEl) {
  try {
    if (!query) {
      resultsEl.innerHTML = '<div class="empty">Enter a city to search.</div>';
      return;
    }
    resultsEl.innerHTML = '<div class="empty">Searching cities...</div>';
    const res = await fetch(`${OPEN_METEO_GEOCODE}?name=${encodeURIComponent(query)}&count=8&language=en&format=json`);
    const data = await res.json();
    citySearchResults = data.results || [];
    if (!citySearchResults.length) {
      resultsEl.innerHTML = '<div class="empty">No matching cities found.</div>';
      return;
    }
    resultsEl.innerHTML = citySearchResults.map((city, idx) => `
      <div class="city-result city-pick" data-idx="${idx}">
        <strong>${esc(city.name)}</strong>
        <div class="small">${esc(city.country || '')}${city.admin1 ? ` · ${esc(city.admin1)}` : ''}</div>
      </div>
    `).join('');
    resultsEl.querySelectorAll('.city-pick').forEach(btn => {
      btn.addEventListener('click', async () => {
        selectedSearch = citySearchResults[Number(btn.dataset.idx)];
        await loadCityDetails(selectedSearch);
      });
    });
  } catch (e) {
    console.error('searchCities', e);
    resultsEl.innerHTML = '<div class="empty">Search failed. Try again.</div>';
  }
}

async function selectCityByName(cityName, countryName = '') {
  try {
    const res = await fetch(`${OPEN_METEO_GEOCODE}?name=${encodeURIComponent(cityName)}&count=8&language=en&format=json`);
    const data = await res.json();
    const match = (data.results || []).find(item => item.name.toLowerCase() === cityName.toLowerCase() && (!countryName || (item.country || '').toLowerCase() === countryName.toLowerCase())) || data.results?.[0];
    if (!match) return showToast('Could not find that city right now.');
    await loadCityDetails(match);
  } catch (e) {
    console.error('selectCityByName', e);
    showToast('Could not load city.');
  }
}

async function loadCityDetails(city) {
  try {
    const [weatherRes, countryRes] = await Promise.all([
      fetch(`${OPEN_METEO_FORECAST}?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`),
      fetch(`${REST_COUNTRIES}/alpha/${encodeURIComponent(city.country_code)}`)
    ]);

    const weather = await weatherRes.json();
    const countryArr = await countryRes.json();
    const country = Array.isArray(countryArr) ? countryArr[0] : null;

    currentCity = {
      ...city,
      weather,
      country,
      logs: getPublicLogs().filter(log => log.city_name.toLowerCase() === city.name.toLowerCase())
    };
    currentView = 'city';
    renderAppShell();
    showToast(`${city.name} loaded.`);
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
  } catch (e) {
    console.error('loadCityDetails', e);
    showToast('Could not load city details.');
  }
}

function weatherLabel(code) {
  const map = {
    0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
    61: 'Rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Snow', 80: 'Rain showers', 95: 'Thunderstorm'
  };
  return map[code] || 'Mixed';
}

function renderCityPage(container) {
  if (!currentCity) {
    container.innerHTML = `
      <section class="section">
        <div class="card empty">Pick a city to view live weather, country facts, and community logs.</div>
      </section>
    `;
    return;
  }

  const country = currentCity.country || {};
  const currencies = country.currencies ? Object.values(country.currencies).map(c => `${c.name} (${c.symbol || ''})`).join(', ') : 'Unavailable';
  const languages = country.languages ? Object.values(country.languages).join(', ') : 'Unavailable';
  const forecast = currentCity.weather?.daily?.time?.slice(0, 4).map((day, idx) => ({
    day,
    max: currentCity.weather.daily.temperature_2m_max[idx],
    min: currentCity.weather.daily.temperature_2m_min[idx],
    code: currentCity.weather.daily.weather_code[idx]
  })) || [];
  const cityLogs = getPublicLogs().filter(log => log.city_name.toLowerCase() === currentCity.name.toLowerCase());

  container.innerHTML = `
    <section class="section">
      <div class="city-layout">
        <div>
          <div class="city-banner card stamp-card" id="city-banner">
            <div class="parallax-layer parallax-grid" data-depth="12"></div>
            <div class="parallax-layer parallax-compass" data-depth="24"><i class="fa-regular fa-compass"></i></div>
            <div class="city-banner-content">
              <div class="kicker">City explorer</div>
              <h2 class="hero-title" style="font-size:2.5rem;">${esc(currentCity.name)}</h2>
              <p class="hero-copy" style="margin-top:8px; max-width:50ch;">${esc(currentCity.country || '')}${currentCity.admin1 ? ` · ${esc(currentCity.admin1)}` : ''} · ${esc(weatherLabel(currentCity.weather?.current?.weather_code))} right now</p>
              <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:18px;">
                <button class="btn btn-primary" id="add-bucket-btn">Save to bucket list</button>
                <button class="btn btn-secondary" id="city-create-log">Write log for this city</button>
              </div>
            </div>
          </div>

          <div class="section card stamp-card" style="padding:20px;">
            <div class="section-title"><h2 style="font-size:1.35rem;">Adventure logs in ${esc(currentCity.name)}</h2></div>
            <div class="log-list">
              ${cityLogs.length ? cityLogs.map(log => renderLogCard(log, true)).join('') : '<div class="empty">No public logs for this city yet.</div>'}
            </div>
          </div>
        </div>

        <div class="side-stack">
          <div class="card stamp-card" style="padding:20px;">
            <div class="section-title" style="margin-bottom:10px;"><h2 style="font-size:1.3rem;">Country facts</h2></div>
            <div class="info-grid">
              <div class="info-box"><span>Country</span><strong>${esc(country.name?.common || currentCity.country || 'Unknown')}</strong></div>
              <div class="info-box"><span>Population</span><strong>${country.population ? country.population.toLocaleString() : 'Unavailable'}</strong></div>
              <div class="info-box"><span>Currency</span><strong>${esc(currencies)}</strong></div>
              <div class="info-box"><span>Languages</span><strong>${esc(languages)}</strong></div>
              <div class="info-box"><span>Region</span><strong>${esc(country.region || 'Unavailable')}</strong></div>
              <div class="info-box"><span>Capital</span><strong>${esc(country.capital?.[0] || 'Unavailable')}</strong></div>
            </div>
          </div>

          <div class="card stamp-card" style="padding:20px;">
            <div class="section-title" style="margin-bottom:10px;"><h2 style="font-size:1.3rem;">Current weather</h2></div>
            <div class="info-grid">
              <div class="info-box"><span>Temperature</span><strong>${Math.round(currentCity.weather?.current?.temperature_2m ?? 0)}°C</strong></div>
              <div class="info-box"><span>Humidity</span><strong>${Math.round(currentCity.weather?.current?.relative_humidity_2m ?? 0)}%</strong></div>
              <div class="info-box"><span>Wind</span><strong>${Math.round(currentCity.weather?.current?.wind_speed_10m ?? 0)} km/h</strong></div>
              <div class="info-box"><span>Condition</span><strong>${esc(weatherLabel(currentCity.weather?.current?.weather_code))}</strong></div>
            </div>
            <div class="forecast-grid">
              ${forecast.map(day => `
                <div class="forecast-day">
                  <strong>${new Date(day.day).toLocaleDateString(undefined, { weekday: 'short' })}</strong>
                  <div class="small" style="margin-top:8px;">${esc(weatherLabel(day.code))}</div>
                  <div style="margin-top:8px; font-weight:800;">${Math.round(day.max)}° / ${Math.round(day.min)}°</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </section>
    <div class="footer-space"></div>
  `;

  document.getElementById('city-create-log').addEventListener('click', () => {
    currentView = 'create';
    renderAppShell();
    setTimeout(() => {
      const cityInput = document.getElementById('log-city');
      if (cityInput) cityInput.value = currentCity.name;
    }, 20);
  });

  document.getElementById('add-bucket-btn').addEventListener('click', async () => {
    try {
      if (bucketList.some(item => item.city_name.toLowerCase() === currentCity.name.toLowerCase())) {
        return showToast('That city is already in your bucket list.');
      }
      const { error } = await supabase.from(T_BUCKET).insert({
        city_name: currentCity.name,
        country_name: currentCity.country || '',
        country_code: currentCity.country_code || '',
        lat: currentCity.latitude,
        lng: currentCity.longitude,
        notes: ''
      });
      if (error) throw error;
      await loadAppData();
      showToast('Saved to your bucket list.');
    } catch (e) {
      console.error('bucket', e);
      showToast('Could not save this city.');
    }
  });

  bindLogActions(container);
  bindParallax();
}

function bindParallax() {
  const banner = document.getElementById('city-banner');
  if (!banner) return;
  banner.addEventListener('mousemove', e => {
    const rect = banner.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    banner.querySelectorAll('.parallax-layer').forEach(layer => {
      const depth = Number(layer.dataset.depth || 10);
      layer.style.transform = `translate(${x * depth}px, ${y * depth}px)`;
    });
  });
  banner.addEventListener('mouseleave', () => {
    banner.querySelectorAll('.parallax-layer').forEach(layer => layer.style.transform = 'translate(0,0)');
  });
}

function renderCreateLog(container) {
  container.innerHTML = `
    <section class="section">
      <div class="two-col">
        <div class="form-card card stamp-card">
          <div class="section-title"><h2>Create adventure log</h2></div>
          <div class="form-stack">
            <div>
              <label class="label">City</label>
              <input class="input" id="log-city" placeholder="Search and match a city first">
            </div>
            <div>
              <label class="label">Title</label>
              <input class="input" id="log-title" placeholder="Sunrise markets and hidden alleys">
            </div>
            <div>
              <label class="label">Notes</label>
              <textarea class="textarea" id="log-notes" placeholder="What made this city memorable?"></textarea>
            </div>
            <div class="two-col" style="gap:12px;">
              <div>
                <label class="label">Rating</label>
                <select class="select" id="log-rating">
                  <option value="5">5 - unforgettable</option>
                  <option value="4">4 - loved it</option>
                  <option value="3">3 - solid trip</option>
                  <option value="2">2 - mixed</option>
                  <option value="1">1 - not for me</option>
                </select>
              </div>
              <div>
                <label class="label">Visit date</label>
                <input class="input" id="log-date" type="date">
              </div>
            </div>
            <div>
              <label class="label">Tags</label>
              <div class="tag-row">${TAG_OPTIONS.map(tag => `<label class="tag"><input type="checkbox" class="tag-check" value="${tag}" style="margin-right:6px;">${tag}</label>`).join('')}</div>
            </div>
            <div>
              <label class="label">Visibility</label>
              <select class="select" id="log-public">
                <option value="true">Public log</option>
                <option value="false">Private log</option>
              </select>
            </div>
            <button class="btn btn-primary" id="create-log-btn">Publish adventure log</button>
          </div>
        </div>

        <div class="city-search-card card stamp-card">
          <div class="section-title"><h2 style="font-size:1.35rem;">Match a city</h2></div>
          <p class="small">Use live Open-Meteo geocoding so your log links to a real city page with weather and country details.</p>
          <div class="city-search-row" style="margin-top:14px;">
            <input class="input" id="create-city-search" placeholder="Search city">
            <button class="btn btn-secondary" id="create-city-search-btn">Find</button>
          </div>
          <div class="city-results" id="create-city-results"></div>
          <div class="bucket-card card" style="margin-top:16px; padding:16px; background:rgba(255,255,255,0.03);">
            <strong>Selected city</strong>
            <div id="selected-city-box" class="small" style="margin-top:8px;">No city selected yet.</div>
          </div>
        </div>
      </div>
    </section>
  `;

  if (currentCity) {
    document.getElementById('log-city').value = currentCity.name;
    selectedSearch = currentCity;
    document.getElementById('selected-city-box').innerHTML = `<strong>${esc(currentCity.name)}</strong><br>${esc(currentCity.country || '')}`;
  }

  document.getElementById('create-city-search-btn').addEventListener('click', async () => {
    await searchCities(document.getElementById('create-city-search').value.trim(), document.getElementById('create-city-results'));
  });

  document.getElementById('create-log-btn').addEventListener('click', createAdventureLog);

  const results = document.getElementById('create-city-results');
  const observer = new MutationObserver(() => {
    results.querySelectorAll('.city-pick').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedSearch = citySearchResults[Number(btn.dataset.idx)];
        document.getElementById('log-city').value = selectedSearch.name;
        document.getElementById('selected-city-box').innerHTML = `<strong>${esc(selectedSearch.name)}</strong><br>${esc(selectedSearch.country || '')}`;
      });
    });
  });
  observer.observe(results, { childList: true, subtree: true });
}

async function createAdventureLog() {
  try {
    const cityName = document.getElementById('log-city').value.trim();
    const title = document.getElementById('log-title').value.trim();
    const notes = document.getElementById('log-notes').value.trim();
    const rating = Number(document.getElementById('log-rating').value);
    const visitDate = document.getElementById('log-date').value;
    const isPublic = document.getElementById('log-public').value === 'true';
    const tags = [...document.querySelectorAll('.tag-check:checked')].map(el => el.value);

    if (!selectedSearch || selectedSearch.name.toLowerCase() !== cityName.toLowerCase()) {
      return showToast('Please search and select a real city first.');
    }
    if (!title || !notes || !visitDate) return showToast('Fill in the title, notes, and visit date.');

    const draft = {
      title,
      notes,
      rating,
      visit_date: visitDate,
      tags,
      city_name: selectedSearch.name,
      country_name: selectedSearch.country || '',
      country_code: selectedSearch.country_code || '',
      lat: selectedSearch.latitude,
      lng: selectedSearch.longitude,
      is_public: isPublic,
      upvotes_count: 0,
      comments_count: 0,
      trending_score: 0
    };
    draft.trending_score = trendingScore({ ...draft, created_at: new Date().toISOString() });

    const { error } = await supabase.from(T_LOGS).insert(draft);
    if (error) throw error;

    await loadAppData();
    currentView = 'city';
    await loadCityDetails(selectedSearch);
    showToast('Adventure log published.');
  } catch (e) {
    console.error('createAdventureLog', e);
    showToast('Could not publish your log.');
  }
}

function renderProfile(container) {
  const myLogs = logs.filter(log => log.user_id === currentUser?.id);
  const citiesExplored = [...new Set(myLogs.map(log => log.city_name))];
  const totalUpvotesReceived = myLogs.reduce((sum, log) => sum + Number(log.upvotes_count || 0), 0);
  const rank = getRank(myLogs.length);

  container.innerHTML = `
    <section class="section">
      <div class="profile-hero">
        <div class="profile-card card stamp-card">
          <div class="profile-badge">${rank.badge}</div>
          <h2 style="font-size:1.6rem;">${esc(currentProfile?.display_name || getDisplayName())}</h2>
          <p class="small" style="margin-top:6px;">${esc(currentUser?.email || '')}</p>
          <div class="rank-stamp"><i class="fa-solid ${rank.icon}"></i> ${rank.name}</div>
          <div class="profile-stats">
            <div class="profile-stat"><strong>${myLogs.length}</strong><span>Total logs</span></div>
            <div class="profile-stat"><strong>${citiesExplored.length}</strong><span>Cities explored</span></div>
            <div class="profile-stat"><strong>${totalUpvotesReceived}</strong><span>Upvotes received</span></div>
            <div class="profile-stat"><strong>${bucketList.length}</strong><span>Bucket list</span></div>
          </div>
        </div>

        <div class="bucket-card card stamp-card">
          <div class="section-title"><h2 style="font-size:1.35rem;">Bucket list</h2></div>
          <div class="log-list">
            ${bucketList.length ? bucketList.map(item => `
              <div class="city-result bucket-open" data-city="${esc(item.city_name)}" data-country="${esc(item.country_name || '')}">
                <strong>${esc(item.city_name)}</strong>
                <div class="small">${esc(item.country_name || '')}</div>
              </div>
            `).join('') : '<div class="empty">No saved cities yet.</div>'}
          </div>
        </div>
      </div>

      <div class="section two-col">
        <div class="card stamp-card" style="padding:20px;">
          <div class="section-title"><h2 style="font-size:1.35rem;">My recent logs</h2></div>
          <div class="log-list">
            ${myLogs.length ? myLogs.slice(0, 5).map(log => renderLogCard(log, true)).join('') : '<div class="empty">You have not written any logs yet.</div>'}
          </div>
        </div>
        <div class="card stamp-card" style="padding:20px;">
          <div class="section-title"><h2 style="font-size:1.35rem;">Passport progress</h2></div>
          <div class="log-list">
            <div class="meta-chip">Current rank: ${rank.name}</div>
            <div class="meta-chip">Next milestone: ${myLogs.length < 6 ? '6 logs for Explorer' : myLogs.length < 16 ? '16 logs for Adventurer' : myLogs.length < 31 ? '31 logs for Globetrotter' : 'Top tier reached'}</div>
            <div class="meta-chip">Favorite tags: ${[...new Set(myLogs.flatMap(log => log.tags || []))].slice(0, 4).join(', ') || 'Start tagging logs'}</div>
          </div>
        </div>
      </div>
    </section>
  `;

  container.querySelectorAll('.bucket-open').forEach(btn => {
    btn.addEventListener('click', async () => {
      await selectCityByName(btn.dataset.city, btn.dataset.country);
    });
  });

  bindLogActions(container);
}

function renderStats(container) {
  const publicLogs = getPublicLogs();
  const byCity = [...publicLogs.reduce((map, log) => {
    const key = `${log.city_name}|${log.country_name}`;
    if (!map.has(key)) map.set(key, { city: log.city_name, country: log.country_name, count: 0 });
    map.get(key).count += 1;
    return map;
  }, new Map()).values()].sort((a, b) => b.count - a.count).slice(0, 8);

  const travelers = [...publicLogs.reduce((map, log) => {
    if (!map.has(log.user_id)) map.set(log.user_id, { userId: log.user_id, logs: 0, upvotes: 0 });
    const item = map.get(log.user_id);
    item.logs += 1;
    item.upvotes += Number(log.upvotes_count || 0);
    return map;
  }, new Map()).values()].sort((a, b) => (b.logs + b.upvotes) - (a.logs + a.upvotes)).slice(0, 8);

  const countryCounts = publicLogs.reduce((map, log) => {
    const code = (log.country_code || '').toUpperCase();
    if (!code) return map;
    map[code] = (map[code] || 0) + 1;
    return map;
  }, {});

  container.innerHTML = `
    <section class="section">
      <div class="two-col">
        <div class="stats-card card stamp-card">
          <div class="section-title"><h2>Most explored cities</h2></div>
          <div class="log-list">
            ${byCity.length ? byCity.map((item, idx) => `
              <div class="city-result stats-city-open" data-city="${esc(item.city)}" data-country="${esc(item.country)}">
                <strong>${idx + 1}. ${esc(item.city)}</strong>
                <div class="small">${esc(item.country)} · ${item.count} logs</div>
              </div>
            `).join('') : '<div class="empty">No city data yet.</div>'}
          </div>
        </div>
        <div class="stats-card card stamp-card">
          <div class="section-title"><h2>Most active travelers</h2></div>
          <div class="log-list">
            ${travelers.length ? travelers.map((traveler, idx) => `
              <div class="city-result">
                <strong>${idx + 1}. Traveler ${idx + 1}</strong>
                <div class="small">${traveler.logs} logs · ${traveler.upvotes} upvotes earned</div>
              </div>
            `).join('') : '<div class="empty">No traveler activity yet.</div>'}
          </div>
        </div>
      </div>

      <div class="section heatmap-card card stamp-card">
        <div class="section-title"><h2>World heatmap</h2><p>Log density by country from public adventure logs.</p></div>
        <div class="world-wrap">
          ${renderWorldMap(countryCounts)}
        </div>
        <div class="legend-row">
          <span class="small">Low</span>
          <span class="legend-box" style="background:rgba(255,255,255,0.10)"></span>
          <span class="legend-box" style="background:rgba(31,200,181,0.32)"></span>
          <span class="legend-box" style="background:rgba(31,200,181,0.52)"></span>
          <span class="legend-box" style="background:rgba(255,179,138,0.72)"></span>
          <span class="legend-box" style="background:rgba(255,127,110,0.92)"></span>
          <span class="small">High</span>
        </div>
      </div>
    </section>
  `;

  container.querySelectorAll('.stats-city-open').forEach(btn => {
    btn.addEventListener('click', async () => {
      await selectCityByName(btn.dataset.city, btn.dataset.country);
    });
  });
}

function renderWorldMap(countryCounts) {
  const max = Math.max(1, ...Object.values(countryCounts));
  const heatClass = code => {
    const count = countryCounts[code] || 0;
    if (count === 0) return 'hot-0';
    const ratio = count / max;
    if (ratio < 0.26) return 'hot-1';
    if (ratio < 0.51) return 'hot-2';
    if (ratio < 0.76) return 'hot-3';
    return 'hot-4';
  };
  return `
    <svg class="world-map" viewBox="0 0 1100 620" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="World heatmap">
      <rect x="0" y="0" width="1100" height="620" fill="rgba(255,255,255,0.02)" rx="24" />
      ${WORLD_REGIONS.map(region => `<path class="land ${heatClass(region.code)}" d="${region.path}"><title>${region.name}: ${countryCounts[region.code] || 0} logs</title></path>`).join('')}
    </svg>
  `;
}

function openCityPickerModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-card card stamp-card">
      <div class="section-title"><h2 style="font-size:1.4rem;">Pick a city</h2></div>
      <div class="city-search-row">
        <input class="input" id="modal-city-input" placeholder="Search city">
        <button class="btn btn-primary" id="modal-city-search">Search</button>
      </div>
      <div class="city-results" id="modal-city-results"></div>
      <div style="margin-top:14px; display:flex; justify-content:flex-end;">
        <button class="btn btn-ghost" id="close-city-modal">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.getElementById('close-city-modal').addEventListener('click', () => modal.remove());
  document.getElementById('modal-city-search').addEventListener('click', async () => {
    await searchCities(document.getElementById('modal-city-input').value.trim(), document.getElementById('modal-city-results'));
  });
}

function openCommentModal(logId) {
  const log = logs.find(item => item.id === logId);
  if (!log) return;
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-card card stamp-card">
      <div class="section-title"><h2 style="font-size:1.4rem;">Comment on ${esc(log.title)}</h2></div>
      <textarea class="textarea" id="comment-text" placeholder="Share a tip, memory, or reaction..."></textarea>
      <div style="margin-top:14px; display:flex; gap:10px; justify-content:flex-end;">
        <button class="btn btn-ghost" id="comment-cancel">Cancel</button>
        <button class="btn btn-primary" id="comment-submit">Post comment</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.getElementById('comment-cancel').addEventListener('click', () => modal.remove());
  document.getElementById('comment-submit').addEventListener('click', async () => {
    const text = document.getElementById('comment-text').value.trim();
    if (!text) return showToast('Write a comment first.');
    try {
      const { error } = await supabase.from(T_COMMENTS).insert({
        log_id: logId,
        log_owner_id: log.user_id,
        comment_text: text
      });
      if (error) throw error;
      await supabase.from(T_LOGS).update({
        comments_count: (log.comments_count || 0) + 1,
        trending_score: trendingScore({ ...log, comments_count: (log.comments_count || 0) + 1 })
      }).eq('id', logId);
      await loadAppData();
      modal.remove();
      renderAppShell();
      showToast('Comment posted.');
    } catch (e) {
      console.error('comment', e);
      showToast('Could not post comment.');
    }
  });
}

function subscribeRealtime() {
  supabase.channel('wandermap-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: T_LOGS }, async () => {
      await loadAppData();
      if (currentScreen === 'app') renderAppShell();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: T_UPVOTES }, async () => {
      await loadAppData();
      if (currentScreen === 'app') renderAppShell();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: T_COMMENTS }, async () => {
      await loadAppData();
      if (currentScreen === 'app') renderAppShell();
    })
    .subscribe();
}

async function init() {
  try {
    await fetchApod();
    renderLoading();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      currentUser = user;
      await ensureAppUser(user);
      await loadAppData();
      renderAppShell();
      subscribeRealtime();
    } else {
      renderSignUp();
      subscribeRealtime();
    }
  } catch (e) {
    console.error('init', e);
    renderSignUp();
  }
}

init();
