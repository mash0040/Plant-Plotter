'use client';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import Task from '../Task/Task';

export default function Column({ tasks }) {
  return (
    <div className="border p-4 rounded bg-gray-50 w-3/4 h-96">
      <SortableContext items={tasks} strategy={verticalListSortingStrategy}>
        {tasks.map((plant) => (
          <Task key={plant.id} id={plant.id} name={plant.name} emoji={plant.emoji} />
        ))}
      </SortableContext>
    </div>
  );
}
