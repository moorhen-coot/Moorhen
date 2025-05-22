import { OverlayTrigger, Tooltip } from "react-bootstrap"
import { moorhen } from "../../types/moorhen";

export const getNameLabel = (item: moorhen.Molecule | moorhen.Map, maxLength: number = 21) => {
    if (item.name.length > maxLength+3) {
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
                    {`#${item.molNo} ${item.name.slice(0,maxLength)}...`}
                </div>
                </OverlayTrigger>
    }
    return `#${item.molNo} ${item.name}`
}



