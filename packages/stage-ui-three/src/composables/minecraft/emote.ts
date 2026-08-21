/*
 * Body-language emotion driver for the Minecraft box rig.
 *
 * A Minecraft skin bakes the face into an 8x8 patch of pixels, so there is no
 * facial channel to animate: no eyelid layer, no mouth shapes, and arbitrary
 * user skins may not even have a human face. Emotion therefore rides entirely on
 * posture, timing and idle modulation.
 *
 * That is less of a compromise than it sounds — AIRI already maps all nine
 * emotions to Live2D *motions* one-to-one, while its expression tables leave
 * several of them undefined (see `EMOTION_VRMExpressionName_value`). Posture is
 * the channel the rest of the app already leans on.
 *
 * Four layers stack every frame:
 *   1. a target pose per emotion, reached by frame-rate independent smoothing
 *   2. a continuous idle: two-rate breathing plus a slow weight-shift cycle
 *   3. a discrete idle: timed head saccades and occasional whole-body gestures,
 *      which is what stops a rigid figure from looking frozen between messages
 *   4. additive gaze tracking and speaking motion
 */

import type { MinecraftRig } from './skin-rig'

import { MathUtils } from 'three'

/*
 * Sign conventions, all in radians and all semantic rather than raw Euler
 * angles, so the emotion table below stays readable:
 *   headPitch     + = look down
 *   headYaw       + = turn toward the figure's own left
 *   headRoll      + = tilt toward the figure's own right shoulder
 *   torsoPitch    + = lean forward
 *   arm*Pitch     - = swing forward and up, + = swing back
 *   arm*Roll      + = away from the body, for either arm
 *   rootX / rootY / rootZ   MC units (1 unit = 1 skin pixel); +Z is toward the viewer
 *   rootYaw       + = the whole body pivots on its feet toward its own left
 *   stretch       1 = neutral, > 1 = taller and narrower
 */
export interface MinecraftPose {
  headPitch: number
  headYaw: number
  headRoll: number
  torsoPitch: number
  torsoYaw: number
  torsoRoll: number
  /**
   * Vertical torso offset, MC units.
   *
   * NOTICE: keep this at 0. The legs hang off the body root while the torso moves
   * independently, so rotating the torso is safe — the waist pivot stays
   * coincident — but *translating* it slides the whole waist line and tears the
   * torso away from the legs. Skins routinely draw a skirt across that seam
   * (measured: one of the bundled skins has 40% coverage on the jacket layer and
   * 29% on the pants layer, i.e. opaque geometry on both sides of it), so any gap
   * shows up as the hem detaching from the leg. Breathe with `torsoPitch` and
   * `shoulderRise` instead.
   */
  torsoY: number
  /**
   * Both shoulder pivots lift by this, MC units. What makes a shrug read.
   *
   * NOTICE: keep the magnitude under about 0.6. The pivot sits 2 units inside the
   * arm, so a rotating arm already reaches up to sqrt(2^2 + 2^2) = 2.83 above it —
   * 0.83 past the top of the torso. `shoulderRise` stacks straight on top of that,
   * and at the 1.7 an earlier revision used for `question` the arms visibly floated
   * free of the shoulders.
   */
  shoulderRise: number
  armRightPitch: number
  armRightRoll: number
  armLeftPitch: number
  armLeftRoll: number
  legRightPitch: number
  legLeftPitch: number
  /**
   * Symmetric outward tilt of both legs, radians. 0 leaves them together.
   *
   * Vanilla legs are two 4-wide boxes at x = +/-2, so at 0 they meet flush at the
   * centre line — a closed stance. Opening it is a deliberate act: each foot swings
   * out 12 * sin(angle), so 0.055 is about 1.3 units of daylight at the ankles.
   */
  legSplay: number
  rootX: number
  /** Vertical body offset, MC units. Only for genuinely leaving the ground. */
  rootY: number
  rootZ: number
  rootYaw: number
  stretch: number
}

/*
 * Procedural motion layered on top of a pose. Frequencies are in Hz.
 *
 * NOTICE: `bob` and the other displacement amplitudes are in MC units, where the
 * whole model is only 32 units tall. Anything below roughly 0.1 is invisible on
 * screen — an earlier revision of this file used 0.05 for the resting bob and the
 * character looked completely frozen.
 */
interface Oscillation {
  /**
   * Vertical lift of the body root, MC units.
   *
   * NOTICE: the root's origin is the soles, so any non-zero value lifts the feet
   * off the ground. Keep it at 0 for anything that is meant to be standing —
   * putting breathing here is what made an earlier revision look like it was
   * hovering. Use it only for deliberate hops and recoils.
   */
  bob: number
  /** Breathing depth applied to the torso, MC units. Feet stay planted. */
  breath: number
  /** Shared rate for the breath and the root bob. */
  bobFreq: number
  /** Weight-shift depth, as torso roll in radians. Drives lateral hip travel too. */
  sway: number
  swayFreq: number
  /** Counter-phase arm swing, as arm pitch. */
  armSwing: number
  /** Amplitude of the timed head saccades. */
  headScan: number
  /** How much of the occasional idle gestures to play, 0 disables them. */
  gestureScale: number
}

