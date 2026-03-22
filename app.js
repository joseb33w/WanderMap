import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://xhhmxabftbyxrirvvihn.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_NZHoIxqqpSvVBP8MrLHCYA_gmg1AbN-'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

const TABLES = {
  appUsers: 'uNMexs7BYTXQ2_wandermap_app_users',
  logs: 'uNMexs7BYTXQ2_wandermap_adventure_logs',
  comments: 'uNMexs7BYTXQ2_wandermap_log_comments',
  upvotes: 'uNMexs7BYTXQ2_wandermap_log_upvotes',
  bucketList: 'uNMexs7BYTXQ2_wandermap_bucket_list'
}

const NASA_APOD_URL = 'https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY'
const REST_COUNTRIES_CODE = 'https://restcountries.com/v3.1/alpha/'
const OPEN_METEO_GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search'
const OPEN_METEO_FORECAST = 'https://api.open-meteo.com/v1/forecast'

const RANKS = [
  { max: 5, name: 'Tourist', icon: 'fa-solid fa-stamp' },
  { max: 15, name: 'Explorer', icon: 'fa-solid fa-compass' },
  { max: 30, name: 'Adventurer', icon: 'fa-solid fa-mountain-sun' },
  { max: Infinity, name: 'Globetrotter', icon: 'fa-solid fa-earth-americas' }
]

const TAGS = ['food', 'nightlife', 'culture', 'nature']
const DEFAULT_CITY = {
  city_name: 'Lisbon',
  country_name: 'Portugal',
  country_code: 'PT',
  latitude: 38.7223,
  longitude: -9.1393
}

const state = {
  session: null,
  user: null,
  appUser: null,
  screen: 'loading',
  authMode: 'signin',
  authBusy: false,
  authError: '',
  authMessage: '',
  pendingEmail: '',
  notice: '',
  nav: 'home',
  loadingPhoto: null,
  cityQuery: '',
  cityResults: [],
  selectedCity: null,
  selectedCountry: null,
  selectedWeather: null,
  logs: [],
  comments: [],
  upvotes: [],
  bucketList: [],
  profiles: [],
  currentLogId: null,
  currentProfileUserId: null,
  initializedRealtime: false
}

const app = document.getElementById('app')

const WORLD_PATHS = [
  { code: 'CA', name: 'Canada', d: 'M70 70 L165 52 L230 72 L248 92 L222 112 L178 108 L150 118 L96 108 L70 90 Z' },
  { code: 'US', name: 'United States', d: 'M82 118 L150 112 L214 118 L228 144 L210 164 L168 170 L122 166 L92 152 Z' },
  { code: 'MX', name: 'Mexico', d: 'M132 170 L172 172 L202 188 L190 214 L164 224 L144 208 Z' },
  { code: 'BR', name: 'Brazil', d: 'M252 224 L308 214 L340 236 L334 286 L302 324 L268 304 L248 264 Z' },
  { code: 'AR', name: 'Argentina', d: 'M282 324 L306 330 L312 382 L294 430 L274 404 L270 360 Z' },
  { code: 'GB', name: 'United Kingdom', d: 'M394 96 L410 88 L420 98 L414 118 L398 120 Z' },
  { code: 'ES', name: 'Spain', d: 'M390 154 L430 150 L444 166 L414 180 L388 172 Z' },
  { code: 'FR', name: 'France', d: 'M426 138 L454 136 L466 162 L448 182 L424 170 Z' },
  { code: 'DE', name: 'Germany', d: 'M454 122 L474 122 L482 150 L470 170 L452 158 Z' },
  { code: 'IT', name: 'Italy', d: 'M476 164 L492 172 L500 206 L486 214 L476 192 Z' },
  { code: 'PT', name: 'Portugal', d: 'M378 150 L388 150 L390 176 L380 178 Z' },
  { code: 'NO', name: 'Norway', d: 'M454 70 L470 56 L478 84 L468 114 L452 102 Z' },
  { code: 'SE', name: 'Sweden', d: 'M480 62 L500 66 L500 116 L482 122 Z' },
  { code: 'RU', name: 'Russia', d: 'M500 62 L676 54 L742 88 L720 126 L632 132 L560 118 L516 104 Z' },
  { code: 'TR', name: 'Turkey', d: 'M506 170 L548 168 L570 182 L536 196 L504 190 Z' },
  { code: 'EG', name: 'Egypt', d: 'M504 214 L532 214 L540 252 L510 258 Z' },
  { code: 'NG', name: 'Nigeria', d: 'M466 250 L494 246 L500 276 L476 286 L462 268 Z' },
  { code: 'ZA', name: 'South Africa', d: 'M470 364 L524 360 L538 392 L500 414 L462 398 Z' },
  { code: 'SA', name: 'Saudi Arabia', d: 'M546 198 L592 198 L614 232 L580 258 L548 238 Z' },
  { code: 'IN', name: 'India', d: 'M624 190 L658 194 L676 236 L652 272 L620 246 Z' },
  { code: 'CN', name: 'China', d: 'M652 138 L724 138 L760 180 L734 228 L672 224 L640 190 Z' },
  { code: 'JP', name: 'Japan', d: 'M786 162 L800 172 L796 206 L782 198 Z' },
  { code: 'TH', name: 'Thailand', d: 'M694 248 L716 252 L720 286 L704 298 L692 274 Z' },
  { code: 'ID', name: 'Indonesia', d: 'M706 304 L778 308 L790 326 L742 334 L700 324 Z' },
  { code: 'AU', name: 'Australia', d: 'M726 352 L816 356 L842 404 L804 436 L728 420 L706 382 Z' },
  { code: 'NZ', name: 'New Zealand', d: 'M850 430 L866 444 L860 470 L844 456 Z' }
]

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function toast(message) {
  state.notice = message
  render()
  setTimeout(() => {
    if (state.notice === message) {
      state.notice = ''
      render()
    }
  }, 2600)
}

