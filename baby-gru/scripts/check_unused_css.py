#!/usr/bin/env python3
"""
check_unused_css.py - find CSS classes defined under src/ that are not used in the app.

For every *.css file under --css-dir (default src/) this script lists every class
selector (.foo) it defines, then classifies each class as:

  USED      the class name appears as a token in a string literal in the app code
  DYNAMIC   the class name is built at runtime from a template-literal prefix
            (e.g. `moorhen__accordion-toggle-${isOpen ? "open" : "close"}` -> the
            full names ...-open / ...-close are never written as literals)
  VERIFY    a short generic "state" class (active, disabled, open, ...) that static
            analysis cannot confidently confirm - needs a manual look
  UNUSED    no reference found anywhere - a candidate for deletion

Usage corpus (where class usages are looked up), by default the app source:
  src/**/*.{ts,tsx,js,jsx}

Optionally pass --dist to ALSO scan the compiled bundles dist/*.js. The dist JS
contains no inlined CSS (webpack + MiniCssExtractPlugin extract it to
dist/public/MoorhenAssets/moorhen.css), so class-name tokens found there are real
usages - including classes applied by bundled third-party code.

Requires: tinycss2  (pip install tinycss2, or: uv pip install --python .venv/bin/python tinycss2)

Examples:
  .venv/bin/python scripts/check_unused_css.py
  .venv/bin/python scripts/check_unused_css.py --json
  .venv/bin/python scripts/check_unused_css.py --dist --verbose
  .venv/bin/python scripts/check_unused_css.py --fail-on-unused
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

import tinycss2

SOURCE_EXTS = (".ts", ".tsx", ".js", ".jsx")
SKIP_SUFFIX = ".d.ts"

# Short generic "state"/"modifier" classes. Static analysis can rarely confirm
# these (they are often toggled via classList or applied by libraries), so when
# they are not found they are reported as VERIFY instead of confidently UNUSED.
DEFAULT_STATE_CLASSES = frozenset({
    "active", "disabled", "open", "close", "closed", "shown", "hidden",
    "visible", "invalid", "selected", "hover", "focus", "checked",
    "expanded", "collapsed", "loading", "error", "success", "warning",
    "no_animation", "two-lines", "table", "card", "default",
})

# A class-name shaped token: starts with a letter/underscore, then word chars.
CLASS_TOKEN_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_-]*")
# A token that ends with a class separator (- or _): could be a template prefix.
PREFIX_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_-]*[-_]$")
MIN_PREFIX_LEN = 6
MIN_CLASS_LEN = 2

# Vendor-prefixed @keyframes at-rule keywords whose name is an animation name.
KEYFRAME_KW = frozenset({
    "keyframes", "-webkit-keyframes", "-moz-keyframes", "-o-keyframes",
})


# ---------------------------------------------------------------------------
# CSS side: collect the classes each CSS file defines
# ---------------------------------------------------------------------------

def classes_in_tokens(tokens, found):
    """Recursively collect (class_name, line) for every `.foo` in a token list."""
    i, n = 0, len(tokens)
    while i < n:
        tok = tokens[i]
        ttype = tok.type
        if ttype == "literal" and tok.value == ".":
            nxt = tokens[i + 1] if i + 1 < n else None
            if nxt is not None and nxt.type == "ident":
                found.append((nxt.value, nxt.source_line))
        elif ttype == "function":
            if tok.arguments is not None:
                classes_in_tokens(list(tok.arguments), found)
        elif ttype in ("{} block", "[] block", "() block"):
            if tok.content is not None:
                classes_in_tokens(list(tok.content), found)
        i += 1


def keyframes_in_tokens(tokens, found):
    """Collect the names of every `@keyframes <name> { ... }` in a token list."""
    i, n = 0, len(tokens)
    while i < n:
        tok = tokens[i]
        ttype = tok.type
        if ttype == "at-keyword" and tok.lower_value in KEYFRAME_KW:
            j = i + 1
            while j < n:
                nt = tokens[j]
                if nt.type == "ident":
                    found.add(nt.value)
                    break
                if nt.type == "{} block":
                    break
                j += 1
        elif ttype in ("function", "{} block", "[] block", "() block"):
            content = tok.arguments if ttype == "function" else tok.content
            if content is not None:
                keyframes_in_tokens(list(content), found)
        i += 1


def parse_css_file(css_path):
    """Return (list of (class_name, line), set of @keyframes names) in a CSS file."""
    text = css_path.read_text(encoding="utf-8", errors="replace")
    try:
        # Comments/whitespace come back as their own token types and are ignored
        # by classes_in_tokens, so no skip_* flags are needed.
        tokens = tinycss2.parse_component_value_list(text)
    except Exception as exc:  # pragma: no cover - defensive
        print(f"  [warn] failed to parse {css_path}: {exc}", file=sys.stderr)
        return [], set()
    found = []
    classes_in_tokens(list(tokens), found)
    keyframes = set()
    keyframes_in_tokens(list(tokens), keyframes)
    return found, keyframes


# ---------------------------------------------------------------------------
# JS/TS side: extract the class names referenced by the app
# ---------------------------------------------------------------------------

def extract_strings(text):
    """Return (strings, template_static).

    strings          list of (content, line) for '...' and "..." literals,
                     including those nested inside ${...} template expressions
    template_static  list of (content, line) static segments of `...` templates
                     (outside ${...})

    Comments (/* */ and //) are skipped; strings and templates are preserved.
    """
    strings = []
    template_static = []
    _scan_code(text, 0, len(text), strings, template_static)
    return strings, template_static


def _line_at(text, index):
    """1-based line number of the character at `index` in `text`."""
    return text.count("\n", 0, index) + 1


def _scan_code(text, start, end, strings, template_static):
    """Scan a JS/TS code region for string and template literals."""
    i = start
    while i < end:
        c = text[i]
        if c in "'\"":
            j, buf = _read_quoted(text, i, end, c)
            strings.append(("".join(buf), _line_at(text, i)))
            i = j
        elif c == "`":
            i = _read_template(text, i, end, strings, template_static)
        elif c == "/" and i + 1 < end and text[i + 1] == "*":
            j = text.find("*/", i + 2)
            i = end if j == -1 or j >= end else j + 2
        elif c == "/" and i + 1 < end and text[i + 1] == "/":
            j = text.find("\n", i + 2)
            i = end if j == -1 or j >= end else j + 1
        else:
            i += 1


def _read_quoted(text, i, end, quote):
    """Read a '...' or "..." literal starting at text[i]; return (end_idx, chars)."""
    buf = []
    j = i + 1
    while j < end:
        ch = text[j]
        if ch == "\\":
            buf.append(ch)
            if j + 1 < end:
                buf.append(text[j + 1])
            j += 2
            continue
        if ch == quote or ch == "\n":
            return j + 1, buf
        buf.append(ch)
        j += 1
    return j, buf


def _read_template(text, i, end, strings, template_static):
    """Read a `...` template starting at text[i]; return index after it.

    Static text outside ${...} is appended to template_static; the ${...}
    expressions are JS code and are scanned recursively (so nested strings and
    nested backtick templates are captured too).
    """
    line = _line_at(text, i)
    j = i + 1
    buf = []
    while j < end:
        ch = text[j]
        if ch == "\\":
            buf.append(ch)
            if j + 1 < end:
                buf.append(text[j + 1])
            j += 2
            continue
        if ch == "`":
            if buf:
                template_static.append(("".join(buf), line))
            return j + 1
        if ch == "$" and j + 1 < end and text[j + 1] == "{":
            if buf:
                template_static.append(("".join(buf), line))
            buf = []
            close = _find_matching_brace(text, j + 2, end, strings, template_static)
            if close is None:
                return end
            _scan_code(text, j + 2, close, strings, template_static)
            j = close + 1
            continue
        buf.append(ch)
        j += 1
    if buf:
        template_static.append(("".join(buf), line))
    return end


def _find_matching_brace(text, start, end, strings, template_static):
    """Return index of the '}' matching the one that opened just before 'start'."""
    depth = 1
    j = start
    while j < end:
        ch = text[j]
        if ch == "\\":
            j += 2
            continue
        if ch in "'\"":
            q = ch
            j += 1
            while j < end:
                qc = text[j]
                if qc == "\\":
                    j += 2
                    continue
                if qc == q or qc == "\n":
                    break
                j += 1
            j += 1
            continue
        if ch == "`":
            j = _read_template(text, j, end, strings, template_static)
            continue
        if ch == "/" and j + 1 < end and text[j + 1] == "/":
            k = text.find("\n", j + 2)
            j = end if k == -1 else k
            continue
        if ch == "/" and j + 1 < end and text[j + 1] == "*":
            k = text.find("*/", j + 2)
            j = end if k == -1 else k + 2
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return j
        j += 1
    return None


def _looks_like_class_string(s):
    """Heuristic: is this string content plausibly a CSS class (list)?"""
    if not s or not s.strip():
        return False
    # import paths, urls, pixmap paths, template glue, ids, spreads...
    if any(ch in s for ch in "/\\@#?={}"):
        return False
    if ".." in s or "." in s:  # paths, versions, qualified names
        return False
    if s.strip()[0] in ".$&":
        return False
    return True


def collect_usage(paths, dist_mode):
    """Scan JS/TS sources (and optionally dist bundles) for class tokens.

    Returns (referenced, prefixes, ref_locations):
      referenced      set of class-name tokens found in string literals
      prefixes        template-literal prefix fragments ending in -/_
      ref_locations   dict token -> list of (path, line) where it is referenced
    """
    referenced = set()
    prefixes = set()
    ref_locations = {}
    for path in paths:
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        strings, template_static = extract_strings(text)

        def note(tok, line):
            referenced.add(tok)
            ref_locations.setdefault(tok, []).append((str(path), line))

        # Dynamic prefixes: static segments of templates ending in -/_ ,
        # e.g. `moorhen__accordion-toggle-${...}` -> "moorhen__accordion-toggle-"
        for seg, _line in template_static:
            for m in CLASS_TOKEN_RE.finditer(seg):
                tok = m.group()
                if len(tok) >= MIN_PREFIX_LEN and PREFIX_RE.match(tok):
                    prefixes.add(tok)
        # In dist mode the compiled concatenation turns template prefixes into
        # plain strings too, so also consider those.
        if dist_mode:
            for s, _line in strings:
                for m in CLASS_TOKEN_RE.finditer(s):
                    tok = m.group()
                    if len(tok) >= MIN_PREFIX_LEN and PREFIX_RE.match(tok):
                        prefixes.add(tok)

        # Class tokens from every plausible string.
        for s, line in strings + template_static:
            if not _looks_like_class_string(s):
                continue
            for m in CLASS_TOKEN_RE.finditer(s):
                tok = m.group()
                if len(tok) >= MIN_CLASS_LEN:
                    note(tok, line)
    return referenced, prefixes, ref_locations


def source_files(root):
    out = []
    for ext in SOURCE_EXTS:
        for p in Path(root).rglob("*" + ext):
            if p.name.endswith(SKIP_SUFFIX):
                continue
            out.append(p)
    return out


def dist_bundles(dist_dir):
    return sorted(Path(dist_dir).glob("*.js"))


def is_dynamic(class_name, prefixes):
    """True if class_name is built from a template prefix (e.g. ...-open)."""
    for p in prefixes:
        if len(p) < len(class_name) and class_name.startswith(p):
            rest = class_name[len(p):]
            if rest and re.fullmatch(r"[A-Za-z0-9_-]+", rest):
                return True
    return False


# ---------------------------------------------------------------------------
# CLI + reporting
# ---------------------------------------------------------------------------

def main(argv=None):
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--css-dir", default="src",
                    help="root dir scanned for *.css (default: src)")
    ap.add_argument("--usage-src", default="src",
                    help="root dir scanned for app code (default: src)")
    ap.add_argument("--dist", action="store_true",
                    help="also scan dist/*.js bundles for class usage")
    ap.add_argument("--json", action="store_true", help="emit JSON instead of text")
    ap.add_argument("--verbose", action="store_true",
                    help="also list used and dynamic classes per file")
    ap.add_argument("--no-state-list", action="store_true",
                    help="treat generic state classes as plain unused")
    ap.add_argument("--state-classes", nargs="+",
                    help="override the generic state-class list")
    ap.add_argument("--min-class-len", type=int, default=MIN_CLASS_LEN)
    ap.add_argument("--fail-on-unused", action="store_true",
                    help="exit 1 if any unused class is found")
    args = ap.parse_args(argv)

    css_root = Path(args.css_dir)
    if not css_root.is_dir():
        print(f"error: CSS dir not found: {css_root}", file=sys.stderr)
        return 2
    css_files = sorted(css_root.rglob("*.css"))
    if not css_files:
        print(f"error: no *.css found under {css_root}", file=sys.stderr)
        return 2

    # 1) Classes each CSS file defines (+ @keyframes names across all files).
    defined = {}
    keyframes = set()
    for css_path in css_files:
        classes, kfs = parse_css_file(css_path)
        defined[css_path] = classes
        keyframes |= kfs
    all_defined = {name for lst in defined.values() for name, _ in lst}

    # 2) Usage corpus.
    usage_paths = source_files(args.usage_src)
    dist_paths = dist_bundles("dist") if args.dist else []
    if args.dist and not dist_paths:
        print("[warn] --dist requested but no dist/*.js found; using src only",
              file=sys.stderr)
    referenced, prefixes, ref_locations = collect_usage(
        usage_paths + dist_paths, args.dist
    )

    state_classes = set(args.state_classes) if args.state_classes \
        else set(DEFAULT_STATE_CLASSES)

    # 3) Classify each defined class.
    files_report = {}
    totals = {"used": 0, "dynamic": 0, "verify": 0, "unused": 0}
    for css_path in css_files:
        buckets = {"used": [], "dynamic": [], "verify": [], "unused": []}
        for name, line in defined[css_path]:
            if len(name) < args.min_class_len:
                continue
            if name in referenced:
                buckets["used"].append((name, line))
            elif is_dynamic(name, prefixes):
                buckets["dynamic"].append((name, line))
            elif (not args.no_state_list) and name in state_classes:
                buckets["verify"].append((name, line))
            else:
                buckets["unused"].append((name, line))
        for key in buckets:
            buckets[key].sort(key=lambda item: item[1])
        files_report[css_path] = buckets
        for key in totals:
            totals[key] += len(buckets[key])

    # 4) Bonus report A: referenced but not defined in any src CSS.
    #    Drop template prefix fragments (moorhen__accordion-toggle-) and CSS
    #    variable noise (--moorhen-accent -> moorhen-accent), keep BEM-looking
    #    tokens and generic state classes. @keyframes names are excluded because
    #    they are animation names (used via `animation: name ...`), not classes.
    bem = re.compile(r"[A-Za-z_][A-Za-z0-9_-]*__[A-Za-z_][A-Za-z0-9_-]*")
    dash2 = re.compile(r"[A-Za-z_][A-Za-z0-9_-]*--[A-Za-z_][A-Za-z0-9_-]*")
    extra = sorted(
        t for t in referenced - all_defined
        if t not in keyframes
        and not PREFIX_RE.match(t)
        and (t.startswith("moorhen__") or bem.search(t) or dash2.search(t)
             or t in state_classes)
    )

    # ---- output ----
    if args.json:
        payload = {
            "css_dir": str(css_root),
            "usage": "src" + (f" + {len(dist_paths)} dist/*.js bundle(s)" if args.dist else ""),
            "files": {
                str(p): {k: [(n, ln) for n, ln in v] for k, v in buckets.items()}
                for p, buckets in files_report.items()
            },
            "totals": totals,
            "defined_classes": len(all_defined),
            "referenced_but_not_defined": [
                {
                    "class": t,
                    "locations": sorted(set(ref_locations.get(t, []))),
                }
                for t in extra
            ],
        }
        print(json.dumps(payload, indent=2))
    else:
        rel = lambda p: os.path.relpath(str(p), os.getcwd())
        corpus = f"{args.usage_src}/**/*.{{ts,tsx,js,jsx}}"
        if dist_paths:
            corpus += f" + {len(dist_paths)} dist/*.js"
        print("Unused CSS class report")
        print(f"  CSS files scanned : {len(css_files)}")
        print(f"  Defined classes   : {len(all_defined)}")
        print(f"  Usage corpus      : {corpus}")
        print(f"    used: {totals['used']}  dynamic: {totals['dynamic']}  "
              f"verify: {totals['verify']}  unused: {totals['unused']}")
        print()

        for css_path in css_files:
            buckets = files_report[css_path]
            total_classes = sum(len(b) for b in buckets.values())
            if not buckets["unused"] and not buckets["verify"] and not args.verbose:
                continue
            print(f"=== {rel(css_path)} "
                  f"({total_classes} classes, "
                  f"{len(buckets['unused'])} unused, "
                  f"{len(buckets['verify'])} verify) ===")
            for label, mark in (("unused", "UNUSED"), ("verify", "VERIFY")):
                for name, line in buckets[label]:
                    print(f"  {mark:<8} .{name:<46} line {line}")
            if args.verbose:
                for label, mark in (("used", "USED  "), ("dynamic", "DYNAMIC")):
                    for name, line in buckets[label]:
                        print(f"  {mark} .{name:<46} line {line}")
            print()

        if extra:
            print("Referenced in code but NOT defined in any src CSS "
                  "(possible typos / third-party classes):")
            for t in extra:
                locs = sorted(set(ref_locations.get(t, [])))
                print(f"  .{t}")
                for path, line in locs[:5]:
                    print(f"      {os.path.relpath(path, os.getcwd())}:{line}")
                if len(locs) > 5:
                    print(f"      ... and {len(locs) - 5} more")
            print()

    unused_count = totals["unused"]
    if args.fail_on_unused and unused_count:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
