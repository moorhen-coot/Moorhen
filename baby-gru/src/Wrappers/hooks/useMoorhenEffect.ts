import type { MoorhenInstance} from '../../InstanceManager/MoorhenInstance'
import type { MoorhenWebComponent} from '../MoorhenWebComponent'

export const useMoorhenEffect =  (callback: (moorhenInstance: MoorhenInstance) =>{}, id: string) => {
    const moorhen = document.getElementById(id) as MoorhenWebComponent
    if (moorhen) {const instance = await moorhen.getMoorhenInstance()
    callback(instance)
    }
    }
