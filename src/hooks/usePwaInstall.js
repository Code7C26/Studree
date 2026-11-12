import { useCallback, useEffect, useState } from 'react'
import { detectPlatform } from '../lib/landing/platform.js'

/**
 * Instalar Studree como app (PWA) desde la landing: en la compu (Chrome/Edge) queda como un
 * programa y en Android Chrome la instala como una app más, sin Play Store. iPhone no tiene
 * botón: se agrega desde Compartir. Ver docs/features/landing.md y docs/features/mobile.md.
 */

/** @type {any} El evento `beforeinstallprompt` guardado (el navegador lo dispara una vez). */
let deferredPrompt = null
let installed = false
const listeners = new Set()
const notify = () => listeners.forEach((listener) => listener())

/**
 * Se llama una vez al arrancar (`main.jsx`): el navegador puede ofrecer instalar antes de que
 * se cargue la landing, y el evento no se repite.
 */
export function listenForInstallPrompt() {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event
    notify()
  })
  window.addEventListener('appinstalled', () => {
    installed = true
    deferredPrompt = null
    notify()
  })
}

/** Abierta como app instalada (ventana propia), no en una pestaña. */
const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches === true || window.navigator.standalone === true

/**
 * @returns {{
 *   platform: 'android'|'ios'|'desktop',
 *   canInstall: boolean,
 *   installed: boolean,
 *   install: () => Promise<boolean>,
 * }}
 */
export function usePwaInstall() {
  const [, setTick] = useState(0)

  useEffect(() => {
    const listener = () => setTick((n) => n + 1)
    listeners.add(listener)
    return () => listeners.delete(listener)
  }, [])

  const install = useCallback(async () => {
    if (!deferredPrompt) return false
    const prompt = deferredPrompt
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    // El evento sirve una sola vez: aceptado o no, se descarta.
    deferredPrompt = null
    if (outcome === 'accepted') installed = true
    notify()
    return outcome === 'accepted'
  }, [])

  return {
    platform: detectPlatform(window.navigator.userAgent, window.navigator.maxTouchPoints ?? 0),
    canInstall: deferredPrompt !== null,
    installed: installed || isStandalone(),
    install,
  }
}
