import { useEffect, useState } from "react"
import { useMoorhenInstance } from ".";

type MoleculeChangeState = {
   moleculeUID: string | null;
   changeId: number;
}

export const useMoleculeChanged = () => {
   const [moleculeChange, setMoleculeChange] = useState<MoleculeChangeState>({ moleculeUID: null, changeId: 0 });
   const moorhenInstance = useMoorhenInstance();
   useEffect(() => {
         const callback = (moleculeUID: string) => {
              setMoleculeChange(prev => ({ moleculeUID, changeId: prev.changeId + 1 }));
         }
            const unsubscribe = moorhenInstance.newMoleculeChangedCallback(callback);
            return () => {
                unsubscribe();
            }
   }, [moorhenInstance])

   return moleculeChange;
}