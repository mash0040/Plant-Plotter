import Link from 'next/link';

export default function GardenCard({ garden }) {
  return (
    <Link href={`/garden/${garden.id}`}>
      <div className="p-4 border rounded shadow bg-white hover:bg-green-100">
        <h2 className="text-lg font-semibold">{garden.name}</h2>
        <p className="text-sm text-gray-600">{garden.location}</p>
      </div>
    </Link>
  );
}