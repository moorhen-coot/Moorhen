import { ChevronRightOutlined, ExpandMoreOutlined } from "@mui/icons-material";
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import { useSelector } from 'react-redux';
import { webGL } from "../../types/mgWebGL";
import { moorhen } from "../../types/moorhen";
import { convertViewtoPx } from "../../utils/utils";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";

export const MoorhenCentreOnLigandMenuItem = (props: { 
    glRef: React.RefObject<webGL.MGWebGL>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
 }) => {

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    return <MoorhenBaseMenuItem
            key='centre-on-ligand-menu-item'
            id='centre-on-ligand-menu-item'
            popoverContent={
                molecules.some(molecule => molecule.ligands.length > 0) ?
                <div style={{overflowY: 'auto', maxHeight: convertViewtoPx(30, height)}}>
                <SimpleTreeView
                aria-label="file system navigator"
                >
                    {molecules.filter(molecule => molecule.ligands.length > 0).map(molecule => {
                        const uniqueChainNames: string[] = molecule.ligands.reduce((uniqueChains: string[], lig) => {
                            if (!uniqueChains.includes(lig.chainName)) {
                                uniqueChains.push(lig.chainName)
                            }
                            return uniqueChains
                        }, [])
                        return <TreeItem key={molecule.molNo} itemId={molecule.molNo.toString()} label={molecule.name}>
                            {uniqueChainNames.map(chainName => {
                                return <TreeItem key={`${molecule.molNo}-${chainName}`} itemId={`${molecule.molNo}-${chainName}`} label={`Chain ${chainName}`}>
                                    {molecule.ligands.filter(lig => lig.chainName === chainName).map(ligand => {
                                        return <TreeItem
                                        key={`${molecule.molNo}-${ligand.cid}`}
                                        itemId={`${molecule.molNo}-${ligand.cid}`}
                                        label={ligand.cid}
                                        onClick={() => molecule.centreOn(ligand.cid, true, true)}/>
                                    })}
                                </TreeItem>
                            })}
                        </TreeItem>
                    })}
                </SimpleTreeView>
                </div>
                :
                <span>No ligands...</span>
            }
            menuItemText="Centre on ligand..."
            setPopoverIsShown={props.setPopoverIsShown}
            showOkButton={false}
        />
}
