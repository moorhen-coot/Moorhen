// The implementation is compiled only for the standalone test program, and deliberately not
// when this file is part of moorhen: libcoot already compiles tinygltf's function bodies in
// coot-utils/gltf-export.cc, and a second copy is a few hundred duplicate symbols at link time.
//
// For the same reason there are no TINYGLTF_NO_STB_IMAGE defines here. They look harmless - this
// file reads no textures - but they are not confined to the implementation: they change the
// in-class initialisers of tinygltf::TinyGLTF, whose LoadImageData member becomes nullptr rather
// than the default loader. A translation unit compiled with them disagrees with libcoot about
// what the class is, which is an ODR violation that links quietly and misbehaves later.
//
// So: whatever coot does, this file does. coot-utils/gltf-export.cc is the one that decides.
#ifdef __GLTF_IMPORT_MAIN__
#ifndef TINYGLTF_IMPLEMENTATION
#define TINYGLTF_IMPLEMENTATION
#endif
#ifndef STB_IMAGE_IMPLEMENTATION
#define STB_IMAGE_IMPLEMENTATION
#endif
#ifndef STB_IMAGE_WRITE_IMPLEMENTATION
#define STB_IMAGE_WRITE_IMPLEMENTATION
#endif
#endif

// tiny_gltf.h comes in through gltf-mesh.hh. Not included directly as well: its implementation
// block sits outside its own header guard, so a second include in the same translation unit
// compiles every function body twice and the link fails on redefinitions.
#include "gltf-mesh.hh"

#include "coot-utils/simple-mesh.hh"

#include <fstream>
#include <sstream>
#include <iostream>
#include <string>

/*
POSITION  -> VEC3 float
NORMAL    -> VEC3 float
TEXCOORD_0-> VEC2 float  //TODO
COLOR_0   -> VEC3/VEC4 float or normalized ubyte //TODO partially
INDICES   -> ubyte, ushort or uint
*/

coot::simple_mesh_t LoadGltfModel(tinygltf::Model& model);
coot::simple_mesh_t LoadGltfModelFromMemory(tinygltf::Model& model, const std::vector<unsigned char> &buffer, const std::string &str);


/**
 * A mesh that says it failed.
 *
 * simple_mesh_t documents status as 1 good, 0 bad, and a caller that cannot tell a failure from
 * an empty result has to guess - which is exactly the confusion the M2T path had before its
 * status was set. The reason goes in the name, which is the only channel there is.
 */
static coot::simple_mesh_t failedMesh(const std::string &why) {
    coot::simple_mesh_t mesh;
    mesh.status = 0;
    mesh.name = "glTF import failed: " + why;
    std::cerr << "glTF import failed: " << why << std::endl;
    return mesh;
}

/**
 * Read a glTF or glb from a path, letting tinygltf resolve anything beside it.
 *
 * tinygltf's own file loaders rather than reading the bytes here and handing them to the memory
 * loaders, because the difference is the base directory. LoadASCIIFromFile and LoadBinaryFromFile
 * each call GetBaseDir on the filename and pass the result through, which is what lets a .gltf
 * find the "scene.bin" sitting next to it. Doing the read by hand and calling the memory loaders
 * threw that away - it passed "." for a .glb and an empty string for a .gltf, so an external
 * buffer could never be found whatever directory the file was actually in.
 *
 * A URI with a directory component in it ("textures/wood.png") resolves relative to the base
 * directory like any other, so a file laid out in subdirectories works provided those
 * subdirectories exist in the filesystem the caller prepared.
 */
coot::simple_mesh_t LoadGltfModelFromFile(const std::string& filename, tinygltf::Model& model){
    tinygltf::TinyGLTF loader;
    std::string err;
    std::string warn;

    // Chosen by extension, because the two formats need different parsers and tinygltf does not
    // sniff. A .glb read as JSON fails with a confusing complaint about an invalid document.
    const bool binary = filename.size() >= 4 && filename.substr(filename.size() - 4) == ".glb";
    const bool result = binary
        ? loader.LoadBinaryFromFile(&model, &err, &warn, filename, tinygltf::REQUIRE_VERSION)
        : loader.LoadASCIIFromFile(&model, &err, &warn, filename, tinygltf::REQUIRE_VERSION);

    if (!warn.empty()) std::cerr << "tinygltf warning: " << warn << '\n';
    if (!err.empty())  std::cerr << "tinygltf error: " << err << '\n';

    if (!result) {
        return failedMesh(err.empty() ? "tinygltf could not read the file" : err);
    }

    return LoadGltfModel(model);
}

