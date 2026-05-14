import * as React from 'react'

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const mediaQuery = window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
    )

    const updateIsMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    updateIsMobile()

    mediaQuery.addEventListener('change', updateIsMobile)

    return () => {
      mediaQuery.removeEventListener('change', updateIsMobile)
    }
  }, [])

  return isMobile
}