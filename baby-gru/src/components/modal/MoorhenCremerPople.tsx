import * as vec3 from 'gl-matrix/vec3';
import * as quat4 from 'gl-matrix/quat';
import { moorhen } from "../../types/moorhen";
import { quatToMat4, quat4Inverse } from '../../WebGLgComponents/quatToMat4.js';
import { RootState } from '../../store/MoorhenReduxStore';
import { SimpleWebGL } from "./SimpleWebGL";
import { getSphereMesh } from "../../utils/sphereMesh";

export const MoorhenCremerPople = (props: { stackDirection: "horizontal" | "vertical", width?: number, molecule: moorhen.Molecule }) => {

    const plotWidth = props.width ? props.width : 500
    const plotHeight = plotWidth

    const getMesh = () => {
        //This needs to be changed to get the appropriate mesh for this molecule?
        return getSphereMesh(1)
    }

    const handleClick = (x:number,y:number,quat:quat4,zoom:number,origin:[number,number,number]) => {
        let p_x = 2.0*zoom*(x/plotWidth-0.5)
        let p_y = 2.0*zoom*(y/plotHeight-0.5)
        if(1.0 - p_x*p_x - p_y*p_y>0.0){
            const p_z = Math.sqrt(1.0 - p_x*p_x - p_y*p_y)
            const invQuat = quat4.create()
            quat4Inverse(quat,invQuat)
            const invMat = quatToMat4(invQuat)
            const p = vec3.create();
            //The -y is because y-axis is reversed in the WebGL canvas.
            vec3.set(p, p_x, -p_y, p_z);
            vec3.transformMat4(p, p, invMat);
            console.log(p[0],p[1],p[2])
        }
    }

    return (
        <>
           <SimpleWebGL stackDirection={props.stackDirection} width={props.width} handleClick={handleClick} getMesh={getMesh} />
        </>
    )
}
