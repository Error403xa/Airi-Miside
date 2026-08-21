import { describe, expect, it } from 'vitest'

import {
  extractLive2DExpressionControls,
  stripLive2DExpressionControls,
} from './live2d-expression-controls'
import {
  extractMinecraftExpressionControls,
  makeMinecraftExpressionControlSpecial,
  minecraftExpressionControlIds,
  parseMinecraftExpressionControlSpecial,
  stripMinecraftExpressionControls,
} from './minecraft-expression-controls'

describe('minecraft expression controls', () => {
  it('extracts a pose and hides the marker', () => {
    const { visibleText, poses } = extractMinecraftExpressionControls('[[minecraft:happy]]你好呀')

    expect(poses).toEqual(['happy'])
    expect(visibleText).toBe('你好呀')
  })

  it('accepts every documented pose', () => {
    for (const id of minecraftExpressionControlIds) {
      const { poses, visibleText } = extractMinecraftExpressionControls(`[[minecraft:${id}]]x`)

      expect(poses, id).toEqual([id])
      expect(visibleText, id).toBe('x')
    }
  })

  it('is case-insensitive and tolerates surrounding text', () => {
    const { visibleText, poses } = extractMinecraftExpressionControls('嗯[[MINECRAFT:Think]]我想想')

    expect(poses).toEqual(['think'])
    expect(visibleText).toBe('嗯我想想')
  })

  it('leaves an unknown pose visible instead of eating it', () => {
    const { visibleText, poses } = extractMinecraftExpressionControls('[[minecraft:sleepy]]zzz')

    expect(poses).toEqual([])
    expect(visibleText).toBe('[[minecraft:sleepy]]zzz')
  })

  it('round-trips through the special-token encoding', () => {
    for (const id of minecraftExpressionControlIds)
      expect(parseMinecraftExpressionControlSpecial(makeMinecraftExpressionControlSpecial(id))).toBe(id)
  })

  it('ignores specials belonging to another channel', () => {
    expect(parseMinecraftExpressionControlSpecial('live2d-expression-control:mita:blush')).toBeUndefined()
  })
})

/*
 * The two marker channels have to stay strictly separate: `mita` and `minecraft`
 * share a two-character prefix, so a sloppy pattern on either side would let one
 * channel consume the other's markers and the wrong renderer would react — or worse,
 * a marker would survive stripping and show up in the chat transcript.
 */
describe('no collision with the live2d controls', () => {
  it('does not let the live2d extractor claim a minecraft marker', () => {
    const { visibleText, controls } = extractLive2DExpressionControls('[[minecraft:happy]]hi')

    expect(controls).toEqual([])
    expect(visibleText).toBe('[[minecraft:happy]]hi')
  })

  it('does not let the minecraft extractor claim live2d markers', () => {
    for (const marker of ['[[mita:blush+highlight]]', '[[xiaomita-pro:smile]]']) {
      const { visibleText, poses } = extractMinecraftExpressionControls(`${marker}hi`)

      expect(poses, marker).toEqual([])
      expect(visibleText, marker).toBe(`${marker}hi`)
    }
  })

  it('strips both channels when chained, leaving no marker behind', () => {
    const raw = '[[mita:blush]][[minecraft:curious]][[xiaomita-pro:smile]]这是正文'

    expect(stripMinecraftExpressionControls(stripLive2DExpressionControls(raw))).toBe('这是正文')
  })

  it('keeps a minecraft marker intact through live2d stripping alone', () => {
    expect(stripLive2DExpressionControls('[[minecraft:sad]]x')).toBe('[[minecraft:sad]]x')
  })
})
