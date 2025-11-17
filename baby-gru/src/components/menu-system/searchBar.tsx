import { ClickAwayListener } from "@mui/material";
import Fuse from "fuse.js";
import { useMemo, useState } from "react";
import { MoorhenButton } from "../inputs";
import { MoorhenStack } from "../interface-base";
import { useMoorhenMenuSystem } from "./MenuSystemContext";
import { MenuItem, SubMenu } from "./SubMenuMap";
import { HelpMenu } from "./SubMenus";
import { MenuFromItems } from "./createSubMenu";
import "./search-bar.css";

export const MoorhenSearchBar = () => {
    const [open, setOpen] = useState<boolean>(false);
    const [query, setQuery] = useState<string>("");

    const menuSystem = useMoorhenMenuSystem();

    // Collect all menu items from all submenus
    const getAllMenuItems = () => {
        if (!menuSystem.subMenuMap) return [];
        const items: MenuItem[] = [];
        Object.values(menuSystem.subMenuMap).forEach((subMenu: SubMenu) => {
            if (subMenu && Array.isArray(subMenu.items)) {
                subMenu.items.forEach((item: MenuItem) => {
                    if (item && item.label) items.push(item);
                });
            }
        });
        return items;
    };

    // Set up Fuse.js options for label, keywords, description (priority order)
    const fuseOptions = {
        keys: [
            { name: "label", weight: 0.7 },
            { name: "keywords", weight: 0.2 },
            { name: "description", weight: 0.1 },
        ],
        threshold: 0.5,
        includeScore: true,
        useExtendedSearch: true,
    };

    const results = useMemo(() => {
        if (query.length > 1) {
            const fuse = new Fuse(getAllMenuItems(), fuseOptions);
            const fuseResults = fuse.search(query);
            return fuseResults.map(r => r.item);
        }
        return [];
    }, [query]);

    return (
        <>
            <div className={`moorhen__search-bar-${open ? "open" : "closed"}`}>
                <MoorhenButton type="icon-only" icon="MUISymbolSearch" onClick={() => setOpen(!open)} />
                {open && (
                    <input
                        defaultValue={query}
                        type="text"
                        className="moorhen__search-bar-input"
                        onChange={e => setQuery(e.target.value)}
                    />
                )}
            </div>
            {open && results.length > 0 && (
                <ClickAwayListener
                    onClickAway={() => {
                        console.log("click away");
                        setOpen(false);
                    }}
                >
                    <div className="moorhen__search-menu-container">
                        <MenuFromItems menuItemList={results} />
                    </div>
                </ClickAwayListener>
            )}
        </>
    );
};
