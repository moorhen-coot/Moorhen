#!/usr/bin/env python3
"""Checks for extract_camera.py.

Two things can silently go wrong here and neither would look wrong in the output:

  * the field numbers drifting from MoorhenSession.proto, so the wrong values are read;
  * the rotation coming out transposed, since Moorhen's quatToMat4 is the transpose of the
    usual gl-matrix formula and either one produces a perfectly plausible matrix.

So the field numbers are read back out of the .proto, and the matrix is compared against
Moorhen's own quatToMat4.js run in node. Everything else is round-tripped through synthetic
session bytes built here, which also documents the wire format the reader expects.

    ./test_extract_camera.py
"""

from __future__ import annotations

import json
import re
import struct
import subprocess
import sys
from pathlib import Path

import extract_camera as ec

HERE = Path(__file__).resolve().parent
BABY_GRU = HERE.parent
PROTO = BABY_GRU / "src" / "protobuf" / "MoorhenSession.proto"
QUAT_TO_MAT4 = BABY_GRU / "src" / "WebGLgComponents" / "quatToMat4.js"

failures = 0


def check(name: str, ok: bool, detail: str = "") -> None:
    global failures
    if not ok:
        failures += 1
    print(f"{'pass' if ok else 'FAIL'}  {name}{('  -  ' + detail) if detail and not ok else ''}")


# --- building a session by hand, so the reader is tested against real wire format -----------

def varint(value: int) -> bytes:
    out = bytearray()
    while True:
        byte = value & 0x7F
        value >>= 7
        out.append(byte | (0x80 if value else 0))
        if not value:
            return bytes(out)


def tag(number: int, wire: int) -> bytes:
    return varint((number << 3) | wire)


def packed_floats(number: int, values: list[float]) -> bytes:
    body = struct.pack(f"<{len(values)}f", *values)
    return tag(number, 2) + varint(len(body)) + body


def unpacked_floats(number: int, values: list[float]) -> bytes:
    return b"".join(tag(number, 5) + struct.pack("<f", v) for v in values)


def single_float(number: int, value: float) -> bytes:
    return tag(number, 5) + struct.pack("<f", value)


def session_with(view: bytes, noise: bool = True) -> bytes:
    """A Session carrying this viewData, with other fields around it to be skipped."""
    out = b""
    if noise:
        # A string field and a couple of submessages, as a real file has before and after.
        out += tag(1, 2) + varint(5) + b"1.0.0"
        out += tag(3, 2) + varint(40) + bytes(40)
        out += tag(6, 0) + varint(2)
    out += tag(ec.VIEW_DATA_FIELD, 2) + varint(len(view)) + view
    if noise:
        out += tag(10, 2) + varint(24) + bytes(24)
    return out


ORIGIN = [-12.5, 7.25, -33.125]
QUAT = [0.18257418583505536, 0.3651483716701107, 0.5477225575051661, 0.7302967433402214]
VIEW = (
    packed_floats(ec.ORIGIN, ORIGIN)
    + single_float(ec.FOG_START, 90.5)
    + single_float(ec.FOG_END, 310.0)
    + single_float(ec.ZOOM, 1.375)
    + single_float(ec.CLIP_START, 12.0)
    + single_float(ec.CLIP_END, 200.0)
    + packed_floats(ec.QUAT4, QUAT)
)


# --- the field numbers must match the .proto --------------------------------------------------
proto = PROTO.read_text()
block = re.search(r"message ViewDataSession \{(.*?)\n\}", proto, re.S)
check("ViewDataSession was found in the .proto", block is not None)
declared = dict(
    (m.group(2), int(m.group(3)))
    for m in re.finditer(r"^\s+(?:repeated\s+)?(\w+)\s+(\w+)\s*=\s*(\d+);", block.group(1), re.M)
) if block else {}

