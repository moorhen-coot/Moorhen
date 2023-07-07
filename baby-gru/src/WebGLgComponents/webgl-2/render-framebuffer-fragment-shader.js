var render_framebuffer_fragment_shader_source = `#version 300 es\n
    precision mediump float;
    in lowp vec2 out_TexCoord0;

    uniform sampler2D inFocus;
    uniform sampler2D blurred;
    uniform sampler2D depth;

    out vec4 fragColor;

    void main(void) {
        float minDistance = 0.0;
        float maxDistance = 1.0;

        vec4 position = texture(depth, out_TexCoord0);
        vec4 focusColor = texture(inFocus, out_TexCoord0);
        vec4 blurColor = texture(blurred, out_TexCoord0);

        float blur = smoothstep ( minDistance , maxDistance , min(position.x*5.,1.0));

        if(blur>0.2)
            //fragColor = vec4(0.0, 0.0, 0.0, 1.0);
            fragColor = blurColor;
        else
            fragColor = focusColor;
        
        //fragColor = texture(inFocus, out_TexCoord0);
    }
`;

export {render_framebuffer_fragment_shader_source};
