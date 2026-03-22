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

function looksLikeStructuredPayload(text = '') {
  const value = String(text || '').trim()
  if (!value) return false
  if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) return true
  return /"cca2"|"cca3"|"capital"|"altSpellings"|"googleMaps"|"timezones"|"currencies"|"languages"|"latlng"|"translations"|"demonyms"/i.test(value)
}

function cleanBucketNotes(value = '') {
  const text = String(value || '').trim()
  if (!text) return ''
  if (looksLikeStructuredPayload(text)) return ''
  return clampText(text, 180)
}

function defaultBucketNote(item) {
  const parts = [item?.city_name, item?.country_name].filter(Boolean)
  return parts.length ? `Saved trip idea for ${parts.join(', ')}.` : 'Saved destination details.'
}

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  return response.json()
}

async function fetchApod() {
  try {
    const data = await fetchJson(NASA_APOD_URL)
    return {
      title: data?.title || 'Adventure starts here',
      explanation: clampText(data?.explanation || 'Plan your next city story.', 220),
      image: data?.media_type === 'image' ? data?.url : ''
    }
  } catch (error) {
    console.error('APOD error:', error?.message)
    return {
      title: 'Adventure starts here',
      explanation: 'Track favorite cities, save bucket-list destinations, and share quick travel logs.',
      image: ''
    }
  }
}

async function fetchCountry(code) {
  if (!code) return null
  try {
    const data = await fetchJson(`${REST_COUNTRIES_CODE}${encodeURIComponent(code)}`)
    return Array.isArray(data) ? data[0] : data
  } catch (error) {
    console.error('Country fetch error:', error?.message)
    return null
  }
}

async function searchCities(query) {
  const q = String(query || '').trim()
  if (!q) return []
  try {
    const url = `${OPEN_METEO_GEOCODE}?name=${encodeURIComponent(q)}&count=8&language=en&format=json`
    const data = await fetchJson(url)
    return (data?.results || []).map(item => ({
      city_name: item.name,
      country_name: item.country,
      country_code: item.country_code,
      latitude: item.latitude,
      longitude: item.longitude,
      admin1: item.admin1 || ''
    }))
  } catch (error) {
    console.error('City search error:', error?.message)
    return []
  }
}

