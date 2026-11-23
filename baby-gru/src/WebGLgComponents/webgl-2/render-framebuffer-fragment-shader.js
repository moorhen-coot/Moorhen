var render_framebuffer_fragment_shader_source = `#version 300 es\n
    precision mediump float;
    in lowp vec2 out_TexCoord0;

    uniform sampler2D inFocus;
    uniform sampler2D blurred;
    uniform sampler2D depth;
    uniform sampler2D depth2;
    uniform bool haveDepth2;
    uniform float blurDepth;

    out vec4 fragColor;

    void main(void) {
        // The depth as the buffer holds it, with no curve applied.
        //
        // This was smoothstep(0.0, 1.0, depth), while blurDepth - the threshold it is compared
        // against - is a plain linear fraction of the slab. Comparing a curved value against a
        // straight one puts the focal plane somewhere other than where it was asked for: the error is
        // zero at the middle of the slab and grows towards either end, reaching about 0.09 of the
        // slab, which on a 135 angstrom slab is some 12 angstroms. Worse, the sign is unhelpful - a
        // plane set in front of the scene is pushed backwards, so the frontmost geometry stayed sharp
        // when all of it should have blurred.
        //
        // smoothstep also flattens at both ends, so near the clip planes the value barely responds to
        // depth at all, which is where a user puts the plane when they want everything blurred.

        vec4 focusColor = texture(inFocus, out_TexCoord0);
        vec4 blurColor = texture(blurred, out_TexCoord0);

        // Same fallback as the blur passes: under peeling the depth sampler holds opaque only, so
        // a pixel showing nothing but a transparent surface would read as empty background.
        float blur = min(texture(depth, out_TexCoord0).x, 1.0);
        if(haveDepth2 && blur >= 0.9999) blur = min(texture(depth2, out_TexCoord0).x, 1.0);

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
