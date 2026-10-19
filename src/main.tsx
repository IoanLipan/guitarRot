import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { galleryMode } from './dev/galleryGuard'

const root = createRoot(document.getElementById('root')!)

async function start() {
  // Dev builds only: `?gallery` swaps the app for the visual-review gallery.
  // The import sits inside the literal `import.meta.env.DEV` check so the
  // production build drops the whole gallery from the bundle.
  if (import.meta.env.DEV) {
    const mode = galleryMode(window.location.search, import.meta.env.DEV)
    if (mode !== null) {
      const { Gallery } = await import('./dev/Gallery')
      root.render(
        <StrictMode>
          <Gallery mode={mode} />
        </StrictMode>,
      )
      return
    }
  }
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void start()
