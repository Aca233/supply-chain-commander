/**
 * 建筑图标映射表
 * 基于当前建筑定义的 key 生成，避免建筑 ID 重排后图标整体错位。
 */

import { IconType } from 'react-icons';
import {
  GiBattery50,
  GiBatteryPack,
  GiBrickWall,
  GiCarKey,
  GiChemicalTank,
  GiClothes,
  GiCircuitry,
  GiCoalWagon,
  GiConcreteBag,
  GiCookingPot,
  GiCow,
  GiCrystalShine,
  GiDiamondRing,
  GiFarmTractor,
  GiFire,
  GiFishingBoat,
  GiFurnace,
  GiGasPump,
  GiGears,
  GiGemChain,
  GiGoldNuggets,
  GiHerbsBundle,
  GiMeat,
  GiMedicalDrip,
  GiMedicines,
  GiMicrochip,
  GiMiner,
  GiMineWagon,
  GiMiningHelmet,
  GiNewspaper,
  GiOilPump,
  GiOilRig,
  GiPowerGenerator,
  GiSewingMachine,
  GiShop,
  GiShoppingBag,
  GiShoppingCart,
  GiSmartphone,
  GiSofa,
  GiSolarPower,
  GiTreehouse,
  GiWashingMachine,
  GiWindow,
  GiWoodAxe,
  GiWoodenChair,
} from 'react-icons/gi';
import { FaCar, FaPills, FaQuestion } from 'react-icons/fa';

import { ALL_BUILDINGS, BUILDINGS_BY_ID, type BuildingTypeDefinition } from '@/data/buildings';

const FallbackIcon = FaQuestion;

const buildingKeyIconMap: Record<string, IconType> = {
  iron_mine: GiMiningHelmet,
  copper_mine: GiMineWagon,
  aluminum_mine: GiMineWagon,
  coal_mine: GiCoalWagon,
  oil_field: GiOilPump,
  gas_field: GiGasPump,
  silicon_mine: GiCrystalShine,
  lithium_mine: GiBattery50,
  rare_earth_mine: GiMiner,
  logging_camp: GiWoodAxe,
  farm: GiFarmTractor,
  rubber_plantation: GiTreehouse,
  livestock_farm: GiCow,
  fishery: GiFishingBoat,
  herb_farm: GiHerbsBundle,
  steel_mill: GiFurnace,
  non_ferrous_smelter: GiFire,
  refinery: GiOilRig,
  chemical_plant: GiChemicalTank,
  glass_factory: GiWindow,
  cement_factory: GiConcreteBag,
  paper_mill: GiNewspaper,
  textile_mill: GiSewingMachine,
  food_factory: GiCookingPot,
  meat_processing: GiMeat,
  dairy_factory: GiCow,
  building_materials_factory: GiBrickWall,
  electronics_factory: GiCircuitry,
  semiconductor_fab: GiMicrochip,
  battery_factory: GiBatteryPack,
  parts_factory: GiGears,
  car_factory: FaCar,
  appliance_factory: GiWashingMachine,
  furniture_factory: GiWoodenChair,
  new_energy_factory: GiSolarPower,
  pharma_factory: GiMedicines,
  medical_device_factory: GiMedicalDrip,
  gold_refinery: GiGoldNuggets,
  luxury_workshop: GiGemChain,
  power_plant: GiPowerGenerator,
  convenience_store: GiShop,
  supermarket: GiShoppingCart,
  electronics_store: GiSmartphone,
  car_dealership: GiCarKey,
  clothing_store: GiClothes,
  furniture_mall: GiSofa,
  pharmacy: FaPills,
  luxury_store: GiDiamondRing,
  energy_service_store: GiGasPump,
  department_store: GiShoppingBag,
};

const categoryFallbackIconMap: Record<BuildingTypeDefinition['category'], IconType> = {
  extraction: GiMiningHelmet,
  processing: GiFurnace,
  manufacturing: GiGears,
  luxury: GiGemChain,
  service: GiPowerGenerator,
  retail: GiShoppingBag,
};

/**
 * 当前建筑 ID 到图标的映射。
 * 保留数字索引导出兼容现有调用方，但由最新建筑定义自动生成。
 */
export const buildingIconMap: Record<number, IconType> = Object.fromEntries(
  ALL_BUILDINGS.map((building) => [
    building.id,
    buildingKeyIconMap[building.key] ?? categoryFallbackIconMap[building.category],
  ]),
);

/**
 * 获取建筑图标
 * @param buildingTypeId 建筑类型 ID
 * @returns 对应的图标组件
 */
export function getBuildingIcon(buildingTypeId: number): IconType {
  const building = BUILDINGS_BY_ID.get(buildingTypeId);
  if (!building) {
    return FallbackIcon;
  }

  return buildingKeyIconMap[building.key] ?? categoryFallbackIconMap[building.category];
}

/**
 * 根据建筑类别获取颜色类名
 */
export function getBuildingCategoryColor(
  category: 'extraction' | 'processing' | 'manufacturing' | 'luxury' | 'service' | 'retail',
): string {
  switch (category) {
    case 'extraction':
      return 'text-amber-500';
    case 'processing':
      return 'text-blue-500';
    case 'manufacturing':
      return 'text-green-500';
    case 'luxury':
      return 'text-yellow-500';
    case 'service':
      return 'text-purple-500';
    case 'retail':
      return 'text-orange-500';
    default:
      return 'text-gray-500';
  }
}

export default buildingIconMap;
