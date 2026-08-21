/*
 * Minecraft skin -> Three.js box rig.
 *
 * A Minecraft skin is not a picture of a character; it is a UV atlas for a fixed
 * box-geometry humanoid. This module rebuilds that humanoid out of BoxGeometry
 * and re-maps every face's UVs so a stock skin renders correctly.
 *
 * NOTICE: every rect below is expressed in the *logical* 64x64 skin grid, never
 * in texture pixels. HD skins (128x128, 256x256, ...) reuse the exact same
 * proportional layout, so normalising by SKIN_GRID keeps a single table valid at
 * any resolution. Normalising by the real texture width instead would misplace
 * every HD skin.
 * Atlas layout reference: https://minecraft.wiki/w/Skin
 */

import type {
  Texture,
} from 'three'

import {
  BoxGeometry,
  CanvasTexture,
  FrontSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  NearestFilter,
  PlaneGeometry,
  SRGBColorSpace,
  TextureLoader,
} from 'three'

/** The atlas is always addressed as a 64x64 grid, whatever the real texture size. */
const SKIN_GRID = 64

/** Minecraft model units: 16 units = 1 block, and a player model is 32 units tall. */
export const MC_UNIT = 1 / 16

/** Total model height in world units once MC_UNIT scaling is applied. */
export const MC_MODEL_HEIGHT = 32 * MC_UNIT

type Rect = [x: number, y: number, w: number, h: number]

interface PartSpec {
  /** Box size in MC units: [width (x), height (y), depth (z)]. */
  size: [number, number, number]
  /** Top-left origin of the part's six-face patch in the 64x64 grid. */
  base: [number, number]
  /** Origin of the second ("overlay") layer patch: hat, jacket, sleeves, pants. */
  overlay: [number, number]
  /** How much larger the overlay box is than the base, total across each axis. */
  overlayExpand: number
}

/*
 * Derive the six face rects of a box from its patch origin.
 *
 * Minecraft lays every box out as two rows inside the atlas:
 *   row 1, `depth` tall:  [ depth-wide gap ][ top ][ bottom ]
 *   row 2, `height` tall: [ left ][ front ][ right ][ back ]
 * so all six rects follow from (u, v) plus the box dimensions alone.
 */
function faceRects(u: number, v: number, w: number, h: number, d: number): Record<'top' | 'bottom' | 'left' | 'front' | 'right' | 'back', Rect> {
  return {
    top: [u + d, v, w, d],
    bottom: [u + d + w, v, w, d],
    left: [u, v + d, d, h],
    front: [u + d, v + d, w, h],
    right: [u + d + w, v + d, d, h],
    back: [u + d + w + d, v + d, w, h],
  }
}

/*
 * Convert a skin-grid rect into its four UV corners, ordered
 * [bottomLeft, bottomRight, topRight, topLeft].
 *
 * Three.js uploads textures with flipY = true by default, so row 0 of the PNG
 * (its top edge) ends up at v = 1 — hence `1 - y / SKIN_GRID` rather than
 * `y / SKIN_GRID`.
 */
function rectCorners([x, y, w, h]: Rect): [number, number][] {
  const u0 = x / SKIN_GRID
  const u1 = (x + w) / SKIN_GRID
  const vTop = 1 - y / SKIN_GRID
  const vBottom = 1 - (y + h) / SKIN_GRID

  return [[u0, vBottom], [u1, vBottom], [u1, vTop], [u0, vTop]]
}

/*
 * Re-map a BoxGeometry's UV attribute onto one Minecraft skin patch.
 *
 * BoxGeometry emits faces in the order +X, -X, +Y, -Y, +Z, -Z with four
 * vertices each, ordered top-left, top-right, bottom-left, bottom-right, while
 * `rectCorners` yields [BL, BR, TR, TL] — hence the [3, 2, 0, 1] shuffle.
 *
 * The character faces +Z, and in a right-handed Y-up basis a figure facing +Z
 * has its own right hand toward -X. The atlas' first side rect (which the wiki
 * calls "Right") therefore belongs on -X, which is what `left -> -X` below does.
 *
 * NOTICE: the -Y face needs a vertically mirrored winding ([0, 1, 3, 2]). It is
 * the only face observed from the far side of its own rect; without the flip,
 * soles and chin undersides render upside down.
 */
