import { SubMenuMap, createSubMenuMap } from "./SubMenuMap";
import { MainMenuMap, createMainMenu } from "./mainMenuConfig";

export class MoorhenMenuSystem {
    public subMenuMap: SubMenuMap | undefined;
    public mainMenuMap: MainMenuMap;

    constructor() {
        this.subMenuMap = createSubMenuMap();
        this.mainMenuMap = createMainMenu();
    }

    public cleanup() {
        this.subMenuMap = undefined;
    }

    // public createMenu(selectedMenu: string) {
    //     const itemList = this.subMenuMap[selectedMenu].items;
    //     return menuFromItems(itemList);
    // }

    public getItems(selectedMenu: string) {
        let itemList = [];
        try {
            itemList = this.subMenuMap[selectedMenu].items;
        } catch {
            console.error("Could not find menu items for menu: " + selectedMenu);
        }
        return itemList;
    }
}
