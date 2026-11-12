import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectPlatform } from './platform.js'

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36'
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36 Edg/129.0'

test('detectPlatform reconoce Android, iPhone y la compu', () => {
  assert.equal(detectPlatform(ANDROID, 5), 'android')
  assert.equal(detectPlatform(IPHONE, 5), 'ios')
  assert.equal(detectPlatform(WINDOWS, 0), 'desktop')
  assert.equal(detectPlatform(MAC, 0), 'desktop')
})

test('un iPad nuevo dice "Macintosh" pero tiene pantalla táctil: es iOS', () => {
  assert.equal(detectPlatform(MAC, 5), 'ios')
})

test('sin datos, es la compu', () => {
  assert.equal(detectPlatform('', 0), 'desktop')
})
