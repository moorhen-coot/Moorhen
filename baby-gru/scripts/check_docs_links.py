"""Check relative links in the hand-authored docs pages (docs/, excluding docs/api)."""
import html.parser
import os
import re
import sys

ROOT = "docs"
BAD = []
CHECKED = 0


class LinkParser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name in ("href", "src"):
                self.links.append(value)


def collect():
    files = []
    for dirpath, _dirnames, filenames in os.walk(ROOT):
        if os.path.abspath(dirpath).startswith(os.path.abspath(os.path.join(ROOT, "api"))):
            continue
        for name in filenames:
            if name.endswith(".html"):
                files.append(os.path.join(dirpath, name))
    return files


for path in collect():
    with open(path, encoding="utf-8") as handle:
        text = handle.read()
    parser = LinkParser()
    parser.feed(text)
    for link in parser.links:
        if re.match(r"^(https?:|mailto:|data:|#|//)", link):
            continue
        target, _, _frag = link.partition("#")
        if not target:
            continue
        CHECKED += 1
        resolved = os.path.normpath(os.path.join(os.path.dirname(path), target))
        if not os.path.exists(resolved):
            BAD.append(f"{path} -> {link}")

print(f"checked {CHECKED} relative links in hand-authored pages")
if BAD:
    print(f"BROKEN: {len(BAD)}")
    for item in BAD:
        print("  " + item)
    sys.exit(1)
print("BROKEN: none")
