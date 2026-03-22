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
  appUsers: 'uNMexs7BYTXQ2_bitemap_app_users',
  spots: 'uNMexs7BYTXQ2_bitemap_spots',
  reviews: 'uNMexs7BYTXQ2_bitemap_reviews',
  follows: 'uNMexs7BYTXQ2_bitemap_follows',
  crawls: 'uNMexs7BYTXQ2_bitemap_crawls',
  crawlStops: 'uNMexs7BYTXQ2_bitemap_crawl_stops',
  crawlClones: 'uNMexs7BYTXQ2_bitemap_crawl_clones',
  crawlCloneStops: 'uNMexs7BYTXQ2_bitemap_crawl_clone_stops',
  bucketList: 'uNMexs7BYTXQ2_bitemap_bucket_list',
  comments: 'uNMexs7BYTXQ2_bitemap_spot_comments',
  commentLikes: 'uNMexs7BYTXQ2_bitemap_spot_comment_likes',
  savedAreas: 'uNMexs7BYTXQ2_bitemap_user_saved_areas'
}

const FOOD_TYPES = ['Tacos', 'BBQ', 'Ramen', 'Boba', 'Burgers', 'Falafel', 'Hot Dogs', 'Arepas', 'Noodles', 'Dumplings', 'Pizza', 'Seafood']
const PRICE_OPTIONS = ['$', '$$', '$$$']
const RANKS = [
  { max: 5, name: 'Snacker', icon: 'S' },
  { max: 20, name: 'Foodie', icon: 'F' },
  { max: 50, name: 'Connoisseur', icon: 'C' },
  { max: Infinity, name: 'Street Food Legend', icon: 'L' }
]

const DEFAULT_CENTER = [34.0522, -118.2437]
const AUTH_HANG_TIMEOUT_MS = 20000
const FALLBACK_LOCATION = {
  latitude: DEFAULT_CENTER[0],
  longitude: DEFAULT_CENTER[1],
  city: 'Los Angeles',
  country: 'United States',
  countryCode: 'US',
  flag: 'US'
}

const state = {
  session: null,
  user: null,
  appUser: null,
  authMode: 'signin',
  screen: 'loading',
  nav: 'home',
  loadingPhoto: null,
  geo: null,
  geoSource: 'unknown',
  geoError: '',
  country: null,
  weather: null,
  spots: [],
  reviews: [],
  crawls: [],
  crawlStops: [],
  crawlClones: [],
  crawlCloneStops: [],
  follows: [],
  profiles: [],
  comments: [],
  commentLikes: [],
  savedAreas: [],
  personalizedFeed: [],
  currentSpotId: null,
  currentProfileUserId: null,
  spinnerResult: null,
  notice: '',
  pendingEmail: '',
  currentReplyParentId: null,
  initializedRealtime: false,
  loadingTimeoutId: null,
  authBusy: false,
  authListenerSet: false,
  authTimeoutId: null,
  authRequestId: 0,
  authMessage: '',
  authErrorText: '',
  authProcessingSession: false,
  authInitialized: false
}

const app = document.getElementById('app')

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

