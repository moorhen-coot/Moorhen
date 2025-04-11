export function clampValue(value: number, minVal: number, maxVal:number ){
    return Math.min(Math.max(value, minVal), maxVal);
};