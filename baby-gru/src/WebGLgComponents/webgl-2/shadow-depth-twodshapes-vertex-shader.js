var shadow_depth_twod_vertex_shader_source = `#version 300 es\n
    in vec3 aVertexPosition;
    in vec2 aVertexTexture;
    in vec4 aVertexColour;

    in vec3 size;
    in vec3 offset;

    uniform mat4 uMVMatrix;
    uniform mat4 uMVINVMatrix;
    uniform mat4 uPMatrix;

    out lowp vec4 vColor;
    out lowp vec2 vTexture;
    out lowp vec4 eyePos;

    void main(void) {

      float silly_scale = 1.4142135623730951;
      vec4 theVert = vec4(silly_scale*size[0]*aVertexPosition+offset,1.0);

      gl_Position = uPMatrix * uMVMatrix * theVert;
      vColor = aVertexColour;
      eyePos = uMVMatrix * theVert;

      vTexture = aVertexTexture;
    }
`;

export {shadow_depth_twod_vertex_shader_source};
