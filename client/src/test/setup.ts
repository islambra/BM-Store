import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  window.history.replaceState({}, '', '/')
})

Object.defineProperty(window, 'scrollTo', {
  value: () => {},
  writable: true,
  configurable: true,
})