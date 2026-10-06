#!/usr/bin/env python3
"""
// This script is fully AI generated, and is just for checking that the WebGL2 shader programs
are wired up consistently. It might contain errors and is likely unreliable, but still useful.
It is not part of the app itself, and is not used at runtime.

check_shader_wiring.py - would every shader program link, and can the draw code reach its uniforms?

Two silent failure modes, both found the hard way.

A varying that does not match. In GLSL ES 3.0 a fragment shader input must have a vertex shader output of the same name and
type, or the program fails to link. Moorhen pairs 30-odd vertex and fragment shaders, and several
fragment shaders are shared between programs - the triangle one is used by the mesh program, the
instanced mesh program and the lit thick lines. So adding an input to a shared fragment shader
breaks every program whose vertex shader does not already declare it, and the only symptom is an
alert box naming a program you were not working on.

That is exactly what adding a texture coordinate to the triangle fragment shader did: the mesh
programs were fine and initThickLineNormalShaders failed, because thick lines share the fragment
shader and had no vTexture.

This reads the pairings out of mgWebGL.tsx rather than being told them, so a program added later
is checked without anyone remembering to come back here. The chain is:

    this.shaderProgramX = initSomeShaders(vertexVar, fragmentVar, this.gl)
    vertexVar   = getShader(this.gl, some_shader_source, "vertex")
    some_shader_source = some_shader_source_webgl2       (the WEBGL2 branch)
    import {some_shader_source as some_shader_source_webgl2} from './webgl-2/some-file.js'

Anything it cannot follow is reported rather than passed over, so the check cannot quietly stop
covering a program.

Exit status is 0 when everything checks out and 1 when something would break, so it can go in a
pre-commit hook or CI step.

Usage, from baby-gru:

    python3 scripts/check_shader_wiring.py

    python3 scripts/check_shader_wiring.py --gl-dir some/other/WebGLgComponents

The second form is also how the check is tested: copy the tree, remove a varying or an init
function's uniform lookup, and confirm this reports it. A check that has never been seen to fail
is not evidence of anything.
"""
import argparse
import re
import sys
from pathlib import Path

