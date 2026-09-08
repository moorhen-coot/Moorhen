import { useDispatch } from "react-redux";
import { useEffect, useRef } from "react";
import {
    pauseClickAwayListener as dispatchPauseClickAwayListener,
    resumeClickAwayListener as dispatchResumeClickAwayListener,
} from "@/store";

/**
 * Pause/resume the global click-away listeners.
 *
 * Pauses are reference-counted, so nesting multiple pauses is safe and an early
 * resume can never leave the listeners disabled for the remaining pauses (the
 * original "click-away listener never re-activated" bug). The resume is deferred
 * so the click that finished the interaction isn't mistaken for an away click.
 */
export const usePauseClickAwayListener = () => {
    const dispatch = useDispatch();
    const resumeTimerRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (resumeTimerRef.current !== null) {
                window.clearTimeout(resumeTimerRef.current);
                resumeTimerRef.current = null;
            }
            // Release the pause even if the component unmounts while paused, so the
            // click-away listeners can never be left permanently disabled.
            dispatch(dispatchResumeClickAwayListener());
        };
    }, [dispatch]);

    const pauseClickAwayListener = () => {
        dispatch(dispatchPauseClickAwayListener());
    };

    const resumeClickAwayListener = () => {
        if (resumeTimerRef.current !== null) {
            window.clearTimeout(resumeTimerRef.current);
        }
        resumeTimerRef.current = window.setTimeout(() => {
            resumeTimerRef.current = null;
            dispatch(dispatchResumeClickAwayListener());
        }, 500);
    };

    return [pauseClickAwayListener, resumeClickAwayListener];
};
