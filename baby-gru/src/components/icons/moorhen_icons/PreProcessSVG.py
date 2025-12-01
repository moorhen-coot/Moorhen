import os
import re
import xml.etree.ElementTree as ET
import sys

def extract_styles_from_css(css_text):
    """Extract CSS rules and convert to a dictionary, handling multi-selector rules."""
    styles = {}
    
    # Match both single and multi-selector rules: .cls-1, .cls-2 { ... } or .cls-1 { ... }
    # First, split by closing braces to get individual rules
    rules = re.split(r'\}', css_text)
    
    for rule in rules:
        rule = rule.strip()
        if not rule or '{' not in rule:
            continue
            
        # Split selector and properties
        parts = rule.split('{', 1)
        if len(parts) != 2:
            continue
            
        selectors = parts[0]
        properties = parts[1]
        
        # Parse properties
        style_dict = {}
        for prop in properties.split(';'):
            prop = prop.strip()
            if ':' in prop:
                key, value = prop.split(':', 1)
                style_dict[key.strip()] = value.strip()
        
        # Handle multiple selectors (e.g., ".cls-1, .cls-2, .cls-3")
        for selector in selectors.split(','):
            selector = selector.strip()
            # Extract class name
            match = re.match(r'\.([a-zA-Z0-9_-]+)', selector)
            if match:
                class_name = match.group(1)
                # Merge with existing styles for this class
                if class_name in styles:
                    styles[class_name].update(style_dict)
                else:
                    styles[class_name] = style_dict.copy()
    
    return styles

def is_black_color(color_value):
    """Check if a color value is black or very dark."""
    if not color_value:
        return False
    
    color = color_value.strip().lower()
    
    # Common black representations
    black_values = [
        '#000', '#000000', '#000000ff',
        'rgb(0, 0, 0)', 'rgb(0,0,0)',
        'rgba(0, 0, 0, 1)', 'rgba(0,0,0,1)',
        'black'
    ]
    
    return color in black_values

def remove_black_colors_from_style(style_string):
    """Replace black color properties with currentColor."""
    if not style_string:
        return style_string
    
    # Parse style properties
    properties = []
    for prop in style_string.split(';'):
        prop = prop.strip()
        if not prop or ':' not in prop:
            continue
        
        key, value = prop.split(':', 1)
        key = key.strip()
        value = value.strip()
        
        # Replace black colors with currentColor
        if key in ['fill', 'stroke', 'color', 'background-color'] and is_black_color(value):
            properties.append(f'{key}: currentColor')
            continue
        
        properties.append(f'{key}: {value}')
    
    return '; '.join(properties)

def remove_black_colors_from_svg(filepath, dry_run=False):
    """Replace black colors with currentColor in all SVG elements."""
    try:
        ET.register_namespace('', 'http://www.w3.org/2000/svg')
        
        tree = ET.parse(filepath)
        root = tree.getroot()
        
        modified = False
        
        # Process all elements
        for elem in root.iter():
            # Replace black colors in inline styles
            style_attr = elem.get('style')
            if style_attr:
                new_style = remove_black_colors_from_style(style_attr)
                if new_style != style_attr:
                    elem.set('style', new_style)
                    modified = True
            
            # Also replace fill and stroke attributes
            for attr in ['fill', 'stroke']:
                attr_value = elem.get(attr)
                if attr_value and is_black_color(attr_value):
                    elem.set(attr, 'currentColor')
                    modified = True
        
        if modified and not dry_run:
            tree.write(filepath, encoding='utf-8', xml_declaration=True)
        
        return modified
        
    except Exception as e:
        print(f"⚠️  Error removing black colors from {filepath}: {e}")
        import traceback
        traceback.print_exc()
        return False

def remove_black_colors_from_svg(filepath, dry_run=False):
    """Remove black colors from all SVG elements."""
    try:
        ET.register_namespace('', 'http://www.w3.org/2000/svg')
        
        tree = ET.parse(filepath)
        root = tree.getroot()
        
        modified = False
        
        # Process all elements
        for elem in root.iter():
            # Remove black colors from inline styles
            style_attr = elem.get('style')
            if style_attr:
                new_style = remove_black_colors_from_style(style_attr)
                if new_style != style_attr:
                    if new_style:
                        elem.set('style', new_style)
                    else:
                        del elem.attrib['style']
                    modified = True
            
            # Also check fill and stroke attributes
            for attr in ['fill', 'stroke']:
                attr_value = elem.get(attr)
                if attr_value and is_black_color(attr_value):
                    del elem.attrib[attr]
                    modified = True
        
        if modified and not dry_run:
            tree.write(filepath, encoding='utf-8', xml_declaration=True)
        
        return modified
        
    except Exception as e:
        print(f"⚠️  Error removing black colors from {filepath}: {e}")
        import traceback
        traceback.print_exc()
        return False

