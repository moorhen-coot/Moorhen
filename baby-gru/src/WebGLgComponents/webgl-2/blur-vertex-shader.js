var blur_vertex_shader_source = `#version 300 es\n
uniform mat4 uPMatrix;
uniform mat4 uMVMatrix;

in vec4 aVertexPosition;
in vec2 aVertexTexture;

out vec2 out_TexCoord0;

void main(){
    gl_Position = uPMatrix * uMVMatrix * aVertexPosition;
    out_TexCoord0 =  aVertexTexture;
}
`;

export {blur_vertex_shader_source};
