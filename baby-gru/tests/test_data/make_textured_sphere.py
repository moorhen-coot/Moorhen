"""
Write tests/test_data/textured_sphere.gltf: a UV sphere with a base colour, a normal map and a
metallic-roughness map, all embedded as data URIs, for the WebGL-against-WebGPU parity test.
"""
import base64, json, math, struct, sys, zlib

def png(width, height, pixel):
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        for x in range(width):
            raw.extend(pixel(x, y))
    def chunk(kind, data):
        c = struct.pack(">I", len(data)) + kind + data
        return c + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b""))

W, H = 128, 64

def base(x, y):
    # Checks, eight around and four down, in two colours that change with longitude, and a red
    # band near the top so the image's orientation shows.
    light = ((x // 16) + (y // 16)) % 2 == 0
    t = x / W
    if y < 6:
        return (220, 40, 40, 255)
    if light:
        return (int(230 - 80 * t), int(200 + 40 * t), 120, 255)
    return (60, int(90 + 100 * t), int(200 - 60 * t), 255)

def height(x, y):
    return math.sin(2 * math.pi * x / 16) * math.sin(2 * math.pi * y / 16)

def normal(x, y):
    # Tangent space, glTF's way round: +X along u (x), +Y up the image (towards row 0).
    dx = (height(x + 0.5, y) - height(x - 0.5, y)) * 0.6
    dy_up = (height(x, y - 0.5) - height(x, y + 0.5)) * 0.6
    n = (-dx, -dy_up, 1.0)
    l = math.sqrt(sum(c * c for c in n))
    return tuple(int(round((c / l * 0.5 + 0.5) * 255)) for c in n) + (255,)

def metallic_roughness(x, y):
    roughness = 0.15 + 0.85 * x / (W - 1)
    metallic = 1.0 if y >= H * 3 // 4 else 0.0
    return (255, int(round(roughness * 255)), int(round(metallic * 255)), 255)

images = [png(W, H, base), png(W, H, normal), png(W, H, metallic_roughness)]

RADIUS, SLICES, STACKS = 8.0, 48, 24
positions, normals, uvs, indices = [], [], [], []
for j in range(STACKS + 1):
    v = j / STACKS
    theta = math.pi * v
    for i in range(SLICES + 1):
        u = i / SLICES
        phi = 2 * math.pi * u
        n = (math.sin(theta) * math.cos(phi), math.cos(theta), -math.sin(theta) * math.sin(phi))
        positions.extend(RADIUS * c for c in n)
        normals.extend(n)
        uvs.extend((u, v))
for j in range(STACKS):
    for i in range(SLICES):
        a = j * (SLICES + 1) + i
        b = a + SLICES + 1
        indices.extend((a, b, a + 1, a + 1, b, b + 1))

def pack(fmt, values):
    data = struct.pack("<%d%s" % (len(values), fmt), *values)
    return data + b"\0" * (-len(data) % 4)

blobs = [pack("f", positions), pack("f", normals), pack("f", uvs), pack("H", indices)]
offsets, buffer = [], b""
for blob in blobs:
    offsets.append(len(buffer))
    buffer += blob
count = len(positions) // 3
lo = [min(positions[k::3]) for k in range(3)]
hi = [max(positions[k::3]) for k in range(3)]

gltf = {
    "asset": {"version": "2.0", "generator": "Moorhen tests: make_textured_sphere.py"},
    "scene": 0, "scenes": [{"nodes": [0]}], "nodes": [{"mesh": 0}],
    "meshes": [{"primitives": [{
        "attributes": {"POSITION": 0, "NORMAL": 1, "TEXCOORD_0": 2}, "indices": 3, "material": 0,
    }]}],
    "materials": [{
        "pbrMetallicRoughness": {
            "baseColorTexture": {"index": 0}, "metallicRoughnessTexture": {"index": 2},
            "metallicFactor": 1.0, "roughnessFactor": 1.0,
        },
        "normalTexture": {"index": 1, "scale": 1.0},
    }],
    "textures": [{"source": 0}, {"source": 1}, {"source": 2}],
    "images": [{"uri": "data:image/png;base64," + base64.b64encode(img).decode()} for img in images],
    "buffers": [{"byteLength": len(buffer), "uri": "data:application/octet-stream;base64," + base64.b64encode(buffer).decode()}],
    "bufferViews": [
        {"buffer": 0, "byteOffset": offsets[0], "byteLength": len(blobs[0]), "target": 34962},
        {"buffer": 0, "byteOffset": offsets[1], "byteLength": len(blobs[1]), "target": 34962},
        {"buffer": 0, "byteOffset": offsets[2], "byteLength": len(blobs[2]), "target": 34962},
        {"buffer": 0, "byteOffset": offsets[3], "byteLength": len(indices) * 2, "target": 34963},
    ],
    "accessors": [
        {"bufferView": 0, "componentType": 5126, "count": count, "type": "VEC3", "min": lo, "max": hi},
        {"bufferView": 1, "componentType": 5126, "count": count, "type": "VEC3"},
        {"bufferView": 2, "componentType": 5126, "count": count, "type": "VEC2"},
        {"bufferView": 3, "componentType": 5123, "count": len(indices), "type": "SCALAR"},
    ],
}
with open(sys.argv[1], "w") as f:
    json.dump(gltf, f, separators=(",", ":"))
