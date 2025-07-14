// Enhanced Mock API functions with fuller garden layouts (10+ plants each)
export async function getGardens() {
  return [
    {
      id: 1,
      name: "Main Vegetable Garden",
      description: "Large productive vegetable garden with diverse crops and companion planting",
      soilType: "Loamy",
      dimensions: { width: 16, height: 12 },
      location: "Backyard",
      status: "Active",
      plantCount: 15,
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-12-15T14:30:00Z",
      plantedItems: [
        {
          id: "item-1",
          plantId: "tomato",
          name: "Tomato",
          emoji: "🍅",
          size: 2,
          category: "vegetables",
          xPosition: 2,
          yPosition: 1,
          plantedDate: "2024-11-01T00:00:00Z",
          notes: "Cherry tomato variety, caged for support"
        },
        {
          id: "item-2",
          plantId: "basil",
          name: "Basil",
          emoji: "🌿",
          size: 1,
          category: "herbs",
          xPosition: 4,
          yPosition: 1,
          plantedDate: "2024-11-05T00:00:00Z",
          notes: "Companion plant with tomatoes"
        },
        {
          id: "item-3",
          plantId: "lettuce",
          name: "Lettuce",
          emoji: "🥬",
          size: 1,
          category: "vegetables",
          xPosition: 0,
          yPosition: 3,
          plantedDate: "2024-10-20T00:00:00Z",
          notes: "Butterhead variety"
        },
        {
          id: "item-4",
          plantId: "carrot",
          name: "Carrot",
          emoji: "🥕",
          size: 1,
          category: "vegetables",
          xPosition: 1,
          yPosition: 3,
          plantedDate: "2024-10-15T00:00:00Z",
          notes: "Orange variety, deep loose soil"
        },
        {
          id: "item-5",
          plantId: "radish",
          name: "Radish",
          emoji: "🔴",
          size: 1,
          category: "vegetables",
          xPosition: 2,
          yPosition: 3,
          plantedDate: "2024-11-25T00:00:00Z",
          notes: "Quick growing, intercropped with carrots"
        },
        {
          id: "item-6",
          plantId: "pepper",
          name: "Bell Pepper",
          emoji: "🫑",
          size: 2,
          category: "vegetables",
          xPosition: 6,
          yPosition: 2,
          plantedDate: "2024-11-10T00:00:00Z",
          notes: "Red bell pepper, needs warm weather"
        },
        {
          id: "item-7",
          plantId: "oregano",
          name: "Oregano",
          emoji: "🌿",
          size: 1,
          category: "herbs",
          xPosition: 8,
          yPosition: 2,
          plantedDate: "2024-10-25T00:00:00Z",
          notes: "Mediterranean variety, drought tolerant"
        },
        {
          id: "item-8",
          plantId: "spinach",
          name: "Spinach",
          emoji: "🥬",
          size: 1,
          category: "vegetables",
          xPosition: 0,
          yPosition: 5,
          plantedDate: "2024-10-30T00:00:00Z",
          notes: "Cold weather crop"
        },
        {
          id: "item-9",
          plantId: "broccoli",
          name: "Broccoli",
          emoji: "🥦",
          size: 2,
          category: "vegetables",
          xPosition: 2,
          yPosition: 5,
          plantedDate: "2024-10-10T00:00:00Z",
          notes: "Fall planting, cool weather preferred"
        },
        {
          id: "item-10",
          plantId: "parsley",
          name: "Parsley",
          emoji: "🌿",
          size: 1,
          category: "herbs",
          xPosition: 4,
          yPosition: 6,
          plantedDate: "2024-10-20T00:00:00Z",
          notes: "Flat-leaf variety, biennial"
        },
        {
          id: "item-11",
          plantId: "cucumber",
          name: "Cucumber",
          emoji: "🥒",
          size: 3,
          category: "vegetables",
          xPosition: 10,
          yPosition: 4,
          plantedDate: "2024-11-15T00:00:00Z",
          notes: "Climbing variety with trellis"
        },
        {
          id: "item-12",
          plantId: "zucchini",
          name: "Zucchini",
          emoji: "🥒",
          size: 3,
          category: "vegetables",
          xPosition: 6,
          yPosition: 8,
          plantedDate: "2024-11-20T00:00:00Z",
          notes: "Summer squash, very productive"
        },
        {
          id: "item-13",
          plantId: "marigold",
          name: "Marigold",
          emoji: "🌼",
          size: 1,
          category: "flowers",
          xPosition: 0,
          yPosition: 0,
          plantedDate: "2024-10-01T00:00:00Z",
          notes: "Pest deterrent border plant"
        },
        {
          id: "item-14",
          plantId: "nasturtium",
          name: "Nasturtium",
          emoji: "🌸",
          size: 1,
          category: "flowers",
          xPosition: 9,
          yPosition: 0,
          plantedDate: "2024-10-05T00:00:00Z",
          notes: "Edible flowers, aphid trap crop"
        },
        {
          id: "item-15",
          plantId: "cilantro",
          name: "Cilantro",
          emoji: "🌿",
          size: 1,
          category: "herbs",
          xPosition: 14,
          yPosition: 2,
          plantedDate: "2024-11-01T00:00:00Z",
          notes: "Cool weather herb, succession planted"
        }
      ]
    },
    {
      id: 2,
      name: "Mixed Berry & Flower Garden",
      description: "Diverse garden combining berry bushes, flowers, and companion herbs",
      soilType: "Sandy Loam",
      dimensions: { width: 14, height: 10 },
      location: "Front yard",
      status: "Active",
      plantCount: 13,
      createdAt: "2024-02-20T09:00:00Z",
      updatedAt: "2024-12-10T16:15:00Z",
      plantedItems: [
        {
          id: "item-16",
          plantId: "strawberry",
          name: "Strawberry",
          emoji: "🍓",
          size: 1,
          category: "fruits",
          xPosition: 1,
          yPosition: 1,
          plantedDate: "2024-09-15T00:00:00Z",
          notes: "Ever-bearing variety, June harvest"
        },
        {
          id: "item-17",
          plantId: "strawberry",
          name: "Strawberry",
          emoji: "🍓",
          size: 1,
          category: "fruits",
          xPosition: 3,
          yPosition: 1,
          plantedDate: "2024-09-15T00:00:00Z",
          notes: "Second strawberry plant for better yield"
        },
        {
          id: "item-18",
          plantId: "strawberry",
          name: "Strawberry",
          emoji: "🍓",
          size: 1,
          category: "fruits",
          xPosition: 5,
          yPosition: 1,
          plantedDate: "2024-09-15T00:00:00Z",
          notes: "Third strawberry for full bed"
        },
        {
          id: "item-19",
          plantId: "blueberry",
          name: "Blueberry",
          emoji: "🫐",
          size: 3,
          category: "fruits",
          xPosition: 8,
          yPosition: 2,
          plantedDate: "2024-08-01T00:00:00Z",
          notes: "Highbush variety, acidic soil added"
        },
        {
          id: "item-20",
          plantId: "raspberry",
          name: "Raspberry",
          emoji: "🍇",
          size: 2,
          category: "fruits",
          xPosition: 2,
          yPosition: 4,
          plantedDate: "2024-07-20T00:00:00Z",
          notes: "Red raspberry canes, summer bearing"
        },
        {
          id: "item-21",
          plantId: "raspberry",
          name: "Raspberry",
          emoji: "🍇",
          size: 2,
          category: "fruits",
          xPosition: 4,
          yPosition: 4,
          plantedDate: "2024-07-20T00:00:00Z",
          notes: "Second raspberry for better production"
        },
        {
          id: "item-22",
          plantId: "lavender",
          name: "Lavender",
          emoji: "💜",
          size: 2,
          category: "flowers",
          xPosition: 0,
          yPosition: 7,
          plantedDate: "2024-08-15T00:00:00Z",
          notes: "English lavender, drought tolerant"
        },
        {
          id: "item-23",
          plantId: "lavender",
          name: "Lavender",
          emoji: "💜",
          size: 2,
          category: "flowers",
          xPosition: 3,
          yPosition: 7,
          plantedDate: "2024-08-15T00:00:00Z",
          notes: "Second lavender for hedge effect"
        },
        {
          id: "item-24",
          plantId: "rose",
          name: "Rose Bush",
          emoji: "🌹",
          size: 2,
          category: "flowers",
          xPosition: 10,
          yPosition: 6,
          plantedDate: "2024-07-01T00:00:00Z",
          notes: "Hybrid tea rose, needs regular feeding"
        },
        {
          id: "item-25",
          plantId: "marigold",
          name: "Marigold",
          emoji: "🌼",
          size: 1,
          category: "flowers",
          xPosition: 6,
          yPosition: 3,
          plantedDate: "2024-09-20T00:00:00Z",
          notes: "French marigold, natural pest control"
        },
        {
          id: "item-26",
          plantId: "marigold",
          name: "Marigold",
          emoji: "🌼",
          size: 1,
          category: "flowers",
          xPosition: 11,
          yPosition: 4,
          plantedDate: "2024-09-20T00:00:00Z",
          notes: "Companion for roses"
        },
        {
          id: "item-27",
          plantId: "thyme",
          name: "Thyme",
          emoji: "🌿",
          size: 1,
          category: "herbs",
          xPosition: 12,
          yPosition: 1,
          plantedDate: "2024-08-30T00:00:00Z",
          notes: "Creeping thyme groundcover"
        },
        {
          id: "item-28",
          plantId: "rosemary",
          name: "Rosemary",
          emoji: "🌿",
          size: 2,
          category: "herbs",
          xPosition: 6,
          yPosition: 8,
          plantedDate: "2024-08-20T00:00:00Z",
          notes: "Upright rosemary, winter hardy"
        }
      ]
    },
    {
      id: 3,
      name: "Culinary Herb Collection",
      description: "Comprehensive herb garden with cooking essentials and specialty varieties",
      soilType: "Well-drained Loam",
      dimensions: { width: 8, height: 8 },
      location: "Kitchen garden",
      status: "Active",
      plantCount: 12,
      createdAt: "2024-03-10T11:30:00Z",
      updatedAt: "2024-12-05T10:20:00Z",
      plantedItems: [
        {
          id: "item-29",
          plantId: "basil",
          name: "Basil",
          emoji: "🌿",
          size: 1,
          category: "herbs",
          xPosition: 1,
          yPosition: 1,
          plantedDate: "2024-10-01T00:00:00Z",
          notes: "Genovese basil for pesto"
        },
        {
          id: "item-30",
          plantId: "basil",
          name: "Basil",
          emoji: "🌿",
          size: 1,
          category: "herbs",
          xPosition: 2,
          yPosition: 1,
          plantedDate: "2024-10-01T00:00:00Z",
          notes: "Thai basil variety"
        },
        {
          id: "item-31",
          plantId: "oregano",
          name: "Oregano",
          emoji: "🌿",
          size: 1,
          category: "herbs",
          xPosition: 4,
          yPosition: 1,
          plantedDate: "2024-09-25T00:00:00Z",
          notes: "Greek oregano, very flavorful"
        },
        {
          id: "item-32",
          plantId: "thyme",
          name: "Thyme",
          emoji: "🌿",
          size: 1,
          category: "herbs",
          xPosition: 6,
          yPosition: 1,
          plantedDate: "2024-09-25T00:00:00Z",
          notes: "Common thyme"
        },
        {
          id: "item-33",
          plantId: "rosemary",
          name: "Rosemary",
          emoji: "🌿",
          size: 2,
          category: "herbs",
          xPosition: 1,
          yPosition: 3,
          plantedDate: "2024-09-20T00:00:00Z",
          notes: "Upright variety, cold hardy"
        },
        {
          id: "item-34",
          plantId: "parsley",
          name: "Parsley",
          emoji: "🌿",
          size: 1,
          category: "herbs",
          xPosition: 4,
          yPosition: 3,
          plantedDate: "2024-10-05T00:00:00Z",
          notes: "Flat-leaf Italian parsley"
        },
        {
          id: "item-35",
          plantId: "parsley",
          name: "Parsley",
          emoji: "🌿",
          size: 1,
          category: "herbs",
          xPosition: 5,
          yPosition: 3,
          plantedDate: "2024-10-05T00:00:00Z",
          notes: "Curly parsley for garnish"
        },
        {
          id: "item-36",
          plantId: "cilantro",
          name: "Cilantro",
          emoji: "🌿",
          size: 1,
          category: "herbs",
          xPosition: 0,
          yPosition: 5,
          plantedDate: "2024-09-30T00:00:00Z",
          notes: "Slow-bolt variety"
        },
        {
          id: "item-37",
          plantId: "cilantro",
          name: "Cilantro",
          emoji: "🌿",
          size: 1,
          category: "herbs",
          xPosition: 1,
          yPosition: 5,
          plantedDate: "2024-10-15T00:00:00Z",
          notes: "Second succession planting"
        },
        {
          id: "item-38",
          plantId: "mint",
          name: "Mint",
          emoji: "🌿",
          size: 1,
          category: "herbs",
          xPosition: 3,
          yPosition: 5,
          plantedDate: "2024-09-30T00:00:00Z",
          notes: "Spearmint in container to control spread"
        },
        {
          id: "item-39",
          plantId: "mint",
          name: "Mint",
          emoji: "🌿",
          size: 1,
          category: "herbs",
          xPosition: 4,
          yPosition: 5,
          plantedDate: "2024-09-30T00:00:00Z",
          notes: "Peppermint variety"
        },
        {
          id: "item-40",
          plantId: "lavender",
          name: "Lavender",
          emoji: "💜",
          size: 2,
          category: "flowers",
          xPosition: 6,
          yPosition: 5,
          plantedDate: "2024-08-15T00:00:00Z",
          notes: "Culinary lavender for tea and baking"
        }
      ]
    },
    {
      id: 4,
      name: "Young Orchard",
      description: "Developing fruit tree collection with understory plantings",
      soilType: "Clay Loam",
      dimensions: { width: 20, height: 15 },
      location: "Side yard",
      status: "Active",
      plantCount: 11,
      createdAt: "2024-04-05T14:00:00Z",
      updatedAt: "2024-11-20T09:45:00Z",
      plantedItems: [
        {
          id: "item-41",
          plantId: "apple",
          name: "Apple Tree",
          emoji: "🍎",
          size: 4,
          category: "fruits",
          xPosition: 3,
          yPosition: 3,
          plantedDate: "2024-04-15T00:00:00Z",
          notes: "Honeycrisp variety, dwarf rootstock"
        },
        {
          id: "item-42",
          plantId: "apple",
          name: "Apple Tree",
          emoji: "🍎",
          size: 4,
          category: "fruits",
          xPosition: 10,
          yPosition: 3,
          plantedDate: "2024-04-15T00:00:00Z",
          notes: "Gala variety, cross-pollinator"
        },
        {
          id: "item-43",
          plantId: "pear",
          name: "Pear Tree",
          emoji: "🍐",
          size: 4,
          category: "fruits",
          xPosition: 16,
          yPosition: 3,
          plantedDate: "2024-04-20T00:00:00Z",
          notes: "Bartlett pear, needs cross-pollination"
        },
        {
          id: "item-44",
          plantId: "cherry",
          name: "Cherry Tree",
          emoji: "🍒",
          size: 4,
          category: "fruits",
          xPosition: 3,
          yPosition: 10,
          plantedDate: "2024-05-01T00:00:00Z",
          notes: "Sweet cherry, self-pollinating variety"
        },
        {
          id: "item-45",
          plantId: "peach",
          name: "Peach Tree",
          emoji: "🍑",
          size: 4,
          category: "fruits",
          xPosition: 10,
          yPosition: 10,
          plantedDate: "2024-05-05T00:00:00Z",
          notes: "Freestone peach, disease resistant"
        },
        {
          id: "item-46",
          plantId: "fig",
          name: "Fig Tree",
          emoji: "🟤",
          size: 4,
          category: "fruits",
          xPosition: 16,
          yPosition: 10,
          plantedDate: "2024-05-10T00:00:00Z",
          notes: "Brown Turkey fig, cold hardy"
        },
        {
          id: "item-47",
          plantId: "nasturtium",
          name: "Nasturtium",
          emoji: "🌸",
          size: 1,
          category: "flowers",
          xPosition: 1,
          yPosition: 1,
          plantedDate: "2024-08-01T00:00:00Z",
          notes: "Ground cover around apple tree"
        },
        {
          id: "item-48",
          plantId: "nasturtium",
          name: "Nasturtium",
          emoji: "🌸",
          size: 1,
          category: "flowers",
          xPosition: 8,
          yPosition: 1,
          plantedDate: "2024-08-01T00:00:00Z",
          notes: "Beneficial insect attractor"
        },
        {
          id: "item-49",
          plantId: "nasturtium",
          name: "Nasturtium",
          emoji: "🌸",
          size: 1,
          category: "flowers",
          xPosition: 14,
          yPosition: 1,
          plantedDate: "2024-08-01T00:00:00Z",
          notes: "Understory planting"
        },
        {
          id: "item-50",
          plantId: "nasturtium",
          name: "Nasturtium",
          emoji: "🌸",
          size: 1,
          category: "flowers",
          xPosition: 1,
          yPosition: 8,
          plantedDate: "2024-08-01T00:00:00Z",
          notes: "Edible flowers for salads"
        },
        {
          id: "item-51",
          plantId: "nasturtium",
          name: "Nasturtium",
          emoji: "🌸",
          size: 1,
          category: "flowers",
          xPosition: 18,
          yPosition: 8,
          plantedDate: "2024-08-01T00:00:00Z",
          notes: "Natural pest deterrent"
        }
      ]
    },
    {
      id: 5,
      name: "Intensive Container Garden",
      description: "Maximized small-space gardening with succession planting",
      soilType: "Premium Potting Mix",
      dimensions: { width: 6, height: 4 },
      location: "Apartment balcony",
      status: "Active",
      plantCount: 14,
      createdAt: "2024-06-01T16:20:00Z",
      updatedAt: "2024-12-01T11:10:00Z",
      plantedItems: [
        {
          id: "item-52",
          plantId: "lettuce",
          name: "Lettuce",
          emoji: "🥬",
          size: 1,
          category: "vegetables",
          xPosition: 0,
          yPosition: 0,
          plantedDate: "2024-11-15T00:00:00Z",
          notes: "Buttercrunch lettuce"
        },
        {
          id: "item-53",
          plantId: "lettuce",
          name: "Lettuce",
          emoji: "🥬",
          size: 1,
          category: "vegetables",
          xPosition: 1,
          yPosition: 0,
          plantedDate: "2024-11-15T00:00:00Z",
          notes: "Red oak leaf lettuce"
        },
        {
          id: "item-54",
          plantId: "spinach",
          name: "Spinach",
          emoji: "🥬",
          size: 1,
          category: "vegetables",
          xPosition: 2,
          yPosition: 0,
          plantedDate: "2024-11-10T00:00:00Z",
          notes: "Baby spinach for salads"
        },
        {
          id: "item-55",
          plantId: "radish",
          name: "Radish",
          emoji: "🔴",
          size: 1,
          category: "vegetables",
          xPosition: 3,
          yPosition: 0,
          plantedDate: "2024-11-20T00:00:00Z",
          notes: "Cherry belle radish"
        },
        {
          id: "item-56",
          plantId: "radish",
          name: "Radish",
          emoji: "🔴",
          size: 1,
          category: "vegetables",
          xPosition: 4,
          yPosition: 0,
          plantedDate: "2024-11-25T00:00:00Z",
          notes: "Second succession planting"
        },
        {
          id: "item-57",
          plantId: "cilantro",
          name: "Cilantro",
          emoji: "🌿",
          size: 1,
          category: "herbs",
          xPosition: 0,
          yPosition: 1,
          plantedDate: "2024-11-10T00:00:00Z",
          notes: "Slow-bolt variety"
        },
        {
          id: "item-58",
          plantId: "basil",
          name: "Basil",
          emoji: "🌿",
          size: 1,
          category: "herbs",
          xPosition: 1,
          yPosition: 1,
          plantedDate: "2024-11-05T00:00:00Z",
          notes: "Compact bush basil"
        },
        {
          id: "item-59",
          plantId: "parsley",
          name: "Parsley",
          emoji: "🌿",
          size: 1,
          category: "herbs",
          xPosition: 2,
          yPosition: 1,
          plantedDate: "2024-10-30T00:00:00Z",
          notes: "Flat-leaf parsley"
        },
        {
          id: "item-60",
          plantId: "thyme",
          name: "Thyme",
          emoji: "🌿",
          size: 1,
          category: "herbs",
          xPosition: 3,
          yPosition: 1,
          plantedDate: "2024-10-25T00:00:00Z",
          notes: "French thyme in small pot"
        },
        {
          id: "item-61",
          plantId: "strawberry",
          name: "Strawberry",
          emoji: "🍓",
          size: 1,
          category: "fruits",
          xPosition: 0,
          yPosition: 2,
          plantedDate: "2024-10-01T00:00:00Z",
          notes: "Day-neutral variety"
        },
        {
          id: "item-62",
          plantId: "strawberry",
          name: "Strawberry",
          emoji: "🍓",
          size: 1,
          category: "fruits",
          xPosition: 1,
          yPosition: 2,
          plantedDate: "2024-10-01T00:00:00Z",
          notes: "Alpine strawberry"
        },
        {
          id: "item-63",
          plantId: "pepper",
          name: "Bell Pepper",
          emoji: "🫑",
          size: 2,
          category: "vegetables",
          xPosition: 3,
          yPosition: 2,
          plantedDate: "2024-10-15T00:00:00Z",
          notes: "Compact bell pepper variety"
        },
        {
          id: "item-64",
          plantId: "marigold",
          name: "Marigold",
          emoji: "🌼",
          size: 1,
          category: "flowers",
          xPosition: 0,
          yPosition: 3,
          plantedDate: "2024-10-20T00:00:00Z",
          notes: "Dwarf marigold for pest control"
        },
        {
          id: "item-65",
          plantId: "nasturtium",
          name: "Nasturtium",
          emoji: "🌸",
          size: 1,
          category: "flowers",
          xPosition: 5,
          yPosition: 3,
          plantedDate: "2024-10-18T00:00:00Z",
          notes: "Trailing variety in hanging container"
        }
      ]
    }
  ];
}

