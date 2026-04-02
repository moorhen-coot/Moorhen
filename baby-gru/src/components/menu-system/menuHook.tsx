import { useEffect, useState } from "react";
import { useMoorhenInstance } from "@/InstanceManager";

export const useMenuHook = () => {
    const moorhenInstance = useMoorhenInstance();
    const menuSystem = moorhenInstance.getMenuSystem();
    const [menuVersion, setMenuVersion] = useState(0);

    useEffect(() => {
        if (!menuSystem) return;

        const unsubscribe = menuSystem.subscribe(() => {
            setMenuVersion(current => current + 1);
        });

        return unsubscribe;
    }, [menuSystem]);

    return menuVersion;
};