coot::simple_mesh_t LoadGltfModelFromMemory(tinygltf::Model& model, const std::vector<unsigned char> &buffer, const std::string &str){
    tinygltf::TinyGLTF loader;

    std::string err;
    std::string warn;

    bool result = false;

    // Determine whether this is a .glb or .gltf file
    if (buffer.size()>0){
        result = loader.LoadBinaryFromMemory(&model, &err, &warn, &buffer.at(0),
                static_cast<unsigned int>(buffer.size()),
                ".", tinygltf::REQUIRE_VERSION);
    } else {
        result = loader.LoadASCIIFromString(&model, &err, &warn, str.c_str(), str.length(), "", tinygltf::REQUIRE_VERSION);
    }

    if (!warn.empty())
    {
        std::cerr << "tinygltf warning: " << warn << '\n';
    }

    if (!err.empty())
    {
        std::cerr << "tinygltf error: " << err << '\n';
    }

    if (!result)
    {
        std::cerr << "Failed to load\n";
        return failedMesh(err.empty() ? "tinygltf could not parse the file" : err);
    }

    return LoadGltfModel(model);
}

/**
 * A parsed model as one Coot mesh.
 *
 * The extraction itself is in gltf-mesh.hh, which is kept free of Coot so it can be tested on
 * models built by hand. All that happens here is the change of shape: three parallel float
 * arrays and an index list become vnc_vertex and g_triangle.
 */
static coot::simple_mesh_t meshDataToSimpleMesh(const moorhen_gltf::MeshData &data) {
    coot::simple_mesh_t mesh;
    mesh.status = 1;
    mesh.vertices.reserve(data.vertexCount());
    for (size_t v = 0; v < data.vertexCount(); v++) {
        mesh.vertices.push_back(coot::api::vnc_vertex(
            glm::vec3(data.positions[3 * v], data.positions[3 * v + 1], data.positions[3 * v + 2]),
            glm::vec3(data.normals[3 * v], data.normals[3 * v + 1], data.normals[3 * v + 2]),
            glm::vec4(data.colours[4 * v], data.colours[4 * v + 1],
                      data.colours[4 * v + 2], data.colours[4 * v + 3])));
    }

    mesh.triangles.reserve(data.triangleCount());
    for (size_t t = 0; t < data.triangleCount(); t++) {
        mesh.triangles.push_back(
            g_triangle(data.indices[3 * t], data.indices[3 * t + 1], data.indices[3 * t + 2]));
    }
    return mesh;
}

coot::simple_mesh_t LoadGltfModel(tinygltf::Model& model){

    const moorhen_gltf::MeshData data = moorhen_gltf::modelToMeshData(model);
    if (data.indices.empty()) {
        return failedMesh(data.error.empty() ? "no triangles found" : data.error);
    }

    const coot::simple_mesh_t mesh = meshDataToSimpleMesh(data);
    std::cout << "glTF: " << mesh.vertices.size() << " vertices, "
              << mesh.triangles.size() << " triangles" << std::endl;
    return mesh;
}

/**
 * One material's worth of geometry, with what is needed to texture it.
 *
 * Three things rather than one, because simple_mesh_t has nowhere to put the other two: its
 * vertex is position, normal and colour, and adding a field would be a change to Coot. So the
 * coordinates travel beside the mesh rather than inside it, and the material is passed through
 * as a bare index - what a material means, which image it names, is settled on the JavaScript
 * side, which has to decode the images anyway and so already reads the material list.
 *
 * A vector of these is what an import returns: one element per material, in the order the
 * materials are first met, each becoming one sub-buffer of the single imported object.
 */
struct MoorhenGltfMesh {
    coot::simple_mesh_t mesh;
    /** u,v per vertex, or empty when this material's geometry carried none. */
    std::vector<float> texCoords;
    /** The glTF material index, or -1 for a primitive that named no material. */
    int material = -1;
};

/**
 * Read a glTF or glb file as one mesh per material.
 *
 * Beside LoadGltFromFile rather than replacing it. Everything that only wants the geometry can go
 * on calling that, and if this path turns out wrong there is something to fall back to.
 *
 * An empty result means the file could not be read. The reason is on the mesh of the single
 * failed element, in its name, exactly as the merged call reports it - so a caller has one place
 * to look whichever it used.
 */