async function fetchWeather(city) {
  if (!city?.latitude || !city?.longitude) return null
  try {
    const url = `${OPEN_METEO_FORECAST}?latitude=${encodeURIComponent(city.latitude)}&longitude=${encodeURIComponent(city.longitude)}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
    const data = await fetchJson(url)
    return {
      currentTemp: data?.current?.temperature_2m,
      weatherCode: data?.current?.weather_code,
      wind: data?.current?.wind_speed_10m,
      high: data?.daily?.temperature_2m_max?.[0],
      low: data?.daily?.temperature_2m_min?.[0]
    }
  } catch (error) {
    console.error('Weather fetch error:', error?.message)
    return null
  }
}

async function ensureAppUser(user) {
  if (!user?.id) return null

  const { data: existing, error: existingError } = await supabase
    .from(TABLES.appUsers)
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingError && !/no rows returned|pgrst116/i.test(String(existingError.message || ''))) {
    throw existingError
  }

  if (existing) {
    state.appUser = existing
    return existing
  }

  const payload = {
    user_id: user.id,
    email: user.email,
    display_name: user.email?.split('@')[0] || 'Traveler',
    home_city: DEFAULT_CITY.city_name,
    favorite_tag: 'culture'
  }

  const { data, error } = await supabase
    .from(TABLES.appUsers)
    .insert(payload)
    .select()
    .single()

  if (error) {
    const { data: retryExisting } = await supabase
      .from(TABLES.appUsers)
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (retryExisting) {
      state.appUser = retryExisting
      return retryExisting
    }

    if (/row-level security|permission denied/i.test(String(error.message || ''))) {
      state.appUser = payload
      return payload
    }

    throw error
  }

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

  if (logsRes.error) throw logsRes.error
  if (commentsRes.error) throw commentsRes.error
  if (upvotesRes.error) throw upvotesRes.error
  if (bucketRes.error) throw bucketRes.error
  if (profilesRes.error) throw profilesRes.error

  state.logs = logsRes.data || []
  state.comments = commentsRes.data || []
  state.upvotes = upvotesRes.data || []
  state.bucketList = bucketRes.data || []
  state.profiles = profilesRes.data || []
}

function renderAuth() {
  return `
    <div class="auth-wrap">
      <div class="card stamp-card auth-card">
        <div class="brand-mark"><i class="fa-solid fa-earth-europe"></i></div>
        <h1 class="title">WanderMap</h1>
        <p class="subtitle">Track city memories, save future destinations, and share quick travel stories with a clean personal explorer dashboard.</p>
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
          <button class="btn btn-primary" type="submit" style="width:100%;">${state.authBusy ? escapeHtml(state.authMessage || 'Working...') : state.authMode === 'signup' ? 'Create account' : 'Sign in'}</button>
        </form>
        <button class="auth-switch" id="switch-auth">${state.authMode === 'signup' ? 'Already have an account? <strong>Sign in</strong>' : `Don't have an account? <strong>Sign up</strong>`}</button>
      </div>
    </div>
  `
}

function renderLoading() {
  return `
    <div class="loading-screen">
      <div class="card stamp-card loading-card">
        <div class="loading-media" style="background-image:url('${escapeHtml(state.loadingPhoto?.image || '')}')">
          <div class="loading-overlay"></div>
        </div>
        <div class="loading-copy">
          <div class="kicker">Daily inspiration</div>
          <h1 class="title" style="text-align:left;">${escapeHtml(state.loadingPhoto?.title || 'Adventure starts here')}</h1>
          <p class="subtitle" style="text-align:left;">${escapeHtml(state.loadingPhoto?.explanation || 'Loading your city explorer...')}</p>
        </div>
      </div>
    </div>
  `
}

function renderTopbar() {
  const mySummary = travelerSummary(state.user?.id)
  return `
    <div class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <div class="brand-icon"><i class="fa-solid fa-compass"></i></div>
          <div class="brand-copy">
            <h1>WanderMap</h1>
            <p>Track city stories, save future destinations, and revisit where you want to go next.</p>
          </div>
        </div>
        <div class="top-actions">
          <div class="top-summary">
            <span class="meta-chip">${mySummary.totalLogs} logs</span>
            <span class="meta-chip">${state.bucketList.length} saved cities</span>
          </div>
          <button class="btn btn-secondary" id="sign-out">Sign out</button>
        </div>
      </div>
      <div class="nav-tabs">
        ${[
          ['home', 'Home'],
          ['discover', 'Discover'],
          ['bucket', 'Bucket List'],
          ['profile', 'Profile'],
          ['new-log', 'New Log']
        ].map(([key, label]) => `<button class="nav-tab ${state.nav === key ? 'active' : ''}" data-nav="${key}">${label}</button>`).join('')}
      </div>
    </div>
  `
}

function renderHome() {
  const trending = topTrendingLogs(6)
  const activeTravelers = mostActiveTravelers(5)
  return `
    <div class="page-shell">
      <section class="hero">
        <div class="hero-grid">
          <div class="card stamp-card hero-main">
            <div class="kicker">City stories</div>
            <h1 class="hero-title">Keep your travel memories and future trip ideas in one clean place.</h1>
            <p class="hero-copy">Search a city, log what stood out, save destinations for later, and browse what other travelers are sharing right now.</p>
            <div class="hero-actions">
              <button class="btn btn-primary" data-nav="discover">Explore cities</button>
              <button class="btn btn-secondary" data-nav="new-log">Add a log</button>
            </div>
          </div>
          <div class="card stamp-card hero-side">
            <div class="kicker">Your progress</div>
            <div class="mini-stats">
              <div class="stat-pill"><strong>${travelerSummary(state.user?.id).cityCount}</strong><span>Cities logged</span></div>
              <div class="stat-pill"><strong>${travelerSummary(state.user?.id).upvotesReceived}</strong><span>Upvotes earned</span></div>
              <div class="stat-pill"><strong>${travelerSummary(state.user?.id).rank.name}</strong><span>Traveler rank</span></div>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-title">
          <div>
            <h2>Trending logs</h2>
            <p>Popular recent stories from the community.</p>
          </div>
        </div>
        <div class="log-list">
          ${trending.length ? trending.map(renderLogCard).join('') : `<div class="card log-card">No public logs yet.</div>`}
        </div>
      </section>

      <section class="section">
        <div class="section-title">
          <div>
            <h2>Active travelers</h2>
            <p>People sharing the most city stories.</p>
          </div>
        </div>
        <div class="log-list">
          ${activeTravelers.map(item => `
            <div class="card log-card">
              <div class="log-head">
                <div>
                  <h3>${escapeHtml(item.profile?.display_name || 'Traveler')}</h3>
                  <div class="log-city">${escapeHtml(item.rank.name)} � ${item.cityCount} cities</div>
                </div>
                <button class="btn btn-secondary open-profile" data-user-id="${item.profile?.user_id || ''}">Open profile</button>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    </div>
  `
}

function renderLogCard(log) {
  const profile = profileFor(log.user_id)
  return `
    <div class="card log-card stamp-card">
      <div class="log-head">
        <div>
          <h3>${escapeHtml(log.title || 'Untitled log')}</h3>
          <div class="log-city">${escapeHtml(log.city_name || 'Unknown city')}, ${escapeHtml(log.country_name || '')} � by ${escapeHtml(profile?.display_name || 'Traveler')}</div>
        </div>
        <div class="meta-chip">${fmtDate(log.created_at)}</div>
      </div>
      <p class="log-notes">${escapeHtml(clampText(log.notes || '', 280))}</p>
      <div class="tag-row">
        ${(Array.isArray(log.tags) ? log.tags : []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
      </div>
      <div class="meta-row">
        <span class="meta-chip">${upvoteCountForLog(log.id)} upvotes</span>
        <span class="meta-chip">${commentsForLog(log.id).length} comments</span>
        <span class="meta-chip">${Number(log.rating || 0).toFixed(1)} / 5</span>
      </div>
      <div class="hero-actions">
        <button class="btn btn-primary open-log" data-log-id="${log.id}">Open</button>
        <button class="btn btn-secondary toggle-upvote" data-log-id="${log.id}">${hasUpvoted(log.id) ? 'Upvoted' : 'Upvote'}</button>
      </div>
    </div>
  `
}

function renderDiscover() {
  return `
    <div class="page-shell section">
      <div class="grid feed-grid">
        <div class="side-stack">
          <div class="card stamp-card city-search-card">
            <div class="section-title">
              <div>
                <h2>Search a city</h2>
                <p>Pick a place to view weather, country details, and recent public logs.</p>
              </div>
            </div>
            <div class="city-search-row">
              <input class="input" id="city-query" placeholder="Lisbon, Tokyo, Mexico City..." value="${escapeHtml(state.cityQuery)}">
              <button class="btn btn-primary" id="search-city-btn">Search</button>
            </div>
            <div class="city-results">
              ${state.cityResults.map((city, index) => `
                <button class="city-result" data-city-index="${index}">
                  <strong>${escapeHtml(city.city_name)}</strong>
                  <div class="log-city">${escapeHtml(city.admin1 ? `${city.admin1}, ` : '')}${escapeHtml(city.country_name || '')}</div>
                </button>
              `).join('') || `<div class="meta-chip">Search for a city to get started.</div>`}
            </div>
          </div>

          ${state.selectedCity ? renderSelectedCity() : ''}
        </div>

        <div class="side-stack">
          <div class="card stamp-card stats-card">
            <div class="section-title">
              <div>
                <h2>Most explored cities</h2>
                <p>Based on public logs.</p>
              </div>
            </div>
            <div class="log-list">
              ${mostExploredCities().map(city => `
                <div class="card log-card">
                  <strong>${escapeHtml(city.city_name)}</strong>
                  <div class="log-city">${escapeHtml(city.country_name || '')}</div>
                  <div class="meta-row"><span class="meta-chip">${city.count} logs</span></div>
                </div>
              `).join('') || `<div class="meta-chip">No city data yet.</div>`}
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}

function renderSelectedCity() {
  const city = state.selectedCity
  const country = state.selectedCountry
  const weather = state.selectedWeather
  const cityLogs = logsForCity(city.city_name, city.country_code)
  return `
    <div class="card stamp-card city-search-card">
      <div class="section-title">
        <div>
          <h2>${escapeHtml(city.city_name)}, ${escapeHtml(city.country_name || '')}</h2>
          <p>Current city details and public traveler logs.</p>
        </div>
      </div>
      <div class="meta-row">
        ${weather ? `<span class="meta-chip">${weatherLabel(weather.weatherCode)} � ${Math.round(weather.currentTemp)}�</span>` : ''}
        ${weather ? `<span class="meta-chip">High ${Math.round(weather.high)}� / Low ${Math.round(weather.low)}�</span>` : ''}
        ${country?.capital?.[0] ? `<span class="meta-chip">Capital ${escapeHtml(country.capital[0])}</span>` : ''}
        ${country?.region ? `<span class="meta-chip">${escapeHtml(country.region)}</span>` : ''}
      </div>
      <div class="log-list" style="margin-top:16px;">
        ${cityLogs.length ? cityLogs.map(renderLogCard).join('') : `<div class="card log-card">No public logs for this city yet.</div>`}
      </div>
    </div>
  `
}

function renderBucketList() {
  return `
    <div class="page-shell section">
      <div class="section-title">
        <div>
          <h2>Bucket list</h2>
          <p>Saved cities you want to explore next.</p>
        </div>
      </div>
      <div class="log-list">
        ${state.bucketList.length ? state.bucketList.map(item => {
          const note = cleanBucketNotes(item.notes)
          return `
            <div class="card bucket-card stamp-card">
              <div class="kicker">${escapeHtml(item.country_code || '')}</div>
              <h3>${escapeHtml(item.city_name || 'Saved city')}</h3>
              ${note ? `<p class="log-notes">${escapeHtml(note)}</p>` : ''}
              <div class="meta-row">
                <span class="meta-chip">${escapeHtml(item.country_name || 'Unknown country')}</span>
                <span class="meta-chip">Saved ${fmtDate(item.created_at)}</span>
              </div>
            </div>
          `
        }).join('') : `<div class="card bucket-card">No saved cities yet.</div>`}
      </div>
    </div>
  `
}

function renderProfile() {
  const summary = travelerSummary(state.currentProfileUserId || state.user?.id)
  const profile = profileFor(state.currentProfileUserId || state.user?.id) || state.appUser
  return `
    <div class="page-shell section">
      <div class="grid feed-grid">
        <div class="card stamp-card profile-card">
          <div class="kicker">Traveler profile</div>
          <h1 class="hero-title">${escapeHtml(profile?.display_name || 'Traveler')}</h1>
          <p class="hero-copy">${escapeHtml(profile?.email || state.user?.email || '')}</p>
          <div class="mini-stats">
            <div class="stat-pill"><strong>${summary.totalLogs}</strong><span>Logs</span></div>
            <div class="stat-pill"><strong>${summary.cityCount}</strong><span>Cities</span></div>
            <div class="stat-pill"><strong>${summary.upvotesReceived}</strong><span>Upvotes</span></div>
          </div>
        </div>
        <div class="card stamp-card stats-card">
          <div class="section-title">
            <div>
              <h2>${escapeHtml(summary.rank.name)}</h2>
              <p>Current traveler rank based on public activity.</p>
            </div>
          </div>
          <div class="log-list">
            ${summary.userLogs.slice(0, 5).map(renderLogCard).join('') || `<div class="card log-card">No logs yet.</div>`}
          </div>
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
        <div class="card stamp-card form-card">
          <div class="section-title">
            <div>
              <h2>Add a travel log</h2>
              <p>Share a short memory, recommendation, or tip for a city.</p>
            </div>
          </div>
          <form id="log-form" class="form-stack">
            <div>
              <label class="label">Title</label>
              <input class="input" name="title" required placeholder="Sunset tram ride and pastel de nata stop">
            </div>
            <div>
              <label class="label">City</label>
              <input class="input" name="city_name" required value="${escapeHtml(city.city_name || '')}">
            </div>
            <div>
              <label class="label">Country</label>
              <input class="input" name="country_name" required value="${escapeHtml(city.country_name || '')}">
            </div>
            <div>
              <label class="label">Country code</label>
              <input class="input" name="country_code" required value="${escapeHtml(city.country_code || '')}">
            </div>
            <div>
              <label class="label">Notes</label>
              <textarea class="textarea" name="notes" required placeholder="What stood out, what to do, and what you'd recommend to someone else."></textarea>
            </div>
            <div>
              <label class="label">Tags</label>
              <div class="tag-row">
                ${TAGS.map(tag => `<label class="tag"><input type="checkbox" name="tags" value="${tag}" style="margin-right:8px;">${tag}</label>`).join('')}
              </div>
            </div>
            <div>
              <label class="label">Rating</label>
              <select class="select" name="rating">${[1,2,3,4,5].map(n => `<option value="${n}">${n}</option>`).join('')}</select>
            </div>
            <button class="btn btn-primary" type="submit">Save log</button>
          </form>
        </div>
        <div class="side-stack">
          <div class="card stamp-card bucket-card">
            <div class="section-title">
              <div>
                <h2>Save current city</h2>
                <p>Add the selected city to your bucket list.</p>
              </div>
            </div>
            <form id="bucket-form" class="form-stack">
              <div>
                <label class="label">City</label>
                <input class="input" name="city_name" required value="${escapeHtml(city.city_name || '')}">
              </div>
              <div>
                <label class="label">Country</label>
                <input class="input" name="country_name" required value="${escapeHtml(city.country_name || '')}">
              </div>
              <div>
                <label class="label">Country code</label>
                <input class="input" name="country_code" required value="${escapeHtml(city.country_code || '')}">
              </div>
              <div>
                <label class="label">Note</label>
                <textarea class="textarea" name="notes" placeholder="Why do you want to visit this city?"></textarea>
              </div>
              <button class="btn btn-secondary" type="submit">Save to bucket list</button>
            </form>
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
      <div class="card stamp-card log-card">
        <div class="log-head">
          <div>
            <h2>${escapeHtml(log.title || 'Untitled log')}</h2>
            <div class="log-city">${escapeHtml(log.city_name || '')}, ${escapeHtml(log.country_name || '')} � ${escapeHtml(profile?.display_name || 'Traveler')}</div>
          </div>
          <div class="meta-chip">${fmtDateTime(log.created_at)}</div>
        </div>
        <p class="log-notes" style="-webkit-line-clamp:unset; display:block;">${escapeHtml(log.notes || '')}</p>
        <div class="tag-row">${(Array.isArray(log.tags) ? log.tags : []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
        <div class="meta-row">
          <span class="meta-chip">${upvoteCountForLog(log.id)} upvotes</span>
          <span class="meta-chip">${Number(log.rating || 0).toFixed(1)} / 5</span>
        </div>
        <div class="hero-actions">
          <button class="btn btn-primary toggle-upvote" data-log-id="${log.id}">${hasUpvoted(log.id) ? 'Upvoted' : 'Upvote'}</button>
        </div>
      </div>

      <div class="card stamp-card form-card" style="margin-top:16px;">
        <div class="section-title">
          <div>
            <h2>Comments</h2>
            <p>Join the conversation.</p>
          </div>
        </div>
        <form id="comment-form" class="form-stack">
          <div>
            <label class="label">Comment</label>
            <textarea class="textarea" name="comment_text" required placeholder="Add a helpful comment or question."></textarea>
          </div>
          <button class="btn btn-primary" type="submit">Post comment</button>
        </form>
        <div class="log-list" style="margin-top:16px;">
          ${comments.length ? comments.map(comment => `
            <div class="card log-card">
              <strong>${escapeHtml(comment.profile?.display_name || 'Traveler')}</strong>
              <div class="log-city">${fmtDateTime(comment.created_at)}</div>
              <p class="log-notes" style="-webkit-line-clamp:unset; display:block;">${escapeHtml(comment.comment_text || '')}</p>
            </div>
          `).join('') : `<div class="card log-card">No comments yet.</div>`}
        </div>
      </div>
    </div>
  `
}

function renderApp() {
  let body = ''
  if (state.nav === 'home') body = renderHome()
  if (state.nav === 'discover') body = renderDiscover()
  if (state.nav === 'bucket') body = renderBucketList()
  if (state.nav === 'profile') body = renderProfile()
  if (state.nav === 'new-log') body = renderNewLog()
  if (state.nav === 'log') body = renderLogDetail()

  return `
    ${renderTopbar()}
    ${state.notice ? `<div class="page-shell" style="padding-top:14px;"><div class="card" style="padding:14px 18px;">${escapeHtml(state.notice)}</div></div>` : ''}
    ${body}
  `
}

function render() {
  if (!state.user && state.screen !== 'loading') {
    app.innerHTML = renderAuth()
    bindEvents()
    return
  }

  if (state.screen === 'loading') {
    app.innerHTML = renderLoading()
    return
  }

  app.innerHTML = renderApp()
  bindEvents()
}

const handleAuthSubmit = safeRun(async event => {
  event.preventDefault()
  if (state.authBusy) return

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

      if (error && /already been registered|user already registered/i.test(String(error.message || ''))) {
        const signIn = await supabase.auth.signInWithPassword({ email, password })
        if (signIn.error) {
          state.authError = normalizeAuthMessage(signIn.error.message)
          return
        }
        await enterApp(signIn.data.session)
        return
      }

      if (error) {
        state.authError = normalizeAuthMessage(error.message)
        return
      }

      if (data?.session) {
        await enterApp(data.session)
        return
      }

      state.pendingEmail = email
      state.screen = 'auth'
      state.authMode = 'signin'
      toast(`Check ${email} for your confirmation link, then sign in.`)
      return
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      state.authError = normalizeAuthMessage(error.message)
      return
    }

    await enterApp(data.session)
  } finally {
    state.authBusy = false
    state.authMessage = ''
    render()
  }
})

const signOut = safeRun(async () => {
  await supabase.auth.signOut()
  state.user = null
  state.session = null
  state.appUser = null
  state.nav = 'home'
  render()
})

const searchCity = safeRun(async () => {
  state.cityResults = await searchCities(state.cityQuery)
  render()
})

const chooseCity = safeRun(async index => {
  const city = state.cityResults[index]
  if (!city) return
  state.selectedCity = city
  const [country, weather] = await Promise.all([
    fetchCountry(city.country_code),
    fetchWeather(city)
  ])
  state.selectedCountry = country
  state.selectedWeather = weather
  render()
})

const saveLog = safeRun(async event => {
  event.preventDefault()
  const form = new FormData(event.currentTarget)
  const payload = {
    title: String(form.get('title') || '').trim(),
    city_name: String(form.get('city_name') || '').trim(),
    country_name: String(form.get('country_name') || '').trim(),
    country_code: String(form.get('country_code') || '').trim().toUpperCase(),
    notes: String(form.get('notes') || '').trim(),
    tags: TAGS.filter(tag => form.getAll('tags').includes(tag)),
    rating: Number(form.get('rating') || 0),
    is_public: true
  }

  const { error } = await supabase.from(TABLES.logs).insert(payload)
  if (error) throw error
  event.currentTarget.reset()
  await loadData()
  toast('Log saved.')
  state.nav = 'home'
  render()
})

const saveBucketItem = safeRun(async event => {
  event.preventDefault()
  const form = new FormData(event.currentTarget)
  const payload = {
    city_name: String(form.get('city_name') || '').trim(),
    country_name: String(form.get('country_name') || '').trim(),
    country_code: String(form.get('country_code') || '').trim().toUpperCase(),
    notes: String(form.get('notes') || '').trim()
  }

  const finalPayload = {
    ...payload,
    notes: cleanBucketNotes(payload.notes) || defaultBucketNote(payload)
  }

  const { error } = await supabase.from(TABLES.bucketList).insert(finalPayload)
  if (error) throw error
  event.currentTarget.reset()
  await loadData()
  toast('Saved to your bucket list.')
  state.nav = 'bucket'
  render()
})

const toggleUpvote = safeRun(async logId => {
  if (!state.user) return
  const existing = state.upvotes.find(item => item.log_id === logId && item.user_id === state.user.id)
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
  const form = new FormData(event.currentTarget)
  const payload = {
    log_id: state.currentLogId,
    comment_text: String(form.get('comment_text') || '').trim()
  }
  const { error } = await supabase.from(TABLES.comments).insert(payload)
  if (error) throw error
  event.currentTarget.reset()
  await loadData()
  toast('Comment posted.')
  render()
})

function bindEvents() {
  document.getElementById('auth-form')?.addEventListener('submit', handleAuthSubmit)
  document.getElementById('switch-auth')?.addEventListener('click', () => {
    state.authMode = state.authMode === 'signup' ? 'signin' : 'signup'
    state.authError = ''
    render()
  })
  document.getElementById('sign-out')?.addEventListener('click', signOut)
  document.getElementById('search-city-btn')?.addEventListener('click', searchCity)
  document.getElementById('city-query')?.addEventListener('input', event => {
    state.cityQuery = event.target.value
  })
  document.getElementById('log-form')?.addEventListener('submit', saveLog)
  document.getElementById('bucket-form')?.addEventListener('submit', saveBucketItem)
  document.getElementById('comment-form')?.addEventListener('submit', saveComment)

  document.querySelectorAll('[data-nav]').forEach(button => button.addEventListener('click', () => {
    state.nav = button.dataset.nav
    render()
  }))
  document.querySelectorAll('[data-city-index]').forEach(button => button.addEventListener('click', () => chooseCity(Number(button.dataset.cityIndex))))
  document.querySelectorAll('.open-log').forEach(button => button.addEventListener('click', () => {
    state.currentLogId = button.dataset.logId
    state.nav = 'log'
    render()
  }))
  document.querySelectorAll('.toggle-upvote').forEach(button => button.addEventListener('click', () => toggleUpvote(button.dataset.logId)))
  document.querySelectorAll('.open-profile').forEach(button => button.addEventListener('click', () => {
    state.currentProfileUserId = button.dataset.userId
    state.nav = 'profile'
    render()
  }))
}

async function enterApp(session) {
  state.session = session || null
  state.user = session?.user || null

  if (!state.user) {
    state.screen = 'auth'
    render()
    return
  }

  await ensureAppUser(state.user)
  await loadData()
  state.screen = 'app'
  render()
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
    state.loadingPhoto = await fetchApod()
    render()
    const { data: { session } } = await supabase.auth.getSession()
    await enterApp(session)
    setupRealtime()

    supabase.auth.onAuthStateChange(async (_event, session) => {
      await enterApp(session)
    })
  } catch (error) {
    console.error('Init error:', error?.message, error?.stack)
    state.screen = 'auth'
    render()
  }
}

init()
