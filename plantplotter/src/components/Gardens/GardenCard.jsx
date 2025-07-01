export default function GardenCard({ garden }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      <h3 className="text-lg font-semibold mb-2">{garden.name}</h3>
      <p className="text-gray-600 text-sm mb-3">{garden.description}</p>
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>Size: {garden.size}</span>
        <span>Plants: {garden.plantCount || 0}</span>
      </div>
    </div>
  );
}