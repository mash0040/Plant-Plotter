'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styled from 'styled-components';

const Item = styled.li`
  border: 2px solid #fb6664;
  background: #ff25222b;
  color: #fb6664;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 1.2rem;
  font-weight: bold;
  aspect-ratio: 1;
  transition: 0.25s ease;
  cursor: grab;
`;

export default function SortableItem({ id, label }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Item
      ref={setNodeRef}
      id={`grid-item-${id}`}
      style={style}
      {...attributes}
      {...listeners}
    >
      {label}
    </Item>
  );
}