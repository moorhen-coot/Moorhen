import { MenuItem } from "@mui/material";
import { ActionCreatorWithOptionalPayload } from "@reduxjs/toolkit";
import { Form, InputGroup } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import React from "react";
import { RootState } from "../../store/MoorhenReduxStore";
import { showModal } from "../../store/modalsSlice";
import { MoorhenMenuItem, MoorhenMenuItemPopover, MoorhenStack } from "../interface-base";
import type { SubMenu, SubMenuMap, SubMenus } from "./SubMenuMap";

export function menuFromMap(menuMap: SubMenuMap, selectedMenu: SubMenus): React.JSX.Element {
    const dispatch = useDispatch();
    const isDev = useSelector((state: RootState) => state.generalStates.devMode);
    const disableFileUploads = useSelector((state: RootState) => state.generalStates.disableFileUpload);
    const allowScripting = useSelector((state: RootState) => state.generalStates.allowScripting);

    const subMenuMap: SubMenu = menuMap[selectedMenu];
    let key = 0;

    const menuItemList = subMenuMap.items.map(menuItem => {
        if ("specialType" in menuItem && menuItem.specialType === "upload" && disableFileUploads) {
            return;
        }
        if ("specialType" in menuItem && menuItem.specialType === "script" && !allowScripting) {
            return;
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
                return <hr key={key}></hr>;
            }
        }
    });
    return <MoorhenStack direction="column">{menuItemList}</MoorhenStack>;
}

const PreferenceChecker = (props: {
    selector: (state: RootState) => boolean;
    action: ActionCreatorWithOptionalPayload<boolean>;
    label: string;
}) => {
    const checked = useSelector(props.selector);
    const dispatch = useDispatch();

    return (
        <InputGroup className="moorhen-input-group-check">
            <Form.Check type="switch" checked={checked} onChange={() => dispatch(props.action(!checked))} label={props.label} />
        </InputGroup>
    );
};