interface EmotionProfile {
  pose: Partial<MinecraftPose>
  osc: Partial<Oscillation>
  /** Seconds to substantially reach the pose. */
  blend: number
  /*
   * Optional excitement envelope. Movement energy — the hop, the arm swing, the
   * sway — starts at full strength and decays to `sustain` over `burst` seconds,
   * while the pose itself is held indefinitely. A bounce that never stops reads as
   * a nervous tic rather than delight; a burst reads as a reaction.
   */
  burst?: number
  /** Fraction of the movement energy left once the burst has decayed. */
  sustain?: number
}

const NEUTRAL_POSE: MinecraftPose = {
  headPitch: 0,
  headYaw: 0,
  headRoll: 0,
  torsoPitch: 0,
  torsoYaw: 0,
  torsoRoll: 0,
  torsoY: 0,
  shoulderRise: 0,
  armRightPitch: 0,
  armRightRoll: 0.05,
  armLeftPitch: 0,
  armLeftRoll: 0.05,
  legRightPitch: 0,
  legLeftPitch: 0,
  legSplay: 0,
  rootX: 0,
  rootY: 0,
  rootZ: 0,
  rootYaw: 0,
  stretch: 1,
}

/*
 * Resting idle. bobFreq 0.28 Hz is a 3.6 s breath cycle (~17 breaths a minute),
 * and swayFreq 0.11 Hz is a 9 s weight-shift cycle, which is roughly how often a
 * standing person actually redistributes their weight.
 */
const NEUTRAL_OSC: Oscillation = {
  bob: 0,
  breath: 0.34,
  bobFreq: 0.28,
  sway: 0.05,
  swayFreq: 0.11,
  armSwing: 0.05,
  headScan: 0.2,
  gestureScale: 1,
}

/*
 * The nine emotions AIRI can emit, as postures.
 *
 * NOTICE: every number here is hand-tuned by eye, not derived.
 *
 * NOTICE: the vanilla model has no elbow joint, so any pose that depends on a
 * forearm — hand to chin, hand behind the neck, arms folded — cannot be built by
 * rotating the rigid arm. `think` and `awkward` were rewritten around shapes the
 * silhouette can actually carry (one arm drawn across, hunched turning away)
 * after the literal gestures failed to communicate anything.
 *
 * NOTICE: `stretch` stays within about 2.5%. It scales the body root, so a skirt
 * drawn on the leg overlay is stretched along with everything else; at the 7% this
 * once used on `surprised` the distortion was plainly visible. Leg *rotation*, by
 * contrast, is safe — each leg's overlay is a child of the same group.
 *
 * `gestureScale` suppresses the random idle gestures where they would break
 * character: a sad or angry figure should not casually stretch mid-sulk.
 */
