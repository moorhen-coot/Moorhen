var blur_vertex_shader_source = `
uniform mat4 uPMatrix;
uniform mat4 uMVMatrix;

attribute vec4 aVertexPosition;
attribute vec2 aVertexTexture;

varying vec2 out_TexCoord0;

void main(){
    gl_Position = uPMatrix * uMVMatrix * aVertexPosition;
    out_TexCoord0 =  aVertexTexture;
}
`;

export {blur_vertex_shader_source};
