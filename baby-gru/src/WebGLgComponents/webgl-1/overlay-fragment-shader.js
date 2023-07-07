var overlay_fragment_shader_source = `
precision mediump float;

uniform sampler2D shader0;
uniform float blurSize;

varying vec2 out_TexCoord0;

void main()
{
    int w = 3;

    vec4 color = vec4(0.0);

    color += texture2D(shader0, out_TexCoord0);

    if(color.a>1e-4)
    {
        vec2 size = vec2(0.002); //1.0f / textureSize(silhouette, 0);

        for (int i = -3; i <= 3; i++)
        {
            for (int j = -3; j <= 3; j++)
            {
                if (i == 0 && j == 0)
                {
                    continue;
                }

                vec2 offset = vec2(i, j) * size;

                // and if one of the pixel-neighbor is blank (we are on the border)
                if (texture2D(shader0, out_TexCoord0 + offset).a < 1e-4)
                {
                    gl_FragColor = vec4(vec3(1.0), 1.0);
                    return;
                }
            }
        }
        gl_FragColor = vec4(1.0, 0.5, 0.0, 0.35);
    } else {
    discard;
    }

}
`;

export {overlay_fragment_shader_source};