function toast(message) {
  state.notice = message
  render()
  setTimeout(() => {
    if (state.notice === message) {
      state.notice = ''
      render()
    }
  }, 2800)
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function fmtDate(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDateTime(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function avg(nums) {
  const valid = nums.filter(n => typeof n === 'number' && !Number.isNaN(n))
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0
}

function distanceKm(aLat, aLon, bLat, bLon) {
  const toRad = deg => deg * Math.PI / 180
  const R = 6371
  const dLat = toRad((bLat || 0) - (aLat || 0))
  const dLon = toRad((bLon || 0) - (aLon || 0))
  const lat1 = toRad(aLat || 0)
  const lat2 = toRad(bLat || 0)
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function walkMinutesBetween(a, b) {
  const km = distanceKm(a.latitude, a.longitude, b.latitude, b.longitude)
  return Math.max(3, Math.round(km * 12))
}

function getRank(spotCount) {
  return RANKS.find(rank => spotCount <= rank.max) || RANKS[RANKS.length - 1]
}

function profileFor(userId) {
  return state.profiles.find(p => p.user_id === userId) || null
}

function currentUserSpotCount(userId) {
  return state.spots.filter(s => s.user_id === userId).length
}

function currentUserReviewsCount(userId) {
  return state.reviews.filter(r => r.user_id === userId).length
}

function currentUserCompletedCrawls(userId) {
  return state.crawlClones.filter(c => c.user_id === userId && c.status === 'completed').length
}

function uniqueFoodTypesTried(userId) {
  const ownSpotIds = new Set(state.spots.filter(s => s.user_id === userId).map(s => s.id))
  const reviewedSpotIds = new Set(state.reviews.filter(r => r.user_id === userId).map(r => r.spot_id))
  const allIds = new Set([...ownSpotIds, ...reviewedSpotIds])
  const tags = new Set()
  state.spots.filter(s => allIds.has(s.id)).forEach(s => (s.food_tags || []).forEach(tag => tags.add(tag)))
  return tags.size
}

function reviewStatsForSpot(spotId) {
  const reviews = state.reviews.filter(r => r.spot_id === spotId)
  const taste = avg(reviews.map(r => Number(r.taste_rating)))
  const portion = avg(reviews.map(r => Number(r.portion_rating)))
  const value = avg(reviews.map(r => Number(r.value_rating)))
  const overall = avg([taste, portion, value])
  const weighted = reviews.length ? ((overall * 0.7) + Math.min(reviews.length, 10) * 0.12) : 0
  return { reviews, taste, portion, value, overall, weighted, count: reviews.length }
}

function commentTreeForSpot(spotId) {
  const comments = state.comments.filter(c => c.spot_id === spotId)
  const likesByComment = state.commentLikes.reduce((acc, like) => {
    acc[like.comment_id] = (acc[like.comment_id] || 0) + 1
    return acc
  }, {})
  const enrich = comment => ({
    ...comment,
    likes: likesByComment[comment.id] || 0,
    profile: profileFor(comment.user_id),
    replies: comments.filter(reply => reply.parent_comment_id === comment.id).map(reply => ({
      ...reply,
      likes: likesByComment[reply.id] || 0,
      profile: profileFor(reply.user_id)
    })).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  })
  return comments
    .filter(comment => !comment.parent_comment_id)
    .map(enrich)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

function userUpvotesReceived(userId) {
  const userSpotIds = new Set(state.spots.filter(s => s.user_id === userId).map(s => s.id))
  return state.reviews.filter(r => userSpotIds.has(r.spot_id)).length
}

function buildProfileSummary(userId) {
  const profile = profileFor(userId)
  const spotCount = currentUserSpotCount(userId)
  const reviewCount = currentUserReviewsCount(userId)
  const completed = currentUserCompletedCrawls(userId)
  const uniqueTypes = uniqueFoodTypesTried(userId)
  const followers = state.follows.filter(f => f.following_user_id === userId).length
  const following = state.follows.filter(f => f.follower_user_id === userId).length
  const upvotes = userUpvotesReceived(userId)
  const rank = getRank(spotCount)
  return { profile, spotCount, reviewCount, completed, uniqueTypes, followers, following, upvotes, rank }
}

function nearbySpots(limit = 6, tag = '') {
  const geo = state.geo
  const spots = [...state.spots].filter(s => s.is_public !== false)
  const filtered = tag ? spots.filter(s => (s.food_tags || []).includes(tag)) : spots
  return filtered
    .map(spot => {
      const stats = reviewStatsForSpot(spot.id)
      const distance = geo ? distanceKm(geo.latitude, geo.longitude, Number(spot.latitude), Number(spot.longitude)) : Infinity
      return { ...spot, distance, stats }
    })
    .sort((a, b) => {
      const scoreA = (a.stats.weighted * 12) - Math.min(a.distance, 50)
      const scoreB = (b.stats.weighted * 12) - Math.min(b.distance, 50)
      return scoreB - scoreA
    })
    .slice(0, limit)
}

function highestRatedNearby(limit = 6) {
  return nearbySpots(limit)
}

function feedSpotScore(spot) {
  const stats = reviewStatsForSpot(spot.id)
  const ageHours = Math.max(1, (Date.now() - new Date(spot.created_at).getTime()) / 36e5)
  const freshnessBoost = Math.max(0, 24 - ageHours) * 0.08
  const distance = state.geo ? distanceKm(state.geo.latitude, state.geo.longitude, Number(spot.latitude), Number(spot.longitude)) : 10
  return stats.weighted * 8 + freshnessBoost - Math.min(distance, 20) * 0.15
}

function monthlyAwards() {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  const currentMonthReviews = state.reviews.filter(r => {
    const d = new Date(r.created_at)
    return d.getMonth() === month && d.getFullYear() === year
  })
  const byTag = {}
  state.spots.forEach(spot => {
    const monthReviewsForSpot = currentMonthReviews.filter(r => r.spot_id === spot.id)
    if (!monthReviewsForSpot.length) return
    const score = avg(monthReviewsForSpot.map(r => avg([Number(r.taste_rating), Number(r.portion_rating), Number(r.value_rating)])))
    const confidence = Math.min(monthReviewsForSpot.length, 8) * 0.12
    const awardScore = score + confidence
    ;(spot.food_tags || []).forEach(tag => {
      if (!byTag[tag] || awardScore > byTag[tag].score) byTag[tag] = { tag, score: awardScore, spot, reviewCount: monthReviewsForSpot.length }
    })
  })
  return Object.values(byTag).sort((a, b) => b.score - a.score)
}

function mostExploredFoodTypes(userId) {
  const counts = {}
  state.reviews.filter(r => r.user_id === userId).forEach(review => {
    const spot = state.spots.find(s => s.id === review.spot_id)
    ;(spot?.food_tags || []).forEach(tag => {
      counts[tag] = (counts[tag] || 0) + 1
    })
  })
  state.spots.filter(s => s.user_id === userId).forEach(spot => {
    ;(spot.food_tags || []).forEach(tag => {
      counts[tag] = (counts[tag] || 0) + 1
    })
  })
  return Object.entries(counts).sort((a, b) => b[1] - a[1])
}

function ratingsDistribution(userId) {
  const result = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  state.reviews.filter(r => r.user_id === userId).forEach(review => {
    const overall = Math.round(avg([Number(review.taste_rating), Number(review.portion_rating), Number(review.value_rating)]))
    result[overall] = (result[overall] || 0) + 1
  })
  return result
}

function discoveryTimeline(userId) {
  const map = {}
  state.spots.filter(s => s.user_id === userId).forEach(spot => {
    const key = new Date(spot.created_at).toLocaleDateString([], { month: 'short', year: 'numeric' })
    map[key] = (map[key] || 0) + 1
  })
  return Object.entries(map).map(([month, count]) => ({ month, count }))
}

function crawlStopsFor(crawlId) {
  return state.crawlStops
    .filter(stop => stop.crawl_id === crawlId)
    .sort((a, b) => a.stop_order - b.stop_order)
    .map(stop => ({ ...stop, spot: state.spots.find(s => s.id === stop.spot_id) }))
}

function cloneStopsFor(cloneId) {
  return state.crawlCloneStops
    .filter(stop => stop.crawl_clone_id === cloneId)
    .sort((a, b) => a.stop_order - b.stop_order)
    .map(stop => ({ ...stop, spot: state.spots.find(s => s.id === stop.spot_id) }))
}

async function fetchNASA() {
  try {
    const res = await fetch('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY')
    const data = await res.json()
    state.loadingPhoto = data
  } catch (error) {
    console.error('NASA error:', error?.message)
  }
}

function applyFallbackLocation(reason = 'Using fallback location.') {
  state.geo = { latitude: FALLBACK_LOCATION.latitude, longitude: FALLBACK_LOCATION.longitude }
  state.geoSource = 'fallback'
  state.geoError = reason
  state.country = {
    name: FALLBACK_LOCATION.country,
    code: FALLBACK_LOCATION.countryCode,
    flag: FALLBACK_LOCATION.flag,
    currencies: 'United States dollar',
    languages: 'English',
    population: 3898747,
    city: FALLBACK_LOCATION.city
  }
}

async function detectLocation(forcePrompt = false) {
  return new Promise(resolve => {
    try {
      if (!navigator.geolocation) {
        state.geoError = 'This browser does not support location.'
        resolve(null)
        return
      }

      const requestPosition = () => {
        navigator.geolocation.getCurrentPosition(
          pos => {
            state.geoError = ''
            resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
          },
          error => {
            console.warn('Geolocation error:', error?.message)
            state.geoError = error?.message || 'Unable to get your location.'
            resolve(null)
          },
          {
            enableHighAccuracy: false,
            timeout: forcePrompt ? 10000 : 6000,
            maximumAge: forcePrompt ? 0 : 600000
          }
        )
      }

      if (navigator.permissions?.query) {
        navigator.permissions.query({ name: 'geolocation' })
          .then(result => {
            if (result.state === 'granted' || result.state === 'prompt' || forcePrompt) {
              requestPosition()
              return
            }
            state.geoError = 'Location permission is blocked.'
            resolve(null)
          })
          .catch(() => requestPosition())
        return
      }

      requestPosition()
    } catch (error) {
      console.error('detectLocation error:', error?.message)
      state.geoError = error?.message || 'Unable to get your location.'
      resolve(null)
    }
  })
}

async function fetchCountryAndWeather() {
  if (!state.geo) {
    applyFallbackLocation('Location unavailable. Showing Los Angeles fallback.')
  }
  try {
    const reverse = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${state.geo.latitude}&longitude=${state.geo.longitude}&language=en&format=json`)
    const reverseData = await reverse.json()
    const place = reverseData?.results?.[0]
    const countryCode = place?.country_code || state.country?.code || FALLBACK_LOCATION.countryCode
    const city = place?.name || place?.admin1 || state.country?.city || FALLBACK_LOCATION.city

    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${state.geo.latitude}&longitude=${state.geo.longitude}&current=temperature_2m,weather_code,apparent_temperature&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`)
    const weatherData = await weatherRes.json()

    let country = null
    if (countryCode) {
      const countryRes = await fetch(`https://restcountries.com/v3.1/alpha/${countryCode}`)
      const countryData = await countryRes.json()
      country = Array.isArray(countryData) ? countryData[0] : null
    }

    state.country = country ? {
      name: country.name?.common || place?.country || state.country?.name || FALLBACK_LOCATION.country,
      code: country.cca2 || countryCode,
      flag: country.flag || state.country?.flag || FALLBACK_LOCATION.flag,
      currencies: Object.values(country.currencies || {}).map(c => c.name).join(', '),
      languages: Object.values(country.languages || {}).join(', '),
      population: country.population || 0,
      city
    } : {
      name: place?.country || state.country?.name || FALLBACK_LOCATION.country,
      code: countryCode,
      flag: state.country?.flag || FALLBACK_LOCATION.flag,
      currencies: state.country?.currencies || '-',
      languages: state.country?.languages || '-',
      population: state.country?.population || 0,
      city
    }

    state.weather = weatherData
  } catch (error) {
    console.error('Weather/country error:', error?.message)
    if (!state.country) applyFallbackLocation('Map location services are unavailable. Showing Los Angeles fallback.')
  }
}

function weatherSuggestion() {
  const code = state.weather?.current?.weather_code
  if (code == null) return 'Perfect time to scout your next street food stop.'
  if ([51,53,55,61,63,65,80,81,82].includes(code)) return 'Rainy day - perfect for a hot ramen spot nearby.'
  if ([0,1].includes(code)) return 'Clear skies - ideal for a sunny taco crawl.'
  if ([2,3,45,48].includes(code)) return 'Cloudy vibes - maybe grab BBQ and keep exploring.'
  return 'Weather looks interesting - spin for your next bite.'
}

function normalizeAuthMessage(message = '') {
  const text = String(message || '')
  if (/invalid login credentials/i.test(text)) return 'Incorrect email or password.'
  if (/email not confirmed/i.test(text)) return 'Please check your email and click the confirmation link first.'
  if (/user already registered|already been registered/i.test(text)) return 'An account with this email already exists. Try signing in instead.'
  if (/email rate limit exceeded/i.test(text)) return 'Too many attempts. Please wait a moment and try again.'
  if (/network/i.test(text)) return 'Network issue while contacting Supabase. Please try again.'
  return text || 'Authentication failed.'
}

function isMissingAppUserError(error) {
  const message = String(error?.message || '')
  return /no rows returned|json object requested, multiple \(or no\) rows returned|pgrst116/i.test(message)
}

function setAuthError(message = '') {
  state.authErrorText = message
  const errorEl = document.getElementById('auth-error')
  if (errorEl) errorEl.textContent = message
}

function beginAuthWork(message = 'Working...') {
  state.authRequestId += 1
  const requestId = state.authRequestId
  state.authBusy = true
  state.authMessage = message
  state.lastAuthActionAt = Date.now()
  if (state.authTimeoutId) clearTimeout(state.authTimeoutId)
  state.authTimeoutId = setTimeout(() => {
    if (state.authBusy && state.authRequestId === requestId) {
      console.warn('Auth timeout fallback triggered')
      state.authBusy = false
      state.authMessage = ''
      state.authProcessingSession = false
      setAuthError('Sign-in is taking too long. Please try again.')
      render()
    }
  }, AUTH_HANG_TIMEOUT_MS)
  return requestId
}

function finishAuthWork(requestId) {
  if (requestId !== state.authRequestId) return
  if (state.authTimeoutId) {
    clearTimeout(state.authTimeoutId)
    state.authTimeoutId = null
  }
  state.authBusy = false
  state.authMessage = ''
}

async function ensureAppUser(user) {
  if (!user?.id) return null

  const { data: existing, error: existingError } = await supabase
    .from(TABLES.appUsers)
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingError && !isMissingAppUserError(existingError)) throw existingError

  if (existing) {
    state.appUser = existing
    return existing
  }

  const payload = {
    user_id: user.id,
    email: user.email,
    display_name: user.email?.split('@')[0] || 'Food Scout',
    avatar_emoji: 'T'
  }

  const { data, error } = await supabase
    .from(TABLES.appUsers)
    .insert(payload)
    .select()
    .single()

  if (error) {
    const { data: retryExisting, error: retryError } = await supabase
      .from(TABLES.appUsers)
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (retryError && !isMissingAppUserError(retryError)) throw retryError
    if (retryExisting) {
      state.appUser = retryExisting
      return retryExisting
    }

    if (/row-level security|permission denied|violates row-level security policy/i.test(String(error.message || ''))) {
      state.appUser = {
        user_id: user.id,
        email: user.email,
        display_name: user.email?.split('@')[0] || 'Food Scout',
        avatar_emoji: 'T'
      }
      return state.appUser
    }

    throw error
  }

  state.appUser = data
  return data
}

async function loadData() {
  const [spotsRes, reviewsRes, followsRes, crawlsRes, crawlStopsRes, crawlClonesRes, crawlCloneStopsRes, profilesRes, commentsRes, commentLikesRes, savedAreasRes] = await Promise.all([
    supabase.from(TABLES.spots).select('*').order('created_at', { ascending: false }),
    supabase.from(TABLES.reviews).select('*').order('created_at', { ascending: false }),
    supabase.from(TABLES.follows).select('*'),
    supabase.from(TABLES.crawls).select('*').order('created_at', { ascending: false }),
    supabase.from(TABLES.crawlStops).select('*').order('stop_order', { ascending: true }),
    supabase.from(TABLES.crawlClones).select('*').order('created_at', { ascending: false }),
    supabase.from(TABLES.crawlCloneStops).select('*').order('stop_order', { ascending: true }),
    supabase.from(TABLES.appUsers).select('*'),
    supabase.from(TABLES.comments).select('*').order('created_at', { ascending: false }),
    supabase.from(TABLES.commentLikes).select('*'),
    supabase.from(TABLES.savedAreas).select('*').order('created_at', { ascending: false })
  ])

  state.spots = spotsRes.data || []
  state.reviews = reviewsRes.data || []
  state.follows = followsRes.data || []
  state.crawls = crawlsRes.data || []
  state.crawlStops = crawlStopsRes.data || []
  state.crawlClones = crawlClonesRes.data || []
  state.crawlCloneStops = crawlCloneStopsRes.data || []
  state.profiles = profilesRes.data || []
  state.comments = commentsRes.data || []
  state.commentLikes = commentLikesRes.data || []
  state.savedAreas = savedAreasRes.data || []
  buildPersonalizedFeed()
}

function buildPersonalizedFeed() {
  if (!state.user?.id) {
    state.personalizedFeed = []
    return
  }
  const following = new Set(state.follows.filter(f => f.follower_user_id === state.user.id).map(f => f.following_user_id))
  const feedItems = []
  state.spots.forEach(spot => {
    if (following.has(spot.user_id)) feedItems.push({ type: 'spot', created_at: spot.created_at, item: spot, score: feedSpotScore(spot) })
  })
  state.reviews.forEach(review => {
    if (following.has(review.user_id)) {
      const spot = state.spots.find(s => s.id === review.spot_id)
      const recency = Math.max(0, 48 - ((Date.now() - new Date(review.created_at).getTime()) / 36e5)) * 0.05
      const score = avg([review.taste_rating, review.portion_rating, review.value_rating]) + recency + (spot ? feedSpotScore(spot) * 0.2 : 0)
      feedItems.push({ type: 'review', created_at: review.created_at, item: review, score })
    }
  })
  state.personalizedFeed = feedItems.sort((a, b) => b.score - a.score || new Date(b.created_at) - new Date(a.created_at)).slice(0, 20)
}

function spinFoodType() {
  const pick = FOOD_TYPES[Math.floor(Math.random() * FOOD_TYPES.length)]
  const best = nearbySpots(20, pick).sort((a, b) => b.stats.weighted - a.stats.weighted)[0] || null
  state.spinnerResult = { type: pick, best }
  render()
}

function setNav(nav) {
  state.nav = nav
  render()
}

function openSpot(id) {
  state.currentSpotId = id
  state.nav = 'spot'
  render()
}

function openProfile(userId) {
  state.currentProfileUserId = userId
  state.nav = 'profile'
  render()
}

function renderAuth() {
  return `
    <div class="auth-wrap">
      <div class="card auth-card stamp-card">
        <div class="brand-mark"><i class="fa-solid fa-map-location-dot"></i></div>
        <h1 class="title">WanderMap</h1>
        <p class="subtitle">Street food scouting with neon grit. Drop pins, write reviews, build crawls, and follow the city's best bites.</p>
        <form id="auth-form" class="form-stack" style="margin-top:18px;">
          <div>
            <label class="label">Email</label>
            <input class="input" type="email" name="email" required ${state.authBusy ? 'disabled' : ''}>
          </div>
          <div>
            <label class="label">Password</label>
            <input class="input" type="password" name="password" required minlength="6" ${state.authBusy ? 'disabled' : ''}>
          </div>
          <div id="auth-error" class="auth-error">${escapeHtml(state.authErrorText || '')}</div>
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
        <p class="subtitle">We sent a confirmation link to <strong>${escapeHtml(state.pendingEmail || '')}</strong>. Tap the link, then come back and sign in to start mapping bites.</p>
        <button class="btn btn-primary" id="go-signin" style="width:100%; margin-top:18px;">Go to sign in</button>
      </div>
    </div>
  `
}

function renderLoading() {
  const image = state.loadingPhoto?.url || ''
  return `
    <div class="loading-screen">
      <div class="card loading-card stamp-card">
        <div class="loading-media" style="background-image:url('${escapeHtml(image)}')">
          <div class="loading-overlay"></div>
        </div>
        <div class="loading-copy">
          <div class="kicker">Daily cosmic snack break</div>
          <h1 class="title" style="text-align:left; margin-top:10px;">Loading WanderMap</h1>
          <p class="hero-copy">NASA APOD sets the mood while we scout your location, weather, and nearby street food scene.</p>
          <p class="log-city" style="margin-top:12px;">If this takes more than a few seconds, WanderMap will continue with a fallback city and you can refresh location later.</p>
        </div>
      </div>
    </div>
  `
}

function renderTopbar() {
  const userId = state.user?.id || state.currentProfileUserId || null
  const rank = userId ? getRank(currentUserSpotCount(userId)) : getRank(0)
  return `
    <div class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <div class="brand-icon"><i class="fa-solid fa-map-location-dot"></i></div>
          <div>
            <h1>WanderMap</h1>
            <p>${escapeHtml(weatherSuggestion())}</p>
          </div>
        </div>
        <div class="top-actions">
          <span class="meta-chip">${rank.icon} ${rank.name}</span>
          <button class="btn btn-secondary" id="refresh-location">Refresh location</button>
          <button class="btn btn-ghost" id="sign-out">Sign out</button>
        </div>
      </div>
      <div class="nav-tabs">
        ${['home','map','add','crawls','bucket','profile'].map(tab => `<button class="nav-tab ${state.nav === tab ? 'active' : ''}" data-nav="${tab}">${tab === 'add' ? 'Add Spot' : tab.charAt(0).toUpperCase() + tab.slice(1)}</button>`).join('')}
      </div>
    </div>
  `
}

function renderSpotCard(spot) {
  const stats = reviewStatsForSpot(spot.id)
  const owner = profileFor(spot.user_id)
  const distance = state.geo ? distanceKm(state.geo.latitude, state.geo.longitude, Number(spot.latitude), Number(spot.longitude)) : null
  const isFollowing = state.user && state.user.id !== spot.user_id && state.follows.some(f => f.follower_user_id === state.user.id && f.following_user_id === spot.user_id)
  return `
    <div class="card log-card stamp-card">
      <div class="log-head">
        <div>
          <div class="kicker">${spot.country_flag || ''} ${escapeHtml(spot.country_name || 'Local')}</div>
          <h3 style="margin-top:8px;">${escapeHtml(spot.name)}</h3>
          <div class="log-city">by ${escapeHtml(owner?.display_name || 'Food scout')} - ${fmtDateTime(spot.created_at)}</div>
        </div>
        <div class="meta-chip">${stats.count ? stats.overall.toFixed(1) + ' star' : 'New'}</div>
      </div>
      <p class="log-notes">${escapeHtml(spot.description || '')}</p>
      <div class="tag-row">${(spot.food_tags || []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')} <span class="meta-chip">${escapeHtml(spot.price_range)}</span> ${distance != null ? `<span class="meta-chip">${distance.toFixed(1)} km</span>` : ''}</div>
      <div class="meta-row">
        <button class="btn btn-secondary open-spot" data-spot-id="${spot.id}">Open spot</button>
        <button class="btn btn-ghost open-profile" data-user-id="${spot.user_id}">Profile</button>
        ${state.user && state.user.id !== spot.user_id ? `<button class="btn btn-secondary follow-btn" data-user-id="${spot.user_id}">${isFollowing ? 'Following' : 'Follow'}</button>` : ''}
      </div>
    </div>
  `
}

function renderHome() {
  const recent = [...state.spots].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6)
  const nearby = highestRatedNearby(6)
  return `
    <div class="page-shell">
      <section class="hero">
        <div class="hero-grid">
          <div class="card hero-main stamp-card">
            <div class="kicker">Street food explorer</div>
            <h1 class="hero-title">Find the loudest flavors around you.</h1>
            <p class="hero-copy">Drop GPS-tagged street food spots, review them, and stitch them into food crawls with walk times.</p>
            <div class="hero-actions">
              <button class="btn btn-primary" data-nav="add">Add a spot</button>
              <button class="btn btn-secondary" data-nav="map">Open map</button>
              <button class="btn btn-ghost" data-nav="bucket">Saved areas</button>
            </div>
            <div class="mini-stats">
              <div class="stat-pill"><strong>${state.spots.length}</strong><span>Spots discovered</span></div>
              <div class="stat-pill"><strong>${state.reviews.length}</strong><span>Reviews dropped</span></div>
              <div class="stat-pill"><strong>${state.crawls.length}</strong><span>Food crawls mapped</span></div>
            </div>
          </div>
          <div class="card hero-side stamp-card">
            <div class="kicker">Local context</div>
            <h3 style="margin-top:10px; font-size:1.3rem;">${escapeHtml(state.country?.flag || '')} ${escapeHtml(state.country?.city || 'Unknown area')}</h3>
            <p class="hero-copy">${state.weather?.current ? `${Math.round(state.weather.current.temperature_2m)} degrees now, feels like ${Math.round(state.weather.current.apparent_temperature)}. ` : ''}${escapeHtml(state.country?.name || '')}</p>
            <div class="meta-row">
              <span class="meta-chip">Currencies: ${escapeHtml(state.country?.currencies || '-')}</span>
              <span class="meta-chip">Languages: ${escapeHtml(state.country?.languages || '-')}</span>
            </div>
            <div class="meta-row">
              <span class="meta-chip">Population: ${state.country?.population ? Number(state.country.population).toLocaleString() : '-'}</span>
              <span class="meta-chip">GPS: ${state.geo ? `${state.geo.latitude.toFixed(3)}, ${state.geo.longitude.toFixed(3)}` : 'Location off'}</span>
            </div>
            <div class="meta-row">
              <span class="meta-chip">Source: ${state.geoSource === 'device' ? 'Device GPS' : 'Fallback city'}</span>
              ${state.geoError ? `<span class="meta-chip">${escapeHtml(state.geoError)}</span>` : ''}
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-title"><div><h2>Recently added spots</h2><p>Fresh pins from the community.</p></div></div>
        <div class="grid feed-grid">
          <div class="log-list">
            ${recent.length ? recent.map(renderSpotCard).join('') : `<div class="card log-card">No spots yet. Be the first to tag a food gem.</div>`}
          </div>
          <div class="side-stack">
            <div class="card stats-card stamp-card">
              <div class="section-title"><div><h2 style="font-size:1.25rem;">Highest rated nearby</h2><p>Weighted for quality, confidence, and distance.</p></div></div>
              ${nearby.length ? nearby.map(spot => {
                const owner = profileFor(spot.user_id)
                return `<div style="padding:14px 0; border-top:1px solid var(--border);">
                  <div class="log-head"><div><strong>${escapeHtml(spot.name)}</strong><div class="log-city">${spot.country_flag || ''} ${escapeHtml((spot.food_tags || []).join(', '))}</div></div><div class="meta-chip">${spot.stats.overall.toFixed(1)} star</div></div>
                  <div class="meta-row"><span class="meta-chip">${Number.isFinite(spot.distance) ? `${spot.distance.toFixed(1)} km away` : 'Distance unavailable'}</span><span class="meta-chip">by ${escapeHtml(owner?.display_name || 'Food scout')}</span><span class="meta-chip">${spot.stats.count} reviews</span></div>
                  <div class="meta-row"><button class="btn btn-secondary open-spot" data-spot-id="${spot.id}">Open</button></div>
                </div>`
              }).join('') : `<div class="card log-card">Add reviews to surface nearby legends.</div>`}
            </div>
          </div>
        </div>
      </section>
    </div>
  `
}

function renderMapPage() {
  return `
    <div class="page-shell section">
      <div class="card stats-card stamp-card">
        <div class="section-title"><div><h2>Interactive street food map</h2><p>Location-aware browsing and saved area shortcuts.</p></div></div>
        <div class="info-grid">
          <div class="info-box"><strong>Closest hot spots</strong><div class="log-city">${highestRatedNearby(1)[0] ? escapeHtml(highestRatedNearby(1)[0].name) : 'No nearby spots yet'}</div></div>
          <div class="info-box"><strong>Saved areas</strong><div class="log-city">${state.savedAreas.length} saved</div></div>
        </div>
        <div class="log-list" style="margin-top:16px;">
          ${highestRatedNearby(8).map(spot => `<div style="padding:12px 0; border-top:1px solid var(--border);"><strong>${escapeHtml(spot.name)}</strong><div class="log-city">${Number.isFinite(spot.distance) ? spot.distance.toFixed(1) : '-'} km - ${spot.stats.overall.toFixed(1)} star - ${(spot.food_tags || []).join(', ')}</div><div class="meta-row"><button class="btn btn-secondary open-spot" data-spot-id="${spot.id}">Open</button></div></div>`).join('') || `<div class="card log-card">Add spots to light up the map.</div>`}
        </div>
      </div>
    </div>
  `
}

function renderAddSpot() {
  return `
    <div class="page-shell section">
      <div class="grid feed-grid">
        <div class="card form-card stamp-card">
          <div class="section-title"><div><h2>Add a street food spot</h2><p>Coordinates come from your browser geolocation, with a fallback city if GPS is blocked.</p></div></div>
          <form id="spot-form" class="form-stack">
            <div>
              <label class="label">Spot name</label>
              <input class="input" name="name" required placeholder="Midnight Tacos Cart">
            </div>
            <div>
              <label class="label">Description</label>
              <textarea class="textarea" name="description" required placeholder="Why this place hits, what to order, and the vibe."></textarea>
            </div>
            <div class="info-grid">
              <div>
                <label class="label">Price range</label>
                <select class="select" name="price_range">${PRICE_OPTIONS.map(p => `<option value="${p}">${p}</option>`).join('')}</select>
              </div>
              <div>
                <label class="label">GPS capture</label>
                <div class="meta-chip" style="padding:14px 16px; display:block;">${state.geo ? `${state.geo.latitude.toFixed(5)}, ${state.geo.longitude.toFixed(5)} - ${state.geoSource === 'device' ? 'device' : 'fallback'}` : 'Location unavailable'}</div>
              </div>
            </div>
            <div>
              <label class="label">Food type tags</label>
              <div class="tag-row">
                ${FOOD_TYPES.map(tag => `<label class="tag" style="cursor:pointer;"><input type="checkbox" name="food_tags" value="${tag}" style="margin-right:8px;">${tag}</label>`).join('')}
              </div>
            </div>
            <button class="btn btn-primary" type="submit">Save this spot</button>
          </form>
        </div>
        <div class="side-stack">
          <div class="card stats-card stamp-card">
            <h3>Auto-tagging</h3>
            <p class="hero-copy">WanderMap uses browser geolocation first, then reverse geocoding and country data to tag each spot. If device GPS is unavailable, it falls back to Los Angeles so the app still works.</p>
            <div class="meta-row">
              <span class="meta-chip">Country: ${escapeHtml(state.country?.name || '-')}</span>
              <span class="meta-chip">Flag: ${escapeHtml(state.country?.flag || '-')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}

function renderSpotPage() {
  const spot = state.spots.find(s => s.id === state.currentSpotId) || state.spots[0]
  if (!spot) return `<div class="page-shell section"><div class="card log-card">No spot selected yet.</div></div>`
  state.currentSpotId = spot.id
  const stats = reviewStatsForSpot(spot.id)
  const owner = profileFor(spot.user_id)
  const comments = commentTreeForSpot(spot.id)
  return `
    <div class="page-shell section">
      <div class="card city-banner stamp-card">
        <div class="parallax-layer parallax-grid"></div>
        <div class="parallax-layer parallax-compass"><i class="fa-solid fa-location-dot"></i></div>
        <div class="city-banner-content">
          <div class="kicker">${spot.country_flag || ''} ${escapeHtml(spot.country_name || 'Local streets')}</div>
          <h1 class="hero-title">${escapeHtml(spot.name)}</h1>
          <p class="hero-copy">${escapeHtml(spot.description || '')}</p>
          <div class="tag-row">${(spot.food_tags || []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}<span class="meta-chip">${escapeHtml(spot.price_range)}</span><span class="meta-chip">Pinned by ${escapeHtml(owner?.display_name || 'Food scout')}</span></div>
        </div>
      </div>

      <div class="grid feed-grid" style="margin-top:16px;">
        <div class="side-stack">
          <div class="card stats-card stamp-card">
            <div class="section-title"><div><h2>Community ratings</h2><p>Taste, portion size, and value.</p></div></div>
            <div class="info-grid">
              <div class="info-box"><strong>${stats.taste.toFixed(1)}</strong><div class="log-city">Taste</div></div>
              <div class="info-box"><strong>${stats.portion.toFixed(1)}</strong><div class="log-city">Portion</div></div>
              <div class="info-box"><strong>${stats.value.toFixed(1)}</strong><div class="log-city">Value</div></div>
              <div class="info-box"><strong>${stats.overall.toFixed(1)}</strong><div class="log-city">Overall</div></div>
            </div>
          </div>
          <div class="card form-card stamp-card">
            <div class="section-title"><div><h2>Leave a review</h2><p>Tell the next foodie what to expect.</p></div></div>
            <form id="review-form" class="form-stack">
              <div class="info-grid">
                <div><label class="label">Taste</label><select class="select" name="taste_rating">${[1,2,3,4,5].map(n => `<option value="${n}">${n}</option>`).join('')}</select></div>
                <div><label class="label">Portion</label><select class="select" name="portion_rating">${[1,2,3,4,5].map(n => `<option value="${n}">${n}</option>`).join('')}</select></div>
                <div><label class="label">Value</label><select class="select" name="value_rating">${[1,2,3,4,5].map(n => `<option value="${n}">${n}</option>`).join('')}</select></div>
              </div>
              <div><label class="label">Review</label><textarea class="textarea" name="review_text" placeholder="What should people order? Was it worth the wait?"></textarea></div>
              <button class="btn btn-primary" type="submit">Drop review</button>
            </form>
          </div>
          <div class="side-stack">
            ${stats.reviews.length ? stats.reviews.map(review => {
              const profile = profileFor(review.user_id)
              return `<div class="card log-card stamp-card"><div class="log-head"><div><strong>${escapeHtml(profile?.display_name || 'Food scout')}</strong><div class="log-city">${fmtDateTime(review.created_at)}</div></div><div class="meta-chip">${Math.round(avg([review.taste_rating, review.portion_rating, review.value_rating]))} star</div></div><p class="log-notes">${escapeHtml(review.review_text || '')}</p><div class="meta-row"><span class="meta-chip">Taste ${review.taste_rating}</span><span class="meta-chip">Portion ${review.portion_rating}</span><span class="meta-chip">Value ${review.value_rating}</span></div></div>`
            }).join('') : `<div class="card log-card">No reviews yet. Be the first to rate it.</div>`}
          </div>
          <div class="card stats-card stamp-card">
            <div class="section-title"><div><h2>Comments</h2><p>Quick reactions, tips, and replies.</p></div></div>
            <form id="comment-form" class="form-stack">
              <input type="hidden" name="parent_comment_id" value="${escapeHtml(state.currentReplyParentId || '')}">
              <div><label class="label">Comment ${state.currentReplyParentId ? '(replying)' : ''}</label><textarea class="textarea" name="comment_text" placeholder="Best order? Best time to go? Parking tricks?"></textarea></div>
              <button class="btn btn-primary" type="submit">Post comment</button>
            </form>
            <div class="comment-list" style="display:grid; gap:10px; margin-top:18px;">
              ${comments.length ? comments.map(renderCommentCard).join('') : `<div class="card log-card">No comments yet. Start the conversation.</div>`}
            </div>
          </div>
        </div>
        <div class="side-stack">
          <div class="card stats-card stamp-card">
            <h3>Spot details</h3>
            <div class="meta-row">
              <span class="meta-chip">Lat ${Number(spot.latitude).toFixed(4)}</span>
              <span class="meta-chip">Lon ${Number(spot.longitude).toFixed(4)}</span>
            </div>
            <div class="meta-row">
              <span class="meta-chip">Added ${fmtDate(spot.created_at)}</span>
              <span class="meta-chip">${state.geo ? `${distanceKm(state.geo.latitude, state.geo.longitude, Number(spot.latitude), Number(spot.longitude)).toFixed(1)} km away` : 'Distance unavailable'}</span>
            </div>
          </div>
          <div class="card stats-card stamp-card">
            <h3>Nearby alternatives</h3>
            ${nearbySpots(5).filter(s => s.id !== spot.id).map(s => `<div style="padding:12px 0; border-top:1px solid var(--border);"><strong>${escapeHtml(s.name)}</strong><div class="log-city">${Number.isFinite(s.distance) ? s.distance.toFixed(1) : '-'} km - ${s.stats.overall.toFixed(1)} star</div><button class="btn btn-secondary open-spot" data-spot-id="${s.id}" style="margin-top:8px;">Open</button></div>`).join('') || `<div class="card log-card">No nearby alternatives yet.</div>`}
          </div>
        </div>
      </div>
    </div>
  `
}

function renderCommentCard(comment) {
  const liked = state.commentLikes.some(like => like.comment_id === comment.id && like.user_id === state.user?.id)
  return `
    <div class="card log-card">
      <div class="log-head">
        <div>
          <strong>${escapeHtml(comment.profile?.display_name || 'Food scout')}</strong>
          <div class="log-city">${fmtDateTime(comment.created_at)}</div>
        </div>
        <div class="meta-chip">${comment.likes} likes</div>
      </div>
      <p class="log-notes">${escapeHtml(comment.comment_text || '')}</p>
      <div class="meta-row">
        <button class="btn btn-secondary toggle-comment-like" data-comment-id="${comment.id}">${liked ? 'Liked' : 'Like'}</button>
        <button class="btn btn-ghost reply-comment" data-comment-id="${comment.id}">Reply</button>
      </div>
      ${comment.replies?.length ? `<div class="comment-list" style="display:grid; gap:10px; margin-top:12px; padding-left:18px; border-left:2px solid rgba(255,255,255,0.08);">${comment.replies.map(reply => {
        const replyLiked = state.commentLikes.some(like => like.comment_id === reply.id && like.user_id === state.user?.id)
        return `<div class="card log-card"><div class="log-head"><div><strong>${escapeHtml(reply.profile?.display_name || 'Food scout')}</strong><div class="log-city">${fmtDateTime(reply.created_at)}</div></div><div class="meta-chip">${reply.likes} likes</div></div><p class="log-notes">${escapeHtml(reply.comment_text || '')}</p><div class="meta-row"><button class="btn btn-secondary toggle-comment-like" data-comment-id="${reply.id}">${replyLiked ? 'Liked' : 'Like'}</button></div></div>`
      }).join('')}</div>` : ''}
    </div>
  `
}

function renderCrawls() {
  const availableSpots = state.spots.slice(0, 20)
  const myClones = state.user?.id ? state.crawlClones.filter(c => c.user_id === state.user.id) : []
  return `
    <div class="page-shell section">
      <div class="grid feed-grid">
        <div class="card form-card stamp-card">
          <div class="section-title"><div><h2>Create a food crawl</h2><p>Build a 3 to 7 stop route with estimated walk times.</p></div></div>
          <form id="crawl-form" class="form-stack">
            <div><label class="label">Crawl name</label><input class="input" name="name" required placeholder="Late Night Neon Noodles"></div>
            <div><label class="label">Description</label><textarea class="textarea" name="description" placeholder="What makes this route worth the walk?"></textarea></div>
            <div>
              <label class="label">Pick 3 to 7 spots in order</label>
              <div class="side-stack" style="max-height:320px; overflow:auto;">
                ${availableSpots.length ? availableSpots.map(spot => `<label class="card" style="padding:12px 14px; border-radius:16px; cursor:pointer;"><input type="checkbox" name="spot_ids" value="${spot.id}" style="margin-right:10px;"> <strong>${escapeHtml(spot.name)}</strong><div class="log-city">${escapeHtml((spot.food_tags || []).join(', '))} - ${escapeHtml(spot.country_flag || '')}</div></label>`).join('') : `<div class="card log-card">Add spots first to build a crawl.</div>`}
              </div>
            </div>
            <button class="btn btn-primary" type="submit">Map this crawl</button>
          </form>
        </div>
        <div class="side-stack">
          <div class="card stats-card stamp-card">
            <div class="section-title"><div><h2>Public crawls</h2><p>Clone one and complete it.</p></div></div>
            ${state.crawls.length ? state.crawls.map(crawl => {
              const stops = crawlStopsFor(crawl.id)
              return `<div style="padding:14px 0; border-top:1px solid var(--border);"><div class="log-head"><div><strong>${escapeHtml(crawl.name)}</strong><div class="log-city">${escapeHtml(crawl.city_name || 'Local')} - ${stops.length} stops</div></div><button class="btn btn-secondary clone-crawl" data-crawl-id="${crawl.id}">Clone</button></div><p class="log-notes">${escapeHtml(crawl.description || '')}</p><div class="meta-row">${stops.map(stop => `<span class="meta-chip">${stop.stop_order}. ${escapeHtml(stop.spot?.name || 'Spot')} ${stop.estimated_walk_minutes ? `- ${stop.estimated_walk_minutes} min` : ''}</span>`).join('')}</div></div>`
            }).join('') : `<div class="card log-card">No public crawls yet.</div>`}
          </div>
          <div class="card stats-card stamp-card">
            <div class="section-title"><div><h2>Your cloned crawls</h2><p>Mark stops visited and finish strong.</p></div></div>
            ${myClones.length ? myClones.map(clone => {
              const stops = cloneStopsFor(clone.id)
              const allVisited = stops.length && stops.every(s => s.visited)
              return `<div style="padding:14px 0; border-top:1px solid var(--border);"><strong>${escapeHtml(state.crawls.find(c => c.id === clone.crawl_id)?.name || 'Crawl')}</strong><div class="log-city">${clone.status === 'completed' ? `Completed ${fmtDate(clone.completed_at)}` : 'In progress'}</div><div class="side-stack" style="margin-top:10px;">${stops.map(stop => `<div class="card" style="padding:10px 12px; border-radius:14px;">${stop.visited ? 'Done' : 'Todo'} ${stop.stop_order}. ${escapeHtml(stop.spot?.name || 'Spot')} ${!stop.visited && clone.status !== 'completed' ? `<button class="btn btn-ghost mark-stop" data-clone-stop-id="${stop.id}" style="margin-left:10px;">Visited</button>` : ''}</div>`).join('')}</div>${clone.status !== 'completed' && allVisited ? `<div class="form-stack" style="margin-top:12px;"><input class="input complete-rating" data-clone-id="${clone.id}" type="number" min="1" max="5" placeholder="Overall rating 1-5"><textarea class="textarea complete-notes" data-clone-id="${clone.id}" placeholder="How was the crawl overall?"></textarea><button class="btn btn-primary complete-crawl" data-clone-id="${clone.id}">Complete crawl</button></div>` : ''}${clone.status === 'completed' ? `<div class="meta-row"><span class="meta-chip">Overall ${clone.overall_rating || '-'} / 5</span><span class="meta-chip">${escapeHtml(clone.notes || '')}</span></div>` : ''}</div>`
            }).join('') : `<div class="card log-card">Clone a public crawl to track your route.</div>`}
          </div>
        </div>
      </div>
    </div>
  `
}

function renderBucketList() {
  return `
    <div class="page-shell section">
      <div class="grid feed-grid">
        <div class="card bucket-card stamp-card">
          <div class="section-title"><div><h2>Save a city or food area</h2><p>Build a bucket list of places you want to hunt next.</p></div></div>
          <form id="bucket-form" class="form-stack">
            <div class="info-grid">
              <div><label class="label">Label</label><input class="input" name="label" required placeholder="Downtown ramen run"></div>
              <div><label class="label">City name</label><input class="input" name="city_name" value="${escapeHtml(state.country?.city || '')}" placeholder="Los Angeles"></div>
            </div>
            <div class="info-grid">
              <div><label class="label">Country name</label><input class="input" name="country_name" value="${escapeHtml(state.country?.name || '')}" placeholder="United States"></div>
              <div><label class="label">Radius km</label><input class="input" name="radius_km" type="number" min="1" max="50" step="0.5" value="5"></div>
            </div>
            <div><label class="label">Notes</label><textarea class="textarea" name="notes" placeholder="Night market, best after 8pm, heard the dumplings are wild."></textarea></div>
            <button class="btn btn-primary" type="submit">Save to bucket list</button>
          </form>
        </div>
        <div class="side-stack">
          <div class="card bucket-card stamp-card">
            <div class="section-title"><div><h2>Saved areas</h2><p>Tap one to revisit later.</p></div></div>
            <div class="log-list">
              ${state.savedAreas.length ? state.savedAreas.map(area => `<div class="card log-card stamp-card"><div class="kicker">${escapeHtml(area.city_name || 'Area')}</div><h3 style="margin-top:8px;">${escapeHtml(area.label)}</h3><p class="log-city">${escapeHtml(area.country_name || '')}</p><div class="meta-row"><span class="meta-chip">${Number(area.radius_km || 5).toFixed(1)} km radius</span></div><div class="log-city" style="margin-top:10px;">Pinned at ${Number(area.latitude).toFixed(3)}, ${Number(area.longitude).toFixed(3)}</div></div>`).join('') : `<div class="card log-card">No saved areas yet.</div>`}
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}

function renderProfile() {
  const userId = state.currentProfileUserId || state.user?.id || null
  if (!userId) {
    return `<div class="page-shell section"><div class="card log-card">Sign in to view your foodie profile.</div></div>`
  }
  const summary = buildProfileSummary(userId)
  const cloud = mostExploredFoodTypes(userId)
  const dist = ratingsDistribution(userId)
  const timeline = discoveryTimeline(userId)
  const recentSpots = state.spots.filter(s => s.user_id === userId).slice(0, 6)
  const recentReviews = state.reviews.filter(r => r.user_id === userId).slice(0, 6)
  return `
    <div class="page-shell section">
      <div class="grid feed-grid">
        <div class="card profile-card stamp-card">
          <div class="kicker">Foodie profile</div>
          <h1 class="hero-title" style="font-size:2.2rem;">${escapeHtml(summary.profile?.display_name || 'Food scout')}</h1>
          <p class="hero-copy">${escapeHtml(summary.profile?.email || '')}</p>
          <div class="meta-row" style="margin-top:16px;"><span class="meta-chip">${summary.rank.icon} ${summary.rank.name}</span></div>
          <div class="mini-stats">
            <div class="stat-pill"><strong>${summary.spotCount}</strong><span>Spots discovered</span></div>
            <div class="stat-pill"><strong>${summary.reviewCount}</strong><span>Reviews written</span></div>
            <div class="stat-pill"><strong>${summary.completed}</strong><span>Crawls completed</span></div>
          </div>
          <div class="meta-row"><span class="meta-chip">Unique food types ${summary.uniqueTypes}</span><span class="meta-chip">Followers ${summary.followers}</span><span class="meta-chip">Following ${summary.following}</span><span class="meta-chip">Review signals ${summary.upvotes}</span></div>
          ${state.user && state.user.id !== userId ? `<div class="meta-row"><button class="btn btn-secondary follow-btn" data-user-id="${userId}">${state.follows.some(f => f.follower_user_id === state.user.id && f.following_user_id === userId) ? 'Following' : 'Follow'}</button></div>` : ''}
        </div>
        <div class="card stats-card stamp-card">
          <div class="section-title"><div><h2>Discovery timeline</h2><p>How this foodie's discoveries stack up over time.</p></div></div>
          <div class="log-list">
            ${timeline.length ? timeline.map(item => `<div style="padding:12px 0; border-top:1px solid var(--border);"><strong>${escapeHtml(item.month)}</strong><div class="log-city">${item.count} new spot${item.count > 1 ? 's' : ''} discovered</div></div>`).join('') : `<div class="card log-card">Add spots to start the timeline.</div>`}
          </div>
        </div>
      </div>

      <div class="grid feed-grid" style="margin-top:16px;">
        <div class="side-stack">
          <div class="card stats-card stamp-card">
            <div class="section-title"><div><h2>Tag cloud</h2><p>Most explored food types sized by frequency.</p></div></div>
            <div class="tag-row">
              ${cloud.length ? cloud.map(([tag, count]) => `<span class="tag" style="font-size:${0.9 + Math.min(count, 8) * 0.18}rem">${escapeHtml(tag)} x ${count}</span>`).join('') : `<div class="card log-card">Review spots to grow the tag cloud.</div>`}
            </div>
          </div>
          <div class="card stats-card stamp-card">
            <div class="section-title"><div><h2>Ratings distribution</h2><p>Histogram of the ratings given.</p></div></div>
            <div class="mini-stats">
              ${Object.entries(dist).map(([rating, count]) => `<div class="stat-pill"><strong>${count}</strong><span>${rating} star</span></div>`).join('')}
            </div>
          </div>
          <div class="card stats-card stamp-card">
            <div class="section-title"><div><h2>Recent discoveries</h2><p>Latest spots found by this foodie.</p></div></div>
            ${recentSpots.length ? recentSpots.map(renderSpotCard).join('') : `<div class="card log-card">No public discoveries yet.</div>`}
          </div>
        </div>
        <div class="side-stack">
          <div class="card stats-card stamp-card">
            <div class="section-title"><div><h2>Recent reviews</h2><p>What this foodie has been saying lately.</p></div></div>
            ${recentReviews.length ? recentReviews.map(review => {
              const spot = state.spots.find(s => s.id === review.spot_id)
              return `<div style="padding:12px 0; border-top:1px solid var(--border);"><strong>${escapeHtml(spot?.name || 'Spot')}</strong><div class="log-city">${fmtDateTime(review.created_at)}</div><p class="log-notes">${escapeHtml(review.review_text || '')}</p><div class="meta-chip">${Math.round(avg([review.taste_rating, review.portion_rating, review.value_rating]))} star</div></div>`
            }).join('') : `<div class="card log-card">No reviews yet.</div>`}
          </div>
        </div>
      </div>
    </div>
  `
}

function renderApp() {
  if (!state.user) {
    state.screen = 'auth'
    return renderAuth()
  }
  let body = ''
  if (state.nav === 'home') body = renderHome()
  if (state.nav === 'map') body = renderMapPage()
  if (state.nav === 'add') body = renderAddSpot()
  if (state.nav === 'spot') body = renderSpotPage()
  if (state.nav === 'crawls') body = renderCrawls()
  if (state.nav === 'bucket') body = renderBucketList()
  if (state.nav === 'profile') body = renderProfile()

  return `
    ${renderTopbar()}
    ${state.notice ? `<div class="page-shell" style="padding-top:14px;"><div class="card" style="padding:14px 18px; border-radius:18px; background:rgba(255,127,110,0.14); border-color:rgba(255,127,110,0.25);">${escapeHtml(state.notice)}</div></div>` : ''}
    ${body}
  `
}

function render() {
  if (state.screen === 'loading') app.innerHTML = renderLoading()
  else if (state.screen === 'auth') app.innerHTML = renderAuth()
  else if (state.screen === 'check-email') app.innerHTML = renderCheckEmail()
  else app.innerHTML = renderApp()
  bindEvents()
}

async function enterAppWithSession(session) {
  const nextUser = session?.user || null
  state.session = session || null
  state.user = nextUser

  if (!nextUser) {
    state.appUser = null
    state.currentProfileUserId = null
    state.currentSpotId = null
    state.personalizedFeed = []
    state.nav = 'home'
    state.screen = 'auth'
    state.authMode = 'signin'
    render()
    return
  }

  await ensureAppUser(nextUser)
  await loadData()
  state.screen = 'app'
  state.authMode = 'signin'
  render()
}

const handleAuthSubmit = safeRun(async event => {
  event.preventDefault()
  if (state.authBusy) return

  const form = new FormData(event.currentTarget)
  const email = String(form.get('email') || '').trim().toLowerCase()
  const password = String(form.get('password') || '').trim()

  setAuthError('')
  const requestId = beginAuthWork(state.authMode === 'signup' ? 'Creating account...' : 'Signing in...')
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
          setAuthError(normalizeAuthMessage(signIn.error.message))
          return
        }
        await enterAppWithSession(signIn.data.session)
        return
      }

      if (error) {
        setAuthError(normalizeAuthMessage(error.message))
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
      setAuthError(normalizeAuthMessage(error.message))
      return
    }

    await enterAppWithSession(data.session)
  } finally {
    finishAuthWork(requestId)
    render()
  }
})

