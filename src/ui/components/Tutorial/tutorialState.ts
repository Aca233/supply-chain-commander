export interface TutorialState {
  isActive: boolean;
  currentChapterIndex: number;
  currentStepIndex: number;
  completedChapters: string[];
  completedSteps: string[];
  showWelcome: boolean;
}

export const TUTORIAL_STORAGE_KEY = 'supply_chain_tutorial_progress';

export function createDefaultTutorialState(): TutorialState {
  return {
    isActive: false,
    currentChapterIndex: 0,
    currentStepIndex: 0,
    completedChapters: [],
    completedSteps: [],
    showWelcome: true,
  };
}

export function dismissTutorialWelcome(state: TutorialState): TutorialState {
  return {
    ...state,
    showWelcome: false,
  };
}

export function startTutorialFlow(state: TutorialState): TutorialState {
  return {
    ...dismissTutorialWelcome(state),
    isActive: true,
    currentChapterIndex: 0,
    currentStepIndex: 0,
  };
}
