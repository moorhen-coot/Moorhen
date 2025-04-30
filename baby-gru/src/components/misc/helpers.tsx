export function clampValue(value: number, minVal: number, maxVal:number ){
    return Math.min(Math.max(value, minVal), maxVal);
};

export const getFirstNonZeroDigitIndex = (num: number): number | null => {
    const numStr = num.toString(); 
    for (let i = 0; i < numStr.length; i++) {
        const char = numStr[i];
        if (char !== '0' && char !== '.') {
            return i; 
        }
    }
    return null; 
};