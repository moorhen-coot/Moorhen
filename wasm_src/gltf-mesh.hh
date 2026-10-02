#ifndef MOORHEN_GLTF_MESH_HH
#define MOORHEN_GLTF_MESH_HH

#include <array>
#include <cmath>
#include <cstring>
#include <string>
#include <vector>

// Coot's copy, not a local one. libcoot compiles tinygltf's implementation from this exact
// header (in coot-utils/gltf-export.cc), so taking the declarations from anywhere else risks the
// two drifting apart - and a translation unit that disagrees with the implementation it links
// against about a struct's layout is an ODR violation that links quietly.
//
// ${coot_src} is on moorhen's include path, which is how coot-utils/simple-mesh.hh is reached
// too. A quoted include also resolves relative to this header's own directory first, so
// tiny_gltf.h finds coot-utils/json.hpp and coot-utils/stb_image.h beside itself.
#include "coot-utils/tiny_gltf.h"

/**
 * Turning a parsed glTF model into one mesh.
 *
 * Kept apart from the file and memory loading in gltf-import.cc so that it can be compiled and
 * tested without tinygltf's implementation, which needs a JSON library; the declarations alone
 * are enough to build a model by hand and check what comes out of it.
 *
 * The rules this follows, where glTF allows more than one thing:
 *
 *  - every mesh of every node of the scene is merged into one, with indices rebased, because a
 *    file that arrives as one import should be one thing to select, centre on and delete;
 *  - node transforms are composed down the hierarchy and applied, since a glTF mesh is placed
 *    by its node rather than by its own coordinates;
 *  - attributes are read through their accessor's component type, normalisation and byteStride,
 *    rather than assuming tightly packed floats, because interleaved buffers are common;
 *  - a primitive with no NORMAL gets normals from its faces, and one with no COLOR_0 takes its
 *    material's base colour factor;
 *  - anything that is not a triangle list is skipped rather than guessed at.
 *
 * Nothing here reverses winding or normals, deliberately: a correct glTF file should render
 * correctly, which is what a file from Blender or ChimeraX needs.
 *
 * Worth recording, because it produced one "the import is reversed" report. Coot's own exporters
 * disagree about winding. Measured with outputs/wf/sel/gltfwinding.py on real exports:
 *
 *   export_metaballs_as_gltf                 signed volume -101.7   inside-out
 *   export_molecular_representation_as_gltf  signed volume  822.6   standard
 *
 * So an inside-out import is not necessarily a fault in the file or in this reader - it may be
 * which Coot generator wrote it. Moorhen corrects its own metaballs exports on the way out
 * (utils/gltfWinding.ts); that correction is per path, because applying it to M2T as well
 * inverted a mesh that was already right.
 *
 * Online viewers show a uniformly reversed file quite happily, because they light both faces and
 * cull neither, so "it looks fine elsewhere" settles nothing.
 */

namespace moorhen_gltf {

    /** A 4x4 transform, column-major as glTF stores them. */
    using Matrix = std::array<double, 16>;

    inline Matrix identityMatrix() {
        Matrix m{};
        m[0] = m[5] = m[10] = m[15] = 1.0;
        return m;
    }

    /** a * b, both column-major. */
    inline Matrix multiply(const Matrix &a, const Matrix &b) {
        Matrix out{};
        for (int col = 0; col < 4; col++) {
            for (int row = 0; row < 4; row++) {
                double sum = 0.0;
                for (int k = 0; k < 4; k++) {
                    sum += a[k * 4 + row] * b[col * 4 + k];
                }
                out[col * 4 + row] = sum;
            }
        }
        return out;
    }

