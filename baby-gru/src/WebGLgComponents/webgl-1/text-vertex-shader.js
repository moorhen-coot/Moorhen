var text_instanced_vertex_shader_source = `
    attribute vec3 aVertexPosition; // Same for all instances
    attribute vec3 aVertexNormal; // Unused
    attribute vec2 aVertexTexture; // Instance coords in big texture
    attribute vec4 aVertexColour; // Unused
    attribute vec3 size; // Instance relative x,y(and z) scaling
    attribute vec3 offset; // Instance 3D position
    attribute vec4 textureOffsets; // Instance place in big texture

    uniform mat4 uMVMatrix;
    uniform mat4 uMVINVMatrix;
    uniform mat4 uPMatrix;

    uniform float pixelZoom;

    varying lowp vec2 vTexture;
    varying lowp vec4 eyePos;

    void main(void) {

      vec4 theVert = vec4(offset,1.0)+uMVINVMatrix*vec4(pixelZoom*size*aVertexPosition,1.0);
      theVert.a = 1.0;

      gl_Position = uPMatrix * uMVMatrix * theVert;

      eyePos = uMVMatrix * theVert;

      vTexture = vec2(textureOffsets[0]+aVertexTexture.s*(textureOffsets[1]),textureOffsets[2]+aVertexTexture.t*(textureOffsets[3]));
    }
`;

export {text_instanced_vertex_shader_source};
