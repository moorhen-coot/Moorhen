import { useMoorhenGlobalInstance } from "./useMoorhenGlobalInstance";

export const useTimeCapsule = () => {
    const moorhenGlobalInstance = useMoorhenGlobalInstance();
    return moorhenGlobalInstance.getTimeCapsuleRef();
};

export const useCommandCentre = () => {
    const moorhenGlobalInstance = useMoorhenGlobalInstance();
    return moorhenGlobalInstance.getCommandCentreRef();
};

export const useCommandAndCapsule = () => {
    const commandCentre = useCommandCentre();
    const timeCapsuleRef = useTimeCapsule();
    return { commandCentre, timeCapsuleRef };
};

export const usePaths = () => {
    const moorhenGlobalInstance = useMoorhenGlobalInstance();
    return moorhenGlobalInstance.paths;
};
