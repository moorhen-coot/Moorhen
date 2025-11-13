import { useDispatch, useSelector } from "react-redux";
import React from "react";
import { RootState } from "../../store/MoorhenReduxStore";
import { showModal } from "../../store/modalsSlice";
import { MoorhenMenuItem, MoorhenMenuItemPopover, MoorhenStack } from "../interface-base";
import type { SubMenu, SubMenuMap, SubMenus } from "./SubMenuMap";

export function menuFromMap(menuMap: SubMenuMap, selectedMenu: SubMenus): React.JSX.Element {
    console.log("exec menu from map");
    const dispatch = useDispatch();
    const isDev = useSelector((state: RootState) => state.generalStates.devMode);
    const disableFileUploads = useSelector((state: RootState) => state.generalStates.disableFileUpload);
    const allowScripting = useSelector((state: RootState) => state.generalStates.allowScripting);

    const subMenuMap: SubMenu = menuMap[selectedMenu];

    const menuItemList = subMenuMap.items.map(menuItem => {
        if (menuItem.specialType === "upload" && disableFileUploads) {
            return;
        }
        if (menuItem.specialType === "script" && !allowScripting) {
            return;
        }

        if (!menuItem.devOnly || (menuItem.devOnly && isDev)) {
            if (menuItem.type === "popover") {
                return (
                    <MoorhenMenuItemPopover key={menuItem.label} menuItemText={menuItem.label}>
                        {menuItem.content}
                    </MoorhenMenuItemPopover>
                );
            } else if (menuItem.type === "item") {
                return (
                    <MoorhenMenuItem key={menuItem.label} onClick={menuItem.onClick}>
                        {menuItem.label}
                    </MoorhenMenuItem>
                );
            } else if (menuItem.type === "showModal") {
                return (
                    <MoorhenMenuItem
                        key={menuItem.label}
                        onClick={() => {
                            dispatch(showModal(menuItem.modal));
                            document.body.click();
                        }}
                    >
                        {menuItem.label}
                    </MoorhenMenuItem>
                );
            } else if (menuItem.type === "customJSX") {
                return menuItem.jsx;
            }
        }
    });
    return <MoorhenStack direction="column">{menuItemList}</MoorhenStack>;
}