const signOut = safeRun(async () => {
  if (state.authTimeoutId) {
    clearTimeout(state.authTimeoutId)
    state.authTimeoutId = null
  }
  state.authBusy = false
  state.authMessage = ''
  state.authProcessingSession = false
  await supabase.auth.signOut()
  await enterAppWithSession(null)
})

const saveSpot = safeRun(async event => {
  event.preventDefault()
  const form = new FormData(event.currentTarget)
  const selectedTags = FOOD_TYPES.filter(tag => form.getAll('food_tags').includes(tag))
  let coords = state.geo
  if (!coords || state.geoSource !== 'device') {
    toast('Trying to get your location...')
    const freshCoords = await detectLocation(true)
    if (freshCoords) {
      coords = freshCoords
      state.geo = coords
      state.geoSource = 'device'
      await fetchCountryAndWeather()
      render()
    }
  }
  if (!coords) {
    applyFallbackLocation('Device location blocked. Saving spot with fallback city center.')
    coords = state.geo
    await fetchCountryAndWeather()
    render()
  }
  const payload = {
    name: String(form.get('name') || '').trim(),
    food_tags: selectedTags,
    price_range: String(form.get('price_range') || '$'),
    description: String(form.get('description') || '').trim(),
    latitude: coords.latitude,
    longitude: coords.longitude,
    country_name: state.country?.name || '',
    country_code: state.country?.code || '',
    country_flag: state.country?.flag || '',
    is_public: true
  }
  const { error } = await supabase.from(TABLES.spots).insert(payload)
  if (error) throw error
  event.currentTarget.reset()
  await loadData()
  state.nav = 'home'
  toast(state.geoSource === 'device' ? 'Spot saved.' : 'Spot saved with fallback city coordinates. Refresh location to pin exact GPS.')
  render()
})

