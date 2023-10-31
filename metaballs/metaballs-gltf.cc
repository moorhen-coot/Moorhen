#include <iostream>
#include <algorithm>

#include "MC.h"

#define TINYGLTF_IMPLEMENTATION
#define STB_IMAGE_IMPLEMENTATION
#define STB_IMAGE_WRITE_IMPLEMENTATION
#include "tiny_gltf.h"

#define BYTE3(value) static_cast<unsigned char> ((value >> 24) & 0xFF)
#define BYTE2(value) static_cast<unsigned char> ((value >> 16) & 0xFF)
#define BYTE1(value) static_cast<unsigned char> ((value >> 8) & 0xFF)
#define BYTE0(value) static_cast<unsigned char> ((value) & 0xFF)

namespace MoorhenMetaBalls {
union VertexData {
    uint32_t u;
    float v;
};

void WriteMeshToglTF(const MC::mcMesh &mesh, const std::string &fileName){
    float new_min_x =  1e8;
    float new_max_x = -1e8;
    float new_min_y =  1e8;
    float new_max_y = -1e8;
    float new_min_z =  1e8;
    float new_max_z = -1e8;
    for(unsigned iv=0;iv<mesh.vertices.size();iv++){
        new_min_x = std::min(mesh.vertices[iv].x,new_min_x);
        new_min_y = std::min(mesh.vertices[iv].y,new_min_y);
        new_min_z = std::min(mesh.vertices[iv].z,new_min_z);
        new_max_x = std::max(mesh.vertices[iv].x,new_max_x);
        new_max_y = std::max(mesh.vertices[iv].y,new_max_y);
        new_max_z = std::max(mesh.vertices[iv].z,new_max_z);
    }
    std::cout << "final x range:" << new_min_x << " " << new_max_x << std::endl;
    std::cout << "final y range:" << new_min_y << " " << new_max_y << std::endl;
    std::cout << "final z range:" << new_min_z << " " << new_max_z << std::endl;

    float norm_min_x =  1e8;
    float norm_max_x = -1e8;
    float norm_min_y =  1e8;
    float norm_max_y = -1e8;
    float norm_min_z =  1e8;
    float norm_max_z = -1e8;
    for(unsigned iv=0;iv<mesh.normals.size();iv++){
        norm_min_x = std::min(mesh.normals[iv].x,norm_min_x);
        norm_min_y = std::min(mesh.normals[iv].y,norm_min_y);
        norm_min_z = std::min(mesh.normals[iv].z,norm_min_z);
        norm_max_x = std::max(mesh.normals[iv].x,norm_max_x);
        norm_max_y = std::max(mesh.normals[iv].y,norm_max_y);
        norm_max_z = std::max(mesh.normals[iv].z,norm_max_z);
    }
    std::cout << "normal x range:" << norm_min_x << " " << norm_max_x << std::endl;
    std::cout << "normal y range:" << norm_min_y << " " << norm_max_y << std::endl;
    std::cout << "normal z range:" << norm_min_z << " " << norm_max_z << std::endl;

    tinygltf::Model m;
    tinygltf::Scene scene;
    tinygltf::Mesh gltf_mesh;
    tinygltf::Primitive primitive;
    tinygltf::Node node;
    tinygltf::Buffer buffer;
    tinygltf::BufferView bufferView1;
    tinygltf::BufferView bufferView2;
    tinygltf::BufferView bufferView3;
    tinygltf::Accessor accessor1;
    tinygltf::Accessor accessor2;
    tinygltf::Accessor accessor3;
    tinygltf::Asset asset;

    std::vector<unsigned char> data;
    for(unsigned ii=0;ii<mesh.indices.size();ii++){
        data.push_back(BYTE0(mesh.indices[ii]));
        data.push_back(BYTE1(mesh.indices[ii]));
        data.push_back(BYTE2(mesh.indices[ii]));
        data.push_back(BYTE3(mesh.indices[ii]));
    }

    std::cout << "buffer length " << data.size() << std::endl;
    int padSize = data.size() % 8;
    for(int ipad=0;ipad<padSize;ipad++){
        data.push_back(0);
    }
    int bufferIndexSize = data.size();
    std::cout << "padded buffer length " << bufferIndexSize << std::endl;

    int idxLength = bufferIndexSize-padSize;

    for(unsigned ii=0;ii<mesh.vertices.size();ii++){
        VertexData vx;
        VertexData vy;
        VertexData vz;
        vx.v = mesh.vertices[ii].x;
        vy.v = mesh.vertices[ii].y;
        vz.v = mesh.vertices[ii].z;
        data.push_back(BYTE0(vx.u));
        data.push_back(BYTE1(vx.u));
        data.push_back(BYTE2(vx.u));
        data.push_back(BYTE3(vx.u));
        data.push_back(BYTE0(vy.u));
        data.push_back(BYTE1(vy.u));
        data.push_back(BYTE2(vy.u));
        data.push_back(BYTE3(vy.u));
        data.push_back(BYTE0(vz.u));
        data.push_back(BYTE1(vz.u));
        data.push_back(BYTE2(vz.u));
        data.push_back(BYTE3(vz.u));
    }

    int vertLength = data.size()-bufferIndexSize;
    int vertOffset = bufferIndexSize;

    int padSize2 = data.size() % 8;
    for(int ipad=0;ipad<padSize2;ipad++){
        data.push_back(0);
    }
    int normOffset = data.size();
    std::cout << "second padded buffer length " << data.size() << std::endl;

    for(unsigned ii=0;ii<mesh.normals.size();ii++){
        VertexData vx;
        VertexData vy;
        VertexData vz;
        vx.v = mesh.normals[ii].x;
        vy.v = mesh.normals[ii].y;
        vz.v = mesh.normals[ii].z;
        data.push_back(BYTE0(vx.u));
        data.push_back(BYTE1(vx.u));
        data.push_back(BYTE2(vx.u));
        data.push_back(BYTE3(vx.u));
        data.push_back(BYTE0(vy.u));
        data.push_back(BYTE1(vy.u));
        data.push_back(BYTE2(vy.u));
        data.push_back(BYTE3(vy.u));
        data.push_back(BYTE0(vz.u));
        data.push_back(BYTE1(vz.u));
        data.push_back(BYTE2(vz.u));
        data.push_back(BYTE3(vz.u));
    }

    // This is the raw data buffer. ?????
    buffer.data = data;

    bufferView1.buffer = 0;
    bufferView1.byteOffset=0;
    bufferView1.byteLength=idxLength;
    bufferView1.target = TINYGLTF_TARGET_ELEMENT_ARRAY_BUFFER;

    bufferView2.buffer = 0;
    bufferView2.byteOffset=vertOffset;
    bufferView2.byteLength=vertLength;
    bufferView2.target = TINYGLTF_TARGET_ARRAY_BUFFER;

    bufferView3.buffer = 0;
    bufferView3.byteOffset=normOffset;
    bufferView3.byteLength=vertLength;
    bufferView3.target = TINYGLTF_TARGET_ARRAY_BUFFER;

    // Describe the layout of bufferView1, the indices of the vertices
    accessor1.bufferView = 0;
    accessor1.byteOffset = 0;
    accessor1.componentType = TINYGLTF_COMPONENT_TYPE_UNSIGNED_INT;
    accessor1.count = mesh.indices.size();
    accessor1.type = TINYGLTF_TYPE_SCALAR;
    accessor1.maxValues.push_back(mesh.vertices.size()-1);
    accessor1.minValues.push_back(0);

    // Describe the layout of bufferView2, the vertices
    accessor2.bufferView = 1;
    accessor2.byteOffset = 0;
    accessor2.componentType = TINYGLTF_COMPONENT_TYPE_FLOAT;
    accessor2.count = mesh.vertices.size();
    accessor2.type = TINYGLTF_TYPE_VEC3;
    accessor2.minValues = {new_min_x,new_min_y,new_min_z};
    accessor2.maxValues = {new_max_x,new_max_y,new_max_z};

    // Describe the layout of bufferView3, the normals
    accessor3.bufferView = 2;
    accessor3.byteOffset = 0;
    accessor3.componentType = TINYGLTF_COMPONENT_TYPE_FLOAT;
    accessor3.count = mesh.normals.size();
    accessor3.type = TINYGLTF_TYPE_VEC3;
    accessor3.maxValues = {1.0, 1.0, 1.0};
    accessor3.minValues = {-1.0, -1.0, -1.0};
    accessor3.minValues = {norm_min_x,norm_min_y,norm_min_z};
    accessor3.maxValues = {norm_max_x,norm_max_y,norm_max_z};

    // Build the mesh primitive and add it to the mesh
    primitive.indices = 0;                 // The index of the accessor for the vertex indices
    primitive.attributes["POSITION"] = 1;  // The index of the accessor for positions
    primitive.attributes["NORMAL"] = 2;  // The index of the accessor for positions
    primitive.material = 0;
    primitive.mode = TINYGLTF_MODE_TRIANGLES;
    gltf_mesh.primitives.push_back(primitive);

    // Other tie ups
    node.mesh = 0;
    scene.nodes.push_back(0); // Default scene

    // Define the asset. The version is required
    asset.version = "2.0";
    asset.generator = "tinygltf";

    // Now all that remains is to tie back all the loose objects into the
    // our single model.
    m.scenes.push_back(scene);
    m.meshes.push_back(gltf_mesh);
    m.nodes.push_back(node);
    m.buffers.push_back(buffer);
    m.bufferViews.push_back(bufferView1);
    m.bufferViews.push_back(bufferView2);
    m.bufferViews.push_back(bufferView3);
    m.accessors.push_back(accessor1);
    m.accessors.push_back(accessor2);
    m.accessors.push_back(accessor3);
    m.asset = asset;

    // Create a simple material
    tinygltf::Material mat;
    mat.pbrMetallicRoughness.baseColorFactor = {1.0f, 0.9f, 0.9f, 1.0f};  
    mat.doubleSided = true;
    m.materials.push_back(mat);

    tinygltf::TinyGLTF saver;
    saver.WriteGltfSceneToFile(&m,fileName,true,true,true,false);

}

}
