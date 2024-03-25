import { OverlayTrigger, Tooltip } from "react-bootstrap"
import { moorhen } from "../../types/moorhen";

export const getNameLabel = (item: moorhen.Molecule | moorhen.Map, maxLength: number = 16) => {
    if (item.name.length > maxLength) {
        return <OverlayTrigger
                key={item.molNo}
                placement="top"
                overlay={
                    <Tooltip id="name-label-tooltip" className="moorhen-tooltip">
                        <div>
                            {item.name}
                        </div>
                    </Tooltip>
                }
                >
                <div>
                    {`#${item.molNo} ${item.type === 'molecule' ? 'Mol.' : 'Map'} ${item.name.slice(0,15)}...`}
                </div>
                </OverlayTrigger>
    }
    return `#${item.molNo} ${item.type === 'molecule' ? 'Mol.' : 'Map'} ${item.name}`
}



