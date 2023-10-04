var perfect_sphere_gbuffer_fragment_shader_source = `#version 300 es\n
    precision mediump float;

    in lowp vec4 eyePos;
    in lowp vec4 v;
    in lowp vec2 vTexture;
    in mediump mat4 projMatrix;
    in float size_v;

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

      gl_FragDepth = (pos.z / pos.w + 1.0) / 2.0;
      fragData0 = vec4(v.x, v.y, (pos.z / pos.w + 1.0) / 2.0, 1.0);
      fragData1 = vec4(-x,-y,-z,1.0);

    }
`;

export {perfect_sphere_gbuffer_fragment_shader_source};
