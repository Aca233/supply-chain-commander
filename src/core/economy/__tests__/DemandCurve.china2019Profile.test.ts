import { describe, expect, it } from 'vitest';

import { GoodsId } from '@/data/goods';

import { CONSUMER_TIERS, calculateMarketDemand } from '../DemandCurve';
import { initializeWorld } from '../../world/WorldInitializer';

describe('china 2019 demand profile regression guards', () => {
  it('keeps consumer tier population structure', () => {
    const expectedPopulationByTier = [
      260_000_000,
      280_000_000,
      290_000_000,
      250_000_000,
      150_000_000,
      90_000_000,
      50_000_000,
      30_000_000,
    ];
    const totalPopulation = CONSUMER_TIERS.reduce((sum, tier) => sum + tier.population, 0);
    const lowerMiddlePopulation = CONSUMER_TIERS
      .filter((tier) => tier.id >= 0 && tier.id <= 4)
      .reduce((sum, tier) => sum + tier.population, 0);

    const tier0 = CONSUMER_TIERS.find((tier) => tier.id === 0);
    const tier7 = CONSUMER_TIERS.find((tier) => tier.id === 7);

    expect(tier0).toBeDefined();
    expect(tier7).toBeDefined();

    expect(CONSUMER_TIERS.map((tier) => tier.population)).toEqual(expectedPopulationByTier);
    expect(totalPopulation).toBe(1_400_000_000);
    expect(lowerMiddlePopulation / totalPopulation).toBeGreaterThan(0.85);
    expect(tier0!.savingsRate).toBeLessThan(tier7!.savingsRate);
    expect(tier0!.baseIncome).toBeLessThan(tier7!.baseIncome);
    expect(tier0!.pricePreference).toBeGreaterThan(tier7!.pricePreference);
  });

  it('keeps food demand dominance over luxury jewelry demand', () => {
    const world = initializeWorld();

    const foodDemand = calculateMarketDemand(world, GoodsId.FOOD);
    const jewelryDemand = calculateMarketDemand(world, GoodsId.JEWELRY);

    expect(foodDemand.quantity).toBeGreaterThan(jewelryDemand.quantity * 50);
    expect(foodDemand.priceElasticity).toBeGreaterThan(jewelryDemand.priceElasticity);
  });

  it('keeps fuel car demand ahead of electric car demand in the 2019 baseline', () => {
    const world = initializeWorld();

    const fuelCarDemand = calculateMarketDemand(world, GoodsId.CAR);
    const electricCarDemand = calculateMarketDemand(world, GoodsId.ELECTRIC_CAR);

    expect(fuelCarDemand.quantity).toBeGreaterThan(electricCarDemand.quantity * 1.25);
    expect(fuelCarDemand.incomeElasticity).toBeLessThan(electricCarDemand.incomeElasticity);
  });
});
