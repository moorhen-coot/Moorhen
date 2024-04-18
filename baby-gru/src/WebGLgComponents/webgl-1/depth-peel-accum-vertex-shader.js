var depth_peel_accum_vertex_shader_source = `
    attribute vec3 aVertexPosition;
    attribute vec2 aVertexTexture;

    uniform mat4 uPMatrix;

    varying lowp vec2 vTexture;

    void main(void) {

      vec4 theVert = vec4(aVertexPosition,1.0);
      gl_Position = uPMatrix * theVert;
      vTexture = aVertexTexture;
    }
`;

export {depth_peel_accum_vertex_shader_source};
