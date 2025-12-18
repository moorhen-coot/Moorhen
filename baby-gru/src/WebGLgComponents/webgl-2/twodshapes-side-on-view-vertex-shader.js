var twod_side_on_view_vertex_shader_source = `#version 300 es\n
    in vec3 aVertexPosition;
    in vec3 aVertexNormal;
    in vec2 aVertexTexture;

    in vec4 aVertexColour;
    in vec3 size;
    in vec3 offset;

    uniform mat4 uMVMatrix;
    uniform mat4 uMVINVMatrix;
    uniform mat4 uPMatrix;
    uniform mat4 TextureMatrix;
    uniform mat4 uINVSymmMatrix;

    out lowp vec4 vColor;
    out lowp vec3 vNormal;
    out lowp vec2 vTexture;
    out mediump mat3 mvMatrix;
    out mediump mat4 projMatrix;
    out lowp vec3 v;
    out float size_v;

    out lowp vec4 eyePos;

    void main(void) {

      float silly_scale = 1.4142135623730951;
      vec4 theVert = vec4((silly_scale*(size[0])) * (uINVSymmMatrix *vec4(aVertexPosition,1.0)).xyz+offset,1.0);

      gl_Position = uPMatrix * uMVMatrix * theVert;
      vColor = aVertexColour;
      vNormal = aVertexNormal;
      eyePos = uMVMatrix * theVert;
      v = vec3(uMVMatrix * theVert);

      projMatrix = uPMatrix;
      size_v = silly_scale*size[0];
      vTexture = aVertexTexture;

      mvMatrix[0][0] = uMVMatrix[0][0];
      mvMatrix[0][1] = uMVMatrix[0][1];
      mvMatrix[0][2] = uMVMatrix[0][2];
      mvMatrix[1][0] = uMVMatrix[1][0];
      mvMatrix[1][1] = uMVMatrix[1][1];
      mvMatrix[1][2] = uMVMatrix[1][2];
      mvMatrix[2][0] = uMVMatrix[2][0];
      mvMatrix[2][1] = uMVMatrix[2][1];
      mvMatrix[2][2] = uMVMatrix[2][2];
    }
`;

export {twod_side_on_view_vertex_shader_source};
