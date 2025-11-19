import { OtherSceneSettingsMenu } from "../menu-item/OtherSceneSettings";
import { HELP_MENU, MenuItem, MenuItemType, SubMenu, SubMenuMap, subMenuMap } from "./SubMenuMap";
import { MainMenu, MainMenuMap, MainMenuType } from "./mainMenuConfig";

export class MoorhenMenuSystem {
    public subMenuMap: SubMenuMap = {};
    public mainMenuMap: MainMenuMap;

    constructor() {
        this.mainMenuMap = MainMenu;
        this.createSubMenu();
    }

    private createSubMenu = () => {
        this.addSubmenu(subMenuMap);
        this.addSubmenu(HELP_MENU);
        this.addSubmenu(OtherSceneSettingsMenu);
    };

    public cleanup() {
        this.subMenuMap = undefined;
    }
    public getItems(selectedMenu: string) {
        let itemList: MenuItemType[] = [];
        try {
            itemList = this.subMenuMap[selectedMenu].items;
        } catch {
            console.error("Could not find menu items for menu: " + selectedMenu);
        }
        return itemList;
    }

    public getAllItems = () => {
        const items: MenuItem[] = [];
        Object.values(this.subMenuMap).forEach((subMenu: SubMenu) => {
            if (subMenu && Array.isArray(subMenu.items)) {
                subMenu.items.forEach((item: MenuItem) => {
                    if (item && item.label) items.push(item);
                });
            }
        });
        return items;
    };

    /**
     * Adds a main menu item to the menu system at the specified position.
     *
     * If no position is provided, the item is added to the end of the menu.
     * If a position is specified, existing menu items at or after that position
     * are shifted to make space for the new item.
     *
     * @param mainMenuItem - The main menu item to add.
     * @param position - The position at which to insert the menu item (optional).
     */
    public addMainMenu = (mainMenuItem: MainMenuType, position: number = undefined) => {
        const maxPosition = Math.max(...Object.keys(this.mainMenuMap).map(k => parseInt(k)));
        if (position === undefined) {
            const newPosition = maxPosition + 1;
        } else {
            for (let i = maxPosition; i < position; i--) {
                this.mainMenuMap[i + 1] = this.mainMenuMap[i];
            }
        }
        this.mainMenuMap[position] = mainMenuItem;
    };

    /**
     * Adds one or more submenus to the current submenu map.
     *
     * Merges the provided `subMenuMap` into the existing `subMenuMap` property.
     * After merging, it checks for unique submenu IDs to ensure there are no duplicates.
     *
     * @param subMenuMap - An object mapping submenu IDs to submenu definitions to be added.
     */
    public addSubmenu = (subMenuMap: SubMenuMap) => {
        Object.assign(this.subMenuMap, subMenuMap);
        this.checkUniqueIds();
    };

    /**
     * Adds the provided menu items to an existing submenu.
     *
     * @param MenuItems - An array of menu items to add to the submenu.
     * @param subMenu - The key or name of the submenu to which the items will be added.
     * @param top - If true, the new items are added to the top of the submenu; otherwise, they are added to the bottom. Defaults to false.
     *
     * @remarks
     * If the submenu exists in `subMenuMap`, the items are added according to the `top` parameter.
     * After modification, the method checks for unique IDs among all menu items.
     */
    public addToExistingSubmenu = (MenuItems: MenuItemType[], subMenu: string, top: boolean = false) => {
        if (this.subMenuMap[subMenu]) {
            if (top) this.subMenuMap[subMenu].items = MenuItems.concat(this.subMenuMap[subMenu].items);
            this.subMenuMap[subMenu].items = this.subMenuMap[subMenu].items.concat(MenuItems);
        } else {
            console.warn(`Moorhen MenuSystem: could not find submenu ${subMenu} to add items to.`);
        }
        this.checkUniqueIds();
    };

    /**
     * Deletes a menu item with the specified ID from all submenus.
     *
     * Iterates through each submenu in `subMenuMap` and removes any item whose `id` matches the provided `id`.
     *
     * @param id - The unique identifier of the menu item to be deleted.
     */
    public deleteItemById = (id: string) => {
        Object.values(this.subMenuMap).forEach((subMenu: SubMenu) => {
            subMenu.items = subMenu.items.filter((item: MenuItem) => item.id !== id);
        });
    };

    private checkUniqueIds = () => {
        const ids: Set<string> = new Set();
        let allUnique = true;
        Object.values(this.subMenuMap).forEach((subMenu: SubMenu) => {
            subMenu.items.forEach((item: MenuItem) => {
                if (item.id) {
                    if (ids.has(item.id)) {
                        console.warn(`Moorhen MenuSystem : Duplicate menu item id found: ${item.id}`);
                        allUnique = false;
                    } else {
                        ids.add(item.id);
                    }
                }
            });
        });
        return allUnique;
    };
}
