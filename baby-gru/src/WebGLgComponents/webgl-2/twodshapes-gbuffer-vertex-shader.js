var twod_gbuffer_vertex_shader_source = `#version 300 es\n
    in vec3 aVertexPosition;
    in vec2 aVertexTexture;

    in vec3 size;
    in vec3 offset;

    uniform mat4 uMVMatrix;
    uniform mat4 uMVINVMatrix;
    uniform mat4 uPMatrix;
    uniform mat4 uINVSymmMatrix;

    uniform vec3 outlineSize;

    out lowp vec4 eyePos;
    out lowp vec4 v;
    out lowp vec2 vTexture;
    out mediump mat4 projMatrix;
    out float size_v;

    void main(void) {

      float silly_scale = 1.4142135623730951;
      vec4 theVert = vec4((silly_scale*(size[0])) * (uINVSymmMatrix *vec4(aVertexPosition,1.0)).xyz+offset,1.0);

      gl_Position = uPMatrix * uMVMatrix * theVert;
      eyePos = uMVMatrix * theVert;
      v = gl_Position;

      projMatrix = uPMatrix;
      size_v = silly_scale*size[0];
      vTexture = aVertexTexture;
    }
`;

export {twod_gbuffer_vertex_shader_source};
