import pako from 'pako';
import { base64decode } from './mgBase64.js';

export function getEncodedData(rssentries:any[]) {
    let allBuffers = [];
    for (let i = 0; i < rssentries.length; i++) {
        if (typeof (rssentries[i]) === "string") {
            const b64Data = rssentries[i];
            let strData;
            if (window.atob && window.btoa) {
                strData = atob(b64Data.replace(/\s/g, ''));
            } else {
                strData = base64decode(b64Data.replace(/\s/g, ''));
            }
            //let binData     = new Uint8Array();
            let j;

            let binData = new Uint8Array(strData.length);
            for (j = 0; j < strData.length; j++) {
                binData[j] = strData[j].charCodeAt(0);
            }

            let data = pako.inflate(binData);

            strData = "";

            if (window.TextDecoder) {
                // THIS'LL only work in Firefox 19+, Opera 25+ and Chrome 38+.
                let decoder = new TextDecoder('utf-8');
                strData = decoder.decode(data);
            } else {
                let unpackBufferLength = 60000;
                for (j = 0; j < data.length / unpackBufferLength; j++) {
                    let lower = j * unpackBufferLength;
                    let upper = (j + 1) * unpackBufferLength;
                    if (upper > data.length) {
                        upper = data.length;
                    }
                    // FECK, no slice on Safari!
                    strData += String.fromCharCode.apply(null, data.subarray(lower, upper));
                }
            }

            let thisBuffer;
            try {
                thisBuffer = JSON.parse(strData);
                allBuffers.push(thisBuffer);
            } catch (e) {
                console.log(strData);
            }
        } else {
            allBuffers.push(rssentries[i]);
        }
    }
    return allBuffers;
}
