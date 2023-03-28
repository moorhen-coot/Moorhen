var circles_vertex_shader_source = `#version 300 es\n
    in vec3 aVertexPosition;
    in vec3 aVertexColour;
    in vec3 aVertexNormal;
    in vec2 aVertexTexture;

    uniform mat4 uMVMatrix;
    uniform mat4 uMVINVMatrix;
    uniform mat4 uPMatrix;

    uniform vec3 up;
    uniform vec3 right;

    out lowp vec2 vTexture;
    out lowp vec4 eyePos;

    void main(void) {

      float x = aVertexPosition.x + aVertexNormal[0] * right.x - aVertexNormal[1] * up.x;
      float y = aVertexPosition.y + aVertexNormal[0] * right.y - aVertexNormal[1] * up.y;
      float z = aVertexPosition.x + aVertexNormal[0] * right.z - aVertexNormal[1] * up.z;
      vec4 theVert = vec4(x,y,z,1.0);

      gl_Position = uPMatrix * uMVMatrix * theVert;
      eyePos = uMVMatrix * theVert;

      vTexture = aVertexTexture;
    }
`;

export {circles_vertex_shader_source};
