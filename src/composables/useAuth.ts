import { computed, ref } from 'vue'
import { clearMirror } from '@/utils/sync'

/**
 * Google sign-in.
 *
 * The heavy lifting is on the server: the browser only receives a signed ID
 * token from Google and hands it to `/api/auth/google`, which verifies it and
 * sets an httpOnly session cookie. Nothing security-relevant is decided here.
 */

export interface AuthUser {
  id: string
  companyId: string
  firstName: string
  lastName: string
  email: string
  role: string
  avatar: string
  accent: string
}

const GSI_SRC = 'https://accounts.google.com/gsi/client'

const user = ref<AuthUser | null>(null)
const clientId = ref('')
const available = ref(false)
const busy = ref(false)
const error = ref('')

let configPromise: Promise<void> | null = null
let scriptPromise: Promise<void> | null = null

const readConfig = async () => {
  try {
    const response = await fetch('/api/auth/config')
    if (!response.ok) return
    const data = (await response.json()) as { google: boolean; clientId: string }
    available.value = data.google
    clientId.value = data.clientId
  } catch {
    // API unreachable: sign-in simply stays hidden.
    available.value = false
  }
}

const readSession = async () => {
  try {
    const response = await fetch('/api/auth/session')
    if (!response.ok) return
    const data = (await response.json()) as { user: AuthUser | null }
    user.value = data.user
  } catch {
    user.value = null
  }
}

/** Loads Google's script once, and only when sign-in is actually configured. */
const loadScript = (): Promise<void> => {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${GSI_SRC}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = GSI_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google-Skript konnte nicht geladen werden.'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

const ready = () => {
  if (!configPromise) configPromise = Promise.all([readConfig(), readSession()]).then(() => {})
  return configPromise
}

interface GoogleCredentialResponse {
  credential: string
}

interface GoogleAccounts {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string
        callback: (response: GoogleCredentialResponse) => void
      }) => void
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
    }
  }
}

/** Set when the signed-in address has no workspace yet. */
const needsWorkspace = ref(false)
const pendingEmail = ref('')
const pendingName = ref('')

const exchange = async (credential: string) => {
  busy.value = true
  error.value = ''
  try {
    const response = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    })
    const data = (await response.json()) as {
      user?: AuthUser | null
      email?: string
      name?: string
      needsWorkspace?: boolean
      error?: string
    }
    if (!response.ok) throw new Error(data.error ?? 'Die Anmeldung wurde abgelehnt.')

    // Whatever this browser cached belongs to whoever was signed in before.
    // Dropping it is what keeps one account out of another's workspace.
    clearMirror()

    user.value = data.user ?? null
    needsWorkspace.value = Boolean(data.needsWorkspace)
    pendingEmail.value = data.email ?? ''
    pendingName.value = data.name ?? ''
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Die Anmeldung ist fehlgeschlagen.'
    throw caught
  } finally {
    busy.value = false
  }
}

/** Claims a workspace for the signed-in address. */
const claimWorkspace = async (
  companyName: string,
  email = '',
  name = '',
): Promise<AuthUser | null> => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // A Google sign-in already put the address in the session; the wizard
      // supplies it directly when nobody signed in.
      email: email || pendingEmail.value,
      name: name || pendingName.value,
      companyName,
    }),
  })
  const data = (await response.json()) as { user?: AuthUser; error?: string }
  if (!response.ok) throw new Error(data.error ?? 'Der Arbeitsbereich konnte nicht angelegt werden.')
  user.value = data.user ?? null
  needsWorkspace.value = false
  return user.value
}

export function useAuth() {
  /**
   * Renders Google's own button into `target`. Google requires its rendered
   * button rather than a custom element calling a JS API, so the element is
   * handed over rather than styled here.
   */
  const mountButton = async (target: HTMLElement, onSignedIn?: () => void) => {
    await ready()
    if (!available.value || !clientId.value) return

    try {
      await loadScript()
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'Google ist nicht erreichbar.'
      return
    }

    const google = (window as unknown as { google?: GoogleAccounts }).google
    if (!google) {
      error.value = 'Google-Anmeldung steht gerade nicht zur Verfügung.'
      return
    }

    google.accounts.id.initialize({
      client_id: clientId.value,
      callback: (response) => {
        exchange(response.credential)
          .then(() => onSignedIn?.())
          .catch(() => {
            // `error` is already set and rendered next to the button.
          })
      },
    })

    google.accounts.id.renderButton(target, {
      theme: 'outline',
      size: 'large',
      width: target.clientWidth || 320,
      text: 'signin_with',
      locale: 'de',
    })
  }

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      user.value = null
      needsWorkspace.value = false
      // The cached workspace goes with the session it belonged to.
      clearMirror()
    }
  }

  return {
    user,
    needsWorkspace,
    pendingEmail,
    pendingName,
    claimWorkspace,
    isSignedIn: computed(() => user.value !== null),
    available,
    busy,
    error,
    ready,
    mountButton,
    signOut,
  }
}
