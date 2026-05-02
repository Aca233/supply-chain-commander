import { describe, expect, it } from 'vitest';

import {
  createDefaultTutorialState,
  dismissTutorialWelcome,
  startTutorialFlow,
} from '../tutorialState';

describe('tutorialState helpers', () => {
  it('dismisses the welcome dialog without mutating tutorial progress', () => {
    const state = {
      ...createDefaultTutorialState(),
      completedChapters: ['basics'],
      completedSteps: ['welcome'],
      showWelcome: true,
    };

    expect(dismissTutorialWelcome(state)).toEqual({
      ...state,
      showWelcome: false,
    });
  });

  it('starts the tutorial from the beginning and hides the welcome dialog', () => {
    const state = {
      ...createDefaultTutorialState(),
      completedChapters: ['production'],
      completedSteps: ['production_intro'],
      currentChapterIndex: 3,
      currentStepIndex: 2,
      showWelcome: true,
    };

    expect(startTutorialFlow(state)).toEqual({
      ...state,
      isActive: true,
      showWelcome: false,
      currentChapterIndex: 0,
      currentStepIndex: 0,
    });
  });
});
