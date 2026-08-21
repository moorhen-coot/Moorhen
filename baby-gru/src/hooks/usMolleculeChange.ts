import { useEffect, useState } from "react"
import { useMoorhenInstance } from ".";

type MoleculeChangeState = {
   moleculeUID: string | null;
   changeId: number;
}

export type useMoleculeChangeProps = {
   uid?: string;
   onChange?: () => void;
}

export const useMoleculeChanged = (props?: useMoleculeChangeProps) => {
   const [moleculeChange, setMoleculeChange] = useState<MoleculeChangeState>({ moleculeUID: null, changeId: 0 });
   const moorhenInstance = useMoorhenInstance();

   useEffect(() => {
         const callback = (moleculeUID: string) => {
            if (!props.uid || props.uid === moleculeUID) {
              setMoleculeChange(prev => ({ moleculeUID, changeId: prev.changeId + 1 }));
                           if (props.onChange ) {
                  props.onChange();
              }
            }
              

         }
            const unsubscribe = moorhenInstance.newMoleculeChangedCallback(callback);
            return () => {
                unsubscribe();
            }
   }, [moorhenInstance, props])

   return moleculeChange;
}