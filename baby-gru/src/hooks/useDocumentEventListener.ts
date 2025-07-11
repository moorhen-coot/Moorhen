import { useEffect, useRef } from 'react';

export const useDocumentEventListener = (
    eventType: string, 
    handler: (event: Event) => void, 
    options?: AddEventListenerOptions
) => {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        const eventListener = (event: Event) => handlerRef.current(event);
        document.addEventListener(eventType, eventListener, options);
        return () => document.removeEventListener(eventType, eventListener, options);
    }, [eventType, options]);
};