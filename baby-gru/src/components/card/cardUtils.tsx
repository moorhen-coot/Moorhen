import { OverlayTrigger, Tooltip } from "react-bootstrap"
import { moorhen } from "../../types/moorhen";

export const getNameLabel = (item: moorhen.Molecule | moorhen.Map) => {
    if (item.name.length > 9) {
        return <OverlayTrigger
                key={item.molNo}
                placement="top"
                overlay={
                    <Tooltip
                    id="name-label-tooltip" 
                    style={{
                        zIndex: 9999,
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        padding: '2px 10px',
                        color: 'white',
                        borderRadius: 3,
                    }}>
                        <div>
                            {item.name}
                        </div>
                    </Tooltip>
                }
                >
                <div>
                    {`#${item.molNo} ${item.type === 'molecule' ? 'Mol.' : 'Map'} ${item.name.slice(0,5)}...`}
                </div>
                </OverlayTrigger>
    }
    return `#${item.molNo} ${item.type === 'molecule' ? 'Mol.' : 'Map'} ${item.name}`
}



