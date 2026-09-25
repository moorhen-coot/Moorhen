#ifndef TINYGLTF_IMPLEMENTATION
#define TINYGLTF_IMPLEMENTATION
#endif
#ifndef STB_IMAGE_IMPLEMENTATION
#define STB_IMAGE_IMPLEMENTATION
#endif
#ifndef STB_IMAGE_WRITE_IMPLEMENTATION
#define STB_IMAGE_WRITE_IMPLEMENTATION
#endif
#ifndef STB_IMAGE_READ_IMPLEMENTATION
#define STB_IMAGE_READ_IMPLEMENTATION
#endif

#include <tiny_gltf.h>

#include <fstream>
#include <iostream>
#include <string>

/*
POSITION  -> VEC3 float
NORMAL    -> VEC3 float
TEXCOORD_0-> VEC2 float  //TODO
COLOR_0   -> VEC3/VEC4 float or normalized ubyte //TODO partially
INDICES   -> ubyte, ushort or uint
*/

bool LoadGltfModel(tinygltf::Model& model);
bool LoadGltfModelFromMemory(tinygltf::Model& model, const std::vector<unsigned char> buffer, const std::string str);

bool LoadGltfModelFromFile(const std::string& filename, tinygltf::Model& model){
    std::vector<unsigned char> buffer;
    std::string str;

    if (filename.size() >= 4 && filename.substr(filename.size() - 4) == ".glb"){
        std::ifstream is(filename, std::ios_base::binary);
        if (is) {
            // get length of file:
            is.seekg (0, is.end);
            int length = is.tellg();
            is.seekg (0, is.beg);


            // read data as a block:
            buffer.resize(length);
            is.read(reinterpret_cast<char *>(&buffer.at(0)),length);

            if (is){
                std::cout << "all characters read successfully." << std::endl;
            } else {
                std::cout << "error: only " << is.gcount() << " could be read" << std::endl;
                return false;
            }
            is.close();
        }
    } else {
	std::ifstream file(filename.c_str());
	std::stringstream sbuffer;
	sbuffer << file.rdbuf();
        str = sbuffer.str();
    }

    return  LoadGltfModelFromMemory(model, buffer, str);
    
}

bool LoadGltfModelFromMemory(tinygltf::Model& model, const std::vector<unsigned char> buffer, const std::string str){
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
        return false;
    }

    return LoadGltfModel(model);
}

bool LoadGltfModel(tinygltf::Model& model){
    for(const auto &m : model.meshes){
        std::cout << m.name << std::endl;
        std::cout << m.primitives.size() << std::endl;

        for (const auto& primitive : m.primitives){
            auto posIt = primitive.attributes.find("POSITION");
            if (posIt == primitive.attributes.end())
                continue;

            const tinygltf::Accessor& accessor =
                model.accessors[posIt->second];

            const tinygltf::BufferView& bufferView =
                model.bufferViews[accessor.bufferView];

            const tinygltf::Buffer& buffer =
                model.buffers[bufferView.buffer];

            const float* positions = reinterpret_cast<const float*>(&buffer.data[bufferView.byteOffset + accessor.byteOffset]);

            size_t vertexCount = accessor.count;

            for (size_t i = 0; i < vertexCount; i++){
                float x = positions[i * 3 + 0];
                float y = positions[i * 3 + 1];
                float z = positions[i * 3 + 2];
                std::cout << x << " " << y << " " << z << "\n";
            }

            auto nIt = primitive.attributes.find("NORMAL");
            if (nIt != primitive.attributes.end()){
                const auto& accessor = model.accessors[nIt->second];

                const auto& view = model.bufferViews[accessor.bufferView];

                const auto& buffer = model.buffers[view.buffer];

                const float* normals = reinterpret_cast<const float*>(&buffer.data[view.byteOffset + accessor.byteOffset]);

                size_t vertexCount = accessor.count;

                for (size_t i = 0; i < vertexCount; i++){
                    float x = normals[i * 3 + 0];
                    float y = normals[i * 3 + 1];
                    float z = normals[i * 3 + 2];
                    std::cout << x << " " << y << " " << z << "\n";
                }
            }

            auto cIt = primitive.attributes.find("COLOR_0");
            if (cIt != primitive.attributes.end()){
                const auto& c_accessor = model.accessors[cIt->second];

                std::cout << c_accessor.componentType << "\n";
                std::cout << c_accessor.type << "\n";
                std::cout << c_accessor.normalized << "\n";
                const auto& view = model.bufferViews[c_accessor.bufferView];
                const float* colors = reinterpret_cast<const float*>(&buffer.data[view.byteOffset + c_accessor.byteOffset]);
                std::cout << c_accessor.count << std::endl;

                if(c_accessor.type==4){
                    size_t vertexCount = c_accessor.count;
                    for (size_t i = 0; i < vertexCount; i++){
                        float x = colors[i * 4 + 0];
                        float y = colors[i * 4 + 1];
                        float z = colors[i * 4 + 2];
                        float a = colors[i * 4 + 3];
                        std::cout << x << " " << y << " " << z << " " << a << "\n";
                    }
                }
            }

            const auto& i_accessor = model.accessors[primitive.indices];
            const auto& i_view = model.bufferViews[i_accessor.bufferView];
            const auto& i_buffer = model.buffers[i_view.buffer];
            const unsigned char* data = i_buffer.data.data() + i_view.byteOffset + i_accessor.byteOffset;
            std::cout << i_accessor.type << "\n";

            if (i_accessor.componentType == TINYGLTF_COMPONENT_TYPE_UNSIGNED_SHORT){
                const uint16_t* indices = reinterpret_cast<const uint16_t*>(data);
                for (size_t i = 0; i< accessor.count; i++) std::cout << indices[i] << "\n";
            } else if (i_accessor.componentType == TINYGLTF_COMPONENT_TYPE_UNSIGNED_INT){
                const uint32_t* indices = reinterpret_cast<const uint32_t*>(data);
                for (size_t i = 0; i< accessor.count; i++) std::cout << indices[i] << "\n";
            } else if (i_accessor.componentType == TINYGLTF_COMPONENT_TYPE_UNSIGNED_BYTE){
                const unsigned char* indices = reinterpret_cast<const unsigned char*>(data);
                for (size_t i = 0; i< accessor.count; i++) std::cout << indices[i] << "\n";
            }
        }
    }

    return true;
}

#ifdef __GLTF_IMPORT_MAIN__
int main(int argc, char *argv[]){
    if(argc>1){
        tinygltf::Model model;
        bool retval = LoadGltfModelFromFile(argv[1],model);
        if(!retval) return 1;
        return 0;
    }
    return 1;
}
#endif
