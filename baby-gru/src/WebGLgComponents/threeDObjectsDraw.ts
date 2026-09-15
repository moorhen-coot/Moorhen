import { gemmiAtomPairsToCylindersInfo,  guid} from '../utils/utils'
import { RootState } from '@/store'
import { Store } from '@reduxjs/toolkit'

export const getThreeDObjectsBuffers = async (store: Store<RootState>): Promise<any>  => {

    const threeDObjects = store.getState().threeDObjects.objects
    const molecules = store.getState().molecules.moleculeList

    threeDObjects.forEach(obj => {
        console.log(obj)
    })
    const objects = []
    return [objects]

}
