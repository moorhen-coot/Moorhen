export function isDarkBackground(r, g, b, a) {
    const brightness = r * 0.299 + g * 0.587 + b * 0.114
    if (brightness >= 0.5) {
        return false
    }
    return true
}

export function getDeviceScale() {
    let deviceScale = 1.0;
    if(window.devicePixelRatio) deviceScale = window.devicePixelRatio
    return deviceScale;
}
