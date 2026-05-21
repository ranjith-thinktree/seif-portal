import React from "react";
import { Bars3Icon } from "@heroicons/react/24/outline";

export default function DraggableCard({
  id,
  canDrag,
  onDragStart,
  onDragEnter,
  onDragEnd,
  isDragOver,
  children,
}) {
  return (
    <div
      draggable={canDrag}
      onDragStart={
        canDrag
          ? (e) => {
              e.dataTransfer.effectAllowed = "move";
              onDragStart(id);
            }
          : undefined
      }
      onDragEnter={
        canDrag
          ? (e) => {
              e.preventDefault();
              onDragEnter(id);
            }
          : undefined
      }
      onDragOver={canDrag ? (e) => e.preventDefault() : undefined}
      onDragEnd={canDrag ? onDragEnd : undefined}
      className={`relative group transition-all duration-150 ${
        isDragOver
          ? "ring-2 ring-[#009530] ring-offset-2 rounded-[16px] scale-[1.03]"
          : ""
      } ${canDrag ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      {canDrag && (
        <div
          title="Drag to reorder"
          className="absolute top-2 right-2 z-10 flex items-center justify-center w-5 h-5 rounded
            text-gray-300 hover:text-[#009530]
            opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-grab select-none"
        >
          <Bars3Icon className="w-3.5 h-3.5" />
        </div>
      )}
      {children}
    </div>
  );
}
