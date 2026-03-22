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

function cleanBucketNotes(value = '') {
  const text = String(value || '').trim()
  if (!text) return ''

  if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
    try {
      const parsed = JSON.parse(text)
      if (typeof parsed === 'string') return clampText(parsed, 180)
      if (Array.isArray(parsed)) {
        return clampText(parsed.map(item => {
          if (typeof item === 'string') return item
          if (item && typeof item === 'object') return item.name || item.common || item.official || ''
          return ''
        }).filter(Boolean).join(', '), 180)
      }
      if (parsed && typeof parsed === 'object') {
        const preferred = [
          parsed.notes,
          parsed.summary,
          parsed.description,
          parsed.overview,
          parsed.city,
          parsed.name,
          parsed.common,
          parsed.official,
          parsed.country,
          parsed.country_name
        ].find(Boolean)

        if (preferred) return clampText(preferred, 180)

        const flattened = Object.values(parsed)
          .flatMap(value => {
            if (typeof value === 'string') return [value]
            if (Array.isArray(value)) return value.filter(item => typeof item === 'string')
            if (value && typeof value === 'object') {
              return Object.values(value).filter(item => typeof item === 'string')
            }
            return []
          })
          .filter(Boolean)

        if (flattened.length) return clampText(flattened.join(' � '), 180)
      }
    } catch (error) {
      console.error('Bucket notes parse error:', error?.message)
    }
    return 'Saved destination details.'
  }

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
  const url = `${OPEN_METEO_GEOCODE}?name=${encodeURIComponent(query)}&count=8&language=en&format=json`
  const data = await fetchJson(url)
  return (data?.results || []).map(item => ({
    city_name: item.name,
    country_name: item.country,
    country_code: item.country_code,
    latitude: item.latitude,
    longitude: item.longitude,
    timezone: item.timezone,
    admin1: item.admin1 || ''
  }))
}

async function fetchWeather(latitude, longitude) {
  if (latitude == null || longitude == null) return null
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: '7'
  })
  return fetchJson(`${OPEN_METEO_FORECAST}?${params.toString()}`)
}

