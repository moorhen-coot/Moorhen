import re

def extract_moorhen_module_identifiers(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    # Extract the content inside declare module 'moorhen' { ... }
    match = re.search(r"declare module 'moorhen' \{(.*?)^\}", content, re.DOTALL | re.MULTILINE)
    if not match:
        return set()
    block = match.group(1)
    # Find all identifiers after let, class, interface, function, or directly before :
    identifiers = set(re.findall(r'\b(?:let|class|interface|function)\s+([A-Za-z0-9_]+)', block))
    # Also catch function declarations like: function foo(...)
    identifiers.update(re.findall(r'function\s+([A-Za-z0-9_]+)\s*\(', block))
    return set(name.strip() for name in identifiers)

def extract_exported_identifiers(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    # Find all exported identifiers (export ... Name ...)
    exports = set(re.findall(r'export\s+(?:declare\s+)?(?:type|interface|class|function|const|let|var)?\s*([A-Za-z0-9_]+)', content))
    return set(name.strip() for name in exports)

main_ids = extract_moorhen_module_identifiers('dist/types/main.d.ts')
moorhen_ids = extract_exported_identifiers('dist/moorhen.d.ts')

missing = main_ids - moorhen_ids

print("Identifiers in main.d.ts but NOT in moorhen.d.ts:")
for name in sorted(missing):
    print(name)