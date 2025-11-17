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
        const itemList = this.subMenuMap[selectedMenu].items;
        return itemList;
    }
}
