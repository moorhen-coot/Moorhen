import React, { useRef, useState, useEffect, ReactNode } from "react";

interface CustomHorizontalScrollbarProps {
  children: ReactNode;
  style?: React.CSSProperties;
  className?: string;
  onDraggingChange?: (isDragging: boolean) => void;
}

export const CustomHorizontalScrollbar: React.FC<CustomHorizontalScrollbarProps> = ({ children, style, className, onDraggingChange }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [thumbWidth, setThumbWidth] = useState(40);
  const [thumbLeft, setThumbLeft] = useState(0);
  const [dragState, setDragState] = useState({
    isDragging: false,
    dragStartX: 0,
    initialThumbLeft: 0,
  });

  // Update thumb size and position on scroll or resize
  useEffect(() => {
    const updateThumb = () => {
      const el = scrollRef.current;
      if (!el) return;
      const visible = el.clientWidth;
      const total = el.scrollWidth;
      const width = Math.max((visible / total) * visible, 40); // min width 40px
      setThumbWidth(width);
      setThumbLeft((el.scrollLeft / (total - visible)) * (visible - width) || 0);
    };
    updateThumb();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', updateThumb);
      window.addEventListener('resize', updateThumb);
    }
    return () => {
      if (el) el.removeEventListener('scroll', updateThumb);
      window.removeEventListener('resize', updateThumb);
    };
  }, []);

  // When starting drag:
  const onThumbMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragState({
      isDragging: true,
      dragStartX: e.clientX,
      initialThumbLeft: thumbLeft,
    });
    if (onDraggingChange) onDraggingChange(true); // Notify parent
  };

  useEffect(() => {
    if (!dragState.isDragging) return;
    const onMouseMove = (e: MouseEvent) => {
      const el = scrollRef.current;
      if (!el) return;
      const visible = el.clientWidth;
      const total = el.scrollWidth;
      const maxScroll = total - visible;
      const maxThumb = visible - thumbWidth;
      let newThumbLeft = dragState.initialThumbLeft + (e.clientX - dragState.dragStartX);
      newThumbLeft = Math.max(0, Math.min(newThumbLeft, maxThumb));
      setThumbLeft(newThumbLeft);
      el.scrollLeft = (newThumbLeft / maxThumb) * maxScroll;
    };
    // When ending drag (in onMouseUp):
    const onMouseUp = () => {
      setDragState(s => ({ ...s, isDragging: false }));
      if (onDraggingChange) onDraggingChange(false); // Notify parent
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragState.isDragging, dragState.dragStartX, dragState.initialThumbLeft, thumbWidth]);

  const onTrackClick = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    const track = e.currentTarget as HTMLDivElement;
    const rect = track.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const visible = el.clientWidth;
    const total = el.scrollWidth;
    const maxScroll = total - visible;
    const maxThumb = visible - thumbWidth;
    let newThumbLeft = clickX - thumbWidth / 2;
    newThumbLeft = Math.max(0, Math.min(newThumbLeft, maxThumb));
    el.scrollLeft = (newThumbLeft / maxThumb) * maxScroll;
  };

  return (
    <div style={{ position: 'relative', width: '100%', ...style }} className={className}>
      <div
        ref={scrollRef}
        style={{ overflow: 'hidden', width: '100%', height: '100%' }}
      >
        {children}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 2,
          width: '100%',
          height: '12px',
          background: 'rgba(240,240,240)',
          zIndex: 10,
          cursor: 'pointer',
          borderRadius: '6px',
          border: '1px solid rgb(199, 228, 244)'
        }}
        onClick={onTrackClick}
      >
        <div
          style={{
            position: 'absolute',
            left: thumbLeft,
            top: 0,
            width: thumbWidth,
            height: '12px',
            background: 'rgb(198, 205, 238)',
            borderRadius: '6px',
            cursor: 'grab',
          }}
          onMouseDown={onThumbMouseDown}
        />
      </div>
    </div>
  );
};
