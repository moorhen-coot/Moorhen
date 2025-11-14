import { ClickAwayListener } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { memo, useMemo, useState } from "react";
import { RootState } from "../../store/MoorhenReduxStore";
import { ModalKey, showModal } from "../../store/modalsSlice";
import { convertRemToPx } from "../../utils/utils";
import { MoorhenIcon } from "../icons";
import { createSubMenuMap } from "./SubMenuMap";
import "./main-menu.css";
import { createMainMenu } from "./mainMenuConfig";

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
    const [isOpen, setIsOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const isDevMode = useSelector((state: RootState) => state.generalStates.devMode);
    const GLViewportHeight = useSelector((state: RootState) => state.sceneSettings.GlViewportHeight);
    const dispatch = useDispatch();

    const handleMainMenuToggle = () => {
        if (isOpen) {
            setActiveMenu(null);
        }

        setIsOpen(prev => !prev);
    };
    const handleClickAway = event => {
        if ((event.target as HTMLElement).closest(".moorhen__main-menu-buttons-container")) return;
        setActiveMenu(null);
    };

    const main_menu_config = useMemo(() => createMainMenu(), [createMainMenu]);

    const subMenu = useMemo(() => {
        if (!activeMenu || !isOpen) return null;

        const menuEntry = Object.values(main_menu_config).find(m => m.label === activeMenu);

        if (menuEntry) {
            const style = menuEntry.align ? { top: `${menuEntry.align * 1.5}rem` } : {};
            return (
                <div key={menuEntry.label} className="moorhen__sub-menu-container" style={style}>
                    <menuEntry.component {...menuEntry.props} />
                </div>
            );
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
                        typeof menu.component === "function"
                            ? () => handleClick(menu.label)
                            : () => {
                                  setActiveMenu(null);
                                  dispatch(showModal(menu.component as ModalKey));
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
    console.log(menuLength);
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
