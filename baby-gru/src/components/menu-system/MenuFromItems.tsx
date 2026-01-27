import { ActionCreatorWithOptionalPayload } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import React from "react";
import { useMoorhenInstance } from "@/InstanceManager";
import { setShownSidePanel } from "@/store";
import { RootState } from "../../store/MoorhenReduxStore";
import { showModal } from "../../store/modalsSlice";
import { MoorhenToggle } from "../inputs";
import { MoorhenMenuItem, MoorhenMenuItemPopover, MoorhenStack } from "../interface-base";
import type { MenuItemType } from "./subMenuConfig";

export const MenuFromItems = (props: { menuItemList: MenuItemType[]; title?: string }): React.JSX.Element => {
    const dispatch = useDispatch();
    const isDev = useSelector((state: RootState) => state.generalStates.devMode);
    const disableFileUploads = useSelector((state: RootState) => state.generalStates.disableFileUpload);
    const allowScripting = useSelector((state: RootState) => state.generalStates.allowScripting);

    let key = 0;
    if (props.menuItemList === undefined) {
        return <div>Empty menu list</div>;
    }

    const menuJSXList = props.menuItemList.map(menuItem => {
        if ("specialType" in menuItem && menuItem.specialType === "upload" && disableFileUploads) {
            return null;
        }
        if ("specialType" in menuItem && menuItem.specialType === "script" && !allowScripting) {
            return null;
        }

        if (!("devOnly" in menuItem) || !menuItem.devOnly || (menuItem.devOnly && isDev)) {
            if (menuItem.type === "popover") {
                return (
                    <MoorhenMenuItemPopover key={menuItem.label} menuItemText={menuItem.label}>
                        <menuItem.content />
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
                return <menuItem.jsx key={menuItem.label} />;
            } else if (menuItem.type === "preferenceSwitch") {
                return (
                    <PreferenceChecker selector={menuItem.selector} action={menuItem.action} label={menuItem.label} key={menuItem.label} />
                );
            } else if (menuItem.type === "separator") {
                key += 1;
                return <hr key={key} className="moorhen_menu-hr"></hr>;
            } else if (menuItem.type === "subMenu") {
                return <SubMenuPopover menu={menuItem.menu} label={menuItem.label} key={menuItem.id} />;
            } else if (menuItem.type === "showPanel") {
                return (
                    <MoorhenMenuItem
                        key={menuItem.label}
                        onClick={() => {
                            dispatch(setShownSidePanel(menuItem.panel));
                            document.body.click();
                        }}
                    >
                        {menuItem.label}
                    </MoorhenMenuItem>
                );
            }
        }
    });

    return (
        <MoorhenStack direction="column">
            {props.title ? <div className="moorhen__submenu-title">{props.title}</div> : null}
            {menuJSXList}
        </MoorhenStack>
    );
};

const PreferenceChecker = (props: {
    selector: (state: RootState) => boolean;
    action: ActionCreatorWithOptionalPayload<boolean>;
    label: string;
}) => {
    const checked = useSelector(props.selector);
    const dispatch = useDispatch();

    return (
        <MoorhenToggle
            checked={checked}
            onChange={() => dispatch(props.action(!checked))}
            label={props.label}
            className="moorhen__toggle-menu-item"
        />
    );
};

const SubMenuPopover = (props: { menu: string; label: string }) => {
    const moorhenInstance = useMoorhenInstance();
    const menuSystem = moorhenInstance.getMenuSystem();
    const items = menuSystem.getItems(props.menu);
    return (
        <MoorhenMenuItemPopover menuItemText={props.label}>
            <MenuFromItems menuItemList={items} title={props.label} />
        </MoorhenMenuItemPopover>
    );
};
