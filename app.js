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
  const [logsRes, commentsRes, upvotesRes, profilesRes, bucketRes] = await Promise.all([
    supabase.from(TABLES.logs).select('*').order('created_at', { ascending: false }),
    supabase.from(TABLES.comments).select('*').order('created_at', { ascending: false }),
    supabase.from(TABLES.upvotes).select('*'),
    supabase.from(TABLES.appUsers).select('*'),
    supabase.from(TABLES.bucketList).select('*').order('created_at', { ascending: false })
  ])

  state.logs = logsRes.data || []
  state.comments = commentsRes.data || []
  state.upvotes = upvotesRes.data || []
  state.profiles = profilesRes.data || []
  state.bucketList = bucketRes.data || []
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
        <p class="subtitle">Track cities, weather, country facts, and adventure logs from travelers around the world.</p>
        <form id="auth-form" class="form-stack" style="margin-top:18px;">
          <div>
            <label class="label">Email</label>
            <input class="input" type="email" name="email" required ${state.authBusy ? 'disabled' : ''}>
          </div>
          <div>
            <label class="label">Password</label>
            <input class="input" type="password" name="password" required minlength="6" ${state.authBusy ? 'disabled' : ''}>
          </div>
          <div class="auth-error">${escapeHtml(state.authError)}</div>
          <button class="btn btn-primary" type="submit" style="width:100%;" ${state.authBusy ? 'disabled' : ''}>${state.authBusy ? escapeHtml(state.authMessage || 'Working...') : state.authMode === 'signup' ? 'Create account' : 'Sign in'}</button>
        </form>
        <button id="switch-auth" class="auth-switch" ${state.authBusy ? 'disabled' : ''}>${state.authMode === 'signup' ? 'Already have an account? <strong>Sign in</strong>' : 'Need an account? <strong>Sign up</strong>'}</button>
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
        <p class="subtitle">We sent a confirmation link to <strong>${escapeHtml(state.pendingEmail)}</strong>. Open it, then come back and sign in.</p>
        <button id="go-signin" class="btn btn-primary" style="width:100%; margin-top:18px;">Go to sign in</button>
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
          <p class="subtitle" style="text-align:left; margin-top:12px;">We are loading your traveler profile, city discovery tools, and live weather.</p>
        </div>
      </div>
    </div>
  `
}

function renderTopbar() {
  const mySummary = state.user ? travelerSummary(state.user.id) : { totalLogs: 0, rank: rankFor(0) }
  return `
    <div class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <div class="brand-icon"><i class="fa-solid fa-route"></i></div>
          <div>
            <h1>WanderMap</h1>
            <p>${escapeHtml(state.selectedCity?.city_name || DEFAULT_CITY.city_name)}, ${escapeHtml(state.selectedCountry?.name || DEFAULT_CITY.country_name)}</p>
          </div>
        </div>
        <div class="top-actions">
          <span class="meta-chip"><i class="${mySummary.rank.icon}"></i> ${escapeHtml(mySummary.rank.name)}</span>
          <button class="btn btn-secondary" id="sign-out">Sign out</button>
        </div>
      </div>
      <div class="nav-tabs">
        ${[
          ['home', 'Home'],
          ['city', 'City'],
          ['new-log', 'New Log'],
          ['bucket', 'Bucket'],
          ['stats', 'Stats']
        ].map(([key, label]) => `<button class="nav-tab ${state.nav === key ? 'active' : ''}" data-nav="${key}">${label}</button>`).join('')}
      </div>
    </div>
  `
}

function renderLogCard(log, expanded = false) {
  const author = profileFor(log.user_id)
  const comments = commentsForLog(log.id)
  const upvotes = upvoteCountForLog(log.id)
  return `
    <div class="card log-card stamp-card">
      <div class="log-head">
        <div>
          <div class="kicker">${escapeHtml(log.country_code || '')} - ${escapeHtml(log.city_name || '')}</div>
          <h3>${escapeHtml(log.title || 'Untitled log')}</h3>
          <div class="log-city">by ${escapeHtml(author?.display_name || author?.email || 'Traveler')} - ${fmtDate(log.visit_date)} - posted ${fmtDateTime(log.created_at)}</div>
        </div>
        <div class="meta-chip">${Number(log.rating || 0)}/5</div>
      </div>
      <p class="log-notes">${escapeHtml(log.notes || '')}</p>
      <div class="tag-row">${(Array.isArray(log.tags) ? log.tags : []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
      <div class="meta-row">
        <span class="meta-chip">Trending ${trendingScore(log).toFixed(1)}</span>
        <span class="meta-chip">${upvotes} upvotes</span>
        <span class="meta-chip">${comments.length} comments</span>
      </div>
      <div class="meta-row">
        <button class="btn btn-secondary toggle-upvote" data-log-id="${log.id}">${hasUpvoted(log.id) ? 'Upvoted' : 'Upvote'}</button>
        <button class="btn btn-secondary open-log" data-log-id="${log.id}">Open</button>
        <button class="btn btn-ghost open-profile" data-user-id="${log.user_id}">Traveler</button>
      </div>
      ${expanded ? `
        <div style="margin-top:16px; border-top:1px solid rgba(255,255,255,0.08); padding-top:16px;">
          <form class="comment-form form-stack" data-log-id="${log.id}">
            <div>
              <label class="label">Comment</label>
              <textarea class="textarea" name="comment_text" placeholder="Share a tip, question, or reaction."></textarea>
            </div>
            <button class="btn btn-primary" type="submit">Post comment</button>
          </form>
          <div class="comment-list" style="display:grid; gap:10px; margin-top:16px;">
            ${comments.length ? comments.map(comment => `
              <div class="card" style="padding:14px; border-radius:18px; background:rgba(255,255,255,0.04);">
                <strong>${escapeHtml(comment.profile?.display_name || comment.profile?.email || 'Traveler')}</strong>
                <div class="log-city">${fmtDateTime(comment.created_at)}</div>
                <p class="log-notes" style="margin-top:8px;">${escapeHtml(comment.comment_text || '')}</p>
              </div>
            `).join('') : `<div class="meta-chip">No comments yet.</div>`}
          </div>
        </div>
      ` : ''}
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
            <h1 class="hero-title">Find the cities travelers cannot stop talking about.</h1>
            <p class="hero-copy">Search a city, fetch live country and weather data, post public adventure logs, and climb the passport ranks from Tourist to Globetrotter.</p>
            <div class="hero-actions">
              <button class="btn btn-primary" data-nav="city">Explore a city</button>
              <button class="btn btn-secondary" data-nav="new-log">Write a log</button>
              <button class="btn btn-ghost" data-nav="stats">See global stats</button>
            </div>
            <div class="mini-stats">
              <div class="stat-pill"><strong>${state.logs.length}</strong><span>Adventure logs</span></div>
              <div class="stat-pill"><strong>${state.bucketList.length}</strong><span>Bucket list saves</span></div>
              <div class="stat-pill"><strong>${state.profiles.length}</strong><span>Travelers</span></div>
            </div>
          </div>
          <div class="card hero-side stamp-card">
            <div class="kicker">Selected city</div>
            <h3 style="margin-top:10px; font-size:1.4rem;">${escapeHtml(state.selectedCity?.city_name || DEFAULT_CITY.city_name)}</h3>
            <p class="hero-copy">${escapeHtml(state.selectedCountry?.name || DEFAULT_CITY.country_name)} - Population ${Number(state.selectedCountry?.population || 0).toLocaleString()}</p>
            <div class="meta-row">
              <span class="meta-chip">Currency: ${escapeHtml(state.selectedCountry?.currencies || '-')}</span>
              <span class="meta-chip">Languages: ${escapeHtml(state.selectedCountry?.languages || '-')}</span>
            </div>
            <div class="meta-row">
              <span class="meta-chip">Now ${state.selectedWeather?.current ? `${Math.round(state.selectedWeather.current.temperature_2m)} deg` : '-'}</span>
              <span class="meta-chip">${escapeHtml(weatherLabel(state.selectedWeather?.current?.weather_code))}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-title"><div><h2>Trending logs</h2><p>Most upvoted and fastest-rising stories across all cities.</p></div></div>
        <div class="grid feed-grid">
          <div class="log-list">
            ${trending.length ? trending.map(log => renderLogCard(log)).join('') : `<div class="card log-card">No logs yet. Be the first traveler to post.</div>`}
          </div>
          <div class="side-stack">
            <div class="card stats-card stamp-card">
              <div class="section-title"><div><h2 style="font-size:1.3rem;">Search a city</h2><p>Pull real data from Open-Meteo and REST Countries.</p></div></div>
              <div class="city-search-row">
                <input id="city-search-input" class="input" placeholder="Search Paris, Tokyo, Nairobi..." value="${escapeHtml(state.cityQuery)}">
                <button id="city-search-btn" class="btn btn-primary">Search</button>
              </div>
              <div class="city-results">
                ${state.cityResults.length ? state.cityResults.map((city, index) => `<button class="city-result select-city" data-city-index="${index}"><strong>${escapeHtml(city.city_name)}</strong><div class="log-city">${escapeHtml(city.admin1 ? `${city.admin1}, ` : '')}${escapeHtml(city.country_name)}</div></button>`).join('') : `<div class="meta-chip">Search for a city to load live data.</div>`}
              </div>
            </div>
            <div class="card stats-card stamp-card">
              <div class="section-title"><div><h2 style="font-size:1.3rem;">Most active travelers</h2><p>Passport leaders right now.</p></div></div>
              ${active.length ? active.map(item => `<div style="padding:12px 0; border-top:1px solid rgba(255,255,255,0.08);"><strong>${escapeHtml(item.profile.display_name || item.profile.email || 'Traveler')}</strong><div class="log-city">${item.totalLogs} logs - ${item.cityCount} cities - ${item.upvotesReceived} upvotes</div></div>`).join('') : `<div class="meta-chip">No traveler activity yet.</div>`}
            </div>
          </div>
        </div>
      </section>
    </div>
  `
}

function renderCityPage() {
  const city = state.selectedCity || DEFAULT_CITY
  const country = state.selectedCountry || { name: DEFAULT_CITY.country_name, code: DEFAULT_CITY.country_code, population: 0, currencies: '-', languages: '-', flag: DEFAULT_CITY.country_code }
  const weather = state.selectedWeather
  const cityLogs = logsForCity(city.city_name, city.country_code)
  return `
    <div class="page-shell section">
      <div class="city-layout">
        <div class="card city-banner stamp-card" id="city-banner">
          <div class="parallax-layer parallax-grid"></div>
          <div class="parallax-layer parallax-compass"><i class="fa-solid fa-compass"></i></div>
          <div class="city-banner-content">
            <div class="kicker">${escapeHtml(country.flag || '')} ${escapeHtml(country.code || '')}</div>
            <h1 class="hero-title">${escapeHtml(city.city_name)}</h1>
            <p class="hero-copy">${escapeHtml(country.name)} - ${escapeHtml(weatherLabel(weather?.current?.weather_code))} - ${weather?.current ? `${Math.round(weather.current.temperature_2m)} deg now` : 'Live weather unavailable'}</p>
          </div>
        </div>
        <div class="side-stack">
          <div class="card stats-card stamp-card">
            <div class="section-title"><div><h2 style="font-size:1.3rem;">Country info</h2><p>Live facts from REST Countries.</p></div></div>
            <div class="info-grid">
              <div class="info-box"><strong>${Number(country.population || 0).toLocaleString()}</strong><span>Population</span></div>
              <div class="info-box"><strong>${escapeHtml(country.currencies || '-')}</strong><span>Currency</span></div>
              <div class="info-box"><strong>${escapeHtml(country.languages || '-')}</strong><span>Languages</span></div>
              <div class="info-box"><strong>${escapeHtml(country.code || '-')}</strong><span>Country code</span></div>
            </div>
          </div>
          <div class="card stats-card stamp-card">
            <div class="section-title"><div><h2 style="font-size:1.3rem;">7-day forecast</h2><p>Live weather from Open-Meteo.</p></div></div>
            <div class="forecast-grid">
              ${(weather?.daily?.time || []).slice(0, 7).map((day, idx) => `
                <div class="forecast-card">
                  <strong>${fmtDate(day)}</strong>
                  <div class="log-city">${escapeHtml(weatherLabel(weather.daily.weather_code?.[idx]))}</div>
                  <div class="meta-row" style="margin-top:8px;">
                    <span class="meta-chip">High ${Math.round(weather.daily.temperature_2m_max?.[idx] || 0)} deg</span>
                    <span class="meta-chip">Low ${Math.round(weather.daily.temperature_2m_min?.[idx] || 0)} deg</span>
                  </div>
                </div>
              `).join('') || `<div class="meta-chip">Forecast unavailable.</div>`}
            </div>
          </div>
          <div class="card bucket-card stamp-card">
            <div class="section-title"><div><h2 style="font-size:1.3rem;">Bucket list</h2><p>Save this city for later.</p></div></div>
            <form id="bucket-form" class="form-stack">
              <div>
                <label class="label">Notes</label>
                <textarea class="textarea" name="notes" placeholder="Why do you want to visit this city?"></textarea>
              </div>
              <button class="btn btn-primary" type="submit">Save city</button>
            </form>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title"><div><h2>Adventure logs in ${escapeHtml(city.city_name)}</h2><p>Public traveler stories for this city.</p></div></div>
        <div class="log-list">
          ${cityLogs.length ? cityLogs.map(log => renderLogCard(log, state.currentLogId === log.id)).join('') : `<div class="card log-card">No city logs yet. Write the first one.</div>`}
        </div>
      </div>
    </div>
  `
}

function renderNewLog() {
  const city = state.selectedCity || DEFAULT_CITY
  return `
    <div class="page-shell section">
      <div class="grid feed-grid">
        <div class="card form-card stamp-card">
          <div class="section-title"><div><h2>Create an adventure log</h2><p>Journal your experience for the selected city.</p></div></div>
          <form id="log-form" class="form-stack">
            <div class="city-search-row">
              <input id="city-search-input" class="input" placeholder="Search city before posting" value="${escapeHtml(state.cityQuery)}">
              <button id="city-search-btn" class="btn btn-secondary" type="button">Search</button>
            </div>
            <div class="city-results">
              ${state.cityResults.length ? state.cityResults.map((item, index) => `<button class="city-result select-city" data-city-index="${index}" type="button"><strong>${escapeHtml(item.city_name)}</strong><div class="log-city">${escapeHtml(item.admin1 ? `${item.admin1}, ` : '')}${escapeHtml(item.country_name)}</div></button>`).join('') : `<div class="meta-chip">Current city: ${escapeHtml(city.city_name)}, ${escapeHtml(city.country_name)}</div>`}
            </div>
            <div>
              <label class="label">Selected city</label>
              <div class="meta-chip" style="display:block; padding:14px 16px;">${escapeHtml(city.city_name)}, ${escapeHtml(city.country_name)} (${escapeHtml(city.country_code)})</div>
            </div>
            <div>
              <label class="label">Title</label>
              <input class="input" name="title" required placeholder="Sunset food crawl through Alfama">
            </div>
            <div>
              <label class="label">Notes</label>
              <textarea class="textarea" name="notes" required placeholder="What did you do, what surprised you, and what should others know?"></textarea>
            </div>
            <div class="info-grid">
              <div>
                <label class="label">Rating</label>
                <select class="select" name="rating">${[1,2,3,4,5].map(n => `<option value="${n}">${n}</option>`).join('')}</select>
              </div>
              <div>
                <label class="label">Visit date</label>
                <input class="input" type="date" name="visit_date" required>
              </div>
            </div>
            <div>
              <label class="label">Tags</label>
              <div class="tag-row">
                ${TAGS.map(tag => `<label class="tag"><input type="checkbox" name="tags" value="${tag}" style="margin-right:8px;">${tag}</label>`).join('')}
              </div>
            </div>
            <button class="btn btn-primary" type="submit">Publish adventure log</button>
          </form>
        </div>
        <div class="side-stack">
          <div class="card stats-card stamp-card">
            <div class="section-title"><div><h2 style="font-size:1.3rem;">Current city context</h2><p>Live data attached to your next log.</p></div></div>
            <div class="meta-row">
              <span class="meta-chip">${escapeHtml(city.city_name)}</span>
              <span class="meta-chip">${escapeHtml(state.selectedCountry?.name || city.country_name)}</span>
            </div>
            <div class="meta-row">
              <span class="meta-chip">Population ${Number(state.selectedCountry?.population || 0).toLocaleString()}</span>
              <span class="meta-chip">${state.selectedWeather?.current ? `${Math.round(state.selectedWeather.current.temperature_2m)} deg now` : 'Weather unavailable'}</span>
            </div>
          </div>
          <div class="card stats-card stamp-card">
            <div class="section-title"><div><h2 style="font-size:1.3rem;">Recent city logs</h2><p>What other travelers posted here.</p></div></div>
            ${logsForCity(city.city_name, city.country_code).slice(0, 4).map(log => `<div style="padding:12px 0; border-top:1px solid rgba(255,255,255,0.08);"><strong>${escapeHtml(log.title)}</strong><div class="log-city">${Number(log.rating || 0)}/5 - ${fmtDate(log.visit_date)}</div></div>`).join('') || `<div class="meta-chip">No logs yet for this city.</div>`}
          </div>
        </div>
      </div>
    </div>
  `
}

function renderBucket() {
  return `
    <div class="page-shell section">
      <div class="grid feed-grid">
        <div class="card bucket-card stamp-card">
          <div class="section-title"><div><h2>Your bucket list</h2><p>Cities you want to explore next.</p></div></div>
          <div class="log-list">
            ${state.bucketList.length ? state.bucketList.map(item => `
              <div class="card log-card">
                <div class="log-head">
                  <div>
                    <h3>${escapeHtml(item.city_name)}</h3>
                    <div class="log-city">${escapeHtml(item.country_name)} - ${escapeHtml(item.country_code || '')}</div>
                  </div>
                  <div class="meta-chip">${fmtDate(item.created_at)}</div>
                </div>
                <p class="log-notes">${escapeHtml(item.notes || 'No notes yet.')}</p>
              </div>
            `).join('') : `<div class="card log-card">No saved cities yet.</div>`}
          </div>
        </div>
        <div class="side-stack">
          <div class="card stats-card stamp-card">
            <div class="section-title"><div><h2 style="font-size:1.3rem;">Quick add current city</h2><p>Save the city you are viewing now.</p></div></div>
            <div class="meta-row">
              <span class="meta-chip">${escapeHtml(state.selectedCity?.city_name || DEFAULT_CITY.city_name)}</span>
              <span class="meta-chip">${escapeHtml(state.selectedCountry?.name || DEFAULT_CITY.country_name)}</span>
            </div>
            <button class="btn btn-primary" id="quick-save-city" style="margin-top:14px;">Save current city</button>
          </div>
        </div>
      </div>
    </div>
  `
}

function renderHeatmapSvg() {
  const counts = logsByCountry()
  const max = Math.max(1, ...Object.values(counts))
  const regions = [
    { code: 'US', label: 'North America', x: 40, y: 70, w: 100, h: 50 },
    { code: 'BR', label: 'South America', x: 110, y: 150, w: 70, h: 90 },
    { code: 'GB', label: 'Europe', x: 250, y: 55, w: 65, h: 45 },
    { code: 'NG', label: 'Africa', x: 255, y: 125, w: 85, h: 100 },
    { code: 'IN', label: 'Asia', x: 350, y: 85, w: 130, h: 95 },
    { code: 'AU', label: 'Oceania', x: 470, y: 190, w: 80, h: 45 }
  ]
  return `
    <svg viewBox="0 0 600 320" width="100%" height="320" role="img" aria-label="World log density heatmap">
      <rect x="0" y="0" width="600" height="320" rx="28" fill="rgba(255,255,255,0.03)"></rect>
      ${regions.map(region => {
        const value = counts[region.code] || 0
        const alpha = 0.12 + (value / max) * 0.78
        return `
          <g>
            <rect x="${region.x}" y="${region.y}" width="${region.w}" height="${region.h}" rx="18" fill="rgba(255,127,110,${alpha.toFixed(2)})" stroke="rgba(255,255,255,0.12)"></rect>
            <text x="${region.x + 12}" y="${region.y + 24}" fill="#eef8f7" font-size="14" font-family="Outfit">${region.label}</text>
            <text x="${region.x + 12}" y="${region.y + 46}" fill="#ffd9c8" font-size="12" font-family="Outfit">${value} log${value === 1 ? '' : 's'}</text>
          </g>
        `
      }).join('')}
    </svg>
  `
}

function renderStats() {
  const cities = mostExploredCities(8)
  const travelers = mostActiveTravelers(8)
  return `
    <div class="page-shell section">
      <div class="grid feed-grid">
        <div class="side-stack">
          <div class="card stats-card stamp-card">
            <div class="section-title"><div><h2>Most explored cities</h2><p>Where the community is logging the most adventures.</p></div></div>
            ${cities.length ? cities.map(item => `<div style="padding:12px 0; border-top:1px solid rgba(255,255,255,0.08);"><strong>${escapeHtml(item.city_name)}</strong><div class="log-city">${escapeHtml(item.country_name)} - ${item.count} logs</div></div>`).join('') : `<div class="meta-chip">No city data yet.</div>`}
          </div>
          <div class="card stats-card stamp-card">
            <div class="section-title"><div><h2>Most active travelers</h2><p>Ranked by logs and upvotes received.</p></div></div>
            ${travelers.length ? travelers.map(item => `<div style="padding:12px 0; border-top:1px solid rgba(255,255,255,0.08);"><strong>${escapeHtml(item.profile.display_name || item.profile.email || 'Traveler')}</strong><div class="log-city">${item.totalLogs} logs - ${item.cityCount} cities - ${item.upvotesReceived} upvotes - ${escapeHtml(item.rank.name)}</div></div>`).join('') : `<div class="meta-chip">No traveler stats yet.</div>`}
          </div>
        </div>
        <div class="card heatmap-card stamp-card">
          <div class="section-title"><div><h2>World heatmap</h2><p>Simple SVG view of log density by country region.</p></div></div>
          ${renderHeatmapSvg()}
        </div>
      </div>
    </div>
  `
}

function renderProfile() {
  const userId = state.currentProfileUserId || state.user?.id
  if (!userId) return ''
  const profile = profileFor(userId)
  const summary = travelerSummary(userId)
  return `
    <div class="page-shell section">
      <div class="grid feed-grid">
        <div class="card profile-card stamp-card">
          <div class="kicker">Traveler profile</div>
          <h1 class="hero-title">${escapeHtml(profile?.display_name || profile?.email || 'Traveler')}</h1>
          <p class="hero-copy">${escapeHtml(profile?.email || '')}</p>
          <div class="meta-row">
            <span class="meta-chip"><i class="${summary.rank.icon}"></i> ${escapeHtml(summary.rank.name)}</span>
            <span class="meta-chip">${summary.cityCount} cities explored</span>
            <span class="meta-chip">${summary.totalLogs} logs</span>
            <span class="meta-chip">${summary.upvotesReceived} upvotes received</span>
          </div>
        </div>
        <div class="card stats-card stamp-card">
          <div class="section-title"><div><h2>Recent logs</h2><p>Latest entries from this traveler.</p></div></div>
          ${summary.userLogs.length ? summary.userLogs.slice(0, 6).map(log => `<div style="padding:12px 0; border-top:1px solid rgba(255,255,255,0.08);"><strong>${escapeHtml(log.title)}</strong><div class="log-city">${escapeHtml(log.city_name)}, ${escapeHtml(log.country_name)} - ${fmtDate(log.visit_date)}</div></div>`).join('') : `<div class="meta-chip">No logs yet.</div>`}
        </div>
      </div>
    </div>
  `
}

function renderApp() {
  let content = ''
  if (state.nav === 'home') content = renderHome()
  if (state.nav === 'city') content = renderCityPage()
  if (state.nav === 'new-log') content = renderNewLog()
  if (state.nav === 'bucket') content = renderBucket()
  if (state.nav === 'stats') content = renderStats()
  if (state.nav === 'profile') content = renderProfile()

  return `
    ${renderTopbar()}
    ${state.notice ? `<div class="page-shell" style="padding-top:14px;"><div class="card" style="padding:14px 18px; border-radius:18px; background:rgba(255,127,110,0.14); border:1px solid rgba(255,127,110,0.22);">${escapeHtml(state.notice)}</div></div>` : ''}
    ${content}
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
  const banner = document.getElementById('city-banner')
  if (!banner || banner.dataset.bound === 'true') return
  banner.dataset.bound = 'true'
  banner.addEventListener('mousemove', event => {
    try {
      const rect = banner.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width - 0.5
      const y = (event.clientY - rect.top) / rect.height - 0.5
      const grid = banner.querySelector('.parallax-grid')
      const compass = banner.querySelector('.parallax-compass')
      if (grid) grid.style.transform = `translate(${x * 10}px, ${y * 10}px)`
      if (compass) compass.style.transform = `translate(${x * 18}px, ${y * 18}px)`
    } catch (error) {
      console.error('Parallax error:', error?.message)
    }
  })
}

const handleAuthSubmit = safeRun(async event => {
  event.preventDefault()
  if (state.authBusy) return
  const form = new FormData(event.currentTarget)
  const email = String(form.get('email') || '').trim().toLowerCase()
  const password = String(form.get('password') || '').trim()
  state.authError = ''
  state.authBusy = true
  state.authMessage = state.authMode === 'signup' ? 'Creating account...' : 'Signing in...'
  render()

  try {
    if (state.authMode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://sling-gogiapp.web.app/email-confirmed.html'
        }
      })

      if (error && /already been registered|user already registered/i.test(error.message || '')) {
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

      if (data?.session?.user) {
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
  const city = state.selectedCity || DEFAULT_CITY
  const payload = {
    city_name: city.city_name,
    country_name: state.selectedCountry?.name || city.country_name,
    country_code: city.country_code,
    title: String(form.get('title') || '').trim(),
    notes: String(form.get('notes') || '').trim(),
    rating: Number(form.get('rating') || 0),
    visit_date: String(form.get('visit_date') || ''),
    tags: form.getAll('tags'),
    is_public: true,
    upvotes_count: 0
  }
  if (!payload.title || !payload.notes) {
    toast('Add a title and notes before publishing.')
    return
  }
  const { error } = await supabase.from(TABLES.logs).insert(payload)
  if (error) throw error
  await loadData()
  state.nav = 'city'
  toast('Adventure log published.')
  render()
})

const saveBucketCity = safeRun(async notes => {
  const city = state.selectedCity || DEFAULT_CITY
  const payload = {
    city_name: city.city_name,
    country_name: state.selectedCountry?.name || city.country_name,
    country_code: city.country_code,
    notes: String(notes || '').trim()
  }
  const { error } = await supabase.from(TABLES.bucketList).insert(payload)
  if (error) throw error
  await loadData()
  toast('City saved to your bucket list.')
  render()
})

const saveBucketFromForm = safeRun(async event => {
  event.preventDefault()
  const form = new FormData(event.currentTarget)
  await saveBucketCity(String(form.get('notes') || ''))
  event.currentTarget.reset()
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

const saveComment = safeRun(async event => {
  event.preventDefault()
  const logId = event.currentTarget.dataset.logId
  const form = new FormData(event.currentTarget)
  const commentText = String(form.get('comment_text') || '').trim()
  if (!commentText) {
    toast('Write a comment first.')
    return
  }
  const { error } = await supabase.from(TABLES.comments).insert({ log_id: logId, comment_text: commentText })
  if (error) throw error
  await loadData()
  event.currentTarget.reset()
  toast('Comment posted.')
  render()
})

function bindEvents() {
  try {
    document.getElementById('auth-form')?.addEventListener('submit', handleAuthSubmit)
    document.getElementById('switch-auth')?.addEventListener('click', () => {
      if (state.authBusy) return
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
    document.getElementById('city-search-btn')?.addEventListener('click', () => {
      const input = document.getElementById('city-search-input')
      state.cityQuery = input?.value || ''
      searchCities(state.cityQuery)
    })
    document.getElementById('city-search-input')?.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault()
        state.cityQuery = event.currentTarget.value || ''
        searchCities(state.cityQuery)
      }
    })
    document.getElementById('log-form')?.addEventListener('submit', saveLog)
    document.getElementById('bucket-form')?.addEventListener('submit', saveBucketFromForm)
    document.getElementById('quick-save-city')?.addEventListener('click', () => saveBucketCity('Saved from current city view.'))

    document.querySelectorAll('[data-nav]').forEach(button => button.addEventListener('click', () => {
      state.nav = button.dataset.nav
      if (state.nav === 'city' && !state.selectedCity) {
        ensureDefaultCityLoaded()
      }
      if (state.nav === 'profile') {
        state.currentProfileUserId = state.user?.id || null
      }
      render()
    }))

    document.querySelectorAll('.select-city').forEach(button => button.addEventListener('click', () => {
      const city = state.cityResults[Number(button.dataset.cityIndex)]
      if (city) selectCity(city)
    }))

    document.querySelectorAll('.toggle-upvote').forEach(button => button.addEventListener('click', () => toggleUpvote(button.dataset.logId)))
    document.querySelectorAll('.open-log').forEach(button => button.addEventListener('click', () => {
      state.currentLogId = state.currentLogId === button.dataset.logId ? null : button.dataset.logId
      if (state.nav !== 'city') state.nav = 'city'
      render()
    }))
    document.querySelectorAll('.open-profile').forEach(button => button.addEventListener('click', () => {
      state.currentProfileUserId = button.dataset.userId
      state.nav = 'profile'
      render()
    }))
    document.querySelectorAll('.comment-form').forEach(form => form.addEventListener('submit', saveComment))
  } catch (error) {
    console.error('Bind error:', error?.message, error?.stack)
  }
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

async function init() {
  try {
    state.screen = 'loading'
    render()
    await fetchNASA()
    const { data: { session } } = await supabase.auth.getSession()
    await enterAppWithSession(session)
    setupRealtime()
    render()
  } catch (error) {
    console.error('Init error:', error?.message, error?.stack)
    state.screen = 'auth'
    render()
  }
}

init()
