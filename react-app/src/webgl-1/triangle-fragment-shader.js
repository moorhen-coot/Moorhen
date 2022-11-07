var triangle_fragment_shader_source = `
    precision mediump float;
    varying lowp vec4 vColor;
    varying lowp vec3 vNormal;
    varying lowp vec4 eyePos;
    varying lowp vec3 v;
    varying mediump mat4 mvInvMatrix;

    uniform vec4 fogColour;

    uniform float fog_end;
    uniform float fog_start;

    uniform vec4 clipPlane0;
    uniform vec4 clipPlane1;
    uniform vec4 clipPlane2;
    uniform vec4 clipPlane3;
    uniform vec4 clipPlane4;
    uniform vec4 clipPlane5;
    uniform vec4 clipPlane6;
    uniform vec4 clipPlane7;
    uniform int nClipPlanes;

    uniform vec2 cursorPos;

    uniform bool shinyBack;
    uniform bool defaultColour;
    uniform vec4 backColour;

    uniform vec4 light_positions;
    uniform vec4 light_colours_ambient;
    uniform vec4 light_colours_specular;
    uniform vec4 light_colours_diffuse;

    void main(void) {
      if(dot(eyePos, clipPlane0)<0.0){
       discard;
      }
      if(dot(eyePos, clipPlane1)<0.0){
       discard;
      }
      vec3 L;
      vec3 E;
      vec3 R;
      vec4 Iamb =vec4(0.0,0.0,0.0,0.0);
      vec4 Idiff=vec4(0.0,0.0,0.0,0.0);
      vec4 Ispec=vec4(0.0,0.0,0.0,0.0);
      vec3 norm = normalize(vNormal);

      if(gl_FrontFacing!=true){
          discard;
        //gl_FragColor = vec4(1.0,0.0,0.0,1.0);
        //gl_FragColor = gl_FragColor;
        norm = -norm;
      }

      if(gl_FrontFacing!=true){
      E = (mvInvMatrix * vec4(normalize(-v),1.0)).xyz;
      //for (i = 0; i<nLights&&i<8; i++) {
       L = normalize((mvInvMatrix *light_positions).xyz);
       R = normalize(-reflect(L,norm));
       if(shinyBack==true){
         Iamb += light_colours_ambient;
         Idiff += light_colours_diffuse * max(dot(norm,L), 0.0);
         float y = max(max(light_colours_specular.r,light_colours_specular.g),light_colours_specular.b);
         Ispec += light_colours_specular * pow(max(dot(R,E),0.0),16.);
         Ispec.a *= y;
       } else {
         Iamb += light_colours_diffuse;
       }
      //}
       } else {
      E = (mvInvMatrix * vec4(normalize(-v),1.0)).xyz;
      //for (i = 0; i<nLights&&i<8; i++) {
       L = normalize((mvInvMatrix *light_positions).xyz);
       R = normalize(-reflect(L,norm));
       //calculate Ambient Term:
       Iamb += light_colours_ambient;
       //calculate Diffuse Term:
       Idiff += light_colours_diffuse * max(dot(norm,L), 0.0);
       // calculate Specular Term:
       float y = max(max(light_colours_specular.r,light_colours_specular.g),light_colours_specular.b);
       Ispec += light_colours_specular * pow(max(dot(R,E),0.0),16.);
       Ispec.a *= y;
      //}
       }
      
      float FogFragCoord = abs(eyePos.z/eyePos.w);
      float fogFactor = (fog_end - FogFragCoord)/(fog_end - fog_start);
      fogFactor = 1.0 - clamp(fogFactor,0.0,1.0);

      vec4 theColor = vec4(vColor);
      if(gl_FrontFacing!=true){
        if(defaultColour==false){
          theColor = vec4(backColour);
        }
      }
      vec4 color = (1.5*theColor*Iamb + 1.2*theColor* Idiff);
      color.a = vColor.a;
      color += Ispec;
      //gl_FragColor = color;
      gl_FragColor = mix(color, fogColour, fogFactor );

      //if((gl_FragCoord.x-cursorPos[0])*(gl_FragCoord.x-cursorPos[0])+(gl_FragCoord.y-cursorPos[1])*(gl_FragCoord.y-cursorPos[1])<500.){
       // gl_FragColor = mix(gl_FragColor, vec4(1.0,1.0,1.0,1.0), 0.4 );
      //}
 
    }
`;

export {triangle_fragment_shader_source};
