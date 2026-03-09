"use client";

import { useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface VirtualizedRowListProps<TData> {
  items: TData[];
  estimateSize?: number;
  renderRow: (item: TData, index: number) => ReactNode;
  className?: string;
}

export function VirtualizedRowList<TData>({
  items,
  estimateSize = 88,
  renderRow,
  className,
}: VirtualizedRowListProps<TData>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 5,
  });

  return (
    <div ref={parentRef} className={className} style={{ overflow: "auto", height: "100%" }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualRow.start}px)`,
            }}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
          >
            {renderRow(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
