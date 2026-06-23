import { useEffect, useState } from 'react'

// Tiny hook: state that persists to the browser's localStorage.
export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // storage full or blocked — fail quietly
    }
  }, [key, value])

  return [value, setValue]
}
