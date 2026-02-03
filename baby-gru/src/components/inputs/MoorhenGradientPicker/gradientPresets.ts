export const gradientPresets = {
    "Red White Blue": [
        [0.0, [254, 39, 18]],
        [0.5, [250, 250, 250]],
        [1.0, [23, 90, 206]],
    ],
    "Red White Green": [
        [0.0, [254, 39, 18]],
        [0.5, [255, 255, 255]],
        [1.0, [102, 176, 50]],
    ],
    "Red Blue Green": [
        [0.0, [254, 39, 18]],
        [0.5, [23, 90, 206]],
        [1.0, [124, 221, 54]],
    ],
    "Green White Blue": [
        [0.0, [0, 255, 0]],
        [0.5, [255, 255, 255]],
        [1.0, [0, 0, 255]],
    ],
    "Pool Party": [
        [0.0, [52, 77, 144]],
        [0.33, [92, 197, 239]],
        [0.67, [255, 183, 69]],
        [1.0, [231, 85, 44]],
    ],
    Heatmap: [
        [0.0, [73, 60, 158]],
        [0.25, [64, 112, 211]],
        [0.5, [250, 224, 0]],
        [0.75, [240, 156, 10]],
        [1.0, [234, 47, 134]],
    ],
    Rainbow: [
        [0.0, [73, 60, 158]],
        [0.2, [64, 112, 211]],
        [0.4, [147, 226, 35]],
        [0.6, [250, 224, 0]],
        [0.8, [240, 156, 10]],
        [1.0, [234, 47, 134]],
    ],
    "mpl Viridis": [
        [0.0, [68, 1, 84]],
        [0.2, [64, 67, 135]],
        [0.4, [41, 120, 142]],
        [0.6, [34, 167, 132]],
        [0.8, [121, 209, 81]],
        [1.0, [253, 231, 36]],
    ],
    "mpl Plasma": [
        [0.0, [12, 7, 134]],
        [0.2, [106, 0, 167]],
        [0.4, [176, 42, 143]],
        [0.6, [224, 100, 97]],
        [0.8, [252, 166, 53]],
        [1.0, [239, 248, 33]],
    ],
};

export type GradientPreset = keyof typeof gradientPresets;

export const getColorFromGradient = (
    gradient: GradientPreset | [number, [number, number, number]][],
    value: number,
    reverse?: boolean,
    cssString?: boolean
) => {
    let colourTable: [number, [number, number, number]][];
    if (typeof gradient === "string") {
        colourTable = gradientPresets[gradient] as [number, [number, number, number]][];
        if (!colourTable) {
            throw new Error(`Preset ${gradient} not found`);
        }
    } else {
        colourTable = gradient as [number, [number, number, number]][];
    }

    const clampedValue = Math.min(Math.max(value, 0), 1);
    const adjustedValue = reverse ? 1 - clampedValue : clampedValue;

    // Find the two color stops that clampedValue falls between
    let lowerStop = colourTable[0];
    let upperStop = colourTable[colourTable.length - 1];

    for (let i = 0; i < colourTable.length - 1; i++) {
        if (adjustedValue >= colourTable[i][0] && adjustedValue <= colourTable[i + 1][0]) {
            lowerStop = colourTable[i];
            upperStop = colourTable[i + 1];
            break;
        }
    }

    // Calculate the interpolation factor between the two stops
    const range = upperStop[0] - lowerStop[0];
    const factor = range === 0 ? 0 : (adjustedValue - lowerStop[0]) / range;
    // Linearly interpolate each RGB channel
    const r = Math.round(lowerStop[1][0] + (upperStop[1][0] - lowerStop[1][0]) * factor);
    const g = Math.round(lowerStop[1][1] + (upperStop[1][1] - lowerStop[1][1]) * factor);
    const b = Math.round(lowerStop[1][2] + (upperStop[1][2] - lowerStop[1][2]) * factor);

    if (cssString) {
        return `rgb(${r}, ${g}, ${b})`;
    } else {
        return [r, g, b];
    }
};