expected = {
    "origin": ec.ORIGIN, "fogStart": ec.FOG_START, "fogEnd": ec.FOG_END,
    "zoom": ec.ZOOM, "clipStart": ec.CLIP_START, "clipEnd": ec.CLIP_END, "quat4": ec.QUAT4,
}
for name, number in expected.items():
    check(f"{name} is field {number}, as the script assumes",
          declared.get(name) == number, f"proto says {declared.get(name)}")

session_block = re.search(r"message Session \{(.*?)\n\}", proto, re.S)
view_field = re.search(r"ViewDataSession viewData = (\d+);", session_block.group(1)) if session_block else None
check("Session.viewData is field %d" % ec.VIEW_DATA_FIELD,
      view_field is not None and int(view_field.group(1)) == ec.VIEW_DATA_FIELD,
      f"proto says {view_field.group(1) if view_field else None}")


# --- the rotation must agree with Moorhen's own conversion -------------------------------------
# The imports in quatToMat4.js are for a mat4.create() that only runs when no destination is
# supplied, and node cannot resolve gl-matrix's subpath directories on its own. Stripping them
# and passing a destination runs the real function without needing the package at all.
quat_source = "\n".join(
    line for line in QUAT_TO_MAT4.read_text().splitlines()
    if not line.lstrip().startswith(("import ", "export "))
)
node_script = quat_source + f"""
const m = quatToMat4({json.dumps(QUAT)}, new Array(16).fill(0));
console.log(JSON.stringify(Array.from(m)));
"""
try:
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", node_script],
        capture_output=True, text=True, cwd=BABY_GRU, timeout=60,
    )
    from_js = json.loads(proc.stdout.strip()) if proc.returncode == 0 else None
except Exception as err:                                   # noqa: BLE001
    from_js, proc = None, None
    print(f"      (could not run node: {err})")

check("Moorhen's own quatToMat4 ran", from_js is not None,
      (proc.stderr.strip()[:200] if proc else ""))

if from_js:
    mine = ec.rotation_matrix(QUAT)
    # quatToMat4 writes a column-major 4x4, so element j*4+i is row i of column j: the rows
    # this script emits are that read the other way round.
    as_rows = [[from_js[j * 4 + i] for j in range(3)] for i in range(3)]
    check("the matrix matches Moorhen's, to the last bit",
          all(abs(a - b) < 1e-12 for ra, rb in zip(mine, as_rows) for a, b in zip(ra, rb)),
          f"{mine} vs {as_rows}")
    # ...and it would NOT match if the transpose had been taken, or this proves nothing.
    transposed = [[from_js[i * 4 + j] for j in range(3)] for i in range(3)]
    check("...and the transpose really is different, so that check means something",
          any(abs(a - b) > 1e-6 for ra, rb in zip(mine, transposed) for a, b in zip(ra, rb)))

# It must be a rotation whatever else it is.
mine = ec.rotation_matrix(QUAT)
prod = [[sum(mine[r][k] * mine[c][k] for k in range(3)) for c in range(3)] for r in range(3)]
check("the matrix is orthonormal",
      all(abs(prod[i][j] - (1.0 if i == j else 0.0)) < 1e-9 for i in range(3) for j in range(3)))
det = (mine[0][0] * (mine[1][1] * mine[2][2] - mine[1][2] * mine[2][1])
       - mine[0][1] * (mine[1][0] * mine[2][2] - mine[1][2] * mine[2][0])
       + mine[0][2] * (mine[1][0] * mine[2][1] - mine[1][1] * mine[2][0]))
check("...and a rotation, not a reflection", abs(det - 1.0) < 1e-9, f"determinant {det}")
check("the identity quaternion gives the identity matrix",
      ec.rotation_matrix([0.0, 0.0, 0.0, 1.0]) == [[1, 0, 0], [0, 1, 0], [0, 0, 1]])


