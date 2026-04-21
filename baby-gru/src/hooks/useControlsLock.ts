import { useDispatch } from "react-redux";
import { useEffect } from "react";
import { lockControls, unlockControls } from "@/store";

export const useControlLock = () => {
    const dispatch = useDispatch();
    const lockKey = Math.random();
    useEffect(() => {
        dispatch(lockControls(lockKey));
        return () => {
            dispatch(unlockControls(lockKey));
        };
    }, []);
    return lockKey;
};
