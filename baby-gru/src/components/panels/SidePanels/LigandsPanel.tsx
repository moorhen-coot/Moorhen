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
    // Re-read molecule.ligands, which is not in the store, when a model is changed
    useSelector((state: RootState) => state.moleculeMapUpdate.moleculeUpdate);
    const hasLigands = moleculeList.some(molecule => (molecule.ligands?.length ?? 0) > 0);

    return (
        <SidePanelContainer title="Ligands">
            <MoorhenAccordion title="Tools" type="card" defaultOpen>
                <MenuFromItems menuItemList={menuItems} popoverPlacement="left" />
            </MoorhenAccordion>
            {hasLigands ? <LigandListCard molecules={moleculeList} /> : <span>No ligands loaded</span>}
        </SidePanelContainer>
    );
};
