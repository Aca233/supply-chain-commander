import { describe, expect, it } from 'vitest';
import { FaPills } from 'react-icons/fa';
import { GiFarmTractor, GiPowerGenerator, GiShoppingBag, GiSmartphone } from 'react-icons/gi';

import { BUILDINGS_BY_KEY } from '@/data/buildings';
import { getBuildingIcon } from '../buildingIconMap';

describe('getBuildingIcon', () => {
  it('matches icons to the current building definitions instead of stale numeric positions', () => {
    expect(getBuildingIcon(BUILDINGS_BY_KEY.get('farm')!.id)).toBe(GiFarmTractor);
    expect(getBuildingIcon(BUILDINGS_BY_KEY.get('power_plant')!.id)).toBe(GiPowerGenerator);
    expect(getBuildingIcon(BUILDINGS_BY_KEY.get('electronics_store')!.id)).toBe(GiSmartphone);
    expect(getBuildingIcon(BUILDINGS_BY_KEY.get('pharmacy')!.id)).toBe(FaPills);
    expect(getBuildingIcon(BUILDINGS_BY_KEY.get('department_store')!.id)).toBe(GiShoppingBag);
  });
});
