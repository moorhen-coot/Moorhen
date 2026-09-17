import Fuse from "fuse.js";
import { useDispatch, useSelector } from "react-redux";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMoorhenInstance } from "@/InstanceManager";
import { RootState } from "../../store/MoorhenReduxStore";
import { setMainMenuOpen, setSearchBarActive, setShortCutsBlocked } from "../../store/globalUISlice";
import { MoorhenButton } from "../inputs";
import { MoorhenClickAwayListener } from "../interface-base/utils/ClickAwayListener";
import { MenuFromItems } from "./MenuFromItems";
import "./search-bar.css";
import { MenuItemType } from "./subMenuConfig";

const fuseOptions = {
    keys: [
        { name: "label", weight: 1 },
        { name: "keywords", weight: 0.5 },
        { name: "description", weight: 0.25 },
    ],
    threshold: 0.3,
    includeScore: true,
    minMatchCharLength: 1,
    useExtendedSearch: true,
    findAllMatches: true,
    ignoreDiacritics: true,
};

export const MoorhenSearchBar = () => {
    const open = useSelector((state: RootState) => state.globalUI.isSearchBarActive);
    const dispatch = useDispatch();
    const [query, setQuery] = useState<string>("");
    const inputRef = useRef<HTMLInputElement>(null);
    const moorhenInstance = useMoorhenInstance();
    const menuSystem = moorhenInstance.menuSystem;

    // Set up Fuse.js options for label, keywords, description (priority order)

    const _shortCuts = useSelector((state: RootState) => state.shortcutSettings.shortCuts);
    const shortCuts = JSON.parse(_shortCuts as string) as Record<string, { keyPress: string; modifiers: string[]; label: string }>;
    const shortcutAsMenuItems = useMemo(() => {
        return Object.entries(shortCuts).map(([key, value]) => {
            return {
                type: "customJSX",
                label: `${value.label} ${value.keyPress} ${(value.modifiers.join(" ")).replaceAll("Key", "")}`,
                jsx: () => (
                    <div className="moorhen__search-bar-shortcut-item">
                        <strong>Shortcut:&nbsp;</strong> {value.label} &nbsp;&nbsp; <strong>{(value.modifiers.join(" ")).replaceAll("Key", "")} {value.keyPress}</strong>
                    </div>
                ),
            };
        });
    }, [shortCuts]);

    console.log("shortCuts", shortCuts);

    const fuse = useMemo(
        () => new Fuse([...menuSystem.getAllItems(), ...shortcutAsMenuItems], fuseOptions),
        [menuSystem, shortcutAsMenuItems]
    );

    const getResults = () => {
        if (query.length > 1) {
            const fuseResults = fuse.search(query);
            const _results = fuseResults.map(r => r.item);
            const uniqueResults = _results.filter((item, pos) => {
                return _results.indexOf(item) == pos;
            });

            return uniqueResults as MenuItemType[];
        }
        return [];
    };

    const results = getResults();

    const handleClick = () => {
        if (!open) {
            dispatch(setMainMenuOpen(false));
            dispatch(setShortCutsBlocked(true));
            dispatch(setSearchBarActive(true));
        } else {
            dispatch(setSearchBarActive(false));
            dispatch(setShortCutsBlocked(false));
        }
    };

    useLayoutEffect(() => {
        if (open && inputRef.current) inputRef.current.focus();
    });

    if (!open) {
        return (
            <div className={`moorhen__search-bar-closed`}>
                <MoorhenButton type="icon-only" icon="MatSymSearch" onClick={handleClick} size="medium" />
            </div>
        );
    }
    return (
        <MoorhenClickAwayListener onClickAway={handleClick}>
            <div>
                <div className={`moorhen__search-bar-open`}>
                    <MoorhenButton type="icon-only" icon="MatSymSearch" onClick={handleClick} size="medium" />
                    {open && (
                        <input
                            ref={inputRef}
                            defaultValue={query}
                            type="text"
                            className="moorhen__search-bar-input"
                            onChange={e => setQuery(e.target.value)}
                        />
                    )}
                </div>
                {open && results.length > 0 && (
                    <div className="moorhen__search-menu-container">
                        <MenuFromItems menuItemList={results} />
                    </div>
                )}
            </div>
        </MoorhenClickAwayListener>
    );
};
