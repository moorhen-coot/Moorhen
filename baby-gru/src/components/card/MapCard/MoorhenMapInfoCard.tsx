import { useEffect, useState } from "react";
import { MoorhenGrid } from "@/components/interface-base/Stack/Grid";
import { moorhen } from "../../../types/moorhen";
import { MoorhenMenuItemPopover } from "../../interface-base/Popovers/MenuItemPopover";

export const MoorhenMapInfoCard = (props: { map: moorhen.Map; disabled: boolean }) => {
    const [cell, setCell] = useState<string | null>(null);
    const [spacegroup, setSpacegroup] = useState<string | null>(null);
    const [resolution, setResolution] = useState<string | null>(null);

    useEffect(() => {
        const fetchHeaderInfo = async () => {
            const headerInfo = props.map.getSimpleHeaderInfo()
            setCell(
                headerInfo.cell.a.toFixed(2) +
                    " " +
                    headerInfo.cell.b.toFixed(2) +
                    " " +
                    headerInfo.cell.c.toFixed(2) +
                    " " +
                    headerInfo.cell.alpha.toFixed(2) +
                    " " +
                    headerInfo.cell.beta.toFixed(2) +
                    " " +
                    headerInfo.cell.gamma.toFixed(2)
            );
            setSpacegroup(headerInfo.spacegroup);
            setResolution(headerInfo.resolution.toFixed(2));
        };

        fetchHeaderInfo();
    }, []);

    const panelContent = (
        <MoorhenGrid table columns={2} titleColumn>
            <div>Cell</div>
            <div>{cell}</div>
            <div>Space Group</div>
            <div>{spacegroup}</div>
            <div>Resolution</div>
            <div>{resolution}</div>
        </MoorhenGrid>
    );

    return <MoorhenMenuItemPopover popoverPlacement="left" popoverContent={panelContent} menuItemText="Map Information..." />;
};
