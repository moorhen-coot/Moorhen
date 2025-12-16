var triangle_side_on_view_vertex_shader_source = `#version 300 es\n
    in vec3 aVertexPosition;
    in vec4 aVertexColour;
    in vec3 aVertexNormal;

    uniform mat4 uMVMatrix;
    uniform mat4 uPMatrix;

    out lowp vec4 vColor;
    out lowp vec3 vNormal;

    out lowp vec4 eyePos;

    void main(void) {

      vec4 theVert = vec4(aVertexPosition+aVertexNormal,1.0);

      gl_Position = uPMatrix * uMVMatrix * theVert;
      vColor = aVertexColour;
      vNormal = aVertexNormal;
      eyePos = uMVMatrix * theVert;

    }
`;

export {triangle_side_on_view_vertex_shader_source};
