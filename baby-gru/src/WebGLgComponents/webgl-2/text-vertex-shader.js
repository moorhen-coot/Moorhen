var text_instanced_vertex_shader_source = `#version 300 es\n
    in vec3 aVertexPosition; // Same for all instances
    in vec4 aVertexColour; // Unused
    in vec3 aVertexNormal; // Unused
    in vec2 aVertexTexture; // Instance coords in big texture
    in vec3 size; // Instance relative x,y(and z) scaling
    in vec3 offset; // Instance 3D position
    in vec4 textureOffsets; // Instance place in big texture

    uniform mat4 uMVMatrix;
    uniform mat4 uMVINVMatrix;
    uniform mat4 uPMatrix;

    uniform float pixelZoom;

    uniform bool atomLabelIgnoreDepth;

    out lowp vec2 vTexture;
    out lowp vec4 eyePos;

    void main(void) {

      vec4 theVert = vec4(offset,1.0)+uMVINVMatrix*vec4(pixelZoom*size*aVertexPosition,1.0);
      theVert.a = 1.0;

      gl_Position = uPMatrix * uMVMatrix * theVert;
      if(atomLabelIgnoreDepth) gl_Position.z = 0.0;

      eyePos = uMVMatrix * theVert;

      vTexture = vec2(textureOffsets[0]+aVertexTexture.s*(textureOffsets[1]),textureOffsets[2]+aVertexTexture.t*(textureOffsets[3]));
    }
`;

export {text_instanced_vertex_shader_source};