const saveReview = safeRun(async event => {
  event.preventDefault()
  const form = new FormData(event.currentTarget)
  const existing = state.reviews.find(r => r.spot_id === state.currentSpotId && r.user_id === state.user.id)
  if (existing) {
    toast('You already reviewed this spot.')
    return
  }
  const payload = {
    spot_id: state.currentSpotId,
    taste_rating: Number(form.get('taste_rating') || 0),
    portion_rating: Number(form.get('portion_rating') || 0),
    value_rating: Number(form.get('value_rating') || 0),
    review_text: String(form.get('review_text') || '').trim()
  }
  const { error } = await supabase.from(TABLES.reviews).insert(payload)
  if (error) throw error
  event.currentTarget.reset()
  await loadData()
  toast('Review dropped.')
  render()
})

const saveComment = safeRun(async event => {
  event.preventDefault()
  const form = new FormData(event.currentTarget)
  const payload = {
    spot_id: state.currentSpotId,
    comment_text: String(form.get('comment_text') || '').trim(),
    parent_comment_id: String(form.get('parent_comment_id') || '').trim() || null
  }
  if (!payload.comment_text) {
    toast('Write something before posting a comment.')
    return
  }
  const { error } = await supabase.from(TABLES.comments).insert(payload)
  if (error) throw error
  state.currentReplyParentId = null
  event.currentTarget.reset()
  await loadData()
  toast('Comment posted.')
  render()
})

