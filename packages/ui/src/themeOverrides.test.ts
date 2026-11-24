import assert from 'node:assert/strict'
import test from 'node:test'

import { goodWalletV2Preset } from './presets.ts'
import { linkFollowsPrimary, mergeOverrideMaps } from './themeOverrides.ts'

/**
 * Anchor reads the `colorLink` role, which the default preset sets to a color that reaches 4.5:1.
 * Before that role existed links used `primary`, so a theme layer that overrides only `primary`
 * must keep its links following it.
 */

test('a host override of primary alone moves links with it', () => {
  const themes = mergeOverrideMaps(goodWalletV2Preset.themes, { dark: { primary: '#FFFFFF' } })

  assert.equal(themes?.dark?.primary, '#FFFFFF')
  assert.equal(themes?.dark?.colorLink, '#FFFFFF')
})

test('an explicit colorLink in the host override wins over its primary', () => {
  const themes = mergeOverrideMaps(goodWalletV2Preset.themes, {
    dark: { primary: '#FFFFFF', colorLink: '#00FF00' },
  })

  assert.equal(themes?.dark?.colorLink, '#00FF00')
})

test('a host override that leaves primary alone keeps the preset link color', () => {
  const themes = mergeOverrideMaps(goodWalletV2Preset.themes, { dark: { background: '#000000' } })

  assert.equal(themes?.dark?.colorLink, goodWalletV2Preset.themes?.dark?.colorLink)
  assert.equal(themes?.light?.colorLink, goodWalletV2Preset.themes?.light?.colorLink)
})

test('a custom preset that sets only primary gets links that follow it', () => {
  const customPreset = { dark: { primary: '#FF00AA', background: '#000000' } }
  const themes = mergeOverrideMaps(linkFollowsPrimary(customPreset), undefined)

  assert.equal(themes?.dark?.colorLink, '#FF00AA')
})

test('the default preset keeps its own link colors', () => {
  const themes = linkFollowsPrimary(goodWalletV2Preset.themes)

  assert.equal(themes?.dark?.colorLink, goodWalletV2Preset.themes?.dark?.colorLink)
  assert.notEqual(themes?.dark?.colorLink, themes?.dark?.primary)
  assert.equal(themes?.light?.colorLink, goodWalletV2Preset.themes?.light?.colorLink)
})

test('merging nothing returns nothing', () => {
  assert.equal(mergeOverrideMaps(undefined, undefined), undefined)
})
