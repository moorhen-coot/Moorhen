from logging import root
import os
import subprocess

script_dir = os.path.dirname(os.path.abspath(__file__))
store_dir = os.path.join(script_dir, "../src/store/")

subprocess.run(["npx", "tsx", os.path.join(script_dir, "generateRootState.ts")], check=True)
for file in os.listdir(store_dir):
    if file != "index.ts" and file != "MoorhenReduxStore.ts":
        with open(os.path.join(store_dir, file),"r") as f:
            content = f.read()
            content_start = content.find("const initialState:")
            content_end = content.find("} = {", content_start)

with open(os.path.join(script_dir, "RootState.d.ts"),"r") as f:
    content = f.read()
    content_start = content.find("export type RootState = {")
    root_state_content = content[content_start:]

formatted_rootstate = root_state_content.replace(": {", ": {\n    ").replace(";   ",";\n       ").replace(";};", ";\n    };\n")

# with open(os.path.join(script_dir, "../dist/moorhen.d.ts"),"r") as f:
#     content= f.read()
#     RootState_start = content.find("dispatch: ThunkDispatch<") + len("dispatch: ThunkDispatch<")
#     RootState_end = content.find(", undefined, import(\"redux\").UnknownAction>;", RootState_start)

# new_rootState = content[RootState_start:RootState_end] + ";\n"

with open(os.path.join(script_dir, "../dist/moorhen.d.ts"),"r") as f:
    dts_content = f.read()
    old_root_state_start = dts_content.find("export type RootState = {")
    old_root_state_end = dts_content.find("};", old_root_state_start) + 2
    old_root_state = dts_content[old_root_state_start:old_root_state_end]

dts_content = dts_content.replace(old_root_state, formatted_rootstate)


with open(os.path.join(script_dir, "../dist/moorhen.d.ts"),"r") as f:
    if "//RootState type updated by replaceRootState.py" not in f.read():
        with open(os.path.join(script_dir, "../dist/moorhen.d.ts"),"w") as f:  
            f.write("//RootState type updated by replaceRootState.py\n")
            f.write(dts_content)  

subprocess.run(["rm", os.path.join(script_dir, "RootState.d.ts")], check=True)