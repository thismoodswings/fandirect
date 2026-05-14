const isBrowser = typeof window !== 'undefined'

function getEnvValue(key, fallback = '') {
  return import.meta.env[key] || fallback
}

function getCurrentUrl() {
  if (!isBrowser) return getEnvValue('VITE_APP_URL', 'http://localhost:5173')

  return window.location.href
}

function getBaseUrl() {
  if (!isBrowser) return getEnvValue('VITE_APP_URL', 'http://localhost:5173')

  return window.location.origin
}

function getUrlParam(paramName, defaultValue = null) {
  if (!isBrowser) return defaultValue

  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get(paramName) || defaultValue
}

function removeUrlParams(paramNames = []) {
  if (!isBrowser || paramNames.length === 0) return

  const urlParams = new URLSearchParams(window.location.search)
  let changed = false

  paramNames.forEach((paramName) => {
    if (urlParams.has(paramName)) {
      urlParams.delete(paramName)
      changed = true
    }
  })

  if (!changed) return

  const newUrl = `${window.location.pathname}${
    urlParams.toString() ? `?${urlParams.toString()}` : ''
  }${window.location.hash}`

  window.history.replaceState({}, document.title, newUrl)
}

function getSupabaseConfig() {
  return {
    url: getEnvValue('VITE_SUPABASE_URL'),
    anonKey:
      getEnvValue('VITE_SUPABASE_ANON_KEY') ||
      getEnvValue('VITE_SUPABASE_PUBLISHABLE_KEY'),
  }
}

function getAppParams() {
  removeUrlParams([
    'access_token',
    'clear_access_token',
    'app_id',
    'functions_version',
    'app_base_url',
  ])

  const supabase = getSupabaseConfig()

  return {
    appName: getEnvValue('VITE_APP_NAME', 'FanDirect'),
    appUrl: getEnvValue('VITE_APP_URL', getBaseUrl()),
    currentUrl: getCurrentUrl(),
    fromUrl: getUrlParam('from_url', getCurrentUrl()),

    supabaseUrl: supabase.url,
    supabaseAnonKey: supabase.anonKey,

    /**
     * Legacy Base44 fields kept as null so old imports do not crash.
     * Do not use these in new Supabase code.
     */
    appId: null,
    token: null,
    functionsVersion: null,
    appBaseUrl: null,
  }
}

export const appParams = {
  ...getAppParams(),
}