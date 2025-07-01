// Mock API functions for development
export async function getGardens() {
  // Mock data - replace with real API call
  return [
    {
      id: 1,
      name: "Vegetable Garden",
      description: "A small vegetable garden with tomatoes, lettuce, and herbs",
      size: "10x8 ft",
      plantCount: 15
    },
    {
      id: 2,
      name: "Flower Garden",
      description: "Beautiful flower garden with roses and daisies",
      size: "6x6 ft",
      plantCount: 8
    },
    {
      id: 3,
      name: "Herb Garden",
      description: "Kitchen herb garden with basil, rosemary, and thyme",
      size: "4x4 ft",
      plantCount: 6
    }
  ];
}