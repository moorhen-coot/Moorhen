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

export function toFixedNoZero(value: number, decimalPlaces: number): string {
    let str = value.toFixed(decimalPlaces);
    while (decimalPlaces > 0 && str.endsWith('0')) {
        decimalPlaces--;
        str = value.toFixed(decimalPlaces);
    }
    // Remove trailing decimal point if present (e.g., "5.")
    if (str.endsWith('.')) str = str.slice(0, -1);
    return str;
}