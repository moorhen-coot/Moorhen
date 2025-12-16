const triangle_side_on_view_instanced_vertex_shader_source = `#version 300 es\n
    in vec3 aVertexPosition;
    in vec4 aVertexColour;
    in vec3 aVertexNormal;
    in vec3 instancePosition;
    in vec3 instanceSize;
    in mat4 instanceOrientation;

    uniform mat4 uMVMatrix;
    uniform mat4 uPMatrix;

    out lowp vec4 vColor;
    out lowp vec3 vNormal;

    out lowp vec4 eyePos;

    void main(void) {

      //vec4 theVert = vec4(instancePosition,1.0)+instanceOrientation*vec4((instanceSize)*aVertexPosition,1.0);
      vec4 theVert = vec4(instancePosition,1.0)+vec4((instanceSize)*aVertexPosition,1.0);
      theVert.a = 1.0;

      gl_Position = uPMatrix * uMVMatrix * theVert;
      vColor = aVertexColour;
      //vNormal = (instanceOrientation*vec4(aVertexNormal,1.0)).xyz;
      vNormal = (vec4(aVertexNormal,1.0)).xyz;
      eyePos = uMVMatrix * theVert;

    }
`;

export {triangle_side_on_view_instanced_vertex_shader_source};
