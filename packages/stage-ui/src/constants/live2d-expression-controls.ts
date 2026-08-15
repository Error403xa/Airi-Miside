export type Live2DExpressionControlModel = 'mita' | 'xiaomita-pro'

export interface Live2DExpressionControl {
  id: string
  expressionFile: string
  label: string
}

export interface ParsedLive2DExpressionControl {
  model: Live2DExpressionControlModel
  expressionIds: string[]
}

export const live2dExpressionControlSpecialPrefix = 'live2d-expression-control:'

export const mitaExpressionControls = [
  { id: 'default', expressionFile: '', label: '默认 / 清空叠加表情' },
  { id: 'inside', expressionFile: 'inside.exp3.json', label: 'inside / 内在异常' },
  { id: 'knife', expressionFile: 'knife.exp3.json', label: '刀' },
  { id: 'knife-blood', expressionFile: 'knife-blood.exp3.json', label: '刀血' },
  { id: 'mouth-blood', expressionFile: 'mouth-blood.exp3.json', label: '嘴血' },
  { id: 'raise-hand', expressionFile: 'raise-hand.exp3.json', label: '抬手' },
  { id: 'special-mouth', expressionFile: 'special-mouth.exp3.json', label: '特殊口型' },
  { id: 'special-eyes', expressionFile: 'special-eyes.exp3.json', label: '特殊眼睛' },
  { id: 'angry', expressionFile: 'angry.exp3.json', label: '生气' },
  { id: 'angry-face', expressionFile: 'angry-face.exp3.json', label: '生气表情' },
  { id: 'cassette', expressionFile: 'cassette.exp3.json', label: '磁带' },
  { id: 'blush', expressionFile: 'blush.exp3.json', label: '脸红' },
  { id: 'face-blood', expressionFile: 'face-blood.exp3.json', label: '脸血' },
  { id: 'dark-face', expressionFile: 'dark-face.exp3.json', label: '脸黑' },
  { id: 'highlight', expressionFile: 'highlight.exp3.json', label: '高光' },
] as const satisfies readonly Live2DExpressionControl[]

export const xiaoMitaProExpressionControls = [
  { id: 'default', expressionFile: '', label: '默认' },
  { id: 'smile', expressionFile: 'exp_smile.exp3.json', label: '微笑' },
  { id: 'happy', expressionFile: 'exp_happy.exp3.json', label: '开心' },
  { id: 'sad', expressionFile: 'exp_sad.exp3.json', label: '悲伤' },
  { id: 'surprised', expressionFile: 'exp_surprised.exp3.json', label: '惊讶' },
  { id: 'angry', expressionFile: 'exp_angry.exp3.json', label: '生气' },
] as const satisfies readonly Live2DExpressionControl[]

export const live2dExpressionControlsByModel = {
  'mita': mitaExpressionControls,
  'xiaomita-pro': xiaoMitaProExpressionControls,
} as const

export const live2dExpressionControlPrompts: Record<Live2DExpressionControlModel, string> = {
  'mita': [
    'Live2D expression control for the current character Mita:',
    'Start every assistant reply with one control marker. The marker is hidden by the app and must not be explained.',
    'Use only this prefix for Mita: [[mita:<expression>]]',
    'Mita supports stacked expressions. To stack multiple expressions, join them with +, for example [[mita:blush+highlight]] or [[mita:dark-face+special-eyes]].',
    'Available Mita expressions: default, inside, knife, knife-blood, mouth-blood, raise-hand, special-mouth, special-eyes, angry, angry-face, cassette, blush, face-blood, dark-face, highlight.',
    'Neutral reset: default. Sweet/affectionate: blush, highlight. Happy/safe: highlight. Jealous/angry: angry or angry-face. Horror/yandere: dark-face+special-eyes, inside, special-mouth. Threatening props: knife, knife-blood, mouth-blood, face-blood, cassette, raise-hand.',
    'Do not use [[xiaomita-pro:...]] while Mita is selected.',
  ].join('\n'),
  'xiaomita-pro': [
    'Live2D expression control for the current character Xiao Mita (pro):',
    'Start every assistant reply with one control marker. The marker is hidden by the app and must not be explained.',
    'Use only this prefix for Xiao Mita (pro): [[xiaomita-pro:<expression>]]',
    'Xiao Mita (pro) supports one expression at a time.',
    'Available Xiao Mita (pro) expressions: default, smile, happy, sad, surprised, angry.',
    'Sweet/affectionate: smile or happy. Shock: surprised. Sad/afraid: sad. Jealous/angry/horror: angry. Neutral reset: default.',
    'Do not use [[mita:...]] while Xiao Mita (pro) is selected.',
  ].join('\n'),
}

const controlPattern = /\[\[(mita|xiaomita-pro):([\w+,\-|; ]{1,160})\]\]/gi

function knownExpressionIds(model: Live2DExpressionControlModel) {
  return new Set<string>(live2dExpressionControlsByModel[model].map(expression => expression.id))
}

function normalizeExpressionIds(model: Live2DExpressionControlModel, rawExpressionIds: string) {
  const known = knownExpressionIds(model)
  return rawExpressionIds
    .split(/[,+|;\s]+/g)
    .map(expressionId => expressionId.trim().toLowerCase())
    .filter(expressionId => known.has(expressionId))
}

export function makeLive2DExpressionControlSpecial(control: ParsedLive2DExpressionControl) {
  return `${live2dExpressionControlSpecialPrefix}${control.model}:${control.expressionIds.join(',')}`
}

export function parseLive2DExpressionControlSpecial(special: string): ParsedLive2DExpressionControl | undefined {
  if (!special.startsWith(live2dExpressionControlSpecialPrefix))
    return

  const payload = special.slice(live2dExpressionControlSpecialPrefix.length)
  const separatorIndex = payload.indexOf(':')
  if (separatorIndex < 0)
    return

  const model = payload.slice(0, separatorIndex) as Live2DExpressionControlModel
  if (!(model in live2dExpressionControlsByModel))
    return

  const expressionIds = normalizeExpressionIds(model, payload.slice(separatorIndex + 1))
  if (!expressionIds.length)
    return

  return { model, expressionIds }
}

export function extractLive2DExpressionControls(text: string) {
  const controls: ParsedLive2DExpressionControl[] = []
  const visibleText = text.replace(controlPattern, (match, rawModel: Live2DExpressionControlModel, rawExpressionIds: string) => {
    const expressionIds = normalizeExpressionIds(rawModel, rawExpressionIds)
    if (!expressionIds.length)
      return match

    controls.push({ model: rawModel, expressionIds })
    return ''
  })

  return { visibleText, controls }
}

export function stripLive2DExpressionControls(text: string) {
  return extractLive2DExpressionControls(text).visibleText
}

export function findLive2DExpressionFile(model: Live2DExpressionControlModel, expressionId: string) {
  return live2dExpressionControlsByModel[model].find(expression => expression.id === expressionId)?.expressionFile
}
