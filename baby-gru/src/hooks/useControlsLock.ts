import { useDispatch } from "react-redux";
import { useEffect, useRef } from "react";
import { lockControls, unlockControls } from "@/store";

export const useControlLock = () => {
    const dispatch = useDispatch();
    const lockKey = useRef(Math.random());
    useEffect(() => {
        dispatch(lockControls(lockKey.current));
        return () => {
            dispatch(unlockControls(lockKey.current));
        };
    }, []);
    return lockKey.current;
};
