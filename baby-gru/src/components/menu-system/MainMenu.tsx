import { ClickAwayListener } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { memo, useMemo, useState } from "react";
import { RootState } from "../../store/MoorhenReduxStore";
import { setMainMenuOpen, setSearchBarActive } from "../../store/globalUISlice";
import { ModalKey, showModal } from "../../store/modalsSlice";
import { convertRemToPx } from "../../utils/utils";
import { MoorhenIcon } from "../icons";
import { MenuFromItems } from "./MenuFromItems ";
import { useMoorhenMenuSystem } from "./MenuSystemContext";
import "./main-menu.css";

export type ExtraNavBarMenus = {
    icon: React.JSX.Element;
    name: string;
    ref?: React.RefObject<HTMLDivElement>;
    JSXElement: React.JSX.Element;
    align?: number;
};

export type ExtraMenuProps = {
    extraNavBarMenus?: ExtraNavBarMenus[];
};

export const MoorhenMainMenu = memo((props: ExtraMenuProps) => {
    const isOpen = useSelector((state: RootState) => state.globalUI.isMainMenuOpen);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const isDevMode = useSelector((state: RootState) => state.generalStates.devMode);
    const GLViewportHeight = useSelector((state: RootState) => state.sceneSettings.GlViewportHeight);
    const dispatch = useDispatch();
    const menuSystem = useMoorhenMenuSystem();

    const handleMainMenuToggle = () => {
        if (isOpen) {
            setActiveMenu(null);
        } else {
            dispatch(setSearchBarActive(false));
        }
        dispatch(setMainMenuOpen(!isOpen));
    };
    const handleClickAway = event => {
        if ((event.target as HTMLElement).closest(".moorhen__main-menu-buttons-container")) return;
        setActiveMenu(null);
    };

    const main_menu_config = menuSystem.mainMenuMap;

    const subMenu = useMemo(() => {
        if (!activeMenu || !isOpen) return null;

        const menuEntry = Object.values(main_menu_config).find(m => m.label === activeMenu);

        if (menuEntry) {
            if (menuEntry.type === "sub-menu") {
                const style = menuEntry.align ? { top: `${menuEntry.align * 1.5}rem` } : {};
                const menuItems = menuSystem.getItems(menuEntry.menu);
                return (
                    <div key={menuEntry.label} className="moorhen__sub-menu-container" style={style}>
                        <MenuFromItems menuItemList={menuItems} />
                    </div>
                );
            } else if (menuEntry.type === "jsx") {
                const style = menuEntry.align ? { top: `${menuEntry.align * 1.5}rem` } : { top: "5rem" };
                return (
                    <div key={menuEntry.label} className="moorhen__sub-menu-container" style={style}>
                        {menuEntry.component}
                    </div>
                );
            }
        } else {
            const extraMenu = props.extraNavBarMenus.find(m => m.name === activeMenu);
            if (extraMenu) {
                const style = extraMenu.align ? { top: `${extraMenu.align * 1.5}rem` } : { top: "5rem" };
                return (
                    <div key={extraMenu.name} className="moorhen__sub-menu-container" ref={extraMenu.ref} style={style}>
                        {extraMenu.JSXElement}
                    </div>
                );
            } else {
                return null;
            }
        }
    }, [activeMenu, isOpen]);

    const extraMenu = useMemo(() => {
        if (!isOpen || !props.extraNavBarMenus) return null;
        return (
            <div className="moorhen__main-menu-buttons-container">
                {props.extraNavBarMenus.map(menu => (
                    <MainMenuButton
                        key={menu.name}
                        icon={menu.icon}
                        label={menu.name}
                        onClick={() => {
                            setActiveMenu(menu.name);
                            menu.ref.current?.scrollIntoView({ behavior: "smooth" });
                        }}
                    />
                ))}
            </div>
        );
    }, [isOpen, props.extraNavBarMenus]);

    const menu = useMemo(() => {
        if (!isOpen) return null;
        const handleClick = (label: string) => {
            setActiveMenu(current => (current === label ? null : label));
        };

        const buttonsList = Object.entries(main_menu_config).map(([key, menu]) => {
            if (menu.label === "Dev tools" && !isDevMode) {
                return null;
            }
            return (
                <MainMenuButton
                    key={key}
                    icon={menu.icon}
                    label={menu.label}
                    onClick={
                        menu.type === "sub-menu" || menu.type === "jsx"
                            ? () => handleClick(menu.label)
                            : () => {
                                  setActiveMenu(null);
                                  dispatch(showModal(menu.modal as ModalKey));
                              }
                    }
                />
            );
        });

        return (
            <div className="moorhen__main-menu-buttons-container">
                {buttonsList}
                {extraMenu}
            </div>
        );
    }, [isOpen, props.extraNavBarMenus, isDevMode]);

    const menuLength =
        Object.keys(main_menu_config).length - (!isDevMode ? 1 : 0) + (props.extraNavBarMenus ? props.extraNavBarMenus.length : 0);
    const containerHeight = isOpen ? `${Math.min(convertRemToPx(4.5 + menuLength * 3.3), GLViewportHeight - 10)}px` : "4.5rem";
    const containerWidth = activeMenu === null ? "12rem" : "40rem";

    return (
        <div className="moorhen__main-menu-scroll" style={{ width: containerWidth, height: containerHeight }}>
            <div className="moorhen__main-menu" style={{ width: containerWidth, height: containerHeight }}>
                <button className="moorhen__main-menu-toggle" onClick={handleMainMenuToggle}>
                    {isOpen ? (
                        <MoorhenIcon name={`MUISymbolClose`} className="moorhen__icon__menu" alt="Menu" />
                    ) : (
                        <MoorhenIcon name={`MUISymbolMenu`} className="moorhen__icon__menu" alt="Menu" />
                    )}
                    &nbsp;&nbsp;
                    <MoorhenIcon name={`MoorhenLogo`} size="medium" alt="Maps" className="moorhen__main-logo" />
                </button>
                <div className="moorhen__main-menu-container">
                    {menu}
                    {subMenu ? <ClickAwayListener onClickAway={event => handleClickAway(event)}>{subMenu}</ClickAwayListener> : null}
                </div>
            </div>
        </div>
    );
});
MoorhenMainMenu.displayName = "MoorhenMainMenu";

const MainMenuButton = (props: { icon: React.JSX.Element; label: string; onClick: () => void }) => {
    return (
        <button className="moorhen__main-menu-button" onClick={props.onClick}>
            {props.icon}
            &nbsp;&nbsp;
            {props.label}
        </button>
    );
};
