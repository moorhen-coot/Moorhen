var depth_peel_accum_vertex_shader_source = `#version 300 es\n
    in vec3 aVertexPosition;
    in vec2 aVertexTexture;

    uniform mat4 uPMatrix;

    out lowp vec2 vTexture;

    void main(void) {

      vec4 theVert = vec4(aVertexPosition,1.0);
      gl_Position = uPMatrix * theVert;
      vTexture = aVertexTexture;
    }
`;

export {depth_peel_accum_vertex_shader_source};
