var twod_gbuffer_vertex_shader_source = `
    attribute vec3 aVertexPosition;
    attribute vec2 aVertexTexture;
    attribute vec3 size;
    attribute vec3 offset;

    uniform mat4 uMVMatrix;
    uniform mat4 uMVINVMatrix;
    uniform mat4 uPMatrix;
    uniform mat4 uINVSymmMatrix;

    uniform vec3 outlineSize;

    varying lowp vec4 eyePos;
    varying lowp vec4 v;
    varying lowp vec2 vTexture;
    varying mediump mat4 projMatrix;
    varying float size_v;

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
