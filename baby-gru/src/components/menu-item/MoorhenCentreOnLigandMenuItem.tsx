import { useEffect, useState } from "react";
import "rc-tree/assets/index.css"
import Tree from 'rc-tree';
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { DataNode } from "rc-tree/lib/interface";

interface ExtendedDataNode extends DataNode {
    type: "molecule" | "ligand";
    molecule?: moorhen.Molecule;
}

export const MoorhenCentreOnLigandMenuItem = (props: { 
    molecules: moorhen.Molecule[];
    glRef: React.RefObject<webGL.MGWebGL>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
 }) => {

    const [molTreeData, setMolTreeData] = useState<ExtendedDataNode[]>([])

    useEffect(() => {

        async function updateLigands() {
            const newTreeData: ExtendedDataNode[] = []
            for (const molecule of props.molecules) {
                if (molecule.gemmiStructure === null || molecule.atomsDirty) {
                    await molecule.updateAtoms()
                }
                if (molecule.gemmiStructure === null || molecule.gemmiStructure.isDeleted()) {
                    console.log('Cannot proceed, something went wrong...')
                    return
                }

                let newMoleculeNode: ExtendedDataNode = { title: molecule.name, key: molecule.molNo, type: "molecule" }
                const model = molecule.gemmiStructure.first_model()
                const ligandCids: ExtendedDataNode[] = []

                try {
                    const chains = model.chains
                    const chainsSize = chains.size()
                    for (let i = 0; i < chainsSize; i++) {
                        const chain = chains.get(i)
                        const ligands = chain.get_ligands()
                        for (let j = 0; j < ligands.length(); j++) {
                            const ligand = ligands.at(j)
                            const ligandSeqId = ligand.seqid
                            const ligandCid = `/${model.name}/${chain.name}/${ligandSeqId.num?.value}(${ligand.name})`
                            ligandCids.push({ molecule: molecule, title: ligandCid, key: ligandCid, type: "ligand" })
                            ligand.delete()
                            ligandSeqId.delete()
                        }
                        chain.delete()
                        ligands.delete()
                    }
                    chains.delete()
                } finally {
                    model.delete()
                }

                if (ligandCids.length > 0) {
                    newMoleculeNode.children = ligandCids
                }
                newTreeData.push(newMoleculeNode)
            }
            setMolTreeData(newTreeData)
        }

        updateLigands()

    }, [props.molecules])

    return <>
        <MoorhenBaseMenuItem
            key='centre-on-ligand-menu-item'
            id='centre-on-ligand-menu-item'
            popoverContent={
                molTreeData.length > 0 ?
                <Tree treeData={molTreeData}
                    onSelect={async (selectedKeys, e: any) => {
                        if ((e.node as ExtendedDataNode).type === "ligand") {
                            const selAtoms = await (e.node as ExtendedDataNode).molecule.gemmiAtomsForCid(e.node.title as string)
                            const reducedValue = selAtoms.reduce(
                                (accumulator, currentValue) => {
                                    const newSum = accumulator.sumXyz.map((coord, i) => coord + currentValue.pos[i])
                                    const newCount = accumulator.count + 1
                                    return { sumXyz: newSum, count: newCount }
                                },
                                { sumXyz: [0., 0., 0.], count: 0 }
                            )
                            if (reducedValue.count > 0) {
                                props.glRef.current.setOriginAnimated(
                                    reducedValue.sumXyz.map(coord => -coord / reducedValue.count)
                                    , true)
                            }
                        }
                    }}
                >
                </Tree>
                :
                <span>No ligands...</span>
            }
            menuItemText="Centre on ligand..."
            setPopoverIsShown={props.setPopoverIsShown}
            showOkButton={false}
        />
    </>
}