export async function getGardenById(id) {
  const gardens = await getGardens();
  const garden = gardens.find(g => g.id === parseInt(id));
  
  if (!garden) {
    throw new Error(`Garden with id ${id} not found`);
  }
  
  return garden;
}

export async function updateGarden(id, gardenData) {
  // Mock update function - replace with real API call
  console.log(`Updating garden ${id}:`, gardenData);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    ...gardenData,
    id: parseInt(id),
    updatedAt: new Date().toISOString()
  };
}

export async function deleteGarden(id) {
  // Mock delete function - replace with real API call
  console.log(`Deleting garden ${id}`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return { success: true };
}

export async function createGarden(gardenData) {
  // Mock create function - replace with real API call
  console.log('Creating garden:', gardenData);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    ...gardenData,
    id: Date.now(), // Simple ID generation for mock
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    plantedItems: []
  };
}

// Additional helper functions for garden management
export async function getGardensByStatus(status) {
  const gardens = await getGardens();
  return gardens.filter(garden => garden.status === status);
}

export async function getGardensByLocation(location) {
  const gardens = await getGardens();
  return gardens.filter(garden => garden.location.toLowerCase().includes(location.toLowerCase()));
}

export async function getGardensWithPlant(plantId) {
  const gardens = await getGardens();
  return gardens.filter(garden => 
    garden.plantedItems && 
    garden.plantedItems.some(item => item.plantId === plantId)
  );
}

export async function getPlantStatistics() {
  const gardens = await getGardens();
  const stats = {
    totalPlants: 0,
    plantsByCategory: {},
    mostPopularPlants: {},
    averagePlantsPerGarden: 0
  };

  gardens.forEach(garden => {
    if (garden.plantedItems) {
      stats.totalPlants += garden.plantedItems.length;
      
      garden.plantedItems.forEach(plant => {
        // Count by category
        const category = plant.category || 'other';
        stats.plantsByCategory[category] = (stats.plantsByCategory[category] || 0) + 1;
        
        // Count by plant type
        const plantType = plant.plantId;
        stats.mostPopularPlants[plantType] = (stats.mostPopularPlants[plantType] || 0) + 1;
      });
    }
  });

  stats.averagePlantsPerGarden = gardens.length > 0 ? (stats.totalPlants / gardens.length).toFixed(1) : 0;

  return stats;
}