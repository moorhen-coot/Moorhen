import { ClickAwayListener } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { memo, useMemo, useState } from "react";
import { useMoorhenInstance } from "@/InstanceManager";
import { setShownSidePanel } from "@/store";
import { RootState } from "../../store/MoorhenReduxStore";
import { setMainMenuOpen, setSearchBarActive } from "../../store/globalUISlice";
import { ModalKey, showModal } from "../../store/modalsSlice";
import { MoorhenIcon, MoorhenSVG } from "../icons";
import { MenuFromItems } from "./MenuFromItems";
import { MoorhenSearchBar } from "./SearchBar";
import "./main-menu.css";

export const MoorhenMainMenu = memo(() => {
    const isOpen = useSelector((state: RootState) => state.globalUI.isMainMenuOpen);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const isDevMode = useSelector((state: RootState) => state.generalStates.devMode);
    const GLViewportHeight = useSelector((state: RootState) => state.sceneSettings.GlViewportHeight);
    const dispatch = useDispatch();
    const moorhenInstance = useMoorhenInstance();
    const menuSystem = moorhenInstance.getMenuSystem();

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
                        <MenuFromItems menuItemList={menuItems} title={menuEntry.label} />
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
            return null;
        }
    }, [activeMenu, isOpen]);

    const menu = useMemo(() => {
        if (!isOpen) return null;
        const handleClick = (label: string) => {
            setActiveMenu(current => (current === label ? null : label));
        };

        const buttonsList = Object.entries(main_menu_config).map(([key, menu]) => {
            if (menu.label === "Dev tools" && !isDevMode) {
                return null;
            }
            const onClick = () => {
                if (menu.type === "sub-menu" || menu.type === "jsx") {
                    handleClick(menu.label);
                } else if (menu.type === "modal") {
                    setActiveMenu(null);
                    dispatch(showModal(menu.modal as ModalKey));
                } else if (menu.type === "panel") {
                    setActiveMenu(null);
                    dispatch(setShownSidePanel(menu.panel));
                }
            };
            return <MainMenuButton key={key} icon={menu.icon} label={menu.label} onClick={onClick} />;
        });

        return <div className="moorhen__main-menu-buttons-container">{buttonsList}</div>;
    }, [isOpen, isDevMode]);

    return (
        <div className="moorhen__main-menu-scroll" style={{ height: GLViewportHeight - 10 }}>
            {/* moorhen__main-menu-scroll have these CSS properties that will propagate and cause bugs: 
            direction: ltr 
            pointer-events: none;
            children needs:
            direction: rtl
            pointer-events: auto;            
            */}

            <MoorhenSearchBar />
            <div className="moorhen__main-menu">
                <button className="moorhen__main-menu-toggle" onClick={handleMainMenuToggle}>
                    {isOpen ? (
                        <MoorhenIcon moorhenSVG={`MatSymClose`} className="moorhen__icon menu" alt="Menu" />
                    ) : (
                        <MoorhenIcon moorhenSVG={`MatSymMenu`} className="moorhen__icon menu" alt="Menu" />
                    )}
                    &nbsp;&nbsp;
                    <MoorhenIcon moorhenSVG={`MoorhenLogo`} alt="Maps" className="moorhen__main-logo" />
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

const MainMenuButton = (props: { icon: MoorhenSVG; label: string; onClick: () => void }) => {
    return (
        <button className="moorhen__main-menu-button" onClick={props.onClick}>
            <MoorhenIcon moorhenSVG={props.icon} className="moorhen__icon menu" alt={props.icon} />
            &nbsp;&nbsp;
            {props.label}
        </button>
    );
};