function safeRun(fn, fallbackMessage = 'Something went wrong.') {
  return async (...args) => {
    try {
      return await fn(...args)
    } catch (error) {
      console.error('Error:', error?.message, error?.stack)
      toast(error?.message || fallbackMessage)
    }
  }
}

function fmtDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function normalizeAuthMessage(message = '') {
  const text = String(message || '')
  if (/invalid login credentials/i.test(text)) return 'Incorrect email or password.'
  if (/email not confirmed/i.test(text)) return 'Please check your email and click the confirmation link first.'
  if (/already been registered|user already registered/i.test(text)) return 'That email already has an account. Try signing in.'
  return text || 'Authentication failed.'
}

function rankFor(logCount) {
  return RANKS.find(rank => logCount <= rank.max) || RANKS[RANKS.length - 1]
}

function cityKey(cityName, countryCode) {
  return `${String(cityName || '').trim().toLowerCase()}::${String(countryCode || '').trim().toUpperCase()}`
}

function profileFor(userId) {
  return state.profiles.find(profile => profile.user_id === userId) || null
}

function commentsForLog(logId) {
  return state.comments
    .filter(comment => comment.log_id === logId)
    .map(comment => ({ ...comment, profile: profileFor(comment.user_id) }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

function upvoteCountForLog(logId) {
  return state.upvotes.filter(item => item.log_id === logId).length
}

function hasUpvoted(logId) {
  return !!state.user && state.upvotes.some(item => item.log_id === logId && item.user_id === state.user.id)
}

function logsForCity(cityName, countryCode) {
  const key = cityKey(cityName, countryCode)
  return state.logs.filter(log => cityKey(log.city_name, log.country_code) === key && log.is_public !== false)
}

function trendingScore(log) {
  const upvotes = upvoteCountForLog(log.id)
  const comments = commentsForLog(log.id).length
  const rating = Number(log.rating || 0)
  const ageHours = Math.max(1, (Date.now() - new Date(log.created_at).getTime()) / 36e5)
  return upvotes * 4 + comments * 2 + rating * 1.5 + Math.max(0, 72 - ageHours) * 0.08
}

function topTrendingLogs(limit = 10) {
  return [...state.logs]
    .filter(log => log.is_public !== false)
    .sort((a, b) => trendingScore(b) - trendingScore(a))
    .slice(0, limit)
}

function travelerSummary(userId) {
  const userLogs = state.logs.filter(log => log.user_id === userId)
  const cities = new Set(userLogs.map(log => cityKey(log.city_name, log.country_code)))
  const upvotesReceived = userLogs.reduce((sum, log) => sum + upvoteCountForLog(log.id), 0)
  const rank = rankFor(userLogs.length)
  return {
    userLogs,
    cityCount: cities.size,
    totalLogs: userLogs.length,
    upvotesReceived,
    rank
  }
}

function mostExploredCities(limit = 8) {
  const counts = {}
  state.logs.forEach(log => {
    const key = cityKey(log.city_name, log.country_code)
    if (!counts[key]) {
      counts[key] = {
        city_name: log.city_name,
        country_name: log.country_name,
        country_code: log.country_code,
        count: 0
      }
    }
    counts[key].count += 1
  })
  return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, limit)
}

function mostActiveTravelers(limit = 8) {
  return state.profiles
    .map(profile => {
      const summary = travelerSummary(profile.user_id)
      return { profile, ...summary }
    })
    .sort((a, b) => (b.totalLogs + b.upvotesReceived) - (a.totalLogs + a.upvotesReceived))
    .slice(0, limit)
}

function logsByCountry() {
  const counts = {}
  state.logs.forEach(log => {
    const code = String(log.country_code || '').toUpperCase()
    if (!code) return
    counts[code] = (counts[code] || 0) + 1
  })
  return counts
}

function weatherLabel(code) {
  if (code == null) return 'Unknown'
  if ([0].includes(code)) return 'Clear'
  if ([1, 2].includes(code)) return 'Mostly clear'
  if ([3].includes(code)) return 'Cloudy'
  if ([45, 48].includes(code)) return 'Fog'
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return 'Rain'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow'
  if ([95, 96, 99].includes(code)) return 'Storm'
  return 'Mixed'
}

function clampText(value = '', max = 220) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max).trim()}...` : text
}

function cleanBucketNotes(value = '') {
  const text = String(value || '').trim()
  if (!text) return ''
  if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
    try {
      const parsed = JSON.parse(text)
      if (typeof parsed === 'string') return clampText(parsed, 180)
      if (parsed?.notes) return clampText(parsed.notes, 180)
      if (parsed?.description) return clampText(parsed.description, 180)
      if (parsed?.city_name || parsed?.country_name) {
        return clampText([parsed.city_name, parsed.country_name, parsed.notes || parsed.description].filter(Boolean).join(' - '), 180)
      }
      return 'Saved destination'
    } catch {
      return clampText(text, 180)
    }
  }
  return clampText(text, 180)
}

function heatColor(count, maxCount) {
  if (!count) return '#103c40'
  const ratio = Math.max(0, Math.min(1, count / Math.max(maxCount, 1)))
  if (ratio < 0.2) return '#15565b'
  if (ratio < 0.4) return '#1c7b7b'
  if (ratio < 0.6) return '#25a79f'
  if (ratio < 0.8) return '#ff9a79'
  return '#ff6f61'
}

function renderWorldHeatmapSvg() {
  const counts = logsByCountry()
  const values = Object.values(counts)
  const maxCount = values.length ? Math.max(...values) : 1
  const paths = WORLD_PATHS.map(item => {
    const count = counts[item.code] || 0
    const fill = heatColor(count, maxCount)
    const label = `${item.name}: ${count} log${count === 1 ? '' : 's'}`
    return `<path class="world-country" d="${item.d}" fill="${fill}" data-count="${count}"><title>${escapeHtml(label)}</title></path>`
  }).join('')

  return `
    <div class="world-heatmap-wrap">
      <svg class="world-heatmap-svg" viewBox="0 0 900 500" role="img" aria-label="World heatmap of adventure log density by country">
        <rect x="0" y="0" width="900" height="500" rx="28" fill="rgba(255,255,255,0.02)"></rect>
        <g class="world-grid-lines">
          <path d="M40 120 H860"></path>
          <path d="M40 250 H860"></path>
          <path d="M40 380 H860"></path>
        </g>
        <g class="world-map-group">${paths}</g>
      </svg>
      <div class="heat-legend">
        <span>Low</span>
        <div class="heat-legend-bar"></div>
        <span>High</span>
      </div>
    </div>
  `
}

async function fetchNASA() {
  try {
    const response = await fetch(NASA_APOD_URL)
    const data = await response.json()
    state.loadingPhoto = data
  } catch (error) {
    console.error('NASA error:', error?.message)
  }
}

async function searchCities(query) {
  const term = String(query || '').trim()
  if (!term) {
    state.cityResults = []
    render()
    return
  }
  const response = await fetch(`${OPEN_METEO_GEOCODE}?name=${encodeURIComponent(term)}&count=8&language=en&format=json`)
  const data = await response.json()
  state.cityResults = (data?.results || []).map(item => ({
    city_name: item.name,
    country_name: item.country,
    country_code: item.country_code,
    latitude: item.latitude,
    longitude: item.longitude,
    admin1: item.admin1 || ''
  }))
  render()
}

async function fetchCountryByCode(code) {
  if (!code) return null
  const response = await fetch(`${REST_COUNTRIES_CODE}${encodeURIComponent(code)}`)
  const data = await response.json()
  return Array.isArray(data) ? data[0] : data
}

async function fetchWeather(lat, lon) {
  const url = `${OPEN_METEO_FORECAST}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,apparent_temperature,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`
  const response = await fetch(url)
  return response.json()
}

async function selectCity(city) {
  state.selectedCity = city
  const [country, weather] = await Promise.all([
    fetchCountryByCode(city.country_code),
    fetchWeather(city.latitude, city.longitude)
  ])

  state.selectedCountry = country ? {
    name: country.name?.common || city.country_name,
    code: country.cca2 || city.country_code,
    population: country.population || 0,
    currencies: Object.values(country.currencies || {}).map(item => item.name).join(', ') || '-',
    languages: Object.values(country.languages || {}).join(', ') || '-',
    flag: country.flag || city.country_code
  } : {
    name: city.country_name,
    code: city.country_code,
    population: 0,
    currencies: '-',
    languages: '-',
    flag: city.country_code
  }

  state.selectedWeather = weather
  state.nav = 'city'
  render()
}

async function ensureDefaultCityLoaded() {
  if (state.selectedCity) return
  await selectCity(DEFAULT_CITY)
}

async function ensureAppUser(user) {
  if (!user?.id) return null
  const { data: existing } = await supabase
    .from(TABLES.appUsers)
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    state.appUser = existing
    return existing
  }

  const payload = {
    user_id: user.id,
    email: user.email,
    display_name: user.email?.split('@')[0] || 'Traveler',
    home_city: '',
    avatar_icon: 'fa-solid fa-compass'
  }

  const { data, error } = await supabase
    .from(TABLES.appUsers)
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  state.appUser = data
  return data
}

async function loadData() {
  const [logsRes, commentsRes, upvotesRes, bucketRes, profilesRes] = await Promise.all([
    supabase.from(TABLES.logs).select('*').order('created_at', { ascending: false }),
    supabase.from(TABLES.comments).select('*').order('created_at', { ascending: false }),
    supabase.from(TABLES.upvotes).select('*'),
    supabase.from(TABLES.bucketList).select('*').order('created_at', { ascending: false }),
    supabase.from(TABLES.appUsers).select('*')
  ])

  state.logs = logsRes.data || []
  state.comments = commentsRes.data || []
  state.upvotes = upvotesRes.data || []
  state.bucketList = bucketRes.data || []
  state.profiles = profilesRes.data || []
}

async function enterAppWithSession(session) {
  state.session = session || null
  state.user = session?.user || null

  if (!state.user) {
    state.appUser = null
    state.screen = 'auth'
    state.nav = 'home'
    render()
    return
  }

  await ensureAppUser(state.user)
  await loadData()
  await ensureDefaultCityLoaded()
  state.screen = 'app'
  render()
}

function renderAuth() {
  return `
    <div class="auth-wrap">
      <div class="card auth-card stamp-card">
        <div class="brand-mark"><i class="fa-solid fa-compass-drafting"></i></div>
        <h1 class="title">WanderMap</h1>
        <p class="subtitle">Discover cities, log adventures, and see what travelers are exploring around the world.</p>
        <form id="auth-form" class="form-stack" style="margin-top:18px;">
          <div>
            <label class="label">Email</label>
            <input class="input" type="email" name="email" required ${state.authBusy ? 'disabled' : ''}>
          </div>
          <div>
            <label class="label">Password</label>
            <input class="input" type="password" name="password" required minlength="6" ${state.authBusy ? 'disabled' : ''}>
          </div>
          <div class="auth-error">${escapeHtml(state.authError || '')}</div>
          <button class="btn btn-primary" type="submit" style="width:100%;" ${state.authBusy ? 'disabled' : ''}>${state.authBusy ? (state.authMessage || 'Working...') : state.authMode === 'signup' ? 'Create account' : 'Sign in'}</button>
        </form>
        <button class="auth-switch" id="switch-auth">${state.authMode === 'signup' ? 'Already have an account? <strong>Sign in</strong>' : 'Need an account? <strong>Sign up</strong>'}</button>
      </div>
    </div>
  `
}

function renderCheckEmail() {
  return `
    <div class="auth-wrap">
      <div class="card auth-card stamp-card">
        <div class="brand-mark"><i class="fa-solid fa-envelope-open-text"></i></div>
        <h1 class="title">Check your email</h1>
        <p class="subtitle">We sent a confirmation link to <strong>${escapeHtml(state.pendingEmail || '')}</strong>. Open it, then come back and sign in.</p>
        <button class="btn btn-primary" id="go-signin" style="width:100%; margin-top:18px;">Go to sign in</button>
      </div>
    </div>
  `
}

function renderLoading() {
  return `
    <div class="loading-screen">
      <div class="card loading-card stamp-card">
        <div class="loading-media" style="background-image:url('${escapeHtml(state.loadingPhoto?.url || '')}')">
          <div class="loading-overlay"></div>
        </div>
        <div class="loading-copy">
          <div class="kicker">Daily space photo</div>
          <h1 class="title" style="text-align:left;">Loading WanderMap</h1>
          <p class="subtitle" style="text-align:left;">Bringing in city data, weather, traveler stories, and your world exploration stats.</p>
        </div>
      </div>
    </div>
  `
}

function renderTopbar() {
  const summary = state.user ? travelerSummary(state.user.id) : { rank: rankFor(0) }
  return `
    <div class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <div class="brand-icon"><i class="fa-solid fa-earth-americas"></i></div>
          <div>
            <h1>WanderMap</h1>
            <p>${escapeHtml(state.selectedCity?.city_name || DEFAULT_CITY.city_name)}, ${escapeHtml(state.selectedCountry?.name || DEFAULT_CITY.country_name)}</p>
          </div>
        </div>
        <div class="top-actions">
          <span class="meta-chip"><i class="${summary.rank.icon}"></i> ${summary.rank.name}</span>
          <button class="btn btn-secondary" id="sign-out">Sign out</button>
        </div>
      </div>
      <div class="nav-tabs">
        ${['home', 'city', 'create', 'bucket', 'stats', 'profile'].map(tab => `<button class="nav-tab ${state.nav === tab ? 'active' : ''}" data-nav="${tab}">${tab.charAt(0).toUpperCase() + tab.slice(1)}</button>`).join('')}
      </div>
    </div>
  `
}

function renderLogCard(log, compact = false) {
  const profile = profileFor(log.user_id)
  const commentCount = commentsForLog(log.id).length
  const upvotes = upvoteCountForLog(log.id)
  const notes = clampText(log.notes || '', compact ? 140 : 260)
  return `
    <div class="card log-card stamp-card">
      <div class="log-head">
        <div>
          <div class="kicker">${escapeHtml(log.city_name || 'Unknown city')}</div>
          <h3>${escapeHtml(log.title || 'Adventure log')}</h3>
          <div class="log-city">${escapeHtml(log.country_name || '')} � ${fmtDate(log.visit_date || log.created_at)} � by ${escapeHtml(profile?.display_name || 'Traveler')}</div>
        </div>
        <div class="meta-chip">${Number(log.rating || 0)} / 5</div>
      </div>
      <p class="log-notes">${escapeHtml(notes)}</p>
      <div class="tag-row">${(log.tags || []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
      <div class="meta-row">
        <span class="meta-chip">${upvotes} upvotes</span>
        <span class="meta-chip">${commentCount} comments</span>
        <span class="meta-chip">Trending ${trendingScore(log).toFixed(1)}</span>
      </div>
      <div class="meta-row">
        <button class="btn btn-secondary open-log" data-log-id="${log.id}">Open</button>
        ${state.user ? `<button class="btn btn-secondary toggle-upvote" data-log-id="${log.id}">${hasUpvoted(log.id) ? 'Upvoted' : 'Upvote'}</button>` : ''}
      </div>
    </div>
  `
}

function renderHome() {
  const trending = topTrendingLogs(8)
  const active = mostActiveTravelers(5)
  return `
    <div class="page-shell">
      <section class="hero">
        <div class="hero-grid">
          <div class="card hero-main stamp-card">
            <div class="kicker">Adventure discovery feed</div>
            <h1 class="hero-title">See where travelers are leaving their mark.</h1>
            <p class="hero-copy">Browse trending adventure logs, discover rising cities, and jump into a live city page with weather, country facts, and public stories.</p>
            <div class="hero-actions">
              <button class="btn btn-primary" data-nav="create">Create a log</button>
              <button class="btn btn-secondary" data-nav="city">Open city page</button>
              <button class="btn btn-secondary" data-nav="stats">View world stats</button>
            </div>
            <div class="mini-stats">
              <div class="stat-pill"><strong>${state.logs.length}</strong><span>Public logs</span></div>
              <div class="stat-pill"><strong>${state.bucketList.length}</strong><span>Bucket list saves</span></div>
              <div class="stat-pill"><strong>${state.profiles.length}</strong><span>Travelers</span></div>
            </div>
          </div>
          <div class="card hero-side stamp-card city-search-card">
            <div class="kicker">Find a city</div>
            <div class="city-search-row" style="margin-top:12px;">
              <input class="input" id="city-search-input" placeholder="Search any city" value="${escapeHtml(state.cityQuery || '')}">
              <button class="btn btn-primary" id="city-search-btn">Search</button>
            </div>
            <div class="city-results">
              ${state.cityResults.length ? state.cityResults.map(city => `<button class="city-result select-city" data-city='${escapeHtml(JSON.stringify(city))}'><strong>${escapeHtml(city.city_name)}</strong><div class="log-city">${escapeHtml(city.country_name)}${city.admin1 ? ` � ${escapeHtml(city.admin1)}` : ''}</div></button>`).join('') : `<div class="meta-chip">Search for a city to load live weather and country info.</div>`}
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-title"><div><h2>Trending now</h2><p>Sorted by upvotes, comments, rating, and freshness.</p></div></div>
        <div class="grid feed-grid">
          <div class="log-list">
            ${trending.length ? trending.map(log => renderLogCard(log)).join('') : `<div class="card log-card">No public logs yet. Be the first to share an adventure.</div>`}
          </div>
          <div class="side-stack">
            <div class="card stats-card stamp-card">
              <div class="section-title"><div><h2>Top travelers</h2><p>Most active profiles right now.</p></div></div>
              ${active.length ? active.map(item => `<div class="meta-row" style="justify-content:space-between; align-items:center;"><div><strong>${escapeHtml(item.profile.display_name || item.profile.email || 'Traveler')}</strong><div class="log-city">${item.totalLogs} logs � ${item.upvotesReceived} upvotes</div></div><button class="btn btn-secondary open-profile" data-user-id="${item.profile.user_id}">Profile</button></div>`).join('') : `<div class="meta-chip">Traveler rankings will appear here.</div>`}
            </div>
            <div class="card heatmap-card stamp-card">
              <div class="section-title"><div><h2>World heatmap</h2><p>Adventure log density by country.</p></div></div>
              ${renderWorldHeatmapSvg()}
            </div>
          </div>
        </div>
      </section>
    </div>
  `
}

function renderCityPage() {
  const city = state.selectedCity || DEFAULT_CITY
  const country = state.selectedCountry || { name: city.country_name, flag: city.country_code, population: 0, currencies: '-', languages: '-' }
  const weather = state.selectedWeather
  const cityLogs = logsForCity(city.city_name, city.country_code)
  return `
    <div class="page-shell section">
      <div class="city-layout">
        <div class="card city-banner stamp-card" id="city-banner">
          <div class="parallax-layer parallax-grid"></div>
          <div class="parallax-layer parallax-compass"><i class="fa-solid fa-compass-drafting"></i></div>
          <div class="city-banner-content">
            <div class="kicker">${escapeHtml(country.flag || city.country_code)}</div>
            <h1 class="hero-title">${escapeHtml(city.city_name)}</h1>
            <p class="hero-copy">${escapeHtml(country.name)} � Population ${Number(country.population || 0).toLocaleString()} � ${escapeHtml(country.currencies || '-')} � ${escapeHtml(country.languages || '-')}</p>
            <div class="meta-row">
              <span class="meta-chip">${weather?.current ? `${Math.round(weather.current.temperature_2m)} degrees` : 'Weather loading'}</span>
              <span class="meta-chip">${weather?.current ? weatherLabel(weather.current.weather_code) : 'Forecast pending'}</span>
              <span class="meta-chip">${weather?.current ? `Wind ${Math.round(weather.current.wind_speed_10m || 0)} km/h` : 'Live weather'}</span>
            </div>
          </div>
        </div>
        <div class="side-stack">
          <div class="card stats-card stamp-card">
            <div class="section-title"><div><h2>7 day forecast</h2><p>Open-Meteo daily outlook.</p></div></div>
            ${(weather?.daily?.time || []).slice(0, 7).map((day, index) => `<div class="meta-row" style="justify-content:space-between;"><span>${fmtDate(day)}</span><span>${Math.round(weather.daily.temperature_2m_max[index])} / ${Math.round(weather.daily.temperature_2m_min[index])}</span><span>${weatherLabel(weather.daily.weather_code[index])}</span></div>`).join('') || `<div class="meta-chip">Forecast unavailable.</div>`}
          </div>
          <div class="card bucket-card stamp-card">
            <div class="section-title"><div><h2>Bucket list</h2><p>Save this city for later.</p></div></div>
            <button class="btn btn-primary" id="save-current-city">Save ${escapeHtml(city.city_name)}</button>
          </div>
        </div>
      </div>

      <section class="section">
        <div class="section-title"><div><h2>Adventure logs in ${escapeHtml(city.city_name)}</h2><p>Public traveler stories for this city.</p></div></div>
        <div class="log-list">
          ${cityLogs.length ? cityLogs.map(log => renderLogCard(log)).join('') : `<div class="card log-card">No logs for this city yet. Start the story.</div>`}
        </div>
      </section>
    </div>
  `
}

function renderCreatePage() {
  const city = state.selectedCity || DEFAULT_CITY
  return `
    <div class="page-shell section">
      <div class="grid feed-grid">
        <div class="card form-card stamp-card">
          <div class="section-title"><div><h2>Create adventure log</h2><p>Journal a city experience with rating, date, and tags.</p></div></div>
          <form id="log-form" class="form-stack">
            <div><label class="label">Title</label><input class="input" name="title" required placeholder="Sunset tram ride and hidden cafe"></div>
            <div><label class="label">City</label><input class="input" name="city_name" value="${escapeHtml(city.city_name)}" required></div>
            <div><label class="label">Country</label><input class="input" name="country_name" value="${escapeHtml(city.country_name)}" required></div>
            <div><label class="label">Country code</label><input class="input" name="country_code" value="${escapeHtml(city.country_code)}" required></div>
            <div class="meta-row" style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div><label class="label">Visit date</label><input class="input" type="date" name="visit_date"></div>
              <div><label class="label">Rating</label><select class="select" name="rating">${[1,2,3,4,5].map(n => `<option value="${n}">${n}</option>`).join('')}</select></div>
            </div>
            <div>
              <label class="label">Tags</label>
              <div class="tag-row">${TAGS.map(tag => `<label class="tag"><input type="checkbox" name="tags" value="${tag}" style="margin-right:8px;">${tag}</label>`).join('')}</div>
            </div>
            <div><label class="label">Notes</label><textarea class="textarea" name="notes" placeholder="What stood out, where you went, what you would recommend, and how the city felt."></textarea></div>
            <button class="btn btn-primary" type="submit">Publish log</button>
          </form>
        </div>
        <div class="side-stack">
          <div class="card stats-card stamp-card">
            <div class="section-title"><div><h2>Current city context</h2><p>Live data for your selected destination.</p></div></div>
            <div class="meta-row"><span class="meta-chip">${escapeHtml(city.city_name)}</span><span class="meta-chip">${escapeHtml(city.country_name)}</span></div>
            <div class="meta-row"><span class="meta-chip">Lat ${Number(city.latitude || 0).toFixed(2)}</span><span class="meta-chip">Lon ${Number(city.longitude || 0).toFixed(2)}</span></div>
          </div>
        </div>
      </div>
    </div>
  `
}

function renderBucketPage() {
  return `
    <div class="page-shell section">
      <div class="card bucket-card stamp-card">
        <div class="section-title"><div><h2>Bucket list</h2><p>Saved cities you want to explore next.</p></div></div>
        <div class="log-list">
          ${state.bucketList.length ? state.bucketList.map(item => `
            <div class="card log-card stamp-card">
              <div class="log-head">
                <div>
                  <div class="kicker">${escapeHtml(item.city_name || 'Saved city')}</div>
                  <h3>${escapeHtml(item.country_name || '')}</h3>
                  <div class="log-city">Saved ${fmtDate(item.created_at)}</div>
                </div>
              </div>
              <p class="log-notes">${escapeHtml(cleanBucketNotes(item.notes || ''))}</p>
              <div class="meta-row">
                <span class="meta-chip">${Number(item.latitude || 0).toFixed(2)}, ${Number(item.longitude || 0).toFixed(2)}</span>
              </div>
            </div>
          `).join('') : `<div class="card log-card">No saved cities yet.</div>`}
        </div>
      </div>
    </div>
  `
}

function renderStatsPage() {
  const cities = mostExploredCities(8)
  const travelers = mostActiveTravelers(8)
  return `
    <div class="page-shell section">
      <div class="grid feed-grid">
        <div class="side-stack">
          <div class="card stats-card stamp-card">
            <div class="section-title"><div><h2>Most explored cities</h2><p>Where the community logs the most adventures.</p></div></div>
            ${cities.length ? cities.map(item => `<div class="meta-row" style="justify-content:space-between;"><span>${escapeHtml(item.city_name)}, ${escapeHtml(item.country_name)}</span><span class="meta-chip">${item.count} logs</span></div>`).join('') : `<div class="meta-chip">No city stats yet.</div>`}
          </div>
          <div class="card stats-card stamp-card">
            <div class="section-title"><div><h2>Most active travelers</h2><p>Leaderboard by logs and upvotes.</p></div></div>
            ${travelers.length ? travelers.map(item => `<div class="meta-row" style="justify-content:space-between;"><span>${escapeHtml(item.profile.display_name || item.profile.email || 'Traveler')}</span><span class="meta-chip">${item.totalLogs} logs � ${item.upvotesReceived} upvotes</span></div>`).join('') : `<div class="meta-chip">No traveler stats yet.</div>`}
          </div>
        </div>
        <div class="card heatmap-card stamp-card">
          <div class="section-title"><div><h2>World heatmap</h2><p>Real SVG world map shaded by log density.</p></div></div>
          ${renderWorldHeatmapSvg()}
        </div>
      </div>
    </div>
  `
}

function renderProfilePage() {
  const userId = state.currentProfileUserId || state.user?.id
  if (!userId) return `<div class="page-shell section"><div class="card profile-card">Sign in to view a traveler profile.</div></div>`
  const profile = profileFor(userId)
  const summary = travelerSummary(userId)
  return `
    <div class="page-shell section">
      <div class="grid feed-grid">
        <div class="card profile-card stamp-card">
          <div class="kicker">Traveler profile</div>
          <h1 class="hero-title">${escapeHtml(profile?.display_name || 'Traveler')}</h1>
          <p class="hero-copy">${escapeHtml(profile?.email || '')}</p>
          <div class="meta-row">
            <span class="meta-chip"><i class="${summary.rank.icon}"></i> ${summary.rank.name}</span>
            <span class="meta-chip">${summary.cityCount} cities explored</span>
            <span class="meta-chip">${summary.totalLogs} logs</span>
            <span class="meta-chip">${summary.upvotesReceived} upvotes received</span>
          </div>
        </div>
        <div class="card stats-card stamp-card">
          <div class="section-title"><div><h2>Recent logs</h2><p>Latest public entries from this traveler.</p></div></div>
          <div class="log-list">
            ${summary.userLogs.length ? summary.userLogs.slice(0, 6).map(log => renderLogCard(log, true)).join('') : `<div class="meta-chip">No logs yet.</div>`}
          </div>
        </div>
      </div>
    </div>
  `
}

function renderLogDetail() {
  const log = state.logs.find(item => item.id === state.currentLogId)
  if (!log) return `<div class="page-shell section"><div class="card log-card">Log not found.</div></div>`
  const profile = profileFor(log.user_id)
  const comments = commentsForLog(log.id)
  return `
    <div class="page-shell section">
      <div class="card log-card stamp-card">
        <div class="log-head">
          <div>
            <div class="kicker">${escapeHtml(log.city_name)}</div>
            <h1 class="hero-title" style="font-size:2.3rem;">${escapeHtml(log.title || 'Adventure log')}</h1>
            <div class="log-city">${escapeHtml(log.country_name || '')} � ${fmtDate(log.visit_date || log.created_at)} � by ${escapeHtml(profile?.display_name || 'Traveler')}</div>
          </div>
          <div class="meta-chip">${Number(log.rating || 0)} / 5</div>
        </div>
        <p class="hero-copy">${escapeHtml(log.notes || '')}</p>
        <div class="tag-row">${(log.tags || []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
        <div class="meta-row">
          <button class="btn btn-secondary toggle-upvote" data-log-id="${log.id}">${hasUpvoted(log.id) ? 'Upvoted' : 'Upvote'}</button>
          <span class="meta-chip">${upvoteCountForLog(log.id)} upvotes</span>
          <span class="meta-chip">${comments.length} comments</span>
        </div>
      </div>
      <div class="grid feed-grid" style="margin-top:16px;">
        <div class="card form-card stamp-card">
          <div class="section-title"><div><h2>Add comment</h2><p>Share a tip or reaction.</p></div></div>
          <form id="comment-form" class="form-stack">
            <textarea class="textarea" name="comment_text" placeholder="What would you tell the next traveler?"></textarea>
            <button class="btn btn-primary" type="submit">Post comment</button>
          </form>
        </div>
        <div class="card stats-card stamp-card">
          <div class="section-title"><div><h2>Comments</h2><p>Community reactions.</p></div></div>
          <div class="log-list">
            ${comments.length ? comments.map(comment => `<div class="card log-card"><strong>${escapeHtml(comment.profile?.display_name || 'Traveler')}</strong><div class="log-city">${fmtDateTime(comment.created_at)}</div><p class="log-notes">${escapeHtml(clampText(comment.comment_text || '', 220))}</p></div>`).join('') : `<div class="meta-chip">No comments yet.</div>`}
          </div>
        </div>
      </div>
    </div>
  `
}

function renderApp() {
  if (!state.user) return renderAuth()
  let body = ''
  if (state.nav === 'home') body = renderHome()
  if (state.nav === 'city') body = renderCityPage()
  if (state.nav === 'create') body = renderCreatePage()
  if (state.nav === 'bucket') body = renderBucketPage()
  if (state.nav === 'stats') body = renderStatsPage()
  if (state.nav === 'profile') body = renderProfilePage()
  if (state.nav === 'log') body = renderLogDetail()
  return `
    ${renderTopbar()}
    ${state.notice ? `<div class="page-shell" style="padding-top:14px;"><div class="card" style="padding:14px 18px;">${escapeHtml(state.notice)}</div></div>` : ''}
    ${body}
  `
}

function render() {
  if (state.screen === 'loading') app.innerHTML = renderLoading()
  else if (state.screen === 'auth') app.innerHTML = renderAuth()
  else if (state.screen === 'check-email') app.innerHTML = renderCheckEmail()
  else app.innerHTML = renderApp()
  bindEvents()
  attachParallax()
}

function attachParallax() {
  const hero = document.getElementById('city-banner')
  if (!hero || hero.dataset.bound === 'true') return
  hero.dataset.bound = 'true'
  hero.addEventListener('mousemove', event => {
    try {
      const rect = hero.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width - 0.5
      const y = (event.clientY - rect.top) / rect.height - 0.5
      hero.querySelectorAll('.parallax-layer').forEach((layer, index) => {
        const factor = (index + 1) * 10
        layer.style.transform = `translate(${x * factor}px, ${y * factor}px)`
      })
    } catch (error) {
      console.error('Parallax error:', error?.message)
    }
  })
}

const handleAuthSubmit = safeRun(async event => {
  event.preventDefault()
  const form = new FormData(event.currentTarget)
  const email = String(form.get('email') || '').trim().toLowerCase()
  const password = String(form.get('password') || '').trim()
  state.authBusy = true
  state.authError = ''
  state.authMessage = state.authMode === 'signup' ? 'Creating account...' : 'Signing in...'
  render()

  try {
    if (state.authMode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: 'https://sling-gogiapp.web.app/email-confirmed.html' }
      })

      if (error && /already been registered|user already registered/i.test(error.message)) {
        const signIn = await supabase.auth.signInWithPassword({ email, password })
        if (signIn.error) {
          state.authError = normalizeAuthMessage(signIn.error.message)
          return
        }
        await enterAppWithSession(signIn.data.session)
        return
      }

      if (error) {
        state.authError = normalizeAuthMessage(error.message)
        return
      }

      if (data?.session) {
        await enterAppWithSession(data.session)
        return
      }

      state.pendingEmail = email
      state.authMode = 'signin'
      state.screen = 'check-email'
      render()
      return
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      state.authError = normalizeAuthMessage(error.message)
      return
    }
    await enterAppWithSession(data.session)
  } finally {
    state.authBusy = false
    state.authMessage = ''
    render()
  }
})

const signOut = safeRun(async () => {
  await supabase.auth.signOut()
  await enterAppWithSession(null)
})

const saveLog = safeRun(async event => {
  event.preventDefault()
  const form = new FormData(event.currentTarget)
  const payload = {
    title: String(form.get('title') || '').trim(),
    city_name: String(form.get('city_name') || '').trim(),
    country_name: String(form.get('country_name') || '').trim(),
    country_code: String(form.get('country_code') || '').trim().toUpperCase(),
    visit_date: String(form.get('visit_date') || '').trim() || null,
    rating: Number(form.get('rating') || 0),
    notes: String(form.get('notes') || '').trim(),
    tags: form.getAll('tags'),
    is_public: true
  }
  const { error } = await supabase.from(TABLES.logs).insert(payload)
  if (error) throw error
  await loadData()
  state.nav = 'home'
  toast('Adventure log published.')
  render()
})

const saveComment = safeRun(async event => {
  event.preventDefault()
  const form = new FormData(event.currentTarget)
  const commentText = String(form.get('comment_text') || '').trim()
  if (!commentText) {
    toast('Write a comment first.')
    return
  }
  const { error } = await supabase.from(TABLES.comments).insert({
    log_id: state.currentLogId,
    comment_text: commentText
  })
  if (error) throw error
  await loadData()
  toast('Comment posted.')
  render()
})

const toggleUpvote = safeRun(async logId => {
  const existing = state.upvotes.find(item => item.log_id === logId && item.user_id === state.user?.id)
  if (existing) {
    const { error } = await supabase.from(TABLES.upvotes).delete().eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from(TABLES.upvotes).insert({ log_id: logId })
    if (error) throw error
  }
  await loadData()
  render()
})

const saveCurrentCityToBucket = safeRun(async () => {
  const city = state.selectedCity || DEFAULT_CITY
  const payload = {
    city_name: city.city_name,
    country_name: state.selectedCountry?.name || city.country_name,
    latitude: city.latitude,
    longitude: city.longitude,
    notes: `Saved from ${city.city_name}`
  }
  const { error } = await supabase.from(TABLES.bucketList).insert(payload)
  if (error) throw error
  await loadData()
  toast(`${city.city_name} saved to bucket list.`)
  render()
})

function bindEvents() {
  document.getElementById('auth-form')?.addEventListener('submit', handleAuthSubmit)
  document.getElementById('switch-auth')?.addEventListener('click', () => {
    state.authMode = state.authMode === 'signup' ? 'signin' : 'signup'
    state.authError = ''
    render()
  })
  document.getElementById('go-signin')?.addEventListener('click', () => {
    state.screen = 'auth'
    state.authMode = 'signin'
    state.authError = ''
    render()
  })
  document.getElementById('sign-out')?.addEventListener('click', signOut)
  document.getElementById('log-form')?.addEventListener('submit', saveLog)
  document.getElementById('comment-form')?.addEventListener('submit', saveComment)
  document.getElementById('city-search-btn')?.addEventListener('click', () => {
    state.cityQuery = document.getElementById('city-search-input')?.value || ''
    searchCities(state.cityQuery)
  })
  document.getElementById('city-search-input')?.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault()
      state.cityQuery = event.currentTarget.value || ''
      searchCities(state.cityQuery)
    }
  })
  document.getElementById('save-current-city')?.addEventListener('click', saveCurrentCityToBucket)

  document.querySelectorAll('[data-nav]').forEach(btn => btn.addEventListener('click', () => {
    state.nav = btn.dataset.nav
    render()
  }))

  document.querySelectorAll('.select-city').forEach(btn => btn.addEventListener('click', () => {
    try {
      const city = JSON.parse(btn.dataset.city)
      selectCity(city)
    } catch (error) {
      console.error('City parse error:', error?.message)
    }
  }))

  document.querySelectorAll('.open-log').forEach(btn => btn.addEventListener('click', () => {
    state.currentLogId = btn.dataset.logId
    state.nav = 'log'
    render()
  }))

  document.querySelectorAll('.open-profile').forEach(btn => btn.addEventListener('click', () => {
    state.currentProfileUserId = btn.dataset.userId
    state.nav = 'profile'
    render()
  }))

  document.querySelectorAll('.toggle-upvote').forEach(btn => btn.addEventListener('click', () => toggleUpvote(btn.dataset.logId)))
}

function setupRealtime() {
  if (state.initializedRealtime) return
  state.initializedRealtime = true
  supabase.channel('wandermap-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.logs }, async () => { await loadData(); render() })
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.comments }, async () => { await loadData(); render() })
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.upvotes }, async () => { await loadData(); render() })
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.bucketList }, async () => { await loadData(); render() })
    .subscribe()
}

function setupAuthListener() {
  supabase.auth.onAuthStateChange(async (_event, session) => {
    try {
      await enterAppWithSession(session)
    } catch (error) {
      console.error('Auth state error:', error?.message)
    }
  })
}

async function init() {
  try {
    state.screen = 'loading'
    render()
    await fetchNASA()
    setupAuthListener()
    const { data: { session } } = await supabase.auth.getSession()
    await enterAppWithSession(session)
    await ensureDefaultCityLoaded()
    setupRealtime()
    render()
  } catch (error) {
    console.error('Init error:', error?.message, error?.stack)
    state.screen = 'auth'
    render()
  }
}

init()
