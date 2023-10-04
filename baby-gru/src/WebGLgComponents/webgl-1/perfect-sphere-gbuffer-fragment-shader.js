var perfect_sphere_gbuffer_fragment_shader_source = `
#extension GL_EXT_draw_buffers : enable
    precision mediump float;

    varying lowp vec4 eyePos;
    varying lowp vec4 v;
    varying lowp vec2 vTexture;
    varying mediump mat4 projMatrix;
    varying float size_v;

    uniform vec4 clipPlane0;
    uniform vec4 clipPlane1;
    uniform vec4 clipPlane2;
    uniform vec4 clipPlane3;
    uniform vec4 clipPlane4;
    uniform vec4 clipPlane5;
    uniform vec4 clipPlane6;
    uniform vec4 clipPlane7;
    uniform int nClipPlanes;
    uniform vec4 fogColour;

    void main(void) {
      float silly_scale = 0.7071067811865475;
      float x = 2.0*(vTexture.x-.5);
      float y = 2.0*(vTexture.y-.5);
      float zz =  1.0 - x*x - y*y;
      float z = sqrt(zz);

      if(zz <= 0.06)
          discard;

      vec4 pos = eyePos;
      pos.z += silly_scale*z*size_v;
      pos = projMatrix * pos;

      if(dot(eyePos, clipPlane1)<0.0){
          discard;
      }

      if(dot(eyePos, clipPlane0)<0.0){
          discard;
      }

      gl_FragData[0] = vec4(v.x, v.y, (pos.z / pos.w + 1.0) / 2.0, 1.0);
      gl_FragData[1] = vec4(-x,-y,-z,1.0);

    }
`;

export {perfect_sphere_gbuffer_fragment_shader_source};
