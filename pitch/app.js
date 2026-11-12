// Motor de la presentación del pitch de Studree. Sin dependencias.
// Doc: docs/features/pitch.md
(() => {
  const W = 1920
  const H = 1080
  const stage = document.getElementById('stage')
  const slides = Array.from(document.querySelectorAll('.slide'))
  const label = document.getElementById('section-label')
  const counter = document.getElementById('counter')
  const bar = document.getElementById('progress-bar')
  const help = document.getElementById('help')
  const total = slides.length
  const pad = (n) => String(n).padStart(2, '0')
  let current = -1

  // ---------- Escala: el lienzo de 1920×1080 entra entero en la pantalla ----------
  function fit() {
    const s = Math.min(window.innerWidth / W, window.innerHeight / H)
    stage.style.transform = `translate(-50%, -50%) scale(${s})`
  }
  window.addEventListener('resize', fit)
  fit()

  // ---------- Números que cuentan al entrar ----------
  const fmt = (value, decimals) =>
    value.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

  function runCounters(slide) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    slide.querySelectorAll('[data-count]').forEach((el) => {
      const target = parseFloat(el.dataset.count)
      const decimals = parseInt(el.dataset.decimals || '0', 10)
      const suffix = el.dataset.suffix || ''
      const start = performance.now()
      const dur = 1100
      let done = false
      const tick = (now) => {
        if (done) return
        const t = Math.min(1, (now - start) / dur)
        const eased = 1 - Math.pow(1 - t, 3)
        el.textContent = fmt(target * eased, decimals) + suffix
        if (t < 1 && slide.classList.contains('is-active')) requestAnimationFrame(tick)
        else el.textContent = fmt(target, decimals) + suffix
      }
      requestAnimationFrame(tick)
      // Por si el navegador frena las animaciones (pestaña en segundo plano): el valor final queda
      // igual y ningún cuadro atrasado lo pisa.
      setTimeout(() => {
        done = true
        el.textContent = fmt(target, decimals) + suffix
      }, dur + 100)
    })
  }

  // ---------- Videos: se agrandan a toda la diapositiva mientras suenan ----------
  function cardOf(slide) {
    return slide ? slide.querySelector('[data-video]') : null
  }

  function closeVideo(card, { reset = false } = {}) {
    if (!card) return
    const video = card.querySelector('video')
    video.pause()
    if (reset) video.currentTime = 0
    card.classList.remove('is-theater', 'is-playing', 'is-paused')
    document.body.classList.remove('theater')
  }

  function toggleVideo(card) {
    const video = card.querySelector('video')
    if (video.paused) {
      if (video.ended) video.currentTime = 0
      card.classList.add('is-theater', 'is-playing')
      card.classList.remove('is-paused')
      document.body.classList.add('theater')
      video.play()
    } else {
      video.pause()
      card.classList.add('is-paused')
    }
  }

  document.querySelectorAll('[data-video]').forEach((card) => {
    const video = card.querySelector('video')
    const fill = card.querySelector('.media-progress div')
    card.querySelector('.play').addEventListener('click', () => toggleVideo(card))
    video.addEventListener('click', () => toggleVideo(card))
    video.addEventListener('timeupdate', () => {
      fill.style.width = `${(video.currentTime / (video.duration || 1)) * 100}%`
    })
    video.addEventListener('ended', () => closeVideo(card))
  })

  // ---------- Navegación ----------
  function go(n) {
    const next = Math.max(0, Math.min(total - 1, n))
    if (next === current) return
    closeVideo(cardOf(slides[current]), { reset: false })
    slides.forEach((s, i) => {
      s.classList.toggle('is-active', i === next)
      s.classList.toggle('is-past', i < next)
    })
    current = next
    const slide = slides[current]
    label.textContent = slide.dataset.label || ''
    counter.textContent = `${pad(current + 1)} / ${pad(total)}`
    bar.style.width = `${((current + 1) / total) * 100}%`
    document.body.classList.toggle('theme-accent', slide.dataset.theme === 'accent')
    document.body.classList.toggle('no-corner', slide.hasAttribute('data-no-corner'))
    history.replaceState(null, '', `#${current + 1}`)
    runCounters(slide)
  }

  const next = () => go(current + 1)
  const prev = () => go(current - 1)

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen().catch(() => {})
  }

  function toggleHelp(force) {
    help.hidden = force === undefined ? !help.hidden : !force
  }

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const card = cardOf(slides[current])
    if (!help.hidden && (e.key === 'Escape' || e.key === '?')) {
      e.preventDefault()
      toggleHelp(false)
      return
    }
    switch (e.key) {
      case 'ArrowRight':
      case 'PageDown':
      case 'Enter':
        e.preventDefault()
        next()
        break
      case 'ArrowLeft':
      case 'PageUp':
      case 'Backspace':
        e.preventDefault()
        prev()
        break
      case ' ':
        e.preventDefault()
        if (card) toggleVideo(card)
        else next()
        break
      case 'Escape':
        if (card) closeVideo(card)
        break
      case 'Home':
        go(0)
        break
      case 'End':
        go(total - 1)
        break
      case 'f':
      case 'F':
        toggleFullscreen()
        break
      case '?':
        toggleHelp()
        break
    }
  })

  // Botones con mouse (aparecen al moverlo) y gestos en pantallas táctiles.
  document.querySelectorAll('[data-nav]').forEach((b) =>
    b.addEventListener('click', () => (b.dataset.nav === 'next' ? next() : prev())),
  )
  let idle
  document.addEventListener('mousemove', () => {
    document.body.classList.add('mouse-active')
    clearTimeout(idle)
    idle = setTimeout(() => document.body.classList.remove('mouse-active'), 1800)
  })
  let touchX = null
  document.addEventListener('touchstart', (e) => (touchX = e.touches[0].clientX), { passive: true })
  document.addEventListener('touchend', (e) => {
    if (touchX === null) return
    const dx = e.changedTouches[0].clientX - touchX
    if (Math.abs(dx) > 60) (dx < 0 ? next : prev)()
    touchX = null
  })
  help.addEventListener('click', () => toggleHelp(false))

  // Arranca en la diapositiva de la URL (#5) para que recargar no vuelva al principio.
  const fromHash = parseInt(location.hash.slice(1), 10)
  go(Number.isFinite(fromHash) ? fromHash - 1 : 0)
})()
