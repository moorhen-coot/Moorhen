import { useSelector } from "react-redux";
import { LigandListCard } from "@/components/card/LigandListCard/LigandListCard";
import { MoorhenAccordion } from "@/components/interface-base";
import { MenuFromItems } from "@/components/menu-system/MenuFromItems";
import { useMenuHook } from "@/components/menu-system/menuHook";
import { useMoorhenInstance } from "@/InstanceManager";
import { RootState } from "@/store";
import { SidePanelContainer } from "./utils/SidePanelContainer";

/**
 * The Ligands panel, opened by the main menu's Ligand button: the ligand menu's items in a Tools
 * accordion at the top (the "ligand" submenu, which stays in the menu system, so its items are still found by search
 * and can be extended through it), then every ligand, those inside models and the ligand-only
 * molecules, each with its ligand card.
 */
export const LigandsPanel = () => {
    const moorhenInstance = useMoorhenInstance();
    // Re-read the items when the menu system changes (items added or removed through the API)
    useMenuHook();
    const menuItems = moorhenInstance.menuSystem.getItems("ligand");
    const moleculeList = useSelector((state: RootState) => state.molecules.moleculeList);
    // A boolean, so that record refreshes do not re-render the panel

    return (
        <SidePanelContainer title="Ligands">
            <MoorhenAccordion title="Tools" type="card" defaultOpen>
                <MenuFromItems menuItemList={menuItems} popoverPlacement="left" />
            </MoorhenAccordion>
            <LigandListCard molecules={moleculeList} /> 
        </SidePanelContainer>
    );
};