const EMOTION_PROFILES: Record<string, EmotionProfile> = {
  neutral: {
    pose: {},
    osc: {},
    blend: 0.6,
  },
  happy: {
    pose: {
      headPitch: -0.1,
      torsoPitch: -0.04,
      armRightPitch: -0.25,
      armLeftPitch: -0.25,
      armRightRoll: 0.18,
      armLeftRoll: 0.18,
      stretch: 1.008,
    },
    /*
     * NOTICE: bobFreq and armSwing are capped well below what "excited" tempts
     * you to write. At 1.55 Hz with a 0.45 rad swing the arms move 4 degrees per
     * frame, which stops reading as cheerful and starts reading as vibration.
     */
    osc: { bob: 2, breath: 0.5, bobFreq: 1.1, sway: 0.07, swayFreq: 0.7, armSwing: 0.22, headScan: 0.1, gestureScale: 0.6 },
    blend: 0.35,
    burst: 3,
    sustain: 0.12,
  },
  sad: {
    pose: {
      headPitch: 0.48,
      torsoPitch: 0.2,
      armRightPitch: 0.12,
      armLeftPitch: 0.12,
      armRightRoll: -0.02,
      armLeftRoll: -0.02,
      // Slumping is carried by the forward hinge and dropped shoulders. Neither
      // `rootY` (pushes the soles through the floor) nor `torsoY` (tears the waist
      // seam) can express it.
      shoulderRise: -0.6,
      legRightPitch: -0.04,
      stretch: 0.985,
    },
    osc: { bob: 0, breath: 0.16, bobFreq: 0.17, sway: 0.03, swayFreq: 0.07, armSwing: 0.02, headScan: 0.04, gestureScale: 0.15 },
    blend: 0.55,
  },
  angry: {
    pose: {
      headPitch: 0.16,
      torsoPitch: 0.16,
      rootZ: 1.8,
      armRightPitch: -0.1,
      armLeftPitch: -0.1,
      armRightRoll: 0.32,
      armLeftRoll: 0.32,
      // Braced, feet apart. A planted wide stance is most of what makes this read
      // as squaring up rather than just leaning in.
      legSplay: 0.055,
    },
    osc: { bob: 0, breath: 0.24, bobFreq: 0.5, sway: 0.02, swayFreq: 0.25, armSwing: 0.03, headScan: 0.02, gestureScale: 0.1 },
    blend: 0.25,
  },
  surprised: {
    pose: {
      headPitch: -0.32,
      torsoPitch: -0.14,
      armRightPitch: -0.95,
      armLeftPitch: -0.95,
      armRightRoll: 0.4,
      armLeftRoll: 0.4,
      shoulderRise: 0.5,
      // A startle plants the feet wider as it recoils.
      legSplay: 0.04,
      rootZ: -0.55,
      // NOTICE: no `rootY` here. A pose is *held* until the next emotion, so a
      // static root lift is not a recoil — it is sustained levitation. The
      // startle reads through stretch, raised shoulders and the arms instead.
      stretch: 1.025,
    },
    osc: { bob: 0.4, breath: 0.3, bobFreq: 0.7, sway: 0.03, swayFreq: 0.4, headScan: 0.05, gestureScale: 0 },
    blend: 0.12,
    burst: 2,
    sustain: 0.2,
  },
  awkward: {
    /*
     * Cringing away, hands drawn low in front.
     *
     * NOTICE: the arms must not roll *inward* (negative roll). An earlier version
     * used -0.2 to pull them in defensively, but the arms sit only 1.5 units off
     * the torso side, so inward roll drives the whole lower arm through the body —
     * a 1.5-unit-deep clip. A slight forward pitch with near-zero roll lets the
     * hands hang forward and just off the body instead, which the hunch and
     * turn-away already read as self-conscious.
     */
    pose: {
      headYaw: 0.62,
      headPitch: 0.22,
      headRoll: 0.12,
      torsoYaw: 0.34,
      torsoPitch: 0.1,
      rootYaw: 0.2,
      shoulderRise: 0.45,
      armRightPitch: -0.22,
      armRightRoll: 0.04,
      armLeftPitch: -0.2,
      armLeftRoll: 0.05,
      stretch: 0.985,
    },
    osc: { breath: 0.2, bobFreq: 0.4, sway: 0.06, swayFreq: 0.3, headScan: 0.06, gestureScale: 0.5 },
    blend: 0.4,
  },
  question: {
    /*
     * A real shrug. The shoulders have to physically rise for this to read —
     * rotating the arms alone left the pose indistinguishable from `think`, which
     * is why `shoulderRise` exists at all. Arms roll outward into a palms-up
     * suggestion and the body settles back onto its heels.
     */
    pose: {
      headRoll: 0.44,
      headPitch: -0.1,
      torsoPitch: -0.12,
      torsoRoll: 0.07,
      shoulderRise: 0.5,
      armRightPitch: -0.2,
      armRightRoll: 0.38,
      armLeftPitch: -0.2,
      armLeftRoll: 0.38,
    },
    osc: { breath: 0.28, bobFreq: 0.45, sway: 0.04, swayFreq: 0.26, headScan: 0.09, gestureScale: 0.4 },
    blend: 0.35,
  },
  think: {
    /*
     * One hand raised in front at chest height, the other hanging.
     *
     * NOTICE: a rigid arm cannot fold low across the chest. The section near the
     * shoulder sits at chest depth (z ~ 0), so any pose that brings the hand across
     * drags that mid-arm straight through the torso — measured over a unit deep
     * even at -0.85. The arm has to swing far enough forward (~-1.1) that its whole
     * length clears to the front of the body before angling inward; the hand then
     * reads as raised thoughtfully in front rather than buried in the chest.
     */
    pose: {
      headRoll: 0.3,
      headPitch: 0.2,
      torsoRoll: 0.1,
      torsoYaw: 0.14,
      shoulderRise: 0.25,
      armRightPitch: -1.15,
      armRightRoll: -0.2,
      armLeftPitch: -0.1,
      armLeftRoll: 0.05,
    },
    // armSwing 0: a raised thinking hand holds still. The default swing dips the
    // arm back toward the chest on each breath, which re-clips the mid-arm.
    osc: { breath: 0.22, bobFreq: 0.28, sway: 0.055, swayFreq: 0.18, armSwing: 0, headScan: 0.11, gestureScale: 0.5 },
    blend: 0.45,
  },
  curious: {
    /*
     * Leaning in. The lean now bends at the waist instead of sliding the whole
     * body forward on `rootZ`, and the head counter-pitches up so the figure is
     * peering at you rather than at the floor.
     */
    pose: {
      headPitch: -0.3,
      headRoll: 0.24,
      torsoPitch: 0.22,
      rootZ: 1.6,
      shoulderRise: 0.3,
      armRightPitch: -0.32,
      armLeftPitch: -0.32,
      armRightRoll: 0.18,
      armLeftRoll: 0.18,
      stretch: 1.012,
    },
    osc: { breath: 0.4, bobFreq: 0.8, sway: 0.06, swayFreq: 0.5, headScan: 0.2, gestureScale: 0.7 },
    blend: 0.3,
  },
}

