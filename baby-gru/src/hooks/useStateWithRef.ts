import React, { useState, useRef } from 'react';

export const useStateWithRef = <T,>(defaultVal: T): [T, React.Dispatch<React.SetStateAction<T>>, React.RefObject<T>] => {
    const [state, _setState] = useState<T>(defaultVal)
    const ref = useRef<T>(defaultVal)
    const setState = (newState: React.SetStateAction<T>) => {
        ref.current = newState instanceof Function ? newState(ref.current) : newState
        _setState(newState)
    }  
    return [state, setState, ref]
}

export default useStateWithRef;