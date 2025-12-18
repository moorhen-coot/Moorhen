var perfect_sphere_side_on_view_fragment_shader_source = `#version 300 es\n

    precision mediump float;

    in lowp vec4 vColor;
    in lowp vec3 vNormal;
    in lowp vec4 eyePos;
    in lowp vec2 vTexture;
    in mediump mat3 mvMatrix;

    in mediump mat4 projMatrix;
    in float size_v;

    out vec4 fragColor;

    void main(void) {

      float silly_scale = 0.7071067811865475;
      float x = 2.0*(vTexture.x-.5);
      float y = -2.0*(vTexture.y-.5);
      float zz =  1.0 - x*x - y*y;
      float z = sqrt(zz);

      if(zz <= 0.06)
          discard;

      vec4 pos = eyePos;
      pos.z += silly_scale*z*size_v;
      pos = projMatrix * pos;
      gl_FragDepth = (pos.z / pos.w + 1.0) / 2.0;

      vec3 L;
      vec3 E;
      vec3 R;
      vec4 Idiff=vec4(0.0,0.0,0.0,0.0);
      vec3 norm = vec3(x,y,z);

      E = normalize(norm);
      L = normalize((inverse(mvMatrix)*vec3(0.0,0.0,1.0)).xyz);
      Idiff += max(dot(E,L), 0.0);

      vec4 theColor = vec4(vColor);
      vec4 color = normalize(1.2*theColor*Idiff);

      color.a = vColor.a;
      fragColor = color;

    }
`;

export {perfect_sphere_side_on_view_fragment_shader_source};