    /**
     * A node's own transform.
     *
     * glTF gives either a matrix or a translation/rotation/scale triple, never both; the triple
     * is applied as T * R * S, which is what the specification says.
     */
    inline Matrix nodeTransform(const tinygltf::Node &node) {
        if (node.matrix.size() == 16) {
            Matrix m{};
            for (size_t i = 0; i < 16; i++) m[i] = node.matrix[i];
            return m;
        }

        Matrix out = identityMatrix();

        if (node.rotation.size() == 4) {
            // glTF stores the quaternion as x, y, z, w.
            const double x = node.rotation[0], y = node.rotation[1];
            const double z = node.rotation[2], w = node.rotation[3];
            out[0] = 1 - 2 * (y * y + z * z);
            out[1] = 2 * (x * y + z * w);
            out[2] = 2 * (x * z - y * w);
            out[4] = 2 * (x * y - z * w);
            out[5] = 1 - 2 * (x * x + z * z);
            out[6] = 2 * (y * z + x * w);
            out[8] = 2 * (x * z + y * w);
            out[9] = 2 * (y * z - x * w);
            out[10] = 1 - 2 * (x * x + y * y);
        }

        if (node.scale.size() == 3) {
            for (int col = 0; col < 3; col++) {
                for (int row = 0; row < 3; row++) {
                    out[col * 4 + row] *= node.scale[col];
                }
            }
        }

        if (node.translation.size() == 3) {
            out[12] = node.translation[0];
            out[13] = node.translation[1];
            out[14] = node.translation[2];
        }

        return out;
    }

    /** The transform to apply to a normal: the inverse transpose of the upper 3x3. */
    inline std::array<double, 9> normalTransform(const Matrix &m) {
        const double a = m[0], b = m[4], c = m[8];
        const double d = m[1], e = m[5], f = m[9];
        const double g = m[2], h = m[6], i = m[10];

        const double det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
        if (std::fabs(det) < 1e-12) {
            // Degenerate, so rotating the normal by the matrix itself is the best that can be
            // done; renormalising afterwards keeps the lighting sane either way.
            return {a, b, c, d, e, f, g, h, i};
        }

        // Inverse, then transposed - written out rather than built in two steps.
        const double inv = 1.0 / det;
        return {
            (e * i - f * h) * inv, (d * i - f * g) * -inv, (d * h - e * g) * inv,
            (b * i - c * h) * -inv, (a * i - c * g) * inv, (a * h - b * g) * -inv,
            (b * f - c * e) * inv, (a * f - c * d) * -inv, (a * e - b * d) * inv
        };
    }

    /**
     * Reads one accessor, whatever shape it is stored in.
     *
     * This is where the four extraction faults in the original spike are answered: the component
     * type is honoured rather than assumed to be float, `normalized` is applied, the buffer comes
     * from this accessor's own view rather than from whichever one was in scope, and byteStride
     * is respected so that an interleaved buffer reads correctly.
     */
    class AccessorReader {
    public:
        AccessorReader() = default;

        AccessorReader(const tinygltf::Model &model, int accessorIndex) {
            if (accessorIndex < 0 || accessorIndex >= static_cast<int>(model.accessors.size())) return;
            const tinygltf::Accessor &accessor = model.accessors[accessorIndex];
            if (accessor.bufferView < 0 || accessor.bufferView >= static_cast<int>(model.bufferViews.size())) return;
            const tinygltf::BufferView &view = model.bufferViews[accessor.bufferView];
            if (view.buffer < 0 || view.buffer >= static_cast<int>(model.buffers.size())) return;
            const tinygltf::Buffer &buffer = model.buffers[view.buffer];

            componentType_ = accessor.componentType;
            componentSize_ = componentBytes(componentType_);
            components_ = componentCount(accessor.type);
            if (componentSize_ == 0 || components_ == 0) return;

            normalized_ = accessor.normalized;
            count_ = accessor.count;
            stride_ = view.byteStride != 0 ? view.byteStride
                                           : static_cast<size_t>(componentSize_) * components_;

            const size_t start = view.byteOffset + accessor.byteOffset;
            if (count_ == 0) { ok_ = true; base_ = buffer.data.data(); return; }

            // The last byte this reader could touch must still be inside the buffer. A file that
            // says otherwise is truncated or lying, and reading it would be reading the heap.
            const size_t last = start + (count_ - 1) * stride_
                              + static_cast<size_t>(componentSize_) * components_;
            if (start > buffer.data.size() || last > buffer.data.size()) return;

            base_ = buffer.data.data() + start;
            ok_ = true;
        }

        bool ok() const { return ok_; }
        size_t count() const { return count_; }
        int components() const { return components_; }

