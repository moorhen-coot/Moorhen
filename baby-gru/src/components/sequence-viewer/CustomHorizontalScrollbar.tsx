import React, { ReactNode, memo, useCallback, useEffect, useRef, useState } from 'react';
import './CustomHorizontalScrollbar.css';

interface CustomHorizontalScrollbarProps {
    children: ReactNode;
    style?: React.CSSProperties;
    className?: string;
    onDraggingChange?: (isDragging: boolean) => void;
}

const MIN_THUMB_WIDTH = 40;

export const CustomHorizontalScrollbar = memo((props: CustomHorizontalScrollbarProps) => {
    const { children, style, className, onDraggingChange } = props;
    const scrollRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const [thumbWidth, setThumbWidth] = useState(MIN_THUMB_WIDTH);
    const [thumbLeft, setThumbLeft] = useState(0);
    const [dragState, setDragState] = useState({
        isDragging: false,
        dragStartX: 0,
        initialThumbLeft: 0,
    });

    // Recompute the thumb from the scroll container's current geometry. The
    // thumb moves inside the track, whose inner width is narrower than the
    // container (margin + border), so thumb sizes are in track pixels.
    // A container that is hidden (display: none, or an ancestor still at zero
    // width mid-transition) reports 0 for both clientWidth and scrollWidth;
    // measuring it would give NaN and leave the thumb unusable, so keep the
    // last good values and wait for the ResizeObserver to fire once it is laid out.
    const updateThumb = useCallback(() => {
        const el = scrollRef.current;
        const track = trackRef.current;
        if (!el || !track) return;
        const visible = el.clientWidth;
        const total = el.scrollWidth;
        const trackWidth = track.clientWidth;
        if (visible <= 0 || total <= 0 || trackWidth <= 0) return;
        if (total <= visible) {
            setThumbWidth(trackWidth);
            setThumbLeft(0);
            return;
        }
        const width = Math.min(Math.max((visible / total) * trackWidth, MIN_THUMB_WIDTH), trackWidth);
        setThumbWidth(width);
        setThumbLeft((el.scrollLeft / (total - visible)) * (trackWidth - width));
    }, []);

    // Keep the thumb in sync with scrolling and any change in the size of the
    // container, the track or the content (window resizes, panel transitions,
    // side panel opening, host layout changes, column width changes). Content
    // rows can be replaced without this component remounting, so the observed
    // set is rebuilt whenever the container's children change.
    useEffect(() => {
        const el = scrollRef.current;
        const track = trackRef.current;
        if (!el || !track) return;
        const resizeObserver = new ResizeObserver(updateThumb);
        const observeAll = () => {
            resizeObserver.disconnect();
            resizeObserver.observe(el);
            resizeObserver.observe(track);
            Array.from(el.children).forEach(child => resizeObserver.observe(child));
        };
        const mutationObserver = new MutationObserver(() => {
            observeAll();
            updateThumb();
        });
        observeAll();
        mutationObserver.observe(el, { childList: true });
        updateThumb();
        el.addEventListener('scroll', updateThumb);
        return () => {
            el.removeEventListener('scroll', updateThumb);
            resizeObserver.disconnect();
            mutationObserver.disconnect();
        };
    }, [updateThumb]);

    const scrollToThumbLeft = useCallback(
        (newThumbLeft: number) => {
            const el = scrollRef.current;
            const track = trackRef.current;
            if (!el || !track) return;
            const maxScroll = el.scrollWidth - el.clientWidth;
            const maxThumb = track.clientWidth - thumbWidth;
            if (maxScroll <= 0 || maxThumb <= 0) return; // nothing to scroll
            const clamped = Math.max(0, Math.min(newThumbLeft, maxThumb));
            setThumbLeft(clamped);
            el.scrollLeft = (clamped / maxThumb) * maxScroll;
        },
        [thumbWidth]
    );

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
    }, [dragState.isDragging, dragState.dragStartX, dragState.initialThumbLeft, scrollToThumbLeft, onDraggingChange]);

    const onTrackClick = (e: React.MouseEvent) => {
        if (dragState.isDragging) return; // Ignore clicks while dragging
        if (e.target !== e.currentTarget) return; // Clicks on the thumb bubble up here
        const track = e.currentTarget as HTMLDivElement;
        const rect = track.getBoundingClientRect();
        const clickX = e.clientX - rect.left - track.clientLeft;
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
            <div ref={trackRef} className="moorhen__custom__scrollbar-track" onClick={onTrackClick}>
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