function applySkinUVs(geometry: BoxGeometry, u: number, v: number, w: number, h: number, d: number): void {
  const rects = faceRects(u, v, w, h, d)
  const faces: [Rect, boolean][] = [
    [rects.right, false], // +X — the figure's left flank
    [rects.left, false], //  -X — the figure's right flank
    [rects.top, false], //   +Y
    [rects.bottom, true], //  -Y, mirrored
    [rects.front, false], // +Z — the figure faces this way
    [rects.back, false], //  -Z
  ]

  const uv = geometry.attributes.uv
  let i = 0

  for (const [rect, mirrored] of faces) {
    const c = rectCorners(rect)
    const order = mirrored ? [0, 1, 3, 2] : [3, 2, 0, 1]

    for (const index of order) {
      uv.setXY(i, c[index][0], c[index][1])
      i += 1
    }
  }

  uv.needsUpdate = true
}

/*
 * Tell a slim ("Alex", 3-wide arms) skin from a classic ("Steve", 4-wide) one.
 *
 * The arm's side-face row is d + w + d + w wide: 16 columns for classic, only 14
 * for slim. Columns 54 and 55 of that row therefore carry pixels on a classic skin
 * and are blank on a slim one, which makes them a reliable discriminator.
 *
 * NOTICE: do not try to detect this from the arm's *front* face. On a slim skin the
 * neighbouring side face starts where the front face ends, so the column that
 * "should" be empty is opaque anyway and classic and slim look identical there.
 */
function detectSlim(image: CanvasImageSource & { width: number, height: number }): boolean {
  const scale = image.width / SKIN_GRID
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx)
    return false

  ctx.drawImage(image, 0, 0)

  const x = Math.round(54 * scale)
  const y = Math.round(20 * scale)
  const w = Math.max(1, Math.round(2 * scale))
  const h = Math.max(1, Math.round(12 * scale))

  try {
    const { data } = ctx.getImageData(x, y, w, h)
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 127)
        return false
    }
    return true
  }
  catch {
    // Tainted canvas on a cross-origin skin. Classic is the safer assumption: it
    // over-covers the arm rather than leaving a strip of it unmapped.
    return false
  }
}

export interface LoadedSkin {
  texture: Texture
  /** True when the skin uses the 3-wide "Alex" arm layout. */
  slim: boolean
}

/**
 * Load a skin PNG as a texture configured for pixel-art sampling, and report
 * whether it is a slim or classic layout.
 *
 * Nearest-neighbour filtering and no mipmaps are what keep the 8x8 face crisp
 * instead of smearing into mush at distance.
 */
export function loadSkinTexture(url: string): Promise<LoadedSkin> {
  return new Promise<LoadedSkin>((resolve, reject) => {
    new TextureLoader().load(
      url,
      (texture) => {
        texture.magFilter = NearestFilter
        texture.minFilter = NearestFilter
        texture.generateMipmaps = false
        texture.colorSpace = SRGBColorSpace

        const image = texture.image as (CanvasImageSource & { width: number, height: number }) | undefined
        resolve({ texture, slim: image ? detectSlim(image) : false })
      },
      undefined,
      error => reject(error),
    )
  })
}

/*
 * Part table for the modern (64x64) skin format.
 *
 * Arms are 4 units wide on the classic ("Steve") model and 3 on the slim
 * ("Alex") model; only the width and the resulting shoulder offset differ, the
 * patch origins are shared.
 *
 * NOTICE: overlayExpand values are hand-tuned rather than derived. 1.0 gives the
 * hat layer enough volume to read as hair, while 0.5 on the torso and limbs is
 * just enough to avoid z-fighting without the clothing looking inflated.
 */
function partSpecs(slim: boolean): Record<'head' | 'body' | 'armRight' | 'armLeft' | 'legRight' | 'legLeft', PartSpec> {
  const armWidth = slim ? 3 : 4

  return {
    head: { size: [8, 8, 8], base: [0, 0], overlay: [32, 0], overlayExpand: 1 },
    body: { size: [8, 12, 4], base: [16, 16], overlay: [16, 32], overlayExpand: 0.5 },
    armRight: { size: [armWidth, 12, 4], base: [40, 16], overlay: [40, 32], overlayExpand: 0.5 },
    armLeft: { size: [armWidth, 12, 4], base: [32, 48], overlay: [48, 48], overlayExpand: 0.5 },
    legRight: { size: [4, 12, 4], base: [0, 16], overlay: [0, 32], overlayExpand: 0.5 },
    legLeft: { size: [4, 12, 4], base: [16, 48], overlay: [0, 48], overlayExpand: 0.5 },
  }
}