        /** Component `component` of element `element`, as a float. */
        float get(size_t element, int component) const {
            if (!ok_ || element >= count_ || component >= components_) return 0.0f;
            const unsigned char *at = base_ + element * stride_
                                    + static_cast<size_t>(component) * componentSize_;
            switch (componentType_) {
                case TINYGLTF_COMPONENT_TYPE_FLOAT: {
                    float v; std::memcpy(&v, at, sizeof(float)); return v;
                }
                case TINYGLTF_COMPONENT_TYPE_UNSIGNED_BYTE: {
                    const unsigned char v = *at;
                    return normalized_ ? static_cast<float>(v) / 255.0f : static_cast<float>(v);
                }
                case TINYGLTF_COMPONENT_TYPE_UNSIGNED_SHORT: {
                    uint16_t v; std::memcpy(&v, at, sizeof(v));
                    return normalized_ ? static_cast<float>(v) / 65535.0f : static_cast<float>(v);
                }
                case TINYGLTF_COMPONENT_TYPE_UNSIGNED_INT: {
                    uint32_t v; std::memcpy(&v, at, sizeof(v)); return static_cast<float>(v);
                }
                case TINYGLTF_COMPONENT_TYPE_BYTE: {
                    int8_t v; std::memcpy(&v, at, sizeof(v));
                    return normalized_ ? std::fmax(static_cast<float>(v) / 127.0f, -1.0f)
                                       : static_cast<float>(v);
                }
                case TINYGLTF_COMPONENT_TYPE_SHORT: {
                    int16_t v; std::memcpy(&v, at, sizeof(v));
                    return normalized_ ? std::fmax(static_cast<float>(v) / 32767.0f, -1.0f)
                                       : static_cast<float>(v);
                }
                default:
                    return 0.0f;
            }
        }

        /** Element `element` as an index. Only meaningful for a SCALAR accessor. */
        unsigned int index(size_t element) const {
            return static_cast<unsigned int>(get(element, 0));
        }

    private:
        static int componentBytes(int componentType) {
            switch (componentType) {
                case TINYGLTF_COMPONENT_TYPE_BYTE:
                case TINYGLTF_COMPONENT_TYPE_UNSIGNED_BYTE: return 1;
                case TINYGLTF_COMPONENT_TYPE_SHORT:
                case TINYGLTF_COMPONENT_TYPE_UNSIGNED_SHORT: return 2;
                case TINYGLTF_COMPONENT_TYPE_UNSIGNED_INT:
                case TINYGLTF_COMPONENT_TYPE_FLOAT: return 4;
                default: return 0;
            }
        }
        static int componentCount(int type) {
            switch (type) {
                case TINYGLTF_TYPE_SCALAR: return 1;
                case TINYGLTF_TYPE_VEC2: return 2;
                case TINYGLTF_TYPE_VEC3: return 3;
                case TINYGLTF_TYPE_VEC4: return 4;
                default: return 0;
            }
        }

        const unsigned char *base_ = nullptr;
        size_t stride_ = 0;
        size_t count_ = 0;
        int componentType_ = 0;
        int componentSize_ = 0;
        int components_ = 0;
        bool normalized_ = false;
        bool ok_ = false;
    };

    /** A primitive's base colour, from its material, for use when it has no COLOR_0. */
    inline std::array<float, 4> materialColour(const tinygltf::Model &model, int materialIndex) {
        if (materialIndex >= 0 && materialIndex < static_cast<int>(model.materials.size())) {
            const auto &factor = model.materials[materialIndex].pbrMetallicRoughness.baseColorFactor;
            if (factor.size() == 4) {
                return {static_cast<float>(factor[0]), static_cast<float>(factor[1]),
                        static_cast<float>(factor[2]), static_cast<float>(factor[3])};
            }
        }
        // glTF's own default base colour factor is opaque white.
        return {1.0f, 1.0f, 1.0f, 1.0f};
    }

    /**
     * One mesh, flattened.
     *
     * A plain intermediate rather than a coot::simple_mesh_t, so that everything above can be
     * compiled and tested without coot. Converting this to a simple_mesh_t is half a dozen
     * obvious lines, and they live with the loading in gltf-import.cc.
     */
    struct MeshData {
        std::vector<float> positions;   ///< x,y,z per vertex
        std::vector<float> normals;     ///< x,y,z per vertex
        std::vector<float> colours;     ///< r,g,b,a per vertex
        std::vector<unsigned int> indices;  ///< three per triangle
        /** What went wrong, if the result is empty when it should not be. */
        std::string error;
        size_t vertexCount() const { return positions.size() / 3; }
        size_t triangleCount() const { return indices.size() / 3; }
    };

