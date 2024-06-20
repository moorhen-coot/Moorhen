var render_framebuffer_fragment_shader_source = `#version 300 es\n
    precision mediump float;
    in lowp vec2 out_TexCoord0;

    uniform sampler2D inFocus;
    uniform sampler2D blurred;
    uniform sampler2D depth;
    uniform float blurDepth;

    out vec4 fragColor;

    void main(void) {
        float minDistance = 0.0;
        float maxDistance = 1.0;

        vec4 position = texture(depth, out_TexCoord0);
        vec4 focusColor = texture(inFocus, out_TexCoord0);
        vec4 blurColor = texture(blurred, out_TexCoord0);

        float blur = smoothstep ( minDistance , maxDistance , min(position.x,1.0));

        if(blur>blurDepth){
            float frac = (blur-blurDepth)/(1.0 - blurDepth);
            frac = frac/(.01+frac);
            fragColor = frac*blurColor+(1.0-frac)*focusColor;
        } else {
            fragColor = focusColor;
        }
        //fragColor = vec4(position.x,position.x,position.x,1.0);
    }
`;

export {render_framebuffer_fragment_shader_source};