const toggleCommentLike = safeRun(async commentId => {
  const existing = state.commentLikes.find(like => like.comment_id === commentId && like.user_id === state.user.id)
  if (existing) {
    const { error } = await supabase.from(TABLES.commentLikes).delete().eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from(TABLES.commentLikes).insert({ comment_id: commentId })
    if (error) throw error
  }
  await loadData()
  render()
})

const toggleFollow = safeRun(async targetUserId => {
  if (!state.user || !targetUserId || targetUserId === state.user.id) return
  const existing = state.follows.find(f => f.follower_user_id === state.user.id && f.following_user_id === targetUserId)
  if (existing) {
    const { error } = await supabase.from(TABLES.follows).delete().eq('id', existing.id)
    if (error) throw error
    toast('Unfollowed.')
  } else {
    const { error } = await supabase.from(TABLES.follows).insert({ follower_user_id: state.user.id, following_user_id: targetUserId })
    if (error) throw error
    toast('Following foodie.')
  }
  await loadData()
  render()
})

const saveCrawl = safeRun(async event => {
  event.preventDefault()
  const form = new FormData(event.currentTarget)
  const selectedIds = form.getAll('spot_ids')
  if (selectedIds.length < 3 || selectedIds.length > 7) {
    toast('Pick between 3 and 7 spots for a crawl.')
    return
  }
  const selectedSpots = selectedIds.map(id => state.spots.find(s => s.id === id)).filter(Boolean)
  const crawlPayload = {
    name: String(form.get('name') || '').trim(),
    description: String(form.get('description') || '').trim(),
    city_name: state.country?.city || 'Local crawl',
    start_latitude: selectedSpots[0]?.latitude || state.geo?.latitude || DEFAULT_CENTER[0],
    start_longitude: selectedSpots[0]?.longitude || state.geo?.longitude || DEFAULT_CENTER[1],
    is_public: true
  }
  const { data: crawl, error } = await supabase.from(TABLES.crawls).insert(crawlPayload).select().single()
  if (error) throw error

  const stopRows = selectedSpots.map((spot, index) => ({
    crawl_id: crawl.id,
    spot_id: spot.id,
    stop_order: index + 1,
    estimated_walk_minutes: index === 0 ? 0 : walkMinutesBetween(selectedSpots[index - 1], spot)
  }))
  const stopInsert = await supabase.from(TABLES.crawlStops).insert(stopRows)
  if (stopInsert.error) throw stopInsert.error

  event.currentTarget.reset()
  await loadData()
  toast('Food crawl mapped.')
  render()
})

