var triangle_gbuffer_fragment_shader_source = `#version 300 es\n
    precision mediump float;
    in lowp vec3 vNormal;
    in lowp vec4 eyePos;
    in lowp vec4 v;

    in mediump mat4 mvInvMatrix;

    uniform vec4 clipPlane0;
    uniform vec4 clipPlane1;
    uniform vec4 clipPlane2;
    uniform vec4 clipPlane3;
    uniform vec4 clipPlane4;
    uniform vec4 clipPlane5;
    uniform vec4 clipPlane6;
    uniform vec4 clipPlane7;
    uniform int nClipPlanes;

    layout(location = 0) out vec4 fragData0;
    layout(location = 1) out vec4 fragData1;

    void main(void) {
        if(dot(eyePos, clipPlane0)<0.0){
            discard;
        }
        if(dot(eyePos, clipPlane1)<0.0){
            discard;
        }
        fragData0 = v;
        fragData1 = vec4(vNormal,1.0);
    }
`;

export {triangle_gbuffer_fragment_shader_source};
