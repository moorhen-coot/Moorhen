import React, { ReactNode, memo, useCallback, useEffect, useRef, useState } from 'react';
import './CustomHorizontalScrollbar.css';

interface CustomHorizontalScrollbarProps {
    children: ReactNode;
    style?: React.CSSProperties;
    className?: string;
    onDraggingChange?: (isDragging: boolean) => void;
    forceRedrawScrollBarKey?: string | number;
}

const MIN_THUMB_WIDTH = 40;

export const CustomHorizontalScrollbar = memo((props: CustomHorizontalScrollbarProps) => {
    const { children, style, className, onDraggingChange, forceRedrawScrollBarKey } = props;
    const scrollRef = useRef<HTMLDivElement>(null);
    const [thumbWidth, setThumbWidth] = useState(MIN_THUMB_WIDTH);
    const [thumbLeft, setThumbLeft] = useState(0);
    const [dragState, setDragState] = useState({
        isDragging: false,
        dragStartX: 0,
        initialThumbLeft: 0,
    });

    // Recompute the thumb from the scroll container's current geometry.
    // A container that is hidden (display: none, or an ancestor still at zero
    // width mid-transition) reports 0 for both clientWidth and scrollWidth;
    // measuring it would give NaN and leave the thumb unusable, so keep the
    // last good values and wait for the ResizeObserver to fire once it is laid out.
    const updateThumb = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const visible = el.clientWidth;
        const total = el.scrollWidth;
        if (visible <= 0 || total <= 0) return;
        if (total <= visible) {
            setThumbWidth(visible);
            setThumbLeft(0);
            return;
        }
        const width = Math.max((visible / total) * visible, MIN_THUMB_WIDTH);
        setThumbWidth(width);
        setThumbLeft((el.scrollLeft / (total - visible)) * (visible - width));
    }, []);

    // Keep the thumb in sync with scrolling, window resizes, and any change in
    // the size of the container or its content (panel transitions, side panel
    // opening, host layout changes, column width changes).
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        updateThumb();
        el.addEventListener('scroll', updateThumb);
        window.addEventListener('resize', updateThumb);
        let observer: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(updateThumb);
            observer.observe(el);
            Array.from(el.children).forEach(child => observer.observe(child));
        }
        return () => {
            el.removeEventListener('scroll', updateThumb);
            window.removeEventListener('resize', updateThumb);
            observer?.disconnect();
        };
    }, [updateThumb, forceRedrawScrollBarKey]);

    const scrollToThumbLeft = (newThumbLeft: number) => {
        const el = scrollRef.current;
        if (!el) return;
        const visible = el.clientWidth;
        const total = el.scrollWidth;
        const maxScroll = total - visible;
        const maxThumb = visible - thumbWidth;
        if (maxScroll <= 0 || maxThumb <= 0) return; // nothing to scroll
        const clamped = Math.max(0, Math.min(newThumbLeft, maxThumb));
        setThumbLeft(clamped);
        el.scrollLeft = (clamped / maxThumb) * maxScroll;
    };

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
            scrollToThumbLeft(dragState.initialThumbLeft + (e.clientX - dragState.dragStartX));
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dragState.isDragging, dragState.dragStartX, dragState.initialThumbLeft, thumbWidth]);

    const onTrackClick = (e: React.MouseEvent) => {
        if (dragState.isDragging) return; // Ignore clicks while dragging
        const track = e.currentTarget as HTMLDivElement;
        const rect = track.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        scrollToThumbLeft(clickX - thumbWidth / 2);
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