const cloneCrawl = safeRun(async crawlId => {
  const crawl = state.crawls.find(c => c.id === crawlId)
  const stops = crawlStopsFor(crawlId)
  if (!crawl || !stops.length) return
  const { data: clone, error } = await supabase.from(TABLES.crawlClones).insert({
    crawl_id: crawl.id,
    original_creator_user_id: crawl.user_id,
    status: 'in_progress',
    overall_rating: null,
    notes: '',
    completed_at: null
  }).select().single()
  if (error) throw error

  const cloneStops = stops.map(stop => ({
    crawl_clone_id: clone.id,
    spot_id: stop.spot_id,
    stop_order: stop.stop_order,
    visited: false,
    visited_at: null
  }))
  const insertStops = await supabase.from(TABLES.crawlCloneStops).insert(cloneStops)
  if (insertStops.error) throw insertStops.error
  await loadData()
  toast('Crawl cloned to your route list.')
  render()
})

const markCloneStopVisited = safeRun(async cloneStopId => {
  const { error } = await supabase.from(TABLES.crawlCloneStops).update({ visited: true, visited_at: new Date().toISOString() }).eq('id', cloneStopId)
  if (error) throw error
  await loadData()
  render()
})

const completeClone = safeRun(async (cloneId, rating, notes) => {
  const { error } = await supabase.from(TABLES.crawlClones).update({ status: 'completed', overall_rating: rating, notes, completed_at: new Date().toISOString() }).eq('id', cloneId)
  if (error) throw error
  await loadData()
  toast('Crawl completed.')
  render()
})

