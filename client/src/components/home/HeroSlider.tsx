import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import { loadBanners } from '../../services/catalog'

const AUTOPLAY_MS = 5500

export default function HeroSlider() {
  const { dir, t } = useLanguage()
  const isRtl = dir === 'rtl'
  const { data: banners } = useAsync(() => loadBanners())
  const slides = banners ?? []
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (index >= slides.length) setIndex(0)
  }, [slides.length, index])

  const go = useCallback(
    (next: number) => {
      if (slides.length === 0) return
      setIndex(((next % slides.length) + slides.length) % slides.length)
    },
    [slides.length]
  )
  const next = useCallback(() => go(index + 1), [go, index])
  const prev = useCallback(() => go(index - 1), [go, index])
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || slides.length === 0) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), AUTOPLAY_MS)
    return () => clearInterval(timer)
  }, [paused, slides.length])

  const touchStart = useRef<number | null>(null)

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return
    const dx = touchStart.current - e.changedTouches[0].clientX
    touchStart.current = null
    const threshold = 40
    if (isRtl ? dx < -threshold : dx > threshold) next()
    else if (isRtl ? dx > threshold : dx < -threshold) prev()
  }

  const PrevIcon = isRtl ? ChevronRight : ChevronLeft
  const NextIcon = isRtl ? ChevronLeft : ChevronRight

  if (slides.length === 0) return null

  const slide = slides[index]
  const content =
    slide.link != null ? (
      <Link
        to={slide.link}
        className="absolute inset-0 block"
        aria-label={`${String(index + 1)} / ${slides.length}`}
      />
    ) : null

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Promotions"
      className="group relative overflow-hidden rounded-2xl bg-ink-900 sm:rounded-3xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="flex w-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(${(isRtl ? 1 : -1) * index * 100}%)` }}
      >
        {slides.map((s) => (
          <div key={s.id} className="relative w-full shrink-0 overflow-hidden">
            <img
              src={s.image}
              alt=""
              loading={s.id === slides[0]?.id ? 'eager' : 'lazy'}
              className="block w-full max-h-64 object-cover sm:max-h-80 lg:max-h-96"
            />
          </div>
        ))}
      </div>

      {content}

      {/* Controls */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label={isRtl ? t('hero.next') : t('hero.previous')}
            className="absolute start-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-ink-900/40 text-white backdrop-blur transition-colors hover:bg-brand-600 focus-visible:outline-none focus-visible:shadow-focus md:flex"
          >
            <PrevIcon size={20} />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label={isRtl ? t('hero.previous') : t('hero.next')}
            className="absolute end-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-ink-900/40 text-white backdrop-blur transition-colors hover:bg-brand-600 focus-visible:outline-none focus-visible:shadow-focus md:flex"
          >
            <NextIcon size={20} />
          </button>

          {/* Indicators */}
          <div className="absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-1.5 sm:bottom-4">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`${i + 1} / ${slides.length}`}
                className={`h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:shadow-focus ${
                  i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/45 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}