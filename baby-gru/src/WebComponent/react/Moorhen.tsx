import { createElement, forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from "react";
import type React from "react";
import type { MoorhenInstance } from "../../InstanceManager/MoorhenInstance";
import type { LocalStorageInstance } from "../../InstanceManager/Preferences/MoorhenPreferences";
import type { MoorhenWebComponent } from "../MoorhenWebComponent";

export type MoorhenProps = {
    id?: string;
    className?: string;
    style?: React.CSSProperties;
    /** Plugins, and content for Moorhen's slots. */
    children?: React.ReactNode;
    /** Fixed size; without it, Moorhen fills the box it is in. */
    width?: number | string;
    height?: number | string;
    /** Where the Moorhen assets are served from. Default "MoorhenAssets". */
    urlPrefix?: string;
    disableFileUploads?: boolean;
    viewOnly?: boolean;
    /** Start-up setting: read when Moorhen starts, changes later are ignored. */
    monomerLibraryPath?: string;
    /** Start-up setting: read when Moorhen starts, changes later are ignored. */
    allowScripting?: boolean;
    /** Start-up setting: where time capsule backups are kept, e.g. from `createCallbackBackupStorage`. */
    backupStorage?: LocalStorageInstance;
    /** Called once Moorhen is ready, with its instance. */
    onReady?: (instance: MoorhenInstance) => void;
};

/**
 * `<moorhen-web-component>` as a React component: Moorhen in your React app, running on its own React,
 * whatever your app's version.
 *
 * Call `registerMoorhenWebComponent()` from `moorhen/web-component` once, before rendering it. A `ref`
 * is the element; `onReady` gives the `MoorhenInstance`. Children are placed inside the element:
 * plugins, and content for Moorhen's slots.
 *
 * @example
 * registerMoorhenWebComponent();
 *
 * <Moorhen id="my-moorhen" width={1000} height={800} onReady={instance => setInstance(instance)}>
 *     <MyPlugin />
 * </Moorhen>
 */
export const Moorhen = forwardRef<MoorhenWebComponent, MoorhenProps>((props, forwardedRef) => {
    const { children, onReady, monomerLibraryPath, allowScripting, backupStorage } = props;
    const ref = useRef<MoorhenWebComponent>(null);
    useImperativeHandle(forwardedRef, () => ref.current as MoorhenWebComponent, []);

    if (typeof customElements !== "undefined" && !customElements.get("moorhen-web-component")) {
        console.warn("<Moorhen>: call registerMoorhenWebComponent() from moorhen/web-component before rendering it");
    }

    // The element parses its boolean attributes as "true" / "false"
    const flag = (value: boolean | undefined) => (value === undefined ? undefined : String(value));
    const attributes = {
        ref,
        id: props.id,
        className: props.className,
        style: props.style,
        width: props.width === undefined ? undefined : String(props.width),
        height: props.height === undefined ? undefined : String(props.height),
        "url-prefix": props.urlPrefix,
        "disable-file-uploads": flag(props.disableFileUploads),
        "view-only": flag(props.viewOnly),
    };

    // Start-up settings: properties, set before Moorhen's first render (it comes once its styles load)
    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) return;
        if (monomerLibraryPath !== undefined) element.monomerLibraryPath = monomerLibraryPath;
        if (allowScripting !== undefined) element.allowScripting = allowScripting;
        if (backupStorage !== undefined) element.backupStorage = backupStorage;
        // Only at start-up: later changes are not applied
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const latestOnReady = useRef(onReady);
    useLayoutEffect(() => {
        latestOnReady.current = onReady;
    });
    useEffect(() => {
        let cancelled = false;
        ref.current?.getMoorhenInstance?.().then(instance => {
            if (!cancelled) latestOnReady.current?.(instance);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    return createElement("moorhen-web-component", attributes, children);
});
Moorhen.displayName = "Moorhen";