/**
 * Build one part: a base box plus its slightly larger overlay box, wrapped in a
 * group whose origin is the part's rotation pivot.
 *
 * `offset` places the mesh centre relative to that pivot, which is what lets a
 * limb rotate around its shoulder or hip instead of around its own middle.
 */
function buildPart(spec: PartSpec, offset: [number, number, number], texture: Texture, disposables: { dispose: () => void }[]): Group {
  const group = new Group()
  const [w, h, d] = spec.size

  const baseGeometry = new BoxGeometry(w, h, d)
  applySkinUVs(baseGeometry, spec.base[0], spec.base[1], w, h, d)
  /*
   * alphaTest rather than `transparent`, so stray holes are discarded instead of
   * sorted.
   *
   * NOTICE: without it, a transparent texel in the *base* layer renders its RGB —
   * which for a fully transparent PNG pixel is (0, 0, 0). That is what produced
   * solid black patches on the hands before slim detection was added, and it is
   * worth keeping as a backstop for any skin with gaps in its base layer.
   */
  const baseMaterial = new MeshLambertMaterial({ map: texture, alphaTest: 0.5 })
  const baseMesh = new Mesh(baseGeometry, baseMaterial)
  baseMesh.position.set(offset[0], offset[1], offset[2])
  group.add(baseMesh)
  disposables.push(baseGeometry, baseMaterial)

  // The overlay layer is authored with transparency, so it needs alpha testing
  // and double-sided rendering — a hat brim is visible from underneath.
  const e = spec.overlayExpand
  const overlayGeometry = new BoxGeometry(w + e, h + e, d + e)
  applySkinUVs(overlayGeometry, spec.overlay[0], spec.overlay[1], w, h, d)
  /*
   * NOTICE: front faces only. With DoubleSide, wherever the near face is discarded
   * by alphaTest you see the *inside* of the far face instead, and a Lambert
   * surface lit from behind renders black. Culling backfaces trades a see-through
   * hat brim at grazing angles for never showing those black interiors.
   */
  const overlayMaterial = new MeshLambertMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.5,
    side: FrontSide,
  })
  const overlayMesh = new Mesh(overlayGeometry, overlayMaterial)
  overlayMesh.position.set(offset[0], offset[1], offset[2])
  group.add(overlayMesh)
  disposables.push(overlayGeometry, overlayMaterial)

  return group
}

/*
 * A soft blob painted under the feet.
 *
 * The stage renders on a transparent background, so there is no floor for a real
 * shadow map to land on — and without any contact cue a standing figure and a
 * hovering one look identical. A faked radial-gradient patch is the cheapest
 * thing that reads as "this is resting on something", and it can be scaled and
 * faded to sell the moments when the character genuinely leaves the ground.
 */
function buildContactShadow(disposables: { dispose: () => void }[]): Mesh {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.58)')
  gradient.addColorStop(0.45, 'rgba(0, 0, 0, 0.34)')
  gradient.addColorStop(0.78, 'rgba(0, 0, 0, 0.1)')
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace

  /*
   * Wider than deep, because the camera looks down only about ten degrees and
   * foreshortening flattens the depth axis to roughly a sixth of its true size.
   * A circular patch would read as a thin smear; over-scaling the depth is what
   * keeps it looking like a pool of shadow under the feet.
   */
  const geometry = new PlaneGeometry(13, 13)
  const material = new MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  })

  const mesh = new Mesh(geometry, material)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = 0.02
  mesh.renderOrder = -1

  disposables.push(geometry, material, texture)

  return mesh
}