# --- reading a whole session --------------------------------------------------------------------
text = ec.as_yaml(ec.view_data(session_with(VIEW)))
check("the origin survives the trip", "origin: [-12.5, 7.25, -33.125]" in text, text)
check("the centre of view is its negation, which is the thing that trips people up",
      "centre_of_view: [12.5, -7.25, 33.125]" in text, text)
for name, value in [("zoom", "1.375"), ("clip_start", "12.0"), ("clip_end", "200.0"),
                    ("fog_start", "90.5"), ("fog_end", "310.0")]:
    check(f"{name} survives", f"{name}: {value}" in text, text)
check("the other fields in the file were skipped, not misread", "null" not in text, text)

# The unpacked encoding has to work too.
unpacked = unpacked_floats(ec.ORIGIN, ORIGIN) + unpacked_floats(ec.QUAT4, QUAT)
check("repeated floats written one per entry read the same as packed ones",
      ec.as_yaml(ec.view_data(session_with(unpacked))).split("rotation_matrix")[0]
      == text.split("rotation_matrix")[0])

# A scalar at its default is simply absent from a proto3 encoding.
no_zoom = packed_floats(ec.ORIGIN, ORIGIN) + packed_floats(ec.QUAT4, QUAT)
check("a field the session never recorded is reported as unknown, not as zero",
      "zoom: null" in ec.as_yaml(ec.view_data(session_with(no_zoom))))

# The output has to be YAML that a parser accepts.
try:
    import yaml                                            # noqa: PLC0415
    parsed = yaml.safe_load(text)
    check("the output parses as YAML", isinstance(parsed, dict))
    check("...with the values a parser would read back",
          parsed["origin"] == ORIGIN
          and parsed["centre_of_view"] == [-c for c in ORIGIN]
          and len(parsed["rotation_matrix"]) == 3
          and all(len(row) == 3 for row in parsed["rotation_matrix"]),
          str(parsed))
    # Against the matrix of the quaternion as the FILE holds it, not as it was written here: a
    # session stores float32, so the value that comes back is the single-precision one. Comparing
    # with the double-precision original fails by about 1e-8, which is the file's precision
    # rather than a fault - and looks exactly like a fault if you have forgotten the narrowing.
    quat32 = list(struct.unpack("<4f", struct.pack("<4f", *QUAT)))
    check("...and the matrix read back is the one the stored quaternion gives",
          all(abs(a - b) < 1e-8
              for ra, rb in zip(parsed["rotation_matrix"], ec.rotation_matrix(quat32))
              for a, b in zip(ra, rb)),
          str(parsed["rotation_matrix"]))
    check("...and that is not the same as the double-precision one, to 1e-9",
          any(abs(a - b) > 1e-9
              for ra, rb in zip(ec.rotation_matrix(quat32), ec.rotation_matrix(QUAT))
              for a, b in zip(ra, rb)))
except ImportError:
    print("      (PyYAML not installed - skipping the parse check)")


# --- rubbish in --------------------------------------------------------------------------------
for name, data in [
    ("an empty file", b""),
    ("something that is not a session", b"not a protobuf at all, just some text here"),
    ("a session with no view data", session_with(b"", noise=True)[:12]),
]:
    try:
        ec.as_yaml(ec.view_data(data))
        ok = False
    except ec.MalformedSession:
        ok = True
    except Exception:                                      # noqa: BLE001
        ok = False
    check(f"{name} is refused cleanly", ok)

# A view with a rotation of the wrong length is a fault, not something to guess at.
short = packed_floats(ec.ORIGIN, ORIGIN) + packed_floats(ec.QUAT4, [1.0, 0.0])
try:
    ec.as_yaml(ec.view_data(session_with(short)))
    ok = False
except ec.MalformedSession:
    ok = True
check("a truncated rotation is refused rather than padded", ok)

print("\nAll passed." if failures == 0 else f"\n{failures} FAILED.")
sys.exit(0 if failures == 0 else 1)