/** Emotion keys in the order a picker should present them. */
export const MINECRAFT_EMOTIONS = [
  'neutral',
  'happy',
  'sad',
  'angry',
  'surprised',
  'awkward',
  'question',
  'think',
  'curious',
] as const

export interface MinecraftEmoteInput {
  /** TTS mouth openness, 0..1. Drives speaking posture, never a mouth shape. */
  mouthOpen?: number
  /** Cursor or tracked focus in -1..1, +y up. */
  focus?: { x: number, y: number }
  /** Let audio drive a subtle nod while speaking. */
  speakingMotion?: boolean
  /** Turn the head, torso and stance toward `focus`. */
  gazeTracking?: boolean
  /** Run the timed saccades and occasional gestures. */
  idleMotion?: boolean
}

/*
 * Gaze is split across three joints, and each one chases the target at its own
 * rate. Because the head is fastest and the stance slowest, the body visibly
 * follows the head instead of everything snapping together — the difference
 * between a character looking at you and a head swivelling on a fence post.
 */
const GAZE_HEAD_YAW = 0.42
const GAZE_TORSO_YAW = 0.26
const GAZE_ROOT_YAW = 0.16
const GAZE_HEAD_PITCH = 0.26
const GAZE_TORSO_PITCH = 0.07
/** Lateral lean toward the target, MC units. */
const GAZE_LEAN = 0.5

/*
 * How much of the torso's forward lean the pelvis copies.
 *
 * NOTICE: this trades one artefact against another. At 0 the torso's bottom face
 * tilts away from the legs and opens a gap of 2 * sin(pitch) — 0.48 units at the
 * lean `angry` used to carry, well past the 0.25 of overlap the jacket layer
 * provides. At 1 the seam is perfect but the legs swing out from under the body.
 * 0.65 keeps the residual wedge at roughly 0.2 for the deepest lean, with margin
 * under the overlay, while the extra leg angle stays small enough to read as
 * leaning in rather than toppling.
 */
const HIP_PITCH_FOLLOW = 0.65

const GAZE_HEAD_TAU = 0.18
const GAZE_TORSO_TAU = 0.5
const GAZE_ROOT_TAU = 1.1

interface GestureDelta {
  legSplay: number
  shoulderRise: number
  headPitch: number
  headYaw: number
  headRoll: number
  torsoPitch: number
  torsoYaw: number
  torsoRoll: number
  armRightPitch: number
  armLeftPitch: number
  armRightRoll: number
  armLeftRoll: number
  rootX: number
  rootY: number
}

/*
 * Occasional whole-body idle actions.
 *
 * `envelope` runs 0 -> 1 -> 0 across the gesture, so every one of these returns
 * to the underlying pose on its own with nothing to unwind. `sign` is chosen at
 * random when the gesture starts, which is what keeps the figure from always
 * glancing the same way.
 */
const IDLE_GESTURES: { duration: number, apply: (d: GestureDelta, envelope: number, sign: number) => void }[] = [
  {
    // Glance off to one side, as if something moved.
    duration: 2,
    apply: (d, e, sign) => {
      d.headYaw += e * 0.42 * sign
      d.headPitch += e * -0.05
      d.torsoYaw += e * 0.08 * sign
    },
  },
  {
    // A small stretch: arms lift, whole body rises.
    duration: 1.8,
    apply: (d, e) => {
      d.armRightPitch += e * -0.55
      d.armLeftPitch += e * -0.55
      d.armRightRoll += e * 0.3
      d.armLeftRoll += e * 0.3
      // Rises through the shoulders only. Raising the root lifts the feet off the
      // floor, and raising the torso opens the waist seam.
      d.shoulderRise += e * 0.5
      d.torsoPitch += e * -0.06
      d.headPitch += e * -0.12
    },
  },
  {
    // Shift weight decisively onto one foot.
    duration: 2.6,
    apply: (d, e, sign) => {
      d.rootX += e * 1.1 * sign
      d.torsoRoll += e * 0.07 * sign
      d.headRoll += e * -0.04 * sign
      // Repositioning the feet is part of actually changing stance.
      d.legSplay += e * 0.03
    },
  },
  {
    // Tilt the head, the way someone does when half-listening.
    duration: 1.6,
    apply: (d, e, sign) => {
      d.headRoll += e * 0.26 * sign
      d.headPitch += e * 0.06
    },
  },
  {
    // Adjust one arm.
    duration: 1.3,
    apply: (d, e, sign) => {
      if (sign > 0) {
        d.armRightPitch += e * -0.3
        d.armRightRoll += e * 0.16
      }
      else {
        d.armLeftPitch += e * -0.3
        d.armLeftRoll += e * 0.16
      }
    },
  },
]

