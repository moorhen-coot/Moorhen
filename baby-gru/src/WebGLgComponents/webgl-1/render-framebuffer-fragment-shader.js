var render_framebuffer_fragment_shader_source = `
    precision mediump float;
    varying lowp vec2 out_TexCoord0;

    uniform sampler2D inFocus;
    uniform sampler2D blurred;
    uniform sampler2D depth;

    void main(void) {
        float minDistance = 0.0;
        float maxDistance = 1.0;

        vec4 position = texture2D(depth, out_TexCoord0);
        vec4 focusColor = texture2D(inFocus, out_TexCoord0);
        vec4 blurColor = texture2D(blurred, out_TexCoord0);

        float blur = smoothstep ( minDistance , maxDistance , min(position.x*5.,1.0));

        if(blur>0.2)
            //gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            gl_FragColor = blurColor;
        else
            gl_FragColor = focusColor;
        
        //gl_FragColor = texture(inFocus, out_TexCoord0);
    }
`;

export {render_framebuffer_fragment_shader_source};
