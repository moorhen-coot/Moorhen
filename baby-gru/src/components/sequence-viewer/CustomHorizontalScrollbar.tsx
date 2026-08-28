import React, { ReactNode, memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import './CustomHorizontalScrollbar.css';

const MIN_THUMB_WIDTH = 40; // min thumb width in px

interface CustomHorizontalScrollbarProps {
    children: ReactNode;
    style?: React.CSSProperties;
    className?: string;
    onDraggingChange?: (isDragging: boolean) => void;
    forceRedrawScrollBarKey?: string | number;
}

export const CustomHorizontalScrollbar = memo((props: CustomHorizontalScrollbarProps) => {
    const { children, style, className, onDraggingChange, forceRedrawScrollBarKey } = props;
    const scrollRef = useRef<HTMLDivElement>(null);
    const [thumbWidth, setThumbWidth] = useState(0);
    const [thumbLeft, setThumbLeft] = useState(0);
    const [dragState, setDragState] = useState({
        isDragging: false,
        dragStartX: 0,
        initialThumbLeft: 0,
    });

    // Update thumb size and position whenever the scrollable area changes:
    // - on user scroll
    // - on window resize
    // - on container/content resize (ResizeObserver catches panel-driven layout changes
    //   that never fire a window resize, e.g. opening/closing side panels)
    // - once web fonts are loaded (scrollWidth can depend on loaded font metrics)
    // - when forceRedrawScrollBarKey changes (external redraw request)
    useLayoutEffect(() => {
        let disposed = false;

        const computeThumbGeometry = (el: HTMLDivElement) => {
            const visible = el.clientWidth;
            const total = el.scrollWidth;
            // Not scrollable (content fits) or no width yet -> thumb fills the whole track.
            if (total <= visible || visible <= 0) {
                return { width: visible, left: 0 };
            }
            const maxScroll = total - visible;
            const rawWidth = (visible / total) * visible;
            const width = Math.min(Math.max(rawWidth, MIN_THUMB_WIDTH), visible);
            const maxThumb = visible - width;
            const left = Math.min(Math.max((el.scrollLeft / maxScroll) * maxThumb, 0), maxThumb);
            return { width, left };
        };

        const updateThumb = () => {
            const el = scrollRef.current;
            if (!el || disposed) return;
            const { width, left } = computeThumbGeometry(el);
            // Round to whole pixels so rasterization is deterministic (no sub-pixel drift).
            setThumbWidth(Math.round(width));
            setThumbLeft(Math.round(left));
        };

        updateThumb();
        const el = scrollRef.current;
        let resizeObserver: ResizeObserver | null = null;
        if (el) {
            el.addEventListener('scroll', updateThumb);
            window.addEventListener('resize', updateThumb);
            if (typeof ResizeObserver !== 'undefined') {
                resizeObserver = new ResizeObserver(updateThumb);
                resizeObserver.observe(el);
                // Content size changes (e.g. async sequence data) also change scrollWidth.
                Array.from(el.children).forEach(child => resizeObserver.observe(child));
            }
        }
        // Re-measure once web fonts are loaded — scrollWidth can differ from the fallback-font value.
        if (typeof document !== 'undefined' && document.fonts && typeof document.fonts.ready?.then === 'function') {
            document.fonts.ready.then(() => {
                if (!disposed) updateThumb();
            });
        }
        return () => {
            disposed = true;
            if (el) {
                el.removeEventListener('scroll', updateThumb);
                resizeObserver?.disconnect();
            }
            window.removeEventListener('resize', updateThumb);
        };
    }, [forceRedrawScrollBarKey]);

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
            setTimeout(() => setDragState(s => ({ ...s, isDragging: false })), 50);
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
        if (dragState.isDragging) return; // Ignore clicks while dragging
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
        <div
            style={{
                position: 'relative',
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                flex: '1 1 auto',
                boxSizing: 'border-box',
                ...style,
            }}
            className={className}
        >
            <div ref={scrollRef} style={{ overflow: 'hidden', width: '100%', minWidth: 0 }}>
                {children}
            </div>
            <div className="moorhen__custom__scrollbar-track" onClick={onTrackClick}>
                <div
                    className={`moorhen__custom__scrollbar-thumb ${
                        dragState.isDragging ? 'moorhen__custom__scrollbar-thumb-dragging' : ''
                    }`}
                    style={{
                        left: thumbLeft,
                        width: thumbWidth,
                    }}
                    onMouseDown={onThumbMouseDown}
                />
            </div>
        </div>
    );
});

CustomHorizontalScrollbar.displayName = 'CustomHorizontalScrollbar';
