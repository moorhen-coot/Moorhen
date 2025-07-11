import React, { useState, useRef } from 'react';

export const useStateWithRef = <T,>(defaultVal: T): [T, React.Dispatch<React.SetStateAction<T>>, React.RefObject<T>] => {
    const [state, setState] = useState<T>(defaultVal)
    const ref = useRef<T>(defaultVal)
    ref.current = state
    return [state, setState, ref]
}

export default useStateWithRef;