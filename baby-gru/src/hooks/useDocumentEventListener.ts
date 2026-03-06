import { useEffect, useRef } from 'react';

/**
 * Custom React hook to add an event listener to the `document` object.
 *
 * The event listener is automatically cleaned up when the component unmounts or when
 * the `eventType` or `options` change. The handler function is always up-to-date
 * with the latest closure.
 *
 * @template T - The type of the event, extending from `Event`.
 * @param eventType - The name of the event to listen for (e.g., 'click', 'keydown').
 * @param handler - The callback function to handle the event.
 * @param options - Optional. An object specifying characteristics about the event listener.
 *
 * @example
 * useDocumentEventListener('keydown', (event) => {
 *   if (event.key === 'Escape') {
 *     // Handle Escape key press
 *   }
 * });
 */
export const useDocumentEventListener = <T extends Event = Event>(
    eventType: string, 
    handler: (event: T) => void,
    // eslint-disable-next-line  
    options?: AddEventListenerOptions
) => {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        const eventListener = (event: Event) => handlerRef.current(event as T);
        document.addEventListener(eventType, eventListener, options);
        return () => document.removeEventListener(eventType, eventListener, options);
    }, [eventType, options]);
};