parser = argparse.ArgumentParser(
    description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
parser.add_argument("--gl-dir", default="src/WebGLgComponents",
                    help="the directory holding mgWebGL.tsx and the webgl-2 shaders "
                         "(default: %(default)s)")
args = parser.parse_args()

ROOT = Path(args.gl_dir)
MAIN = ROOT / "mgWebGL.tsx"

if not MAIN.exists():
    sys.exit(f"{MAIN} not found - run this from baby-gru, or pass --gl-dir")

text = MAIN.read_text()

# ---- import name -> file ---------------------------------------------------------------------
# import {foo_shader_source as foo_shader_source_webgl2} from './webgl-2/foo.js';
# import {foo_shader_source} from './webgl-1/foo.js';
#
# One import may bring in several names - the triangle fragment shader exports a variant without
# the clip and peel discards alongside the full one. An earlier version of this regex expected a
# single name between the braces, so adding the second silently unresolved BOTH, taking the six
# programs that share that fragment shader out of the check without failing.
imports = {}
for match in re.finditer(r"import\s*\{([^}]*)\}\s*from\s*['\"]([^'\"]+)['\"]", text):
    names, path = match.group(1), match.group(2)
    for clause in names.split(","):
        parts = clause.strip().split()
        if not parts:
            continue
        # "foo" or "foo as bar"; the imported name is what the rest of the file refers to.
        imports[parts[-1]] = path

# ---- local variable -> imported name --------------------------------------------------------
# The WEBGL2 branch reassigns the webgl1 defaults, so later assignments win - which matches the
# runtime, since this survey only cares about the WebGL2 programs.
#
# The first term of a concatenation is the one that matters: the triangle and perfect-sphere
# fragment sources have the fxaa function library appended, and fxaa declares no varyings. Missing
# this was what left the four most interesting programs unresolved on the first run - including
# the one whose link had actually broken.
assigned = {}
for name, value in re.findall(r"^\s*(?:let\s+)?(\w+)\s*=\s*([\w\s\+]+?)\s*;", text, re.M):
    first = value.split("+")[0].strip()
    if first in imports or first in assigned:
        assigned[name] = first

def resolve_source(var):
    """The shader file a local variable ends up holding, or None."""
    seen = set()
    while var in assigned and var not in seen:
        seen.add(var)
        var = assigned[var]
    return imports.get(var)

# ---- getShader(...) variables ---------------------------------------------------------------
# let x = getShader(this.gl, some_source, "vertex");
compiled = {}
for var, source, stage in re.findall(
        r"(\w+)\s*=\s*getShader\(\s*this\.gl\s*,\s*([\w\+ ]+?)\s*,\s*[\"'](vertex|fragment)[\"']\s*\)",
        text):
    # Some sources are concatenations (the triangle fragment shader has fxaa appended); the first
    # term is the one that declares the varyings.
    first = source.split("+")[0].strip()
    compiled[var] = (resolve_source(first), stage)

# ---- programs --------------------------------------------------------------------------------
#
# Which argument is which is taken from how each was compiled, not from its position.
# initDepthShadowPerfectSphereShaders is called with the fragment shader first, unlike every other
# init function - harmless, since attachShader reads each shader's own type, but it makes argument
# order the wrong thing to trust.
programs = []
for name, init, first, second in re.findall(
        r"this\.(\w+)\s*=\s*(init\w+)\(\s*(\w+)\s*,\s*(\w+)\s*,\s*this\.gl\s*\)", text):
    stages = {compiled.get(arg, (None, None))[1]: arg for arg in (first, second)}
    programs.append((name, init, stages.get("vertex"), stages.get("fragment")))

if not programs:
    sys.exit("FAIL  no shader programs found; the regex no longer matches mgWebGL.tsx")

# ---- declarations ----------------------------------------------------------------------------
DECL = re.compile(r"^\s*(in|out)\s+((?:lowp|mediump|highp)\s+)?(\w+)\s+(\w+)\s*;", re.M)

LOCAL = r"\b(?:float|int|uint|bool|vec2|vec3|vec4|ivec2|ivec3|ivec4|mat2|mat3|mat4)\s+{}\s*="

def declarations(path):
    """{name: type} for `in` and `out` separately, from a shader source file."""
    if path is None:
        return None
    file = (ROOT / path.lstrip("./")).resolve()
    if not file.exists():
        return None
    body = file.read_text()
    ins, outs = {}, {}
    for direction, _precision, kind, name in DECL.findall(body):
        (ins if direction == "in" else outs)[name] = kind

    # A varying shadowed by a local of the same name inside the shader is never read, and the
    # link rule applies only to statically used inputs - so it does not need a vertex output.
    # twodshapes-fragment-shader.js does exactly this with FogFragCoord, where the `in` is simply
    # a leftover. Reporting it would be a false alarm about code that works.
    for name in list(ins):
        if re.search(LOCAL.format(re.escape(name)), body):
            del ins[name]

    return ins, outs

failures = 0
unresolved = 0
checked = 0

for name, init, vertexVar, fragmentVar in programs:
    vertexPath = compiled.get(vertexVar, (None, None))[0]
    fragmentPath = compiled.get(fragmentVar, (None, None))[0]

    if vertexPath is None or fragmentPath is None:
        print(f"????  {name:40s} could not resolve "
              f"{'vertex' if vertexPath is None else 'fragment'} source")
        unresolved += 1
        continue
    # A program cannot mix generations - GL ES 1.0 and 3.0 shaders will not link together - so
    # resolving to one of each means the parsing above went wrong, not that the program is a
    # WebGL1 one. Worth failing on, because the symptom is otherwise invisible: the program is
    # quietly skipped by the webgl-1 test below and the run still passes, just covering less.
    # That is exactly how six programs slipped out of this check when a second name was added to
    # the triangle fragment shader's import and the webgl-1 source was picked up instead.
    if ("webgl-2" in vertexPath) != ("webgl-2" in fragmentPath):
        print(f"FAIL  {name:40s} mixes GL generations: "
              f"vertex {vertexPath}, fragment {fragmentPath}")
        failures += 1
        continue

    # Only the GL ES 3.0 shaders have the strict rule; the webgl-1 ones use attribute/varying and
    # are linked leniently.
    if "webgl-2" not in vertexPath or "webgl-2" not in fragmentPath:
        continue

    vertex = declarations(vertexPath)
    fragment = declarations(fragmentPath)
    if vertex is None or fragment is None:
        print(f"????  {name:40s} source file missing")
        unresolved += 1
        continue

    _, vertexOuts = vertex
    fragmentIns, _ = fragment

    missing = []
    mistyped = []
    for varying, kind in fragmentIns.items():
        if varying not in vertexOuts:
            missing.append(varying)
        elif vertexOuts[varying] != kind:
            mistyped.append(f"{varying} ({vertexOuts[varying]} vs {kind})")

    checked += 1
    if missing or mistyped:
        failures += 1
        print(f"FAIL  {name:40s} {init}")
        print(f"        vertex   {vertexPath}")
        print(f"        fragment {fragmentPath}")
        if missing:
            print(f"        fragment reads with no vertex output: {', '.join(sorted(missing))}")
        if mistyped:
            print(f"        type mismatch: {', '.join(sorted(mistyped))}")
    else:
        print(f"pass  {name:40s} {len(fragmentIns)} varyings matched")

# ---- uniforms the draw code depends on -------------------------------------------------------
#
# The second half of the same problem. A uniform the shader declares but the init function never
# locates is unreachable: the draw code guards on `shader.x != null`, `undefined != null` is false,
# and the whole block is skipped. Nothing fails and nothing is logged - the feature is simply
# absent, which is how the instanced mesh program came to draw every textured plane plain white
# while the non-instanced one worked.
#
# A watchlist rather than every uniform, because plenty are declared and deliberately not located.
# The rule for the ones listed is absolute: if a program's shaders declare it, its init function
# must locate it, either directly or through a shared helper.
WATCHED = {
    "hasBaseColourTexture": "locateBaseColourTextureUniforms",
    "baseColourTexture": "locateBaseColourTextureUniforms",
    # The depth-peel layers used to be square, so a shader could use xSSAOScaling for both axes
    # and look perfectly correct. Once the layers were sized to the canvas the two differ, and
    # sampling the peel depth with the wrong y scaling makes background geometry drift up and
    # down as the view changes. An unlocated uniform is a silent no-op that leaves the scaling
    # at zero, which is worse than the bug it replaced.
    "ySSAOScaling": None,
    "xSSAOScaling": None,
    # The opaque depth a transparent peel layer tests against. Unlocated, the uniform1i calls
    # are silent no-ops and transparent geometry behind the opaque scene stops being rejected.
    "opaqueDepthSampler": None,
    "haveOpaqueDepth": None,
}

# Some watched uniforms only matter to programs that use a particular feature. Several programs
# share the text fragment shader and so declare the peel uniforms without ever peeling - they
# never locate peelNumber, so the peel branch is dead in them and the scalings are irrelevant.
# Requiring them there would be noise, and noise is how a check stops being read.
REQUIRED_WHEN = {
    "xSSAOScaling": "peelNumber",
    "ySSAOScaling": "peelNumber",
    "opaqueDepthSampler": "peelNumber",
    "haveOpaqueDepth": "peelNumber",
}

SHADERS_FILE = ROOT / "mgWebGLShaders.ts"
wiring_failures = 0

if SHADERS_FILE.exists() and not failures:
    shaders_text = SHADERS_FILE.read_text()

    # Each init function's body, from its signature to the next top-level function.
    bodies = {}
    starts = [(m.start(), m.group(1)) for m in
              re.finditer(r"^export function (init\w+)\s*\(", shaders_text, re.M)]
    for i, (at, name) in enumerate(starts):
        end = starts[i + 1][0] if i + 1 < len(starts) else len(shaders_text)
        bodies[name] = shaders_text[at:end]

    print()
    for name, init, vertexVar, fragmentVar in programs:
        body = bodies.get(init)
        if body is None:
            continue
        vertexPath = compiled.get(vertexVar, (None, None))[0]
        fragmentPath = compiled.get(fragmentVar, (None, None))[0]
        sources = ""
        for path in (vertexPath, fragmentPath):
            if path is None:
                continue
            file = (ROOT / path.lstrip("./")).resolve()
            if file.exists():
                sources += file.read_text()

        for uniform, helper in WATCHED.items():
            if not re.search(rf"uniform\s+\w+\s+{re.escape(uniform)}\s*;", sources):
                continue
            gate = REQUIRED_WHEN.get(uniform)
            if gate is not None and f'"{gate}"' not in body:
                continue
            # helper is None for uniforms located directly rather than through a shared helper.
            located = (f'"{uniform}"' in body) or (helper is not None and helper in body)
            if not located:
                wiring_failures += 1
                print(f"FAIL  {name:40s} {init} never locates {uniform}, "
                      f"which its shaders declare - the draw code cannot reach it")

    if wiring_failures == 0:
        print(f"All programs locate the {len(WATCHED)} watched uniforms their shaders declare.")

print()
if wiring_failures:
    print(f"{wiring_failures} unreachable uniform(s).")
    sys.exit(1)
if unresolved:
    # A failure, not a note. An unresolved program is one this check is silently not covering,
    # and silence is the only way this script can be wrong in a way that matters: it would pass
    # while the thing it exists to catch went unchecked. That is exactly what happened when a
    # second name was added to the triangle fragment shader's import.
    print(f"FAIL  {unresolved} program(s) could not be resolved - the check does not cover them,")
    print("      so it cannot tell you whether they link. Fix the parsing above, or the wiring.")
    sys.exit(1)
if failures:
    print(f"{failures} program(s) would fail to link.")
    sys.exit(1)
print(f"All {checked} WebGL2 programs have matching varyings.")
