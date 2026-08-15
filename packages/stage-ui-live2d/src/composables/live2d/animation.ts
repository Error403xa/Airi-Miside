import type { InternalModel } from 'pixi-live2d-display/cubism4'

import { MathUtils } from 'three'

import { randomSaccadeInterval } from '../../utils'

export interface Live2DIdleEyeFocusOptions {
  xRange?: [number, number]
  yRange?: [number, number]
  focusScaleX?: number
  focusScaleY?: number
  centerBias?: number
}

/**
 * This is to simulate idle eye saccades and focus (head) movements in a *pretty* naive way.
 * Not using any reactivity here as it's not yet needed.
 * Keeping it here as a composable for future extension.
 */
export function useLive2DIdleEyeFocus(options: Live2DIdleEyeFocusOptions = {}) {
  const {
    xRange = [-1, 1],
    yRange = [-1, 0.7],
    focusScaleX = 0.5,
    focusScaleY = 0.5,
    centerBias = 0,
  } = options

  let nextSaccadeAfter = -1
  let focusTarget: [number, number] | undefined
  let lastSaccadeAt = -1

  // Function to handle idle eye saccades and focus (head) movements
  function update(model: InternalModel, now: number) {
    if (now >= nextSaccadeAfter || now < lastSaccadeAt) {
      focusTarget = Math.random() < centerBias
        ? [0, 0]
        : [MathUtils.randFloat(xRange[0], xRange[1]), MathUtils.randFloat(yRange[0], yRange[1])]
      lastSaccadeAt = now
      nextSaccadeAfter = now + (randomSaccadeInterval() / 1000)
      model.focusController.focus(focusTarget![0] * focusScaleX, focusTarget![1] * focusScaleY, false)
    }

    model.focusController.update(now - lastSaccadeAt)
    const coreModel = model.coreModel as any
    // TODO: After emotion mapper, stage editor, eye related parameters should be take cared to be dynamical instead of hardcoding
    coreModel.setParameterValueById('ParamEyeBallX', MathUtils.lerp(coreModel.getParameterValueById('ParamEyeBallX'), focusTarget![0], 0.3))
    coreModel.setParameterValueById('ParamEyeBallY', MathUtils.lerp(coreModel.getParameterValueById('ParamEyeBallY'), focusTarget![1], 0.3))
  }

  return { update }
}
