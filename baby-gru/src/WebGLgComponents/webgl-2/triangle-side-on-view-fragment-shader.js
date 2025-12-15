const triangle_side_on_view_fragment_shader_source = `#version 300 es\n

    precision mediump float;

    in lowp vec4 vColor;
    in lowp vec3 vNormal;
    in lowp vec4 eyePos;

    uniform vec3 screenZFrag;

    out vec4 fragColor;

    void main(void) {

      vec3 L;
      vec3 E;
      vec3 R;
      vec4 Idiff=vec4(0.0,0.0,0.0,0.0);
      vec3 norm = normalize(vNormal);

      E = screenZFrag;
      L = vec3(0.0,0.0,-60.0);
      R = normalize(-reflect(L,norm));

      Idiff += max(dot(norm,L), 0.0);

      vec4 theColor = vec4(vColor);

      vec4 color = (1.2*theColor*Idiff);

      color.a = vColor.a;

      fragColor = color;
      fragColor.a = vColor.a;

    }
`;

export {triangle_side_on_view_fragment_shader_source};
