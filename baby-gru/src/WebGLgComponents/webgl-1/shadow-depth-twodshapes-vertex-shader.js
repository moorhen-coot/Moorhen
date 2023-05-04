var shadow_depth_twod_vertex_shader_source = `
    attribute vec3 aVertexPosition;
    attribute vec2 aVertexTexture;
    attribute vec4 aVertexColour;

    attribute vec3 size;
    attribute vec3 offset;

    uniform mat4 uMVMatrix;
    uniform mat4 uMVINVMatrix;
    uniform mat4 uPMatrix;

    varying lowp vec4 vColor;
    varying lowp vec2 vTexture;
    varying lowp vec4 eyePos;

    void main(void) {

      vec4 theVert = vec4(size[0]*aVertexPosition+offset,1.0);

      gl_Position = uPMatrix * uMVMatrix * theVert;
      vColor = aVertexColour;
      eyePos = uMVMatrix * theVert;

      vTexture = aVertexTexture;
    }
`;

export {shadow_depth_twod_vertex_shader_source};
