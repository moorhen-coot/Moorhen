import { determineFontHeight } from './fontHeight.js';

function next_power_of_2(v) {
    v -= 1;
    v |= v >> 1;
    v |= v >> 2;
    v |= v >> 4;
    v |= v >> 8;
    v |= v >> 16;
    v += 1;
    return v;
}

export function handleTextureLoaded(gl, image, texture, text, tex_size, font) {

    // FIXME - For text, need to fathom how to create a quad of appropriate size to draw on, and how to create correct sized canvas for that.
    const acanvas = document.createElement("canvas");

    let nptw;
    let npth;
    if (image) {
        nptw = next_power_of_2(image.width);
        npth = next_power_of_2(image.height);
    } else {
        nptw = 512;
        npth = 256;
    }

    const ctx = acanvas.getContext("2d");

    let scalew = 1.0;
    let scaleh = 1.0;
    if (nptw > 1024) {
        scalew = 1024.0 / nptw;
        nptw = 1024;
    }
    if (npth > 1024) {
        scaleh = 1024.0 / npth;
        npth = 1024;
    }
    acanvas.width = nptw;
    acanvas.height = npth;

    if (image) {
        ctx.scale(scalew, scaleh);
        ctx.drawImage(image, 0, 0);
    } else {
        const fnsize = font.match(/^\d+|\d+\b|\d+(?=\w)/g)[0];
        ctx.font = font;
        const textWidth = ctx.measureText(text).width;
        const textHeight = 1.0 * determineFontHeight(font, fnsize);
        nptw = next_power_of_2(Math.floor(textWidth));
        npth = next_power_of_2(Math.floor(textHeight));
        console.log(nptw + " " + npth);
        console.log(ctx.measureText(text));

        acanvas.width = nptw;
        acanvas.height = npth;
        ctx.font = font;
        ctx.fillStyle = "black";
        ctx.fillText(text, acanvas.width / 2 - textWidth / 2, textHeight);
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, acanvas);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
    tex_size["width"] = acanvas.width;
    tex_size["height"] = acanvas.height;
}

export function initStringTextures(gl, text, tex_size, font) {
    const cubeTexture = gl.createTexture();
    handleTextureLoaded(gl, null, cubeTexture, text, tex_size, font);
    return cubeTexture;
}

export function initTextures(gl, fname) {
    const cubeTexture = gl.createTexture();
    const cubeImage = new Image();
    const tex_size = {};

    cubeImage.src = fname;

    cubeImage.onload = function () { handleTextureLoaded(gl, cubeImage, cubeTexture, null, tex_size, null); }

    return cubeTexture;
}