const saveBucketArea = safeRun(async event => {
  event.preventDefault()
  const form = new FormData(event.currentTarget)
  let coords = state.geo
  if (!coords || state.geoSource !== 'device') {
    toast('Trying to get your location...')
    const freshCoords = await detectLocation(true)
    if (freshCoords) {
      coords = freshCoords
      state.geo = coords
      state.geoSource = 'device'
      await fetchCountryAndWeather()
      render()
    }
  }
  if (!coords) {
    applyFallbackLocation('Device location blocked. Saving area with fallback city center.')
    coords = state.geo
    await fetchCountryAndWeather()
    render()
  }
  const payload = {
    label: String(form.get('label') || '').trim(),
    city_name: String(form.get('city_name') || '').trim(),
    country_name: String(form.get('country_name') || '').trim(),
    latitude: coords.latitude,
    longitude: coords.longitude,
    radius_km: Number(form.get('radius_km') || 5)
  }
  const notes = String(form.get('notes') || '').trim()
  if (!payload.label) {
    toast('Add a label for this saved area.')
    return
  }
  if (!payload.city_name) payload.city_name = state.country?.city || FALLBACK_LOCATION.city
  if (!payload.country_name) payload.country_name = state.country?.name || FALLBACK_LOCATION.country
  const { error } = await supabase.from(TABLES.savedAreas).insert(payload)
  if (error) throw error
  if (notes) {
    await supabase.from(TABLES.bucketList).insert({
      city_name: payload.city_name,
      country_name: payload.country_name,
      latitude: payload.latitude,
      longitude: payload.longitude,
      notes
    })
  }
  event.currentTarget.reset()
  await loadData()
  toast(state.geoSource === 'device' ? 'Area saved to your bucket list.' : 'Area saved with fallback city coordinates. Refresh location for exact GPS.')
  render()
})

