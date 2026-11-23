#!/usr/bin/env python3
"""Pull the camera out of a Moorhen session file and write it as YAML.

A saved session (.pb) is a raw protobuf message - not compressed, not wrapped - and the camera
lives in its `viewData` field. Only that field is read here; the molecules, maps and everything
else are skipped over without being decoded.

No third-party packages. The few protobuf fields needed are read straight off the wire, which
avoids having to run protoc or keep a generated module in step with the .proto. The cost is the
field numbers below, which have to match MoorhenSession.proto - they are checked by
test_extract_camera.py, which reads the .proto and compares.

Usage:
    ./extract_camera.py session.pb                 # to stdout
    ./extract_camera.py session.pb -o camera.yaml
"""

from __future__ import annotations

import argparse
import struct
import sys
from pathlib import Path

# --- where things are in the message -------------------------------------------------------
# Session.viewData
VIEW_DATA_FIELD = 5
# ...and within ViewDataSession.
ORIGIN = 1
FOG_START = 8
FOG_END = 9
ZOOM = 10
CLIP_START = 12
CLIP_END = 13
QUAT4 = 14

WIRE_VARINT = 0
WIRE_64BIT = 1
WIRE_LENGTH = 2
WIRE_32BIT = 5


class MalformedSession(Exception):
    """The file is not a protobuf message of the shape a Moorhen session has."""


def _read_varint(data: bytes, at: int) -> tuple[int, int]:
    value = 0
    shift = 0
    while True:
        if at >= len(data):
            raise MalformedSession("ran off the end of the file reading a number")
        byte = data[at]
        at += 1
        value |= (byte & 0x7F) << shift
        if not byte & 0x80:
            return value, at
        shift += 7
        if shift > 63:
            raise MalformedSession("number too long to be real")


def _fields(data: bytes):
    """Every top-level field as (number, wire type, payload), payload unparsed."""
    at = 0
    while at < len(data):
        key, at = _read_varint(data, at)
        number, wire = key >> 3, key & 0x07
        if wire == WIRE_VARINT:
            value, at = _read_varint(data, at)
            yield number, wire, value
        elif wire == WIRE_64BIT:
            yield number, wire, data[at:at + 8]
            at += 8
        elif wire == WIRE_LENGTH:
            length, at = _read_varint(data, at)
            if at + length > len(data):
                raise MalformedSession("a field claims to be longer than the file")
            yield number, wire, data[at:at + length]
            at += length
        elif wire == WIRE_32BIT:
            yield number, wire, data[at:at + 4]
            at += 4
        else:
            raise MalformedSession(f"unknown wire type {wire}")


def _floats(view: bytes, wanted: int) -> list[float]:
    """A repeated float field, however it was encoded.

    proto3 packs repeated scalars by default - the whole list arrives as one length-delimited
    block of little-endian float32 - but the unpacked form, one field entry per value, is still
    legal and has to be accepted or a file written by some other encoder would silently come
    back empty.
    """
    out: list[float] = []
    for number, wire, payload in _fields(view):
        if number != wanted:
            continue
        if wire == WIRE_LENGTH:
            if len(payload) % 4:
                raise MalformedSession(f"field {wanted} is not a whole number of floats")
            out.extend(struct.unpack(f"<{len(payload) // 4}f", payload))
        elif wire == WIRE_32BIT:
            out.append(struct.unpack("<f", payload)[0])
    return out


def _float(view: bytes, wanted: int) -> float | None:
    """A single float, or None where the field is absent.

    proto3 leaves a scalar out of the encoding when it holds the default, so a missing field
    means zero rather than an error - but it is reported as absent rather than invented, since
    a zoom of zero and an unrecorded zoom are not the same thing to whoever reads the YAML.
    """
    for number, wire, payload in _fields(view):
        if number == wanted and wire == WIRE_32BIT:
            return struct.unpack("<f", payload)[0]
    return None


def view_data(session: bytes) -> bytes:
    for number, wire, payload in _fields(session):
        if number == VIEW_DATA_FIELD and wire == WIRE_LENGTH:
            return payload
    raise MalformedSession("no view data in this file - is it a Moorhen session?")


def rotation_matrix(quat: list[float]) -> list[list[float]]:
    """The rotation the session's quaternion stands for, as three rows.

    Transcribed from quatToMat4.js rather than from a textbook, because Moorhen's is the
    transpose of the usual gl-matrix formula and taking the standard one would produce a matrix
    that looks entirely plausible and turns the wrong way.

    That file fills a 16-element array which WebGL reads column-major, so its dest[0..2] are the
    first *column*. The rows below are that transposed back into ordinary reading order: row i
    is what multiplies a column vector to give component i.
    """
    if len(quat) != 4:
        raise MalformedSession(f"expected 4 numbers for the rotation, found {len(quat)}")
    x, y, z, w = quat

    x2, y2, z2 = x + x, y + y, z + z
    xx, xy, xz = x * x2, x * y2, x * z2
    yy, yz, zz = y * y2, y * z2, z * z2
    wx, wy, wz = w * x2, w * y2, w * z2

    return [
        [1 - (yy + zz), xy + wz,       xz - wy      ],
        [xy - wz,       1 - (xx + zz), yz + wx      ],
        [xz + wy,       yz - wx,       1 - (xx + yy)],
    ]


def _num(value: float) -> str:
    """Enough digits to be exact for a float32, without a wall of noise."""
    return repr(round(value, 9) + 0.0)


def as_yaml(view: bytes) -> str:
    origin = _floats(view, ORIGIN)
    if len(origin) != 3:
        raise MalformedSession(f"expected 3 numbers for the origin, found {len(origin)}")
    matrix = rotation_matrix(_floats(view, QUAT4))

    lines = [
        "# Camera extracted from a Moorhen session.",
        "#",
        "# origin is stored as Moorhen holds it, which is the NEGATIVE of the point the view is",
        "# centred on - centring on an atom at (x, y, z) sets the origin to (-x, -y, -z). The",
        "# point itself is given as centre_of_view, which is what most other tools will want.",
        "#",
        "# rotation_matrix is row-major: row i multiplies a column vector to give component i.",
        "# Moorhen's own 4x4 is the transpose of this, because WebGL reads it column-major.",
        "",
        "origin: [%s]" % ", ".join(_num(c) for c in origin),
        "centre_of_view: [%s]" % ", ".join(_num(-c) for c in origin),
        "",
        "rotation_matrix:",
    ]
    lines += ["  - [%s]" % ", ".join(_num(c) for c in row) for row in matrix]

    optional = [
        ("zoom", ZOOM),
        ("clip_start", CLIP_START),
        ("clip_end", CLIP_END),
        ("fog_start", FOG_START),
        ("fog_end", FOG_END),
    ]
    lines.append("")
    for name, field in optional:
        value = _float(view, field)
        # A scalar left out of the encoding is at its default; say so rather than print a zero
        # that might be mistaken for a recorded measurement.
        lines.append(f"{name}: {_num(value)}" if value is not None
                     else f"{name}: null   # not recorded in this session")

    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("session", type=Path, help="a Moorhen session file (.pb)")
    parser.add_argument("-o", "--output", type=Path, help="write here instead of stdout")
    args = parser.parse_args(argv)

    try:
        data = args.session.read_bytes()
    except OSError as err:
        print(f"could not read {args.session}: {err}", file=sys.stderr)
        return 1

    try:
        text = as_yaml(view_data(data))
    except MalformedSession as err:
        print(f"{args.session}: {err}", file=sys.stderr)
        return 1

    if args.output:
        args.output.write_text(text)
    else:
        sys.stdout.write(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
