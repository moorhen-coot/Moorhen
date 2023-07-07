var render_framebuffer_fragment_shader_source = `#version 300 es\n
    precision mediump float;
    in lowp vec4 vColor;
    in lowp vec2 vTexture;

    uniform float fog_end;
    uniform float fog_start;

    uniform sampler2D uSampler;

    uniform vec4 clipPlane0;
    uniform vec4 clipPlane1;
    uniform vec4 clipPlane2;
    uniform vec4 clipPlane3;
    uniform vec4 clipPlane4;
    uniform vec4 clipPlane5;
    uniform vec4 clipPlane6;
    uniform vec4 clipPlane7;
    uniform int nClipPlanes;

    out vec4 fragColor;

    void main(void) {
      fragColor = texture(uSampler, vec2(vTexture.s, vTexture.t));

      //e.g. a 1D gaussian blur.
      //float blurSize = 1.0/1024.0;
      //vec4 color = vec4(0.0);
      //color += texture( uSampler, vec2(vTexture.s -3.0*blurSize,vTexture.t)) * 0.015625;
      //color += texture( uSampler, vec2(vTexture.s -2.0*blurSize,vTexture.t)) * 0.09375;
      //color += texture( uSampler, vec2(vTexture.s -1.0*blurSize,vTexture.t)) * 0.234375;
      //color += texture( uSampler, vec2(vTexture.s,vTexture.t) )*0.3125;
      //color += texture( uSampler, vec2(vTexture.s +1.0*blurSize,vTexture.t)) * 0.234375;
      //color += texture( uSampler, vec2(vTexture.s +2.0*blurSize,vTexture.t)) * 0.09375;
      //color += texture( uSampler, vec2(vTexture.s +3.0*blurSize,vTexture.t)) * 0.015625;
      //fragColor = color;
      
    }
`;

export {render_framebuffer_fragment_shader_source};