    /** Normals from the faces, for a primitive that brought none. */
    inline void addFaceNormals(MeshData &mesh, size_t firstVertex, size_t firstIndex) {
        for (size_t t = firstIndex; t + 2 < mesh.indices.size(); t += 3) {
            const unsigned int a = mesh.indices[t], b = mesh.indices[t + 1], c = mesh.indices[t + 2];
            if (a >= mesh.vertexCount() || b >= mesh.vertexCount() || c >= mesh.vertexCount()) continue;
            double ab[3], ac[3];
            for (int i = 0; i < 3; i++) {
                ab[i] = mesh.positions[3 * b + i] - mesh.positions[3 * a + i];
                ac[i] = mesh.positions[3 * c + i] - mesh.positions[3 * a + i];
            }
            const double n[3] = {
                ab[1] * ac[2] - ab[2] * ac[1],
                ab[2] * ac[0] - ab[0] * ac[2],
                ab[0] * ac[1] - ab[1] * ac[0]
            };
            for (unsigned int v : {a, b, c}) {
                for (int i = 0; i < 3; i++) mesh.normals[3 * v + i] += static_cast<float>(n[i]);
            }
        }
        for (size_t v = firstVertex; v < mesh.vertexCount(); v++) {
            const double length = std::sqrt(
                static_cast<double>(mesh.normals[3 * v]) * mesh.normals[3 * v] +
                static_cast<double>(mesh.normals[3 * v + 1]) * mesh.normals[3 * v + 1] +
                static_cast<double>(mesh.normals[3 * v + 2]) * mesh.normals[3 * v + 2]);
            if (length > 0.0) {
                for (int i = 0; i < 3; i++) mesh.normals[3 * v + i] /= static_cast<float>(length);
            } else {
                // A vertex no triangle refers to. Pointing it somewhere beats leaving a zero
                // vector to become a NaN in the lighting.
                mesh.normals[3 * v + 1] = 1.0f;
            }
        }
    }

    /** Append one primitive, already placed by its node's transform. */
    inline void addPrimitive(const tinygltf::Model &model,
                             const tinygltf::Primitive &primitive,
                             const Matrix &transform,
                             MeshData &mesh) {

        // Only triangle lists. Strips, fans, lines and points are skipped rather than guessed
        // at: drawing them as triangles would produce confident nonsense.
        if (primitive.mode != TINYGLTF_MODE_TRIANGLES) return;

        const auto positionIt = primitive.attributes.find("POSITION");
        if (positionIt == primitive.attributes.end()) return;
        const AccessorReader positions(model, positionIt->second);
        if (!positions.ok() || positions.count() == 0) return;

        AccessorReader normals;
        const auto normalIt = primitive.attributes.find("NORMAL");
        if (normalIt != primitive.attributes.end()) normals = AccessorReader(model, normalIt->second);

        AccessorReader colours;
        const auto colourIt = primitive.attributes.find("COLOR_0");
        if (colourIt != primitive.attributes.end()) colours = AccessorReader(model, colourIt->second);

        const bool haveNormals = normals.ok() && normals.count() == positions.count();
        const bool haveColours = colours.ok() && colours.count() == positions.count();
        const std::array<float, 4> fallbackColour = materialColour(model, primitive.material);
        const std::array<double, 9> normalMatrix = normalTransform(transform);

        const size_t firstVertex = mesh.vertexCount();
        const size_t firstIndex = mesh.indices.size();

        for (size_t v = 0; v < positions.count(); v++) {
            const double x = positions.get(v, 0), y = positions.get(v, 1), z = positions.get(v, 2);
            // Column-major, so the translation is in elements 12, 13, 14.
            mesh.positions.push_back(static_cast<float>(transform[0] * x + transform[4] * y + transform[8] * z + transform[12]));
            mesh.positions.push_back(static_cast<float>(transform[1] * x + transform[5] * y + transform[9] * z + transform[13]));
            mesh.positions.push_back(static_cast<float>(transform[2] * x + transform[6] * y + transform[10] * z + transform[14]));

            if (haveNormals) {
                const double nx = normals.get(v, 0), ny = normals.get(v, 1), nz = normals.get(v, 2);
                double tx = normalMatrix[0] * nx + normalMatrix[1] * ny + normalMatrix[2] * nz;
                double ty = normalMatrix[3] * nx + normalMatrix[4] * ny + normalMatrix[5] * nz;
                double tz = normalMatrix[6] * nx + normalMatrix[7] * ny + normalMatrix[8] * nz;
                const double length = std::sqrt(tx * tx + ty * ty + tz * tz);
                if (length > 0.0) { tx /= length; ty /= length; tz /= length; }
                mesh.normals.push_back(static_cast<float>(tx));
                mesh.normals.push_back(static_cast<float>(ty));
                mesh.normals.push_back(static_cast<float>(tz));
            } else {
                mesh.normals.insert(mesh.normals.end(), {0.0f, 0.0f, 0.0f});
            }

            if (haveColours) {
                mesh.colours.push_back(colours.get(v, 0));
                mesh.colours.push_back(colours.get(v, 1));
                mesh.colours.push_back(colours.get(v, 2));
                // A VEC3 colour has no alpha of its own, so it is opaque.
                mesh.colours.push_back(colours.components() == 4 ? colours.get(v, 3) : 1.0f);
            } else {
                mesh.colours.insert(mesh.colours.end(), fallbackColour.begin(), fallbackColour.end());
            }
        }

        if (primitive.indices >= 0) {
            const AccessorReader indices(model, primitive.indices);
            if (!indices.ok()) {
                mesh.error = "indices could not be read";
                // Everything added above would otherwise be a vertex soup with no faces.
                mesh.positions.resize(firstVertex * 3);
                mesh.normals.resize(firstVertex * 3);
                mesh.colours.resize(firstVertex * 4);
                return;
            }
            // indices.count(), not the position accessor's count. Taking the wrong one is what
            // the original spike did, and it reads the wrong number of indices whenever a
            // primitive has a different number of them from its vertices - which is most.
            for (size_t i = 0; i + 2 < indices.count(); i += 3) {
                for (int c = 0; c < 3; c++) {
                    mesh.indices.push_back(
                        static_cast<unsigned int>(firstVertex) + indices.index(i + c));
                }
            }
        } else {
            // No index accessor: the vertices are the triangles, in order.
            for (size_t i = 0; i + 2 < positions.count(); i += 3) {
                for (int c = 0; c < 3; c++) {
                    mesh.indices.push_back(static_cast<unsigned int>(firstVertex + i + c));
                }
            }
        }

        if (!haveNormals) addFaceNormals(mesh, firstVertex, firstIndex);
    }

