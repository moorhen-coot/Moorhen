import { useDispatch } from "react-redux";
import { useEffect } from "react";
import { setClickAwayListenerActive } from "@/store";

export const usePauseClickAwayListener = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        return () => {
            dispatch(setClickAwayListenerActive(true));
        };
    }, []);

    const pauseClickAwayListener = () => {dispatch(setClickAwayListenerActive(false)) }
    const resumeClickAwayListener = () => {setTimeout(() => {dispatch(setClickAwayListenerActive(true))}, 500) }

    return [pauseClickAwayListener, resumeClickAwayListener];
};
