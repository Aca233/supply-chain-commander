import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearNewsHistory, loadNewsHistory, markNewsAsRead, resetNewsStore, saveNewsReport } from '../NewsStore';
import { MonthlyNewsReport } from '../types';

const sampleReport: MonthlyNewsReport = {
  id: '2020-1',
  year: 2020,
  month: 1,
  tick: 30,
  generatedAt: 1,
  isLLMGenerated: false,
  headline: {
    id: 'headline-1',
    category: 'economy',
    importance: 'headline',
    title: 'Market update',
    content: 'The market is stable.',
  },
  articles: [],
  summary: 'Stable market.',
  stats: {
    economy: {
      gdp: 1,
      gdpChange: 0,
      inflation: 0,
      unemployment: 0,
      cyclePhase: 'stable',
    },
    priceChanges: [],
    companyRankings: {
      richest: [],
      mostBuildings: [],
      mostGrowth: [],
      bankrupt: [],
    },
    playerStats: {
      cashChange: 0,
      cashChangePercent: 0,
      buildingsBuilt: 0,
      buildingsDemolished: 0,
      tradesCompleted: 0,
      totalTradeValue: 0,
    },
    disasters: [],
    majorEvents: [],
  },
};

describe('NewsStore storage fallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetNewsStore();
  });

  it('uses in-memory history without logging storage errors when localStorage is unavailable', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    saveNewsReport(sampleReport);

    expect(loadNewsHistory()).toEqual([sampleReport]);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('marks news as read without logging storage errors when localStorage is unavailable', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    markNewsAsRead(sampleReport.id);
    clearNewsHistory();

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
