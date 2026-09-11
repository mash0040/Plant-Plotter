import React, { useId } from 'react';
import { getPlantFootprint } from './Utils/GardenUtils';
import { getOverviewCell } from './Utils/RowPlantingUtils';

export default function RowPlantingOverview({ dimensions, gridSize, placedPlants, positions, plant, direction, onSelect }) {
  const id = useId();
  const size = getPlantFootprint(plant);
  const last = positions[positions.length - 1];
  const first = positions[0];
  const width = Math.max(dimensions.width, last.x + size);
  const height = Math.max(dimensions.height, last.y + size);
  const padding = Math.max(width, height) * 0.025;
  const view = { x: -padding, y: -padding, width: width + padding * 2, height: height + padding * 2 };
  const invalid = positions.some(position => !position.withinBounds);
  const handleClick = event => {
    const cell = getOverviewCell(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect(), view, dimensions);
    if (cell) onSelect(cell);
  };

  return (
    <div>
      <div className="mb-1 flex flex-wrap justify-between gap-x-3 text-xs text-gray-600">
        <span>Top left: X 1, Y 1</span>
        <span>X increases right · Y increases down</span>
      </div>
      <svg
        role="img"
        aria-label="Garden row overview. Choose the starting cell by tapping the garden, or use the X and Y fields."
        viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
        preserveAspectRatio="xMidYMid meet"
        onClick={handleClick}
        className="block w-full cursor-crosshair rounded-lg bg-white"
        style={{ aspectRatio: `${view.width} / ${view.height}`, minHeight: 120, maxHeight: 240 }}
      >
        <defs>
          <pattern id={`${id}-grid`} width="1" height="1" patternUnits="userSpaceOnUse">
            <path d="M 1 0 H 0 V 1" fill="none" stroke="#d1d5db" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
          </pattern>
          <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#14532d" />
          </marker>
        </defs>
        <rect width={dimensions.width} height={dimensions.height} fill="#f0fdf4" />
        {Math.max(dimensions.width, dimensions.height) <= 60 && (
          <rect width={dimensions.width} height={dimensions.height} fill={`url(#${id}-grid)`} />
        )}
        {placedPlants.map(existing => (
          <rect key={existing.id} x={existing.x / gridSize} y={existing.y / gridSize} width={getPlantFootprint(existing)} height={getPlantFootprint(existing)} fill="#9ca3af" fillOpacity="0.55" stroke="#4b5563" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        {positions.map(position => {
          const valid = position.withinBounds && !position.overlapsExisting && !position.overlapsRow;
          return (
            <g key={position.index} data-row-position={position.index} data-valid={valid}>
              <rect x={position.x} y={position.y} width={size} height={size} fill={valid ? '#16a34a' : '#dc2626'} fillOpacity="0.3" stroke={valid ? '#15803d' : '#b91c1c'} strokeWidth="2" strokeDasharray={valid ? undefined : '4 2'} vectorEffect="non-scaling-stroke" />
              {!valid && <path d={`M ${position.x} ${position.y} l ${size} ${size} m ${-size} 0 l ${size} ${-size}`} stroke="#b91c1c" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
            </g>
          );
        })}
        <rect width={dimensions.width} height={dimensions.height} fill="none" stroke="#14532d" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <line x1={first.x + size * 0.3} y1={first.y + size * 0.3} x2={first.x + size * (direction === 'horizontal' ? 0.8 : 0.3)} y2={first.y + size * (direction === 'vertical' ? 0.8 : 0.3)} stroke="#14532d" strokeWidth="2" vectorEffect="non-scaling-stroke" markerEnd={`url(#${id}-arrow)`} />
        <circle cx={first.x + size * 0.3} cy={first.y + size * 0.3} r={size * 0.12} fill="#14532d" stroke="white" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <p className="mt-2 text-xs text-gray-600">Garden: {dimensions.width} × {dimensions.height} grid units. Tap inside the boundary to set the start.</p>
      {invalid && <p className="mt-1 text-xs text-red-700">The overview zooms out to show the footprints outside the garden.</p>}
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-700" aria-label="Overview legend">
        <li><span aria-hidden="true" className="mr-1 inline-block h-2.5 w-2.5 border border-gray-600 bg-gray-300" />Existing</li>
        <li><span aria-hidden="true" className="mr-1 inline-block h-2.5 w-2.5 border border-green-700 bg-green-200" />Valid row</li>
        <li><span aria-hidden="true" className="mr-1 inline-block h-2.5 w-2.5 border border-dashed border-red-700 bg-red-200" />Invalid (crossed)</li>
        <li>Dot + arrow: start and direction</li>
      </ul>
    </div>
  );
}
