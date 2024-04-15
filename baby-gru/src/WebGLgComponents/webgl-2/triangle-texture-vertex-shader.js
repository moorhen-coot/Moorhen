var triangle_texture_vertex_shader_source = `#version 300 es\n
    in vec3 aVertexPosition;
    in vec2 aVertexTexture;

    uniform mat4 uMVMatrix;
    uniform mat4 uMVINVMatrix;
    uniform mat4 uPMatrix;

    out lowp vec2 vTexture;
    out lowp vec4 eyePos;

    void main(void) {

      vec4 theVert = vec4(aVertexPosition,1.0);

      gl_Position = uPMatrix * uMVMatrix * theVert;

      eyePos = uMVMatrix * theVert;

      vTexture = aVertexTexture;
    }
`;

export {triangle_texture_vertex_shader_source};
