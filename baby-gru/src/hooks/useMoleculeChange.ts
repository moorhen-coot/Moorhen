import { useEffect, useRef, useState } from "react"
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

   const propsRef = useRef(props);
   useEffect(() => { propsRef.current = props; }, [props]);

   const uid = props?.uid;

   useEffect(() => {
      const callback = (moleculeUID: string) => {
         const { onChange } = propsRef.current ?? {};
         setMoleculeChange(prev => ({ moleculeUID, changeId: prev.changeId + 1 }));
         onChange?.();
      };
      // Pass uid to the instance's built-in filter; undefined = "any"
      const unsubscribe = moorhenInstance.newMoleculeChangedCallback(callback, uid);
      console.log(`useMoleculeChanged: subscribed to molecule changes for uid=${uid}`);
      return unsubscribe;
   }, [moorhenInstance, uid]);

   return moleculeChange;
}