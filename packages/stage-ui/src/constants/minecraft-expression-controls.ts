/*
 * Expression control markers for the Minecraft box character.
 *
 * Deliberately a separate module from `live2d-expression-controls.ts` rather than a
 * third model inside it. Live2D controls resolve to `.exp3.json` expression files
 * that ship with each model, while a Minecraft skin has no expression files at all —
 * its "expressions" are the whole-body poses defined in `useMinecraftEmote`. Sharing
 * the Live2D types would mean carrying an `expressionFile` that is always empty, and
 * touching that module risks the Mita controls that already work.
 *
 * NOTICE: the `minecraft` keyword cannot collide with the Live2D markers. Their
 * pattern alternates on `mita|xiaomita-pro`, and at a shared start position `mita`
 * diverges from `minecraft` at the third character (t vs n), so neither pattern can
 * match the other's marker. `constants/minecraft-expression-controls.test.ts` pins
 * that down in both directions.
 */

export interface MinecraftExpressionControl {
  /** Pose id. Must match a key of `EMOTION_PROFILES` in the rig's emote driver. */
  id: string
  label: string
  emoji: string
  /** When the model should reach for it, used to build the system prompt. */
  hint: string
}

export const minecraftExpressionControlSpecialPrefix = 'minecraft-expression-control:'

/*
 * One pose at a time, unlike Mita's stackable expression files. These are full-body
 * postures, so two at once would fight over the same joints rather than layer.
 */
export const minecraftExpressionControls = [
  { id: 'neutral', label: '默认', emoji: '😐', hint: 'resting, no particular feeling' },
  { id: 'happy', label: '开心', emoji: '😄', hint: 'delight, praise, good news — bounces for a few seconds then settles' },
  { id: 'sad', label: '悲伤', emoji: '😢', hint: 'disappointment, apology, bad news' },
  { id: 'angry', label: '生气', emoji: '😠', hint: 'annoyance, jealousy, squaring up' },
  { id: 'surprised', label: '惊讶', emoji: '😲', hint: 'shock, being startled, sudden realisation' },
  { id: 'awkward', label: '尴尬', emoji: '😳', hint: 'embarrassment, being caught out, changing the subject' },
  { id: 'question', label: '疑问', emoji: '🤨', hint: 'confusion, asking something back, shrugging' },
  { id: 'think', label: '思考', emoji: '🤔', hint: 'considering, recalling, working something out' },
  { id: 'curious', label: '好奇', emoji: '👀', hint: 'interest, leaning in, wanting to know more' },
] as const satisfies readonly MinecraftExpressionControl[]

export const minecraftExpressionControlIds: readonly string[] = minecraftExpressionControls.map(control => control.id)

export const minecraftExpressionControlPrompt = [
  'Body-language control for the current character, a Minecraft-skin figure:',
  'Start every assistant reply with one control marker. The marker is hidden by the app and must not be explained or mentioned.',
  'Use only this prefix: [[minecraft:<pose>]]',
  'Exactly one pose per marker. These are whole-body postures, so they cannot be combined — do not use + or commas.',
  `Available poses: ${minecraftExpressionControlIds.join(', ')}.`,
  ...minecraftExpressionControls.map(control => `  ${control.id} — ${control.hint}`),
  'This character has no facial animation; the pose is the entire expression, so pick the one whose body language matches the reply.',
  'Do not use [[mita:...]] or [[xiaomita-pro:...]] while this character is selected.',
].join('\n')

/*
 * Only word characters and hyphens between the colon and the closing brackets, so a
 * marker cannot swallow following prose if the model forgets to close it.
 */
const controlPattern = /\[\[minecraft:([\w-]{1,40})\]\]/gi

const knownIds = new Set<string>(minecraftExpressionControlIds)

function normalizePoseId(raw: string): string | undefined {
  const id = raw.trim().toLowerCase()
  return knownIds.has(id) ? id : undefined
}

export function makeMinecraftExpressionControlSpecial(poseId: string): string {
  return `${minecraftExpressionControlSpecialPrefix}${poseId}`
}

export function parseMinecraftExpressionControlSpecial(special: string): string | undefined {
  if (!special.startsWith(minecraftExpressionControlSpecialPrefix))
    return

  return normalizePoseId(special.slice(minecraftExpressionControlSpecialPrefix.length))
}

/**
 * Pull the markers out of a chunk of model output.
 *
 * Unrecognised pose names are left in the visible text rather than silently eaten,
 * which makes a typo in a prompt visible instead of turning into a no-op.
 */
export function extractMinecraftExpressionControls(text: string): { visibleText: string, poses: string[] } {
  const poses: string[] = []

  const visibleText = text.replace(controlPattern, (match, rawPoseId: string) => {
    const poseId = normalizePoseId(rawPoseId)
    if (!poseId)
      return match

    poses.push(poseId)
    return ''
  })

  return { visibleText, poses }
}

export function stripMinecraftExpressionControls(text: string): string {
  return extractMinecraftExpressionControls(text).visibleText
}

export function findMinecraftExpressionControl(poseId: string): MinecraftExpressionControl | undefined {
  return minecraftExpressionControls.find(control => control.id === poseId)
}
