import { useMoorhenInstance } from './useMoorhenInstance';

export const useTimeCapsule = () => {
    const moorhenGlobalInstance = useMoorhenInstance();
    return moorhenGlobalInstance.getTimeCapsuleRef();
};

export const useCommandCentre = () => {
    const moorhenGlobalInstance = useMoorhenInstance();
    return moorhenGlobalInstance.getCommandCentreRef();
};

export const useCommandAndCapsule = () => {
    const commandCentre = useCommandCentre();
    const timeCapsuleRef = useTimeCapsule();
    return { commandCentre, timeCapsuleRef };
};

export const usePaths = () => {
    const moorhenGlobalInstance = useMoorhenInstance();
    return moorhenGlobalInstance.paths;
};
