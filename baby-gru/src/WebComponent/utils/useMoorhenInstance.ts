import { useEffect, useState } from "react";
import type { MoorhenInstance } from "../../InstanceManager/MoorhenInstance";
import type { MoorhenWebComponent } from "../MoorhenWebComponent";
import { findMoorhenHost } from "../findMoorhenHost";

/**
 * Which `<moorhen-web-component>`: its element id, or a ref to an element inside it (such as content
 * placed in one of its slots, so a plugin needs no id). With a ref to an element that is not inside
 * one, the only one in the page.
 */
export type MoorhenTarget = string | React.RefObject<HTMLElement | null>;

const findHost = (target: MoorhenTarget): MoorhenWebComponent | null => {
    if (typeof target === "string") return document.getElementById(target) as MoorhenWebComponent | null;
    return target.current ? findMoorhenHost(target.current) : null;
};

/**
 * For use with MoorhenWebComponent only.
 *
 * The MoorhenInstance of a `<moorhen-web-component>`, once it is ready; `null` until then.
 *
 * @param target - The element id of the web component, or a ref to an element inside it.
 * @example
 * // In a plugin rendered inside the web component: no id needed
 * const ref = useRef<HTMLDivElement>(null);
 * const instance = useMoorhenInstance(ref);
 * return <div slot="my-plugin" ref={ref}>…</div>;
 */
export const useMoorhenInstance = (target: MoorhenTarget): MoorhenInstance | null => {
    const [instance, setInstance] = useState<MoorhenInstance | null>(null);
    const key = typeof target === "string" ? target : null;

    useEffect(() => {
        const host = findHost(target);
        if (!host) {
            console.error("useMoorhenInstance: no <moorhen-web-component> found", target);
            return;
        }
        let cancelled = false;
        host.getMoorhenInstance().then(found => {
            if (!cancelled) setInstance(found);
        });
        return () => {
            cancelled = true;
        };
        // A ref is read once mounted; an id when it changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    return instance;
};