/**
 * Frame-rate independent smoothing factor.
 *
 * `tau` is a third of the blend duration so that roughly 95% of the distance is
 * covered within that duration, matching how the VRM path talks about blends.
 */
function smoothing(delta: number, duration: number): number {
  return 1 - Math.exp(-delta / Math.max(duration, 1e-3) * 3)
}

/**
 * Drive a Minecraft rig's posture from AIRI's emotion stream.
 *
 * Mirrors the shape of `useVRMEmote` — `setEmotion` plus a per-frame `update` —
 * so the scene component can treat either renderer the same way.
 */
export function useMinecraftEmote(rig: MinecraftRig) {
  const targetPose: MinecraftPose = { ...NEUTRAL_POSE }
  const currentPose: MinecraftPose = { ...NEUTRAL_POSE }
  const targetOsc: Oscillation = { ...NEUTRAL_OSC }
  const currentOsc: Oscillation = { ...NEUTRAL_OSC }

  let currentEmotion = 'neutral'
  let blend = 0.6
  let speakLevel = 0

  // Kept so the movement energy can be re-derived every frame as the burst decays.
  let activeProfile: EmotionProfile = EMOTION_PROFILES.neutral
  let activeWeight = 1
  let emotionAge = 0

  /*
   * Oscillator phases are accumulated rather than recomputed as
   * `elapsed * frequency`. With the multiplicative form, any change to the
   * frequency retroactively rewrites the whole history, so the phase jumps by
   * `elapsed * deltaFrequency` in a single frame — a discontinuity that grows
   * without bound the longer the app stays open.
   */
  let breathPhase = 0
  let swayPhase = 0

  // Gaze, tracked per joint so each can lag the one above it.
  let gazeHeadX = 0
  let gazeTorsoX = 0
  let gazeRootX = 0
  let gazeHeadY = 0
  let gazeTorsoY = 0

  /*
   * Discrete head movement. Each glance is a timed interpolation between two
   * held values, not an exponential chase of a moving target: easing toward a
   * target that changes in a step puts peak velocity on the very first frame,
   * which reads as a twitch rather than a glance.
   */
  let saccadeFromYaw = 0
  let saccadeFromPitch = 0
  let saccadeToYaw = 0
  let saccadeToPitch = 0
  let saccadeYaw = 0
  let saccadePitch = 0
  /** Seconds spent travelling, then held until `saccadeHold` expires. */
  let saccadeTravel = 0
  let saccadeDuration = 0.7
  let saccadeHold = 1

  // Occasional gesture scheduling.
  let gestureCountdown = 5
  let gestureIndex = -1
  let gestureElapsed = 0
  let gestureSign = 1

  // Reused so the per-frame path allocates nothing.
  const gesture: GestureDelta = {
    legSplay: 0,
    shoulderRise: 0,
    headPitch: 0,
    headYaw: 0,
    headRoll: 0,
    torsoPitch: 0,
    torsoYaw: 0,
    torsoRoll: 0,
    armRightPitch: 0,
    armLeftPitch: 0,
    armRightRoll: 0,
    armLeftRoll: 0,
    rootX: 0,
    rootY: 0,
  }

  /**
   * Select an emotion. `intensity` scales the pose away from neutral, so a weak
   * signal reads as a hint of the posture rather than the full performance.
   */
  function setEmotion(emotion: string, intensity = 1): void {
    const profile = EMOTION_PROFILES[emotion]
    if (!profile) {
      // Unknown emotions fall back to neutral rather than freezing the last
      // pose, which would leave the character stuck mid-gesture.
      setEmotion('neutral')
      return
    }

    currentEmotion = emotion
    blend = profile.blend
    activeProfile = profile
    activeWeight = MathUtils.clamp(intensity, 0, 1)
    emotionAge = 0

    for (const key of Object.keys(NEUTRAL_POSE) as (keyof MinecraftPose)[]) {
      const neutral = NEUTRAL_POSE[key]
      const full = profile.pose[key] ?? neutral
      targetPose[key] = neutral + (full - neutral) * activeWeight
    }

    refreshTargetOsc()
  }

  /*
   * Movement energy channels. These are the ones a burst decays; `breath`,
   * `headScan` and `gestureScale` are the always-on signs of life and stay put, so
   * a character that has finished celebrating still breathes and looks around.
   */
  const ENERGY_KEYS: (keyof Oscillation)[] = ['bob', 'bobFreq', 'sway', 'swayFreq', 'armSwing']

  /**
   * Recompute the oscillator targets for the current emotion age.
   *
   * The burst falls off on an inverted smoothstep, which leaves the curve flat at
   * both ends — the excitement neither snaps on nor stops dead, it just runs out.
   */
  function refreshTargetOsc(): void {
    const burst = activeProfile.burst ?? 0
    const sustain = activeProfile.sustain ?? 1

    let energy = 1
    if (burst > 0) {
      const u = MathUtils.clamp(emotionAge / burst, 0, 1)
      energy = sustain + (1 - sustain) * (1 - u * u * (3 - 2 * u))
    }

    for (const key of Object.keys(NEUTRAL_OSC) as (keyof Oscillation)[]) {
      const neutral = NEUTRAL_OSC[key]
      const full = activeProfile.osc[key] ?? neutral
      const weight = ENERGY_KEYS.includes(key) ? activeWeight * energy : activeWeight
      targetOsc[key] = neutral + (full - neutral) * weight
    }
  }

  /**
   * Begin a new glance from wherever the head currently is.
   *
   * Roughly one glance in four is a wider look, so the scanning does not settle
   * into a uniform twitch pattern. Travel time scales with distance, the way a
   * real head turn does.
   */
  function retargetSaccade(): void {
    const wide = Math.random() < 0.25
    const reach = currentOsc.headScan * (wide ? 2.1 : 1)

    saccadeFromYaw = saccadeYaw
    saccadeFromPitch = saccadePitch
    saccadeToYaw = (Math.random() * 2 - 1) * reach
    saccadeToPitch = (Math.random() * 2 - 1) * reach * 0.4

    const distance = Math.abs(saccadeToYaw - saccadeFromYaw)
    saccadeDuration = 0.45 + distance * 2.2
    saccadeTravel = 0
    saccadeHold = 0.9 + Math.random() * 2.4
  }

  /** Advance the discrete idle layer: saccades plus occasional gestures. */
  function updateIdleMotion(delta: number, enabled: boolean): void {
    for (const key of Object.keys(gesture) as (keyof GestureDelta)[])
      gesture[key] = 0

    if (!enabled) {
      // Return to centre on the same eased path rather than snapping.
      if (saccadeToYaw !== 0 || saccadeToPitch !== 0) {
        saccadeFromYaw = saccadeYaw
        saccadeFromPitch = saccadePitch
        saccadeToYaw = 0
        saccadeToPitch = 0
        saccadeTravel = 0
        saccadeDuration = 0.6
      }
      gestureIndex = -1
    }

    if (saccadeTravel < saccadeDuration) {
      saccadeTravel = Math.min(saccadeTravel + delta, saccadeDuration)
      /*
       * smoothstep has zero derivative at both ends, so the head accelerates out
       * of rest and decelerates into the new position. That is what removes the
       * first-frame jerk an exponential ease produces on a stepped target.
       */
      const p = saccadeTravel / saccadeDuration
      const eased = p * p * (3 - 2 * p)
      saccadeYaw = MathUtils.lerp(saccadeFromYaw, saccadeToYaw, eased)
      saccadePitch = MathUtils.lerp(saccadeFromPitch, saccadeToPitch, eased)
    }
    else if (enabled) {
      // Arrived. Hold this direction for a beat before looking elsewhere.
      saccadeHold -= delta
      if (saccadeHold <= 0)
        retargetSaccade()
    }

    if (!enabled)
      return

    const scale = currentOsc.gestureScale
    if (gestureIndex < 0) {
      // Between gestures. Emotions with gestureScale 0 never start one, so the
      // countdown is simply left to idle down and re-armed on the next check.
      gestureCountdown -= delta
      if (gestureCountdown <= 0) {
        gestureCountdown = 5 + Math.random() * 8
        if (scale > 0.05) {
          gestureIndex = Math.floor(Math.random() * IDLE_GESTURES.length)
          gestureElapsed = 0
          gestureSign = Math.random() < 0.5 ? -1 : 1
        }
      }
      return
    }

    const active = IDLE_GESTURES[gestureIndex]
    gestureElapsed += delta

    if (gestureElapsed >= active.duration) {
      gestureIndex = -1
      return
    }

    /*
     * sin^2 rises to 1 at the midpoint and returns to 0, and unlike plain sin it
     * has zero derivative at both ends — so a gesture starts and finishes without
     * the visible kick that cost `armR.x` about a degree per frame on onset.
     */
    const s = Math.sin(Math.PI * (gestureElapsed / active.duration))
    active.apply(gesture, s * s * scale, gestureSign)
  }

  /** Advance and write the rig's transforms. Call once per rendered frame. */
  function update(delta: number, input: MinecraftEmoteInput = {}): void {
    emotionAge += delta
    refreshTargetOsc()

    const k = smoothing(delta, blend)
    for (const key of Object.keys(currentPose) as (keyof MinecraftPose)[])
      currentPose[key] = MathUtils.lerp(currentPose[key], targetPose[key], k)

    // Oscillator parameters ease over a fixed window so that switching to a
    // faster emotion speeds the idle up smoothly instead of snapping.
    const oscK = smoothing(delta, 0.8)
    for (const key of Object.keys(currentOsc) as (keyof Oscillation)[])
      currentOsc[key] = MathUtils.lerp(currentOsc[key], targetOsc[key], oscK)

    updateIdleMotion(delta, input.idleMotion !== false)

    /*
     * Breathing uses two rates rather than one. A single sine reads as a
     * mechanical pulse; adding a slower, weaker second term makes the cycle
     * uneven enough to pass as respiration.
     */
    breathPhase += delta * currentOsc.bobFreq * Math.PI * 2
    swayPhase += delta * currentOsc.swayFreq * Math.PI * 2

    const breath = Math.sin(breathPhase) * 0.82 + Math.sin(breathPhase * 0.53 + 0.9) * 0.18
    const sway = Math.sin(swayPhase)

    /*
     * A hop has to be one-sided: the feet may leave the floor but must never sink
     * through it. `(1 - cos)/2` rectifies to 0..1 while keeping zero derivative at
     * both ends, unlike `max(breath, 0)` which would reintroduce a kink at zero.
     */
    const bobLift = (1 - Math.cos(breathPhase)) * 0.5

    // Speaking posture: a small nod and lift tied to TTS amplitude. Smoothed
    // hard, because raw mouth-open values are jittery enough to look like a
    // glitch when applied straight to a rigid neck.
    const mouthOpen = input.speakingMotion === false ? 0 : MathUtils.clamp(input.mouthOpen ?? 0, 0, 1)
    speakLevel = MathUtils.lerp(speakLevel, mouthOpen, smoothing(delta, 0.12))

    const focus = input.gazeTracking === false ? undefined : input.focus
    const focusX = MathUtils.clamp(focus?.x ?? 0, -1, 1)
    const focusY = MathUtils.clamp(focus?.y ?? 0, -1, 1)

    gazeHeadX = MathUtils.lerp(gazeHeadX, focusX, smoothing(delta, GAZE_HEAD_TAU))
    gazeTorsoX = MathUtils.lerp(gazeTorsoX, focusX, smoothing(delta, GAZE_TORSO_TAU))
    gazeRootX = MathUtils.lerp(gazeRootX, focusX, smoothing(delta, GAZE_ROOT_TAU))
    gazeHeadY = MathUtils.lerp(gazeHeadY, focusY, smoothing(delta, GAZE_HEAD_TAU))
    gazeTorsoY = MathUtils.lerp(gazeTorsoY, focusY, smoothing(delta, GAZE_TORSO_TAU))

    /*
     * The weight-shift cycle drives the hips sideways, rolls the torso, and
     * counter-rolls the head so it stays roughly level — that counter-rotation is
     * most of what makes the shift read as balance rather than as leaning.
     */
    const shiftRoll = sway * currentOsc.sway
    const shiftLateral = sway * 0.55

    rig.head.rotation.x = currentPose.headPitch
      - gazeHeadY * GAZE_HEAD_PITCH
      + saccadePitch
      + gesture.headPitch
      + speakLevel * 0.055
    rig.head.rotation.y = currentPose.headYaw
      + gazeHeadX * GAZE_HEAD_YAW
      + saccadeYaw
      + gesture.headYaw
    rig.head.rotation.z = currentPose.headRoll
      - shiftRoll * 0.5
      + gesture.headRoll

    rig.torso.rotation.x = currentPose.torsoPitch
      - gazeTorsoY * GAZE_TORSO_PITCH
      + breath * 0.03
      + gesture.torsoPitch
    rig.torso.rotation.y = currentPose.torsoYaw
      + gazeTorsoX * GAZE_TORSO_YAW
      + gesture.torsoYaw
    rig.torso.rotation.z = currentPose.torsoRoll
      + shiftRoll
      + gesture.torsoRoll

    /*
     * The waist never moves. `torsoY` is pinned to its rest value so the torso and
     * the legs keep sharing the y = 12 seam; see the note on `MinecraftPose.torsoY`
     * for why translating it detaches a skirt hem from the leg underneath.
     */
    rig.torso.position.y = rig.torsoBaseY

    /*
     * Breathing therefore surfaces as chest rotation plus shoulder rise. Shoulders
     * are free to translate because the arms are separate boxes with nothing
     * bridging them to the body — there is no seam to tear.
     */
    const shoulderY = rig.shoulderBaseY
      + currentPose.shoulderRise
      + gesture.shoulderRise
      + breath * currentOsc.breath * 0.4
      + speakLevel * 0.13
    rig.armRight.position.y = shoulderY
    rig.armLeft.position.y = shoulderY

    /*
     * Arms swing counter-phase to the breath and lag the weight shift slightly,
     * which is the cheapest available stand-in for follow-through on a rig with
     * no elbows.
     *
     * NOTICE: the outward roll uses breath squared, not its absolute value. Both
     * stay non-negative, but `Math.abs` has a kink at zero — the one remaining
     * derivative discontinuity in this whole system, and measurably the largest
     * per-frame acceleration spike in every emotion before it was replaced.
     */
    const swing = breath * currentOsc.armSwing
    const breathRoll = breath * breath * 0.02
    rig.armRight.rotation.x = currentPose.armRightPitch + swing + gesture.armRightPitch
    rig.armRight.rotation.z = -(currentPose.armRightRoll + breathRoll + gesture.armRightRoll) - shiftRoll * 0.3
    rig.armLeft.rotation.x = currentPose.armLeftPitch - swing + gesture.armLeftPitch
    rig.armLeft.rotation.z = currentPose.armLeftRoll + breathRoll + gesture.armLeftRoll - shiftRoll * 0.3

    /*
     * The pelvis follows the torso so the waist seam stays rigid.
     *
     * Yaw and roll match exactly: yaw preserves height, and roll only tips the feet
     * by 2 * sin(angle), which reads as a weight shift anyway. Pitch matches at half
     * strength — a full match would swing the legs out from under the body like it
     * was toppling, while no match at all leaves the 2 * sin(pitch) wedge at the
     * waist that made the upper body look detached.
     */
    rig.hips.rotation.y = rig.torso.rotation.y
    rig.hips.rotation.z = rig.torso.rotation.z
    rig.hips.rotation.x = rig.torso.rotation.x * HIP_PITCH_FOLLOW

    /*
     * On top of that shared rotation, each leg keeps its own small motion so the
     * lower body is not merely a rigid extension of the torso: the weight shift
     * loads one leg more than the other, and both tuck slightly at the top of a hop.
     */
    const legTuck = bobLift * currentOsc.bob * 0.045
    rig.legRight.rotation.x = currentPose.legRightPitch + shiftRoll * 0.4 - legTuck
    rig.legLeft.rotation.x = currentPose.legLeftPitch - shiftRoll * 0.4 - legTuck

    /*
     * Splay is per-pose rather than constant, so the default stance is closed and
     * only the poses that mean to open it do. `shiftRoll` is added to both legs in
     * the same direction — that is the weight shift tilting the whole stance, not a
     * splay.
     */
    const splay = currentPose.legSplay + gesture.legSplay
    rig.legRight.rotation.z = -splay + shiftRoll * 0.25
    rig.legLeft.rotation.z = splay + shiftRoll * 0.25

    /*
     * Squash and stretch. Rigid boxes read as alive almost entirely through this;
     * volume is roughly preserved by shrinking x/z as y grows. The root origin is
     * at the soles, so scaling y grows the figure upward and leaves the feet down.
     *
     * NOTICE: amplitudes are deliberately held under about 2.5%. Skins that draw a
     * skirt put it on the leg overlay, and scaling the root stretches that geometry
     * along with everything else — at the 7% this once used on `surprised` the
     * distortion was plainly visible.
     */
    const stretch = currentPose.stretch + breath * 0.004
    const lateral = 1 / Math.sqrt(Math.max(stretch, 0.1))
    rig.root.scale.set(lateral, stretch, lateral)

    /*
     * The root only carries motion that genuinely moves the whole body: a lateral
     * weight shift, a lean, a stance turn, and `bob` for the emotions that really
     * do leave the ground. Everything authored here is already in MC units — the
     * MC_UNIT conversion lives once on `rig.object`.
     */
    const airborne = currentPose.rootY + bobLift * currentOsc.bob + gesture.rootY
    const lateralOffset = currentPose.rootX + shiftLateral + gesture.rootX + gazeRootX * GAZE_LEAN

    rig.root.position.x = lateralOffset
    rig.root.position.y = airborne
    rig.root.position.z = currentPose.rootZ
    rig.root.rotation.y = currentPose.rootYaw + gazeRootX * GAZE_ROOT_YAW

    /*
     * The contact shadow tracks the body sideways but stays on the floor, and it
     * shrinks and fades as the figure rises. That coupling is what makes a hop
     * look like a hop instead of the whole rig sliding upward.
     */
    rig.shadow.position.x = lateralOffset
    rig.shadow.position.z = currentPose.rootZ

    const lift = MathUtils.clamp(Math.max(airborne, 0) / 6, 0, 1)
    const shadowScale = 1 - lift * 0.35
    rig.shadow.scale.set(shadowScale, shadowScale, 1)
    ;(rig.shadow.material as { opacity: number }).opacity = 1 - lift * 0.55
  }

  function reset(): void {
    setEmotion('neutral')
  }

  return {
    setEmotion,
    update,
    reset,
    getCurrentEmotion: () => currentEmotion,
  }
}
