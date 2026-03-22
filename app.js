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
  return /"cca2"|"cca3"|"capital"|"altSpellings"|"googleMaps"|"timezones"|"currencies"|"languages"|"latlng"|"translations"|"demonyms"|"flags"|"coatOfArms"|"postalCode"/i.test(value)
}

function cleanBucketNotes(value = '') {
  const text = String(value || '').trim()
  if (!text || looksLikeStructuredPayload(text)) return ''
  return clampText(text, 180)
}

function sanitizeBucketPayload(item = {}) {
  return {
    ...item,
    notes: cleanBucketNotes(item?.notes || '')
  }
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
    avatar_emoji: ':compass:'
  }
  const { data, error } = await supabase.from(TABLES.appUsers).insert(payload).select().single()
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

  if (logsRes.error) throw logsRes.error
  if (commentsRes.error) throw commentsRes.error
  if (upvotesRes.error) throw upvotesRes.error
  if (bucketRes.error) throw bucketRes.error
  if (profilesRes.error) throw profilesRes.error

  state.logs = logsRes.data || []
  state.comments = commentsRes.data || []
  state.upvotes = upvotesRes.data || []
  state.bucketList = (bucketRes.data || []).map(sanitizeBucketPayload)
  state.profiles = profilesRes.data || []
}

function renderTopbar() {
  const myLogCount = state.logs.filter(log => log.user_id === state.user?.id).length
  const myBucketCount = state.bucketList.filter(item => item.user_id === state.user?.id).length
  return `
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <div class="brand-icon"><i class="fa-solid fa-earth-americas"></i></div>
          <div class="brand-copy">
            <h1>WanderMap</h1>
            <p>Save cities, keep bucket plans, and post short travel logs without the clutter.</p>
          </div>
        </div>
        <div class="top-actions">
          <div class="top-summary">
            <span class="meta-chip">${myBucketCount} bucket saves</span>
            <span class="meta-chip">${myLogCount} travel logs</span>
          </div>
          <button class="btn btn-secondary" id="sign-out">Sign out</button>
        </div>
      </div>
      <div class="nav-tabs">
        ${[
          ['home', 'Home'],
          ['city', 'City'],
          ['bucket', 'Bucket List'],
          ['profile', 'Profile']
        ].map(([tab, label]) => `<button class="nav-tab ${state.nav === tab ? 'active' : ''}" data-nav="${tab}">${label}</button>`).join('')}
      </div>
    </header>
  `
}

