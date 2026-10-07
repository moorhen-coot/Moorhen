var thick_lines_normal_vertex_shader_source = `#version 300 es\n
    in vec4 aVertexPosition;
    in vec4 aVertexColour;
    in vec3 aVertexNormal;
    in vec3 aVertexRealNormal;

    uniform mat4 uMVMatrix;
    uniform mat4 uMVINVMatrix;
    uniform vec3 screenZ;
    uniform mat4 uPMatrix;
    uniform float pixelZoom;
    uniform mat4 TextureMatrix;

    out lowp vec4 vColor;
    out lowp vec3 vNormal;
    out mediump mat4 mvInvMatrix;
    out lowp vec3 v;
    out lowp vec4 eyePos;
    out lowp vec4 ShadowCoord;

    out float vHighlight;

    // Only to satisfy the fragment shader, which is shared with the mesh programs and declares a
    // matching input for base colour texturing. A fragment input with no vertex output of the
    // same name and type is a link-time error in GLSL ES 3.0, and leaving this out broke this
    // program - not the mesh ones - the moment the fragment shader gained the input.
    //
    // Lit thick lines are not textured and are not meant to be: the texture work is for the mesh
    // and instanced-mesh paths. Zero here, and the fragment shader never samples because
    // hasBaseColourTexture is false for anything that is not a textured mesh sub-buffer.
    out lowp vec2 vTexture;

    void main(void) {

        vec4 theVert = aVertexPosition;

        ShadowCoord = TextureMatrix * theVert;

        float lineSize = pixelZoom*dot(aVertexNormal,aVertexNormal);
        vec3 lineY = lineSize * normalize(cross(aVertexNormal,screenZ));

        gl_Position =  uPMatrix * vec4(lineY+aVertexPosition.xyz,1.0);
        vTexture = vec2(0.0, 0.0);
        vColor = aVertexColour;
        vNormal = -aVertexRealNormal;
        if(dot(vNormal,screenZ)<0.0)
            vNormal = -vNormal;
        eyePos = uMVMatrix * aVertexPosition;
        mvInvMatrix = uMVINVMatrix;
        v = vec3(uMVMatrix * theVert);

        vHighlight = 1.0;
    }
`;

export {thick_lines_normal_vertex_shader_source};