def convert_svg_styles_to_inline(filepath, dry_run=False, remove_black=False):
    """Convert CSS classes in SVG to inline styles."""
    try:
        # Read original file to preserve formatting
        with open(filepath, 'r', encoding='utf-8') as f:
            original_content = f.read()
        
        # Register namespace to preserve xmlns
        ET.register_namespace('', 'http://www.w3.org/2000/svg')
        
        tree = ET.parse(filepath)
        root = tree.getroot()
        
        # Find all style tags
        style_tags = root.findall('.//{http://www.w3.org/2000/svg}style') or root.findall('.//style')
        
        if not style_tags:
            return False
        
        # Extract all CSS rules
        all_styles = {}
        for style_tag in style_tags:
            if style_tag.text:
                all_styles.update(extract_styles_from_css(style_tag.text))
        
        if not all_styles:
            return False
        
        # Apply styles to elements with class attributes
        modified = False
        for elem in root.iter():
            class_attr = elem.get('class')
            if class_attr and class_attr in all_styles:
                # Build inline style string
                style_props = all_styles[class_attr]
                inline_style = '; '.join([f'{k}: {v}' for k, v in style_props.items()])
                
                # Merge with existing inline styles if any
                existing_style = elem.get('style', '')
                if existing_style:
                    inline_style = existing_style.rstrip(';') + '; ' + inline_style
                
                # Remove black colors if requested
                if remove_black:
                    inline_style = remove_black_colors_from_style(inline_style)
                
                # Set inline style and remove class
                if inline_style:
                    elem.set('style', inline_style)
                del elem.attrib['class']
                modified = True
        
        # Also remove black colors from existing inline styles if requested
        if remove_black:
            for elem in root.iter():
                style_attr = elem.get('style')
                if style_attr:
                    new_style = remove_black_colors_from_style(style_attr)
                    if new_style != style_attr:
                        if new_style:
                            elem.set('style', new_style)
                        else:
                            del elem.attrib['style']
                        modified = True
                
                # Also check fill and stroke attributes
                for attr in ['fill', 'stroke']:
                    attr_value = elem.get(attr)
                    if attr_value and is_black_color(attr_value):
                        del elem.attrib[attr]
                        modified = True
        
        if not modified:
            return False
        
        # Remove style tags and defs if empty
        for style_tag in style_tags:
            # Find parent (could be defs or root)
            for parent in root.iter():
                if style_tag in list(parent):
                    parent.remove(style_tag)
                    # Remove defs if it's now empty
                    if parent.tag.endswith('defs') and len(parent) == 0:
                        for grandparent in root.iter():
                            if parent in list(grandparent):
                                grandparent.remove(parent)
                    break
        
        if not dry_run:
            # Write back to file
            tree.write(filepath, encoding='utf-8', xml_declaration=True)
            return True
        
        return True
        
    except Exception as e:
        print(f"⚠️  Error converting {filepath}: {e}")
        import traceback
        traceback.print_exc()
        return False

def generate_index(auto_convert=False, remove_black=False):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    files = [f for f in os.listdir(".") if f.endswith(".svg")]
    svg_names = [n.split(".")[0] for n in files]
    
    # Check and optionally convert problematic SVG files
    problematic_files = []
    converted_files = []
    black_removed_files = []
    
    for filename in files:
        has_styles = convert_svg_styles_to_inline(filename, dry_run=not auto_convert, remove_black=remove_black)
        if has_styles:
            if auto_convert:
                converted_files.append(filename)
            else:
                problematic_files.append(filename)
        
        # Remove black colors from all files if requested
        if remove_black and auto_convert:
            had_black = remove_black_colors_from_svg(filename, dry_run=False)
            if had_black and filename not in converted_files:
                black_removed_files.append(filename)
    
    # Generate imports
    imports = [f'import {n} from "./{n}.svg"\n' for n in svg_names]
    
    # Generate export
    export = "\nexport const moorhenSVGs = {"
    for name in svg_names:
        export += f'"{name}": {name},\n '
    export += "}\n"
    
    # Generate types
    types = "\nexport type MoorhenSVG = "
    for i, name in enumerate(svg_names):
        types += f'"{name}"'
        if i < len(svg_names) - 1:
            types += " |\n "
    types += "\n"
    
    # Write to file
    with open("./index.ts", "w") as f:
        f.write("".join(imports))
        f.write(export)
        f.write(types)
    
    # Print results
    print(f"✅ Generated index.ts with {len(svg_names)} SVG files")
    
    if converted_files:
        print(f"\n✅ Auto-converted {len(converted_files)} SVG files to use inline styles:")
        for filename in converted_files:
            print(f"   - {filename}")
    
    if black_removed_files:
        print(f"\n🎨 Removed black colors from {len(black_removed_files)} additional SVG files:")
        for filename in black_removed_files:
            print(f"   - {filename}")
    
    if remove_black and auto_convert:
        total_modified = len(converted_files) + len(black_removed_files)
        print(f"\n✅ Total files modified: {total_modified}")
    
    if problematic_files:
        print("\n⚠️  WARNING: The following SVG files contain <style> tags:")
        print("   Run with --convert flag to automatically convert them.\n")
        for filename in problematic_files:
            print(f"   - {filename}")
        print("\n   Usage: python PopulateIndex.py --convert [--remove-black]")
    
    if not problematic_files and not converted_files:
        print("✅ All SVG files are using inline styles")

if __name__ == "__main__":
    auto_convert = "--convert" in sys.argv or "-c" in sys.argv
    remove_black = "--remove-black" in sys.argv or "--no-black" in sys.argv or "-r" in sys.argv
    
    if auto_convert:
        print("🔄 Auto-converting CSS classes to inline styles...\n")
        if remove_black:
            print("🎨 Removing black colors from ALL SVG files...\n")
    
    generate_index(True, True)