function setupRealtime() {
  try {
    if (state.initializedRealtime) return
    state.initializedRealtime = true
    supabase.channel('wandermap-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.spots }, async () => { await loadData(); render() })
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.reviews }, async () => { await loadData(); render() })
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.crawls }, async () => { await loadData(); render() })
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.crawlStops }, async () => { await loadData(); render() })
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.comments }, async () => { await loadData(); render() })
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.commentLikes }, async () => { await loadData(); render() })
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.savedAreas }, async () => { await loadData(); render() })
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
      setAuthError('')
      render()
    })
    document.getElementById('go-signin')?.addEventListener('click', () => { state.screen = 'auth'; state.authMode = 'signin'; setAuthError(''); render() })
    document.getElementById('sign-out')?.addEventListener('click', signOut)
    document.getElementById('spot-form')?.addEventListener('submit', saveSpot)
    document.getElementById('review-form')?.addEventListener('submit', saveReview)
    document.getElementById('comment-form')?.addEventListener('submit', saveComment)
    document.getElementById('crawl-form')?.addEventListener('submit', saveCrawl)
    document.getElementById('bucket-form')?.addEventListener('submit', saveBucketArea)
    document.getElementById('refresh-location')?.addEventListener('click', safeRun(async () => {
      const coords = await detectLocation(true)
      if (coords) {
        state.geo = coords
        state.geoSource = 'device'
        state.geoError = ''
      } else {
        applyFallbackLocation('Location blocked or unavailable. Showing Los Angeles fallback.')
      }
      await fetchCountryAndWeather()
      render()
      toast(state.geoSource === 'device' ? 'Location refreshed.' : 'Location blocked, so the app is using Los Angeles fallback.')
    }))

    document.querySelectorAll('[data-nav]').forEach(btn => btn.addEventListener('click', () => setNav(btn.dataset.nav)))
    document.querySelectorAll('.open-spot').forEach(btn => btn.addEventListener('click', () => openSpot(btn.dataset.spotId)))
    document.querySelectorAll('.open-profile').forEach(btn => btn.addEventListener('click', () => openProfile(btn.dataset.userId)))
    document.querySelectorAll('.follow-btn').forEach(btn => btn.addEventListener('click', () => toggleFollow(btn.dataset.userId)))
    document.querySelectorAll('.clone-crawl').forEach(btn => btn.addEventListener('click', () => cloneCrawl(btn.dataset.crawlId)))
    document.querySelectorAll('.mark-stop').forEach(btn => btn.addEventListener('click', () => markCloneStopVisited(btn.dataset.cloneStopId)))
    document.querySelectorAll('.complete-crawl').forEach(btn => btn.addEventListener('click', () => {
      const cloneId = btn.dataset.cloneId
      const rating = Number(document.querySelector(`.complete-rating[data-clone-id="${cloneId}"]`)?.value || 0)
      const notes = String(document.querySelector(`.complete-notes[data-clone-id="${cloneId}"]`)?.value || '')
      completeClone(cloneId, rating, notes)
    }))
    document.querySelectorAll('.toggle-comment-like').forEach(btn => btn.addEventListener('click', () => toggleCommentLike(btn.dataset.commentId)))
    document.querySelectorAll('.reply-comment').forEach(btn => btn.addEventListener('click', () => { state.currentReplyParentId = btn.dataset.commentId; render(); setTimeout(() => document.querySelector('#comment-form textarea')?.focus(), 60) }))
  } catch (error) {
    console.error('Bind error:', error?.message, error?.stack)
  }
}

function setupAuthListener() {
  if (state.authListenerSet) return
  state.authListenerSet = true

  supabase.auth.onAuthStateChange(async (_event, session) => {
    try {
      if (!state.authInitialized) return
      if (state.authProcessingSession) return
      state.authProcessingSession = true
      await enterAppWithSession(session)
    } catch (error) {
      console.error('Auth state error:', error?.message)
      state.screen = session?.user ? 'app' : 'auth'
      render()
    } finally {
      state.authProcessingSession = false
      state.authBusy = false
      state.authMessage = ''
      if (state.authTimeoutId) {
        clearTimeout(state.authTimeoutId)
        state.authTimeoutId = null
      }
    }
  })
}

async function init() {
  try {
    state.screen = 'loading'
    render()
    if (state.loadingTimeoutId) clearTimeout(state.loadingTimeoutId)
    state.loadingTimeoutId = setTimeout(() => {
      if (state.screen === 'loading') {
        applyFallbackLocation('Initial GPS lookup was slow. Showing Los Angeles fallback.')
        state.screen = 'auth'
        state.authMode = 'signin'
        render()
      }
    }, 4500)

    setupAuthListener()
    await fetchNASA()
    const detected = await detectLocation(false)
    if (detected) {
      state.geo = detected
      state.geoSource = 'device'
    } else {
      applyFallbackLocation('Device location unavailable. Showing Los Angeles fallback.')
    }
    await fetchCountryAndWeather()
    const { data: { session } } = await supabase.auth.getSession()
    state.authInitialized = true
    await enterAppWithSession(session)
    setupRealtime()
    if (state.loadingTimeoutId) clearTimeout(state.loadingTimeoutId)
    render()
  } catch (error) {
    console.error('Init error:', error?.message, error?.stack)
    state.authInitialized = true
    applyFallbackLocation('Unable to initialize device location. Showing Los Angeles fallback.')
    state.screen = 'auth'
    state.authMode = 'signin'
    render()
  }
}

init()
