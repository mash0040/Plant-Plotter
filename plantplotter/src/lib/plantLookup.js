export const normalizePlantName = (name) => {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
};

const getPlantNameVariants = (name) => {
  const normalizedName = normalizePlantName(name);
  if (!normalizedName) return [];

  const variants = new Set([normalizedName]);

  if (normalizedName.endsWith('ies') && normalizedName.length > 3) {
    variants.add(`${normalizedName.slice(0, -3)}y`);
  }

  if (normalizedName.endsWith('s') && normalizedName.length > 3) {
    variants.add(normalizedName.slice(0, -1));
  }

  return [...variants];
};

const getPlantIdCandidates = (plant = {}) => {
  return [plant.plant_id, plant.plantId, plant.id]
    .filter((value) => value !== undefined && value !== null && value !== '')
    .map((value) => String(value).toLowerCase().trim());
};

export const findPlantInLibrary = (plantedItem, plantLibrary = []) => {
  if (!plantedItem || !Array.isArray(plantLibrary) || plantLibrary.length === 0) {
    return null;
  }

  const plantedItemIds = getPlantIdCandidates(plantedItem);
  const plantedItemNames = getPlantNameVariants(plantedItem.name || plantedItem.plant_name);

  const idMatch = plantLibrary.find((plant) => {
    const libraryIds = getPlantIdCandidates(plant);
    return plantedItemIds.some((plantedItemId) => libraryIds.includes(plantedItemId));
  });

  if (idMatch) return idMatch;

  const exactNameMatch = plantLibrary.find((plant) => {
    const libraryNames = getPlantNameVariants(plant.name || plant.plant_name);
    return plantedItemNames.some((plantedItemName) => libraryNames.includes(plantedItemName));
  });

  if (exactNameMatch) return exactNameMatch;

  return plantLibrary.find((plant) => {
    const libraryNames = getPlantNameVariants(plant.name || plant.plant_name);

    return plantedItemNames.some((plantedItemName) => (
      libraryNames.some((libraryName) => (
        libraryName.length >= 4 &&
        plantedItemName.length >= 4 &&
        (
          plantedItemName.includes(libraryName) ||
          libraryName.includes(plantedItemName)
        )
      ))
    ));
  }) || null;
};
