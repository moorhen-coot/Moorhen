export class TexturedShape {
    width: number;
    height: number;
    x_size: number;
    y_size: number;
    z_position: number;
    image_texture: WebGLTexture;
    color_ramp_texture: WebGLTexture;
    idxBuffer = WebGLBuffer;
    vertexBuffer = WebGLBuffer;
    texCoordBuffer = WebGLBuffer;
    gl: WebGL2RenderingContext;
    constructor(textureInfo,gl,uuid) {
        this.width = textureInfo.width;
        this.height = textureInfo.height;
        this.x_size = textureInfo.x_size;
        this.y_size = textureInfo.y_size;
        this.z_position = textureInfo.z_position;
        this.image_texture = gl.createTexture();
        //TODO - Populate the image texture ...
        gl.bindTexture(gl.TEXTURE_2D, this.image_texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, this.width, this.height, 0, gl.RED, gl.FLOAT, textureInfo.image_data);
        //TODO - Populate the color ramp texture with a default black to white.
        this.color_ramp_texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.color_ramp_texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        const colour_ramp_cp = [
            [0.0, 0.0, 0.0, 1.0],
            [1.0, 1.0, 1.0, 1.0],
        ];
        const ramp_accu = 256;
        const colour_ramp_values = [];
        for(let i=0;i<ramp_accu;i++){
            const frac = i/ramp_accu;
            const frac2 = 1.0-frac;
            const r = frac * colour_ramp_cp[1][0] + frac2 *  colour_ramp_cp[0][0];
            const g = frac * colour_ramp_cp[1][1] + frac2 *  colour_ramp_cp[0][1];
            const b = frac * colour_ramp_cp[1][2] + frac2 *  colour_ramp_cp[0][2];
            const a = frac * colour_ramp_cp[1][3] + frac2 *  colour_ramp_cp[0][3];
            colour_ramp_values.push(r);
            colour_ramp_values.push(g);
            colour_ramp_values.push(b);
            colour_ramp_values.push(a);
        }

        this.gl = gl;
        this.setColourRamp(colour_ramp_values)

        this.idxBuffer = gl.createBuffer();
        this.vertexBuffer = gl.createBuffer();
        this.texCoordBuffer = gl.createBuffer();
        const vertices = new Float32Array([
            0,                      0,this.z_position,
            this.x_size,           0,this.z_position,
            this.x_size,this.y_size,this.z_position,
            0,                      0,this.z_position,
            this.x_size,this.y_size,this.z_position,
            0,           this.y_size,this.z_position,
        ])
        const texCoords = new Float32Array([
            0,0, 1,0, 1,1, 0,0, 1,1, 0,1,
        ])
        const idxs = new Uint32Array([0, 1, 2, 3, 4, 5]);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idxs, gl.STATIC_DRAW);
    }
    getOrigin() {
        return [-this.x_size/2,-this.y_size/2,-this.z_position];
    }
    setColourRamp(colour_ramp_values,interp=false) {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.color_ramp_texture);
        let colour_ramp_values_interp;
        if(interp){
            colour_ramp_values_interp = [];
            const nsteps = 256/(colour_ramp_values.length-1);
            for(let icol=0;icol<colour_ramp_values.length-1;icol++){
                for(let istep=0;istep<nsteps;istep++){
                    const frac = istep/nsteps
                        const frac2 = 1.0 - frac
                        const r = frac*colour_ramp_values[icol+1][0] + frac2*colour_ramp_values[icol][0]
                        const g = frac*colour_ramp_values[icol+1][1] + frac2*colour_ramp_values[icol][1]
                        const b = frac*colour_ramp_values[icol+1][2] + frac2*colour_ramp_values[icol][2]
                        const a = frac*colour_ramp_values[icol+1][3] + frac2*colour_ramp_values[icol][3]
                        const col = [r,g,b,a]
                        colour_ramp_values_interp.push(...col)
                }
            }
        } else {
            colour_ramp_values_interp = colour_ramp_values.flat();
        }
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA32F, colour_ramp_values_interp.length/4, 1, 0, this.gl.RGBA, this.gl.FLOAT, new Float32Array(colour_ramp_values_interp));
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }
}