    /** Walk a node and its children, accumulating their meshes. */
    inline void addNode(const tinygltf::Model &model, int nodeIndex,
                        const Matrix &parent, MeshData &mesh, int depth = 0) {
        if (nodeIndex < 0 || nodeIndex >= static_cast<int>(model.nodes.size())) return;
        // A malformed file can describe a cycle; glTF forbids it, but nothing here can assume
        // the file is well formed.
        if (depth > 64) return;

        const tinygltf::Node &node = model.nodes[nodeIndex];
        const Matrix here = multiply(parent, nodeTransform(node));

        if (node.mesh >= 0 && node.mesh < static_cast<int>(model.meshes.size())) {
            for (const auto &primitive : model.meshes[node.mesh].primitives) {
                addPrimitive(model, primitive, here, mesh);
            }
        }
        for (int child : node.children) addNode(model, child, here, mesh, depth + 1);
    }

    /**
     * Every mesh in the model, merged into one.
     *
     * The scene's nodes are walked so that node transforms are applied. A model with no scenes
     * falls back to drawing every mesh at the origin, which is the best that can be done when
     * the file does not say where anything goes.
     */
    inline MeshData modelToMeshData(const tinygltf::Model &model) {
        MeshData mesh;

        const int sceneIndex = (model.defaultScene >= 0 &&
                                model.defaultScene < static_cast<int>(model.scenes.size()))
                             ? model.defaultScene
                             : (model.scenes.empty() ? -1 : 0);

        if (sceneIndex >= 0) {
            for (int nodeIndex : model.scenes[sceneIndex].nodes) {
                addNode(model, nodeIndex, identityMatrix(), mesh);
            }
        } else {
            for (const auto &m : model.meshes) {
                for (const auto &primitive : m.primitives) {
                    addPrimitive(model, primitive, identityMatrix(), mesh);
                }
            }
        }

        if (mesh.indices.empty() && mesh.error.empty()) {
            mesh.error = "no triangles found";
        }
        return mesh;
    }

} // namespace moorhen_gltf

#endif