function renderAuth() {
  return `
    <div class="auth-wrap">
      <div class="card auth-card stamp-card">
        <div class="brand-mark"><i class="fa-solid fa-earth-americas"></i></div>
        <h1 class="title">WanderMap</h1>
        <p class="subtitle">Track places you loved, cities you want to visit, and short travel notes you actually want to revisit later.</p>
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
        <button class="auth-switch" id="switch-auth" ${state.authBusy ? 'disabled' : ''}>${state.authMode === 'signup' ? 'Already have an account? <strong>Sign in</strong>' : `Don't have an account? <strong>Sign up</strong>`}</button>
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
        <p class="subtitle">We sent a confirmation link to <strong>${escapeHtml(state.pendingEmail || '')}</strong>. Open it, then return here and sign in.</p>
        <button class="btn btn-primary" id="go-signin" style="width:100%; margin-top:18px;">Go to sign in</button>
      </div>
    </div>
  `
}

function renderLoading() {
  const photo = state.loadingPhoto || {}
  return `
    <div class="loading-screen">
      <div class="card loading-card stamp-card">
        <div class="loading-media" style="background-image:url('${escapeHtml(photo.image || '')}')">
          <div class="loading-overlay"></div>
        </div>
        <div class="loading-copy">
          <div class="kicker">Loading your next trip</div>
          <h1 class="title" style="text-align:left;">${escapeHtml(photo.title || 'Adventure starts here')}</h1>
          <p class="subtitle" style="text-align:left;">${escapeHtml(photo.explanation || 'Preparing your saved cities and travel logs.')}</p>
        </div>
      </div>
    </div>
  `
}

function renderTopbar() {
  const summary = travelerSummary(state.user?.id)
  const currentCity = state.selectedCity?.city_name || DEFAULT_CITY.city_name
  const currentCountry = state.selectedCity?.country_name || DEFAULT_CITY.country_name

  return `
    <div class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <div class="brand-icon"><i class="fa-solid fa-earth-americas"></i></div>
          <div class="brand-copy">
            <h1>WanderMap</h1>
            <p>${escapeHtml(currentCity)}, ${escapeHtml(currentCountry)}</p>
          </div>
        </div>
        <div class="top-actions">
          <div class="top-summary">
            <span class="meta-chip"><i class="fa-solid fa-stamp"></i> ${escapeHtml(summary.rank.name)}</span>
            <span class="meta-chip">${summary.totalLogs} logs</span>
            <span class="meta-chip">${state.bucketList.length} saved cities</span>
          </div>
          <button class="btn btn-secondary" id="sign-out">Sign out</button>
        </div>
      </div>
      <div class="nav-tabs">
        ${[
          ['home', 'Home'],
          ['city', 'City'],
          ['create', 'Create'],
          ['bucket', 'Bucket'],
          ['profile', 'Profile']
        ].map(([tab, label]) => `<button class="nav-tab ${state.nav === tab ? 'active' : ''}" data-nav="${tab}">${label}</button>`).join('')}
      </div>
    </div>
  `
}

function renderHero() {
  const trending = topTrendingLogs(3)
  const summary = travelerSummary(state.user?.id)
  return `
    <section class="hero">
      <div class="page-shell hero-grid">
        <div class="card hero-main stamp-card">
          <div class="kicker">Your travel journal</div>
          <h1 class="hero-title">Capture cities worth returning to.</h1>
          <p class="hero-copy">Save quick notes, rate memorable experiences, keep a clean bucket list, and revisit city details without clutter.</p>
          <div class="hero-actions">
            <button class="btn btn-primary" data-nav="create">Write a log</button>
            <button class="btn btn-secondary" data-nav="bucket">Open bucket list</button>
          </div>
          <div class="mini-stats">
            <div class="stat-pill"><strong>${summary.totalLogs}</strong><span>Logs</span></div>
            <div class="stat-pill"><strong>${summary.cityCount}</strong><span>Cities</span></div>
            <div class="stat-pill"><strong>${summary.upvotesReceived}</strong><span>Upvotes</span></div>
          </div>
        </div>
        <div class="card hero-side stamp-card">
          <div class="section-title">
            <div>
              <h2>Trending logs</h2>
              <p>Recent public posts travelers are reacting to.</p>
            </div>
          </div>
          <div class="side-stack">
            ${trending.length ? trending.map(log => `
              <div class="comment-card">
                <strong>${escapeHtml(log.title || 'Untitled log')}</strong>
                <div class="log-city">${escapeHtml(log.city_name || '')}, ${escapeHtml(log.country_name || '')}</div>
                <p class="log-notes">${escapeHtml(clampText(log.notes || '', 120))}</p>
              </div>
            `).join('') : `<div class="empty-state">No public logs yet. Be the first to add one.</div>`}
          </div>
        </div>
      </div>
    </section>
  `
}

function renderHome() {
  const logs = topTrendingLogs(12)
  return `
    <div>
      ${renderHero()}
      <section class="section">
        <div class="page-shell">
          <div class="section-title">
            <div>
              <h2>Recent travel logs</h2>
              <p>Short city stories from the community.</p>
            </div>
          </div>
          <div class="log-list">
            ${logs.length ? logs.map(renderLogCard).join('') : `<div class="card log-card empty-state">No logs yet. Add the first one.</div>`}
          </div>
        </div>
      </section>
    </div>
  `
}

function renderWeatherSummary() {
  const weather = state.selectedWeather
  if (!weather?.current) return `<div class="empty-state">Weather data is not available right now.</div>`
  return `
    <div class="meta-row">
      <span class="meta-chip">${Math.round(weather.current.temperature_2m)} degrees</span>
      <span class="meta-chip">${escapeHtml(weatherLabel(weather.current.weather_code))}</span>
      <span class="meta-chip">Wind ${Math.round(weather.current.wind_speed_10m)} km/h</span>
    </div>
  `
}

function renderForecast() {
  const daily = state.selectedWeather?.daily
  if (!daily?.time?.length) return `<div class="empty-state">Forecast unavailable.</div>`
  return daily.time.map((date, index) => `
    <div class="meta-row" style="justify-content:space-between;">
      <strong>${escapeHtml(fmtDate(date))}</strong>
      <span>${Math.round(daily.temperature_2m_max[index])} / ${Math.round(daily.temperature_2m_min[index])}</span>
      <span>${escapeHtml(weatherLabel(daily.weather_code[index]))}</span>
    </div>
  `).join('')
}

function renderCity() {
  const city = state.selectedCity || DEFAULT_CITY
  const country = state.selectedCountry
  const cityLogs = logsForCity(city.city_name, city.country_code)
  return `
    <div class="page-shell section">
      <div class="grid city-layout">
        <div class="card city-search-card stamp-card">
          <div class="section-title">
            <div>
              <h2>Search a city</h2>
              <p>Find weather and save places you want to explore.</p>
            </div>
          </div>
          <div class="city-search-row">
            <input class="input" id="city-query" placeholder="Search Lisbon, Tokyo, Mexico City..." value="${escapeHtml(state.cityQuery)}">
            <button class="btn btn-primary" id="search-city">Search</button>
          </div>
          <div class="city-results">
            ${state.cityResults.length ? state.cityResults.map(result => `
              <button class="city-result" data-city="${escapeHtml(JSON.stringify(result))}">
                <strong>${escapeHtml(result.city_name)}</strong>
                <div class="log-city">${escapeHtml([result.admin1, result.country_name].filter(Boolean).join(', '))}</div>
              </button>
            `).join('') : `<div class="empty-state">Search for a city to switch the dashboard.</div>`}
          </div>
        </div>
        <div class="card city-banner stamp-card">
          <div class="parallax-layer parallax-grid"></div>
          <div class="parallax-layer parallax-compass"><i class="fa-regular fa-compass"></i></div>
          <div class="city-banner-content">
            <div class="kicker">${escapeHtml(country?.flag || city.country_code || '')}</div>
            <h1 class="hero-title">${escapeHtml(city.city_name)}</h1>
            <p class="hero-copy">${escapeHtml(city.country_name)} � Population ${escapeHtml(country?.population?.toLocaleString?.() || 'Unknown')} � ${escapeHtml(country?.currencies ? Object.keys(country.currencies).join(', ') : 'Currency unknown')} � ${escapeHtml(country?.languages ? Object.values(country.languages).join(', ') : 'Language unknown')}</p>
            ${renderWeatherSummary()}
          </div>
        </div>
      </div>

      <div class="grid feed-grid" style="margin-top:18px;">
        <div class="side-stack">
          <div class="card stats-card stamp-card">
            <div class="section-title">
              <div>
                <h2>7 day forecast</h2>
                <p>Open-Meteo daily outlook.</p>
              </div>
            </div>
            ${renderForecast()}
          </div>

          <div class="card stats-card stamp-card">
            <div class="section-title">
              <div>
                <h2>Logs in this city</h2>
                <p>Public entries for ${escapeHtml(city.city_name)}.</p>
              </div>
            </div>
            <div class="log-list">
              ${cityLogs.length ? cityLogs.map(renderLogCard).join('') : `<div class="empty-state">No city logs yet.</div>`}
            </div>
          </div>
        </div>

        <div class="side-stack">
          <div class="card bucket-card stamp-card">
            <div class="section-title">
              <div>
                <h2>Quick facts</h2>
                <p>Helpful context for your next visit.</p>
              </div>
            </div>
            <div class="meta-row">
              <span class="meta-chip">Capital: ${escapeHtml((country?.capital || ['Unknown'])[0])}</span>
              <span class="meta-chip">Region: ${escapeHtml(country?.region || 'Unknown')}</span>
              <span class="meta-chip">Timezone: ${escapeHtml(city.timezone || 'Unknown')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}

function renderCreate() {
  const city = state.selectedCity || DEFAULT_CITY
  return `
    <div class="page-shell section">
      <div class="card form-card stamp-card">
        <div class="section-title">
          <div>
            <h2>Create a travel log</h2>
            <p>Journal a city experience with rating, date, and tags.</p>
          </div>
        </div>
        <form id="log-form" class="form-stack">
          <div>
            <label class="label">Title</label>
            <input class="input" name="title" required placeholder="Sunset tram ride and hidden cafe">
          </div>
          <div class="two-col">
            <div>
              <label class="label">City</label>
              <input class="input" name="city_name" value="${escapeHtml(city.city_name)}" required>
            </div>
            <div>
              <label class="label">Country</label>
              <input class="input" name="country_name" value="${escapeHtml(city.country_name)}" required>
            </div>
          </div>
          <div class="two-col">
            <div>
              <label class="label">Country code</label>
              <input class="input" name="country_code" value="${escapeHtml(city.country_code)}" required>
            </div>
            <div>
              <label class="label">Visit date</label>
              <input class="input" type="date" name="visit_date">
            </div>
          </div>
          <div class="two-col">
            <div>
              <label class="label">Rating</label>
              <select class="select" name="rating">
                ${[1, 2, 3, 4, 5].map(value => `<option value="${value}">${value}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="label">Tags</label>
              <div class="tag-row">
                ${TAGS.map(tag => `<label class="tag"><input type="checkbox" name="tags" value="${tag}" style="margin-right:8px;"> ${tag}</label>`).join('')}
              </div>
            </div>
          </div>
          <div>
            <label class="label">Notes</label>
            <textarea class="textarea" name="notes" placeholder="What stood out, where you went, what you would recommend, and how the city felt."></textarea>
          </div>
          <button class="btn btn-primary" type="submit">Publish log</button>
        </form>
      </div>
    </div>
  `
}

function renderBucket() {
  return `
    <div class="page-shell section">
      <div class="section-title">
        <div>
          <h2>Bucket list</h2>
          <p>Saved cities you want to explore next.</p>
        </div>
      </div>
      <div class="side-stack">
        ${state.bucketList.length ? state.bucketList.map(item => `
          <div class="card bucket-card stamp-card">
            <div class="section-title">
              <div>
                <div class="kicker">${escapeHtml(item.country_code || '')}</div>
                <h2 style="font-size:1.4rem;">${escapeHtml(item.city_name || 'Saved city')}</h2>
              </div>
            </div>
            <p class="hero-copy">${escapeHtml(cleanBucketNotes(item.notes) || defaultBucketNote(item))}</p>
            <div class="meta-row">
              <span class="meta-chip">Saved ${escapeHtml(fmtDate(item.created_at))}</span>
              ${item.latitude != null && item.longitude != null ? `<span class="meta-chip">${Number(item.latitude).toFixed(2)}, ${Number(item.longitude).toFixed(2)}</span>` : ''}
            </div>
          </div>
        `).join('') : `<div class="card bucket-card empty-state">No saved cities yet.</div>`}
      </div>
    </div>
  `
}

function renderProfile() {
  const summary = travelerSummary(state.user?.id)
  const activeTravelers = mostActiveTravelers(6)
  const exploredCities = mostExploredCities(6)
  return `
    <div class="page-shell section">
      <div class="grid profile-grid">
        <div class="card profile-card stamp-card">
          <div class="kicker">Traveler profile</div>
          <h1 class="hero-title" style="font-size:2.4rem;">${escapeHtml(state.appUser?.display_name || state.user?.email?.split('@')[0] || 'Traveler')}</h1>
          <p class="hero-copy">${escapeHtml(state.user?.email || '')}</p>
          <div class="rank-badge" style="margin-top:16px;">
            <i class="${summary.rank.icon}"></i>
            <span>${escapeHtml(summary.rank.name)}</span>
          </div>
          <div class="mini-stats">
            <div class="stat-pill"><strong>${summary.totalLogs}</strong><span>Logs</span></div>
            <div class="stat-pill"><strong>${summary.cityCount}</strong><span>Cities</span></div>
            <div class="stat-pill"><strong>${summary.upvotesReceived}</strong><span>Upvotes</span></div>
          </div>
        </div>
        <div class="side-stack">
          <div class="card stats-card stamp-card">
            <div class="section-title">
              <div>
                <h2>Most explored cities</h2>
                <p>Where the community logs the most adventures.</p>
              </div>
            </div>
            <div class="side-stack">
              ${exploredCities.length ? exploredCities.map(city => `
                <div class="comment-card">
                  <strong>${escapeHtml(city.city_name)}</strong>
                  <div class="log-city">${escapeHtml(city.country_name)}</div>
                  <div class="meta-row"><span class="meta-chip">${city.count} logs</span></div>
                </div>
              `).join('') : `<div class="empty-state">No city stats yet.</div>`}
            </div>
          </div>
          <div class="card stats-card stamp-card">
            <div class="section-title">
              <div>
                <h2>Most active travelers</h2>
                <p>Leaderboard by logs and upvotes.</p>
              </div>
            </div>
            <div class="side-stack">
              ${activeTravelers.length ? activeTravelers.map(entry => `
                <div class="comment-card">
                  <strong>${escapeHtml(entry.profile?.display_name || 'Traveler')}</strong>
                  <div class="meta-row">
                    <span class="meta-chip">${entry.totalLogs} logs</span>
                    <span class="meta-chip">${entry.upvotesReceived} upvotes</span>
                  </div>
                </div>
              `).join('') : `<div class="empty-state">No traveler stats yet.</div>`}
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}

function renderLogCard(log) {
  const profile = profileFor(log.user_id)
  const comments = commentsForLog(log.id)
  const upvotes = upvoteCountForLog(log.id)
  return `
    <div class="card log-card stamp-card">
      <div class="log-head">
        <div>
          <strong>${escapeHtml(log.title || 'Untitled log')}</strong>
          <div class="log-city">${escapeHtml(log.city_name || '')}, ${escapeHtml(log.country_name || '')}</div>
          <div class="meta-row">
            <span class="meta-chip">By ${escapeHtml(profile?.display_name || 'Traveler')}</span>
            <span class="meta-chip">${escapeHtml(fmtDateTime(log.created_at))}</span>
            <span class="meta-chip">${log.rating || 0}/5</span>
          </div>
        </div>
        <div class="meta-row">
          <button class="btn btn-secondary toggle-upvote" data-log-id="${log.id}">${hasUpvoted(log.id) ? 'Upvoted' : 'Upvote'}</button>
        </div>
      </div>
      <p class="log-notes">${escapeHtml(clampText(log.notes || '', 280))}</p>
      <div class="tag-row">
        ${(Array.isArray(log.tags) ? log.tags : []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
      </div>
      <div class="meta-row">
        <span class="meta-chip">${upvotes} upvotes</span>
        <span class="meta-chip">${comments.length} comments</span>
      </div>
      <div class="comment-thread" style="margin-top:14px;">
        ${comments.slice(0, 3).map(comment => `
          <div class="comment-card">
            <strong>${escapeHtml(comment.profile?.display_name || 'Traveler')}</strong>
            <p class="hero-copy">${escapeHtml(comment.comment_text || '')}</p>
          </div>
        `).join('')}
      </div>
      <form class="form-stack comment-form" data-log-id="${log.id}" style="margin-top:14px;">
        <div>
          <label class="label">Comment</label>
          <textarea class="textarea" name="comment_text" placeholder="Add a quick reaction or recommendation."></textarea>
        </div>
        <button class="btn btn-secondary" type="submit">Post comment</button>
      </form>
    </div>
  `
}

function renderApp() {
  let body = ''
  if (state.nav === 'home') body = renderHome()
  if (state.nav === 'city') body = renderCity()
  if (state.nav === 'create') body = renderCreate()
  if (state.nav === 'bucket') body = renderBucket()
  if (state.nav === 'profile') body = renderProfile()

  return `
    ${renderTopbar()}
    ${state.notice ? `<div class="page-shell" style="padding-top:14px;"><div class="card" style="padding:14px 18px; border-radius:18px; background:rgba(255,127,110,0.14); border-color:rgba(255,127,110,0.25);">${escapeHtml(state.notice)}</div></div>` : ''}
    ${body}
    <div class="footer-space"></div>
  `
}

function render() {
  if (state.screen === 'loading') app.innerHTML = renderLoading()
  else if (state.screen === 'auth') app.innerHTML = renderAuth()
  else if (state.screen === 'check-email') app.innerHTML = renderCheckEmail()
  else app.innerHTML = renderApp()
  bindEvents()
}

async function ensureAppUser(user) {
  if (!user?.id) return null
  const { data: existing } = await supabase.from(TABLES.appUsers).select('*').eq('user_id', user.id).maybeSingle()
  if (existing) {
    state.appUser = existing
    return existing
  }
  const payload = {
    user_id: user.id,
    email: user.email,
    display_name: user.email?.split('@')[0] || 'Traveler'
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
  state.bucketList = bucketRes.data || []
  state.profiles = profilesRes.data || []
}

async function refreshSelectedCityData() {
  const city = state.selectedCity || DEFAULT_CITY
  state.selectedCountry = await fetchCountry(city.country_code)
  state.selectedWeather = await fetchWeather(city.latitude, city.longitude)
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
  if (!state.selectedCity) state.selectedCity = { ...DEFAULT_CITY }
  await Promise.all([loadData(), refreshSelectedCityData()])
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

const submitLog = safeRun(async event => {
  event.preventDefault()
  const form = new FormData(event.currentTarget)
  const payload = {
    title: String(form.get('title') || '').trim(),
    city_name: String(form.get('city_name') || '').trim(),
    country_name: String(form.get('country_name') || '').trim(),
    country_code: String(form.get('country_code') || '').trim().toUpperCase(),
    visit_date: String(form.get('visit_date') || '').trim() || null,
    rating: Number(form.get('rating') || 0),
    tags: TAGS.filter(tag => form.getAll('tags').includes(tag)),
    notes: String(form.get('notes') || '').trim(),
    is_public: true
  }

  if (!payload.title || !payload.city_name || !payload.country_name || !payload.country_code) {
    toast('Please fill in the title, city, country, and country code.')
    return
  }

  const { error } = await supabase.from(TABLES.logs).insert(payload)
  if (error) throw error
  event.currentTarget.reset()
  await loadData()
  state.nav = 'home'
  toast('Travel log published.')
  render()
})

const submitComment = safeRun(async event => {
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
  event.currentTarget.reset()
  await loadData()
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

const runCitySearch = safeRun(async () => {
  const query = state.cityQuery.trim()
  if (!query) {
    toast('Enter a city name first.')
    return
  }
  state.cityResults = await searchCities(query)
  render()
})

const chooseCity = safeRun(async raw => {
  const city = JSON.parse(raw)
  state.selectedCity = city
  state.cityResults = []
  state.cityQuery = city.city_name
  await refreshSelectedCityData()
  render()
})

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
    document.getElementById('log-form')?.addEventListener('submit', submitLog)
    document.getElementById('search-city')?.addEventListener('click', runCitySearch)
    document.getElementById('city-query')?.addEventListener('input', event => {
      state.cityQuery = event.target.value
    })
    document.querySelectorAll('[data-nav]').forEach(btn => btn.addEventListener('click', () => {
      state.nav = btn.dataset.nav
      render()
    }))
    document.querySelectorAll('.toggle-upvote').forEach(btn => btn.addEventListener('click', () => toggleUpvote(btn.dataset.logId)))
    document.querySelectorAll('.comment-form').forEach(form => form.addEventListener('submit', submitComment))
    document.querySelectorAll('.city-result').forEach(btn => btn.addEventListener('click', () => chooseCity(btn.dataset.city)))
  } catch (error) {
    console.error('Bind error:', error?.message, error?.stack)
  }
}

async function init() {
  try {
    state.loadingPhoto = await fetchApod()
    render()
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
