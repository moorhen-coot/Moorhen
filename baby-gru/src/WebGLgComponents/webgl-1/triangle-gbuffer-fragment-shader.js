var triangle_gbuffer_fragment_shader_source = `
#extension GL_EXT_draw_buffers : enable
    precision mediump float;
    varying lowp vec3 vNormal;
    varying lowp vec4 eyePos;
    varying lowp vec4 v;

    varying mediump mat4 mvInvMatrix;

    uniform vec4 clipPlane0;
    uniform vec4 clipPlane1;
    uniform vec4 clipPlane2;
    uniform vec4 clipPlane3;
    uniform vec4 clipPlane4;
    uniform vec4 clipPlane5;
    uniform vec4 clipPlane6;
    uniform vec4 clipPlane7;
    uniform int nClipPlanes;

    void main(void) {
      if(dot(eyePos, clipPlane0)<0.0){
       discard;
      }
      if(dot(eyePos, clipPlane1)<0.0){
       discard;
      }

      gl_FragData[0] = v;
      gl_FragData[1] = vec4(vNormal,1.0);

    }
`;

export {triangle_gbuffer_fragment_shader_source};
