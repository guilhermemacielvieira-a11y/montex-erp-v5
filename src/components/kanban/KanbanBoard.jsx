import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

// Sortable Item wrapper
function SortableItem({ id, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10 p-1 rounded hover:bg-slate-600/50"
      >
        <GripVertical className="w-4 h-4 text-slate-500" />
      </div>
      <div className="pl-6">
        {children}
      </div>
    </div>
  );
}

// Droppable Column
function DroppableColumn({ id, title, items, color, icon: Icon, renderItem, count }) {
  return (
    <div className="flex-1 min-w-[280px] max-w-[380px]">
      <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg ${color}`}>
        {Icon && <Icon className="w-4 h-4" />}
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-full">{count}</span>
      </div>
      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[100px] p-2 rounded-lg bg-slate-800/30 border border-slate-700/30">
          {items.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              Arraste itens aqui
            </div>
          ) : (
            items.map(item => (
              <SortableItem key={item.id} id={item.id}>
                {renderItem(item)}
              </SortableItem>
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

/**
 * KanbanBoard - Componente genérico de Kanban com drag-and-drop
 *
 * @param {object} props
 * @param {Array} props.columns - Array de { id, title, color, icon, items }
 * @param {Function} props.onMoveItem - Callback(itemId, fromColumnId, toColumnId)
 * @param {Function} props.renderItem - Render function para cada item
 */
export default function KanbanBoard({ columns, onMoveItem, renderItem }) {
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  const findColumn = (itemId) => {
    for (const col of columns) {
      if (col.items.find(i => i.id === itemId)) {
        return col.id;
      }
    }
    return null;
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeColumnId = findColumn(active.id);
    let overColumnId = findColumn(over.id);

    // If dropped on column header area
    if (!overColumnId) {
      overColumnId = over.id;
    }

    if (activeColumnId && overColumnId && activeColumnId !== overColumnId) {
      onMoveItem(active.id, activeColumnId, overColumnId);
    }
  };

  const activeItem = activeId
    ? columns.flatMap(c => c.items).find(i => i.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(col => (
          <DroppableColumn
            key={col.id}
            id={col.id}
            title={col.title}
            items={col.items}
            color={col.color}
            icon={col.icon}
            count={col.items.length}
            renderItem={renderItem}
          />
        ))}
      </div>

      <DragOverlay>
        {activeItem ? (
          <div className="bg-slate-800 border border-blue-500/50 rounded-lg shadow-2xl shadow-blue-500/20 p-3 opacity-90">
            {renderItem(activeItem)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export { SortableItem, DroppableColumn };
