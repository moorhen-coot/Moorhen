import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { ChevronRightOutlined, ExpandMoreOutlined } from "@mui/icons-material";
import TreeView from '@mui/lab/TreeView';
import TreeItem from '@mui/lab/TreeItem';
import { useSelector } from 'react-redux';

export const MoorhenCentreOnLigandMenuItem = (props: { 
    glRef: React.RefObject<webGL.MGWebGL>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
 }) => {

    const molecules = useSelector((state: moorhen.State) => state.molecules)

    return <MoorhenBaseMenuItem
            key='centre-on-ligand-menu-item'
            id='centre-on-ligand-menu-item'
            popoverContent={
                molecules.some(molecule => molecule.ligands.length > 0) ?
                <TreeView
                aria-label="file system navigator"
                defaultCollapseIcon={<ExpandMoreOutlined />}
                defaultExpandIcon={<ChevronRightOutlined />}
                >
                    {molecules.filter(molecule => molecule.ligands.length > 0).map(molecule => {
                        return <TreeItem key={molecule.molNo} nodeId={molecule.molNo.toString()} label={molecule.name}>
                            {molecule.ligands.map(ligand => {
                                return <TreeItem
                                    key={`${molecule.molNo}-${ligand.cid}`}
                                    nodeId={`${molecule.molNo}-${ligand.cid}`}
                                    label={ligand.cid}
                                    onClick={() => molecule.centreOn(ligand.cid, true)}/>
                            })}
                        </TreeItem>
                    })}
                </TreeView>
                :
                <span>No ligands...</span>
            }
            menuItemText="Centre on ligand..."
            setPopoverIsShown={props.setPopoverIsShown}
            showOkButton={false}
        />
}
