var render_framebuffer_fragment_shader_source = `#version 300 es\n
    precision mediump float;
    in lowp vec2 out_TexCoord0;

    uniform sampler2D uSampler;

    out vec4 fragColor;

    void main(void) {
      fragColor = texture(uSampler, out_TexCoord0);
    }
`;

export {render_framebuffer_fragment_shader_source};