std::vector<MoorhenGltfMesh> LoadGltfGroupsFromFile(const std::string &fn){
    tinygltf::Model model;
    tinygltf::TinyGLTF loader;
    std::string err;
    std::string warn;

    const bool binary = fn.size() >= 4 && fn.substr(fn.size() - 4) == ".glb";
    const bool result = binary
        ? loader.LoadBinaryFromFile(&model, &err, &warn, fn, tinygltf::REQUIRE_VERSION)
        : loader.LoadASCIIFromFile(&model, &err, &warn, fn, tinygltf::REQUIRE_VERSION);

    if (!warn.empty()) std::cerr << "tinygltf warning: " << warn << '\n';
    if (!err.empty())  std::cerr << "tinygltf error: " << err << '\n';

    std::vector<MoorhenGltfMesh> groups;
    if (!result) {
        groups.push_back({failedMesh(err.empty() ? "tinygltf could not read the file" : err), {}, -1});
        return groups;
    }

    const moorhen_gltf::MeshGroups extracted = moorhen_gltf::modelToMeshGroups(model);
    if (extracted.groups.empty()) {
        groups.push_back({failedMesh(extracted.error.empty() ? "no triangles found" : extracted.error), {}, -1});
        return groups;
    }

    groups.reserve(extracted.groups.size());
    for (const auto &group : extracted.groups) {
        groups.push_back({meshDataToSimpleMesh(group), group.texCoords, group.material});
    }

    std::cout << "glTF: " << groups.size() << " material group(s)" << std::endl;
    return groups;
}

/**
 * Read a glTF or glb file and return it as one mesh.
 *
 * From a file rather than from memory because a .glb may refer to other files beside it, and a
 * path is what lets tinygltf find them.
 */
coot::simple_mesh_t LoadGltFromFile(const std::string &fn){
    tinygltf::Model model;
    return LoadGltfModelFromFile(fn,model);
}

coot::simple_mesh_t LoadGltFromMemory(uintptr_t ptr, size_t size, const std::string &str){
    tinygltf::Model model;
    std::vector<unsigned char> buffer;
    auto data = reinterpret_cast<const unsigned char*>(ptr);
    buffer.assign(data,data+size);
    return  LoadGltfModelFromMemory(model, buffer, str);
}


#ifndef __GLTF_IMPORT_MAIN__
#include <emscripten/bind.h>
using namespace emscripten;

/**
 * Copy a bound vector of floats into a JavaScript Float32Array.
 *
 * The same trick the mesh accessors in moorhen-wrappers-helpers.h use: a typed_memory_view over
 * the C++ data, handed to the array's own `set`, so the whole thing moves in one memcpy rather
 * than a million calls to a bound vector's `get`.
 *
 * Takes the vector rather than the struct holding it, deliberately. getPositionsFromSimpleMesh
 * and its siblings take a whole simple_mesh_t back from JavaScript, which means embind rebuilds
 * the mesh - copying every vertex - on the way in. That is unavoidable when the data wanted is
 * inside the mesh. Here it is beside it, so taking the vector alone skips that copy entirely.
 * The getPositionsFromVertices family does the same for the mesh's own arrays.
 */
void getFloatsFromVector(const std::vector<float> &values, const emscripten::val &out){
    const emscripten::val view{emscripten::typed_memory_view(values.size(), values.data())};
    out.call<void>("set", view);
}

// simple_mesh_t is already registered as a value_object in moorhen-types-wrappers.cc, and
// std::vector<float> as "VectorFloat" there too. Neither is registered again here: embind refuses
// a duplicate registration at module load, and it does so with a message that names the type but
// not the file, which would be a thoroughly unpleasant thing to debug.
EMSCRIPTEN_BINDINGS(moorhen_gltf) {
    value_object<MoorhenGltfMesh>("MoorhenGltfMesh")
        .field("mesh", &MoorhenGltfMesh::mesh)
        .field("texCoords", &MoorhenGltfMesh::texCoords)
        .field("material", &MoorhenGltfMesh::material);
    register_vector<MoorhenGltfMesh>("VectorMoorhenGltfMesh");

    function("getFloatsFromVector", &getFloatsFromVector);
    function("LoadGltfGroupsFromFile", &LoadGltfGroupsFromFile);
    function("LoadGltFromFile", &LoadGltFromFile);
    function("LoadGltFromMemory", &LoadGltFromMemory);
}
#endif

#ifdef __GLTF_IMPORT_MAIN__
int main(int argc, char *argv[]){
    if(argc>1){
        tinygltf::Model model;
        const coot::simple_mesh_t mesh = LoadGltfModelFromFile(argv[1],model);
        if(mesh.status == 0) return 1;
        std::cout << mesh.vertices.size() << " vertices, "
                  << mesh.triangles.size() << " triangles" << std::endl;

        // The grouped path over the same file. Printed in a form the offline suite can check, so
        // that everything except the embind registration is exercised without a browser.
        const std::vector<MoorhenGltfMesh> groups = LoadGltfGroupsFromFile(argv[1]);
        std::cout << "groups " << groups.size() << std::endl;
        for (const auto &group : groups) {
            std::cout << "group material " << group.material
                      << " vertices " << group.mesh.vertices.size()
                      << " triangles " << group.mesh.triangles.size()
                      << " texcoords " << group.texCoords.size() << std::endl;
        }
        return 0;
    }
    return 1;
}
#endif
