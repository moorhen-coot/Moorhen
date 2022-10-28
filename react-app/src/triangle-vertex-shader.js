var triangle_vertex_shader_source = `#version 300 es\n
    // This shader is basic
    in vec3 aVertexOrigin;
    in vec3 aVertexPosition;
    in vec4 aVertexColour;
    in vec3 aVertexNormal;
    in vec2 aVertexTexture;

    uniform mat4 uMVMatrix;
    uniform mat4 uMVINVMatrix;
    uniform mat4 uPMatrix;

    out lowp vec4 vColor;
    out lowp vec3 vNormal;
    out lowp vec2 vTexture;
    out mediump mat4 mvInvMatrix;
    out lowp vec3 v;

    out lowp vec4 eyePos;

    void main(void) {

      vec4 theVert = vec4(aVertexPosition,1.0);

      gl_Position = uPMatrix * uMVMatrix * theVert;
      vColor = aVertexColour;
      vNormal = aVertexNormal;
      eyePos = uMVMatrix * theVert;
      mvInvMatrix = uMVINVMatrix;
      v = vec3(uMVMatrix * theVert);

      vTexture = aVertexTexture;
    }
`;

export {triangle_vertex_shader_source};
