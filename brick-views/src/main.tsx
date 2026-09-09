import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/atkinson-hyperlegible-next'
import './styles/global.css'
import { fetchCatalog, setCatalog } from './core/catalog'

// No router: the game and the admin dashboard are two roots split on the
// URL path at boot. Neither needs client-side navigation between routes.
const isAdmin = window.location.pathname.startsWith('/admin')

const root = createRoot(document.getElementById('root')!)

if (isAdmin) {
  import('./admin/AdminApp').then(({ AdminApp }) => {
    root.render(
      <StrictMode>
        <AdminApp />
      </StrictMode>,
    )
  })
} else {
  // The catalogue is installed BEFORE ./App is imported, because importing it
  // pulls in the session store, which reads the catalogue synchronously at
  // module scope. A failed fetch is not fatal — getCatalog() falls back to the
  // puzzles bundled at build time, so the child still gets a playable game.
  void (async () => {
    try {
      setCatalog(await fetchCatalog())
    } catch (error) {
      console.error('Falling back to bundled puzzles:', error)
    }

    const [{ default: App }, { useSession }] = await Promise.all([
      import('./App.tsx'),
      import('./state/session'),
    ])

    if (import.meta.env.DEV) {
      ;(window as any).useSession = useSession
    }

    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })()
}
