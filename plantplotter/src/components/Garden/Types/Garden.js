export const GardenSchema = {
  id: 'string',
  userId: 'string',
  name: 'string',
  width: 'number',
  height: 'number',
  gridSize: 'number',
  plantedItems: 'array', // PlantedItem[]
  createdAt: 'date',
  updatedAt: 'date'
};

export const PlantedItemSchema = {
  id: 'string',
  gardenId: 'string',
  plantId: 'string',
  plantName: 'string',
  plantEmoji: 'string',
  plantSize: 'number',
  xPosition: 'number',
  yPosition: 'number',
  plantedDate: 'date',
  notes: 'string'
};