export interface MinecraftRig {
  /**
   * Top-level object to add to the scene. Carries the MC_UNIT conversion, so
   * everything inside it is authored in MC units and `root.scale` is free to
   * carry squash and stretch on its own.
   */
  object: Group
  /** Animated body root, soles at y = 0 when it is not deliberately airborne. */
  root: Group
  /** Waist pivot. Leaning this carries the head and arms but not the legs. */
  torso: Group
  /**
   * Pelvis. Both legs hang off it, and it exists so their tops can follow the
   * torso's rotation.
   *
   * NOTICE: the torso pivots on the y = 12 waist plane, which is also where the
   * legs end. Rotating a box about a plane it shares with another box tilts its
   * bottom face away and opens a wedge — 4 * sin(roll) at the hips' half-width, and
   * the mismatch in silhouette that yaw produces. Matching that rotation here makes
   * the seam rigid. Yaw and roll are free to match exactly; yaw is
   * height-preserving, and roll only tips the feet by 2 * sin(angle).
   */
  hips: Group
  head: Group
  armRight: Group
  armLeft: Group
  legRight: Group
  legLeft: Group
  /** Faked ground contact patch. Sits outside `root` so it stays on the floor. */
  shadow: Mesh
  /** Resting Y of the waist pivot, so breathing can offset from it. */
  torsoBaseY: number
  /** Resting Y of both shoulder pivots, so a shrug can offset from it. */
  shoulderBaseY: number
  dispose: () => void
}

/**
 * Assemble a full humanoid rig from a loaded skin texture.
 *
 * Pivots follow the vanilla model: neck and shoulders at y = 24, hips at y = 12,
 * soles at y = 0. Legs hang off the root rather than the torso so that a forward
 * lean bends at the waist instead of dragging the feet along.
 */
export function buildMinecraftRig(texture: Texture, options: { slim?: boolean } = {}): MinecraftRig {
  const specs = partSpecs(options.slim ?? false)
  const disposables: { dispose: () => void }[] = []

  const object = new Group()
  const root = new Group()
  const torso = new Group()
  const head = new Group()

  // Half the torso width plus half an arm width puts the shoulder flush.
  const shoulderX = 4 + specs.armRight.size[0] / 2
  const torsoBaseY = 12

  /*
   * Shoulder pivots sit 2 units *inside* the arm rather than on its top face,
   * matching vanilla Minecraft's rotation points.
   *
   * NOTICE: this is load-bearing, not cosmetic. With the pivot flush at the top of
   * the arm (torso-local y = 12, i.e. world y = 24), every large rotation swings
   * the arm's top corners away from the shoulder — the inner one drops by
   * 2 * sin(angle) — and the arm visibly detaches, floating beside the body. Pivoting
   * from inside the arm keeps its topmost 2 units parked over the joint at any
   * angle, which is exactly why vanilla can swing arms through 60 degrees.
   */
  const shoulderBaseY = 10
  const armMeshOffsetY = -4

  torso.position.set(0, torsoBaseY, 0)
  torso.add(buildPart(specs.body, [0, 6, 0], texture, disposables))

  head.position.set(0, 12, 0)
  head.add(buildPart(specs.head, [0, 4, 0], texture, disposables))
  torso.add(head)

  // The mesh offset compensates for the lowered pivot so the arm still spans the
  // same y = 12..24 as the torso when at rest.
  const armRight = buildPart(specs.armRight, [0, armMeshOffsetY, 0], texture, disposables)
  armRight.position.set(-shoulderX, shoulderBaseY, 0)
  torso.add(armRight)

  const armLeft = buildPart(specs.armLeft, [0, armMeshOffsetY, 0], texture, disposables)
  armLeft.position.set(shoulderX, shoulderBaseY, 0)
  torso.add(armLeft)

  /*
   * The hips sit on the waist plane so that rotating them orbits both legs about
   * the body's centre line, exactly as the torso's bottom face does. Rotating each
   * leg about its own axis instead would spin them in place and leave the seam
   * mismatched.
   */
  const hips = new Group()
  hips.position.set(0, 12, 0)

  const legRight = buildPart(specs.legRight, [0, -6, 0], texture, disposables)
  legRight.position.set(-2, 0, 0)

  const legLeft = buildPart(specs.legLeft, [0, -6, 0], texture, disposables)
  legLeft.position.set(2, 0, 0)

  hips.add(legRight, legLeft)
  root.add(torso, hips)

  const shadow = buildContactShadow(disposables)

  object.add(root, shadow)
  object.scale.setScalar(MC_UNIT)

  function dispose() {
    for (const item of disposables)
      item.dispose()

    texture.dispose()
    object.removeFromParent()
  }

  return { object, root, torso, hips, head, armRight, armLeft, legRight, legLeft, shadow, torsoBaseY, shoulderBaseY, dispose }
}