function renderAuth() {
  return `
    <div class="auth-wrap">
      <div class="card auth-card stamp-card">
        <div class="brand-mark"><i class="fa-solid fa-compass"></i></div>
        <h1 class="title">WanderMap</h1>
        <p class="subtitle">Track cities you love, save future destinations, and post quick travel stories.</p>
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
        <button class="auth-switch" id="switch-auth">${state.authMode === 'signup' ? 'Already have an account? <strong>Sign in</strong>' : `Don't have an account? <strong>Sign up</strong>`}</button>
      </div>
    </div>
  `
}

function renderLoading() {
  return `
    <div class="loading-screen">
      <div class="card loading-card stamp-card">
        <div class="loading-media" style="background-image:${state.loadingPhoto ? `url('${escapeHtml(state.loadingPhoto)}')` : 'none'};">
          <div class="loading-overlay"></div>
        </div>
        <div class="loading-copy">
          <div class="kicker">Loading your next trip</div>
          <h1 class="hero-title" style="font-size:2.2rem;">WanderMap</h1>
          <p class="hero-copy">Saving cities, syncing your bucket list, and pulling in live city details.</p>
        </div>
      </div>
    </div>
  `
}

function renderLogCard(log) {
  const profile = profileFor(log.user_id)
  return `
    <article class="card log-card stamp-card">
      <div class="log-head">
        <div>
          <strong>${escapeHtml(log.title || 'Untitled log')}</strong>
          <div class="log-city">${escapeHtml(log.city_name || '')}, ${escapeHtml(log.country_name || '')}</div>
        </div>
        <div class="meta-chip">${Number(log.rating || 0).toFixed(1)} / 5</div>
      </div>
      <p class="log-notes">${escapeHtml(clampText(log.notes || '', 260))}</p>
      <div class="tag-row">
        ${(Array.isArray(log.tags) ? log.tags : []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
      </div>
      <div class="meta-row">
        <span class="meta-chip">By ${escapeHtml(profile?.display_name || 'Traveler')}</span>
        <span class="meta-chip">${fmtDateTime(log.created_at)}</span>
        <span class="meta-chip">${upvoteCountForLog(log.id)} upvotes</span>
      </div>
      <div class="meta-row">
        <button class="btn btn-secondary open-log" data-log-id="${log.id}">Open</button>
        <button class="btn btn-ghost upvote-log" data-log-id="${log.id}">${hasUpvoted(log.id) ? 'Upvoted' : 'Upvote'}</button>
      </div>
    </article>
  `
}

function renderHome() {
  const trending = topTrendingLogs(6)
  const cities = mostExploredCities(6)
  return `
    <div class="page-shell">
      <section class="hero">
        <div class="hero-grid">
          <div class="card hero-main stamp-card">
            <div class="kicker">City explorer</div>
            <h1 class="hero-title">Save places you want to go and remember the trips that mattered.</h1>
            <p class="hero-copy">Search any city, add it to your bucket list, and keep short travel logs with photos, ratings, and notes.</p>
            <div class="hero-actions">
              <button class="btn btn-primary" data-nav="city">Search a city</button>
              <button class="btn btn-secondary" data-nav="bucket">Open bucket list</button>
            </div>
          </div>
          <div class="card hero-side stamp-card">
            <div class="section-title"><div><h2>Top explored cities</h2><p>Where the community is posting most.</p></div></div>
            <div class="log-list">
              ${cities.length ? cities.map(city => `<div class="bucket-item"><strong>${escapeHtml(city.city_name)}</strong><p>${escapeHtml(city.country_name)} · ${city.count} logs</p></div>`).join('') : `<div class="bucket-item"><p>No city activity yet.</p></div>`}
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-title"><div><h2>Trending travel logs</h2><p>Recent public stories from travelers.</p></div></div>
        <div class="log-list">
          ${trending.length ? trending.map(renderLogCard).join('') : `<div class="card log-card">No public logs yet.</div>`}
        </div>
      </section>
    </div>
  `
}

function renderCityPage() {
  const city = state.selectedCity || DEFAULT_CITY
  const country = state.selectedCountry
  const weather = state.selectedWeather
  const cityLogs = logsForCity(city.city_name, city.country_code)

  return `
    <div class="page-shell section">
      <div class="city-layout">
        <div class="side-stack">
          <div class="card city-search-card stamp-card">
            <div class="section-title"><div><h2>Search city</h2><p>Pick a city to view details and save it.</p></div></div>
            <div class="city-search-row">
              <input class="input" id="city-query" value="${escapeHtml(state.cityQuery)}" placeholder="Search Lisbon, Tokyo, Mexico City...">
              <button class="btn btn-primary" id="city-search-btn">Search</button>
            </div>
            <div class="city-results">
              ${state.cityResults.map((item, index) => `<button class="city-result" data-city-index="${index}"><strong>${escapeHtml(item.city_name)}</strong><div class="log-city">${escapeHtml(item.admin1 ? `${item.admin1}, ` : '')}${escapeHtml(item.country_name)}</div></button>`).join('')}
            </div>
          </div>

          <div class="card stamp-card" style="padding:0; overflow:hidden;">
            <div class="city-banner">
              <div class="parallax-layer parallax-grid"></div>
              <div class="parallax-layer parallax-blobs"></div>
              <div class="parallax-layer parallax-icon"><i class="fa-solid fa-location-dot"></i></div>
              <div class="city-banner-content">
                <div class="kicker">Selected city</div>
                <h1 class="hero-title" style="font-size:2.5rem;">${escapeHtml(city.city_name || '')}</h1>
                <p class="hero-copy">${escapeHtml(city.country_name || '')}${country?.capital?.length ? ` · Capital: ${country.capital[0]}` : ''}</p>
                <div class="weather-grid">
                  <div class="weather-box"><strong>${weather?.currentTemp ?? '--'} deg</strong><span class="log-city">Now</span></div>
                  <div class="weather-box"><strong>${weather ? weatherLabel(weather.weatherCode) : '--'}</strong><span class="log-city">Weather</span></div>
                  <div class="weather-box"><strong>${weather?.wind ?? '--'}</strong><span class="log-city">Wind km/h</span></div>
                </div>
              </div>
            </div>
          </div>

          <div class="card form-card stamp-card">
            <div class="section-title"><div><h2>Save this city</h2><p>Add it to your bucket list for later.</p></div></div>
            <form id="bucket-form" class="form-stack">
              <div>
                <label class="label">Quick note</label>
                <textarea class="textarea" name="notes" placeholder="Why do you want to visit? Food, views, nightlife, museums..."></textarea>
              </div>
              <button class="btn btn-primary" type="submit">Save city</button>
            </form>
          </div>
        </div>

        <div class="side-stack">
          <div class="card form-card stamp-card">
            <div class="section-title"><div><h2>Add travel log</h2><p>Share a short story or memory from this city.</p></div></div>
            <form id="log-form" class="form-stack">
              <div>
                <label class="label">Title</label>
                <input class="input" name="title" required placeholder="Sunset tram ride and rooftop dinner">
              </div>
              <div>
                <label class="label">Notes</label>
                <textarea class="textarea" name="notes" required placeholder="What happened, what you loved, what people should know."></textarea>
              </div>
              <div class="two-col">
                <div>
                  <label class="label">Rating</label>
                  <select class="select" name="rating">
                    ${[1,2,3,4,5].map(n => `<option value="${n}">${n}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="label">Tag</label>
                  <select class="select" name="tag">
                    ${TAGS.map(tag => `<option value="${tag}">${tag}</option>`).join('')}
                  </select>
                </div>
              </div>
              <button class="btn btn-primary" type="submit">Save travel log</button>
            </form>
          </div>

          <div class="card stats-card stamp-card">
            <div class="section-title"><div><h2>City logs</h2><p>${cityLogs.length} public logs for this city.</p></div></div>
            <div class="log-list">
              ${cityLogs.length ? cityLogs.map(renderLogCard).join('') : `<div class="bucket-item"><p>No logs for this city yet. Add the first one.</p></div>`}
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}

function renderBucketPage() {
  const mine = state.bucketList.filter(item => item.user_id === state.user?.id)
  return `
    <div class="page-shell section">
      <div class="section-title"><div><h2>Your bucket list</h2><p>Saved cities you want to remember.</p></div></div>
      <div class="bucket-list">
        ${mine.length ? mine.map(item => {
          const cleanNote = cleanBucketNotes(item.notes)
          return `
            <div class="card bucket-card stamp-card">
              <strong>${escapeHtml(item.city_name || 'Saved city')}</strong>
              <div class="log-city">${escapeHtml(item.country_name || '')}</div>
              ${cleanNote ? `<p>${escapeHtml(cleanNote)}</p>` : ''}
              <div class="meta-row">
                <span class="meta-chip">Saved ${fmtDate(item.created_at)}</span>
                <button class="btn btn-ghost delete-bucket" data-bucket-id="${item.id}">Remove</button>
              </div>
            </div>
          `
        }).join('') : `<div class="card bucket-card">No saved cities yet.</div>`}
      </div>
    </div>
  `
}

function renderProfile() {
  const summary = travelerSummary(state.user?.id)
  return `
    <div class="page-shell section">
      <div class="profile-hero">
        <div class="card profile-card stamp-card">
          <div class="kicker">Traveler profile</div>
          <h1 class="hero-title" style="font-size:2.3rem;">${escapeHtml(state.appUser?.display_name || state.user?.email?.split('@')[0] || 'Traveler')}</h1>
          <p class="hero-copy">${escapeHtml(state.user?.email || '')}</p>
          <div class="weather-grid" style="margin-top:18px;">
            <div class="weather-box"><strong>${summary.totalLogs}</strong><span class="log-city">Logs</span></div>
            <div class="weather-box"><strong>${summary.cityCount}</strong><span class="log-city">Cities</span></div>
            <div class="weather-box"><strong>${summary.upvotesReceived}</strong><span class="log-city">Upvotes</span></div>
          </div>
        </div>
        <div class="card stats-card stamp-card">
          <div class="section-title"><div><h2>Recent travel logs</h2><p>Your latest activity.</p></div></div>
          <div class="log-list">
            ${summary.userLogs.length ? summary.userLogs.slice(0, 5).map(renderLogCard).join('') : `<div class="bucket-item"><p>No travel logs yet.</p></div>`}
          </div>
        </div>
      </div>
    </div>
  `
}

function renderApp() {
  let body = ''
  if (state.nav === 'home') body = renderHome()
  if (state.nav === 'city') body = renderCityPage()
  if (state.nav === 'bucket') body = renderBucketPage()
  if (state.nav === 'profile') body = renderProfile()

  return `
    ${renderTopbar()}
    ${state.notice ? `<div class="notice"><div class="notice-card">${escapeHtml(state.notice)}</div></div>` : ''}
    ${body}
  `
}

function render() {
  if (state.screen === 'loading') app.innerHTML = renderLoading()
  else if (!state.user) app.innerHTML = renderAuth()
  else app.innerHTML = renderApp()
  bindEvents()
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
  state.screen = 'app'
  render()
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
        options: { emailRedirectTo: 'https://sling-gogiapp.web.app/email-confirmed.html' }
      })
      if (error) throw error
      if (data?.session) await enterAppWithSession(data.session)
      else {
        state.authMode = 'signin'
        toast('Check your email to confirm your account, then sign in.')
      }
      return
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    await enterAppWithSession(data.session)
  } catch (error) {
    state.authError = normalizeAuthMessage(error?.message)
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

const runCitySearch = safeRun(async () => {
  state.cityResults = await searchCities(state.cityQuery)
  render()
})

const selectCityResult = safeRun(async index => {
  const city = state.cityResults[Number(index)]
  if (!city) return
  state.selectedCity = city
  state.selectedCountry = await fetchCountry(city.country_code)
  state.selectedWeather = await fetchWeather(city)
  render()
})

const saveBucketCity = safeRun(async event => {
  event.preventDefault()
  const formEl = event.currentTarget
  if (!formEl) return
  const form = new FormData(formEl)
  const city = state.selectedCity || DEFAULT_CITY
  const note = cleanBucketNotes(String(form.get('notes') || '').trim())
  const payload = {
    city_name: city.city_name,
    country_name: city.country_name,
    latitude: city.latitude,
    longitude: city.longitude,
    notes: note
  }
  const { error } = await supabase.from(TABLES.bucketList).insert(payload)
  if (error) throw error
  formEl.reset()
  await loadData()
  state.nav = 'bucket'
  toast('City saved to your bucket list.')
  render()
})

const saveTravelLog = safeRun(async event => {
  event.preventDefault()
  const formEl = event.currentTarget
  if (!formEl) return
  const city = state.selectedCity || DEFAULT_CITY
  const form = new FormData(formEl)
  const payload = {
    city_name: city.city_name,
    country_name: city.country_name,
    country_code: city.country_code,
    title: String(form.get('title') || '').trim(),
    notes: String(form.get('notes') || '').trim(),
    rating: Number(form.get('rating') || 0),
    tags: [String(form.get('tag') || '').trim()].filter(Boolean),
    is_public: true
  }
  if (!payload.title || !payload.notes) {
    toast('Please add both a title and notes for your travel log.')
    return
  }
  const { data, error } = await supabase.from(TABLES.logs).insert(payload).select().single()
  if (error) throw error
  formEl.reset()
  await loadData()
  state.currentLogId = data?.id || null
  state.nav = 'home'
  toast('Travel log saved.')
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

const deleteBucket = safeRun(async bucketId => {
  const { error } = await supabase.from(TABLES.bucketList).delete().eq('id', bucketId)
  if (error) throw error
  await loadData()
  toast('Removed from bucket list.')
  render()
})

function bindEvents() {
  try {
    document.getElementById('auth-form')?.addEventListener('submit', handleAuthSubmit)
    document.getElementById('switch-auth')?.addEventListener('click', () => {
      state.authMode = state.authMode === 'signup' ? 'signin' : 'signup'
      state.authError = ''
      render()
    })
    document.getElementById('sign-out')?.addEventListener('click', signOut)
    document.getElementById('city-query')?.addEventListener('input', event => {
      state.cityQuery = event.target.value
    })
    document.getElementById('city-search-btn')?.addEventListener('click', runCitySearch)
    document.getElementById('bucket-form')?.addEventListener('submit', saveBucketCity)
    document.getElementById('log-form')?.addEventListener('submit', saveTravelLog)

    document.querySelectorAll('[data-nav]').forEach(btn => btn.addEventListener('click', () => {
      state.nav = btn.dataset.nav
      render()
    }))
    document.querySelectorAll('[data-city-index]').forEach(btn => btn.addEventListener('click', () => selectCityResult(btn.dataset.cityIndex)))
    document.querySelectorAll('.open-log').forEach(btn => btn.addEventListener('click', () => {
      state.currentLogId = btn.dataset.logId
      state.nav = 'home'
      render()
    }))
    document.querySelectorAll('.upvote-log').forEach(btn => btn.addEventListener('click', () => toggleUpvote(btn.dataset.logId)))
    document.querySelectorAll('.delete-bucket').forEach(btn => btn.addEventListener('click', () => deleteBucket(btn.dataset.bucketId)))
  } catch (error) {
    console.error('Bind error:', error?.message, error?.stack)
  }
}

function setupRealtime() {
  if (state.initializedRealtime) return
  state.initializedRealtime = true
  try {
    supabase.channel('wandermap-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.logs }, async () => { await loadData(); render() })
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.comments }, async () => { await loadData(); render() })
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.upvotes }, async () => { await loadData(); render() })
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.bucketList }, async () => { await loadData(); render() })
      .subscribe()
  } catch (error) {
    console.error('Realtime error:', error?.message)
  }
}

async function init() {
  try {
    state.screen = 'loading'
    render()
    const apod = await fetchApod()
    state.loadingPhoto = apod.image || ''
    const { data: { session } } = await supabase.auth.getSession()
    await enterAppWithSession(session)
    if (state.user) {
      state.selectedCity = DEFAULT_CITY
      state.selectedCountry = await fetchCountry(DEFAULT_CITY.country_code)
      state.selectedWeather = await fetchWeather(DEFAULT_CITY)
    }
    setupRealtime()
    render()
  } catch (error) {
    console.error('Init error:', error?.message, error?.stack)
    state.screen = 'auth'
    render()
  }
}

init()
