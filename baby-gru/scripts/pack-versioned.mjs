#!/usr/bin/env node
/*
 * Build a uniquely-versioned dev/integration tarball.
 *
 * `npm pack` names the tarball from package.json's `version`, and consumers
 * (e.g. ccp4i2 via `npm install ./moorhen-*.tgz`) key on that internal version
 * — so reusing the same `1.0.0-alpha.3` for every build can be a silent no-op
 * on reinstall and makes two tarballs indistinguishable.
 *
 * This stamps the version as `<base>-dev.g<short-sha>[.dirty]` for the duration
 * of the build (so it is unique per commit and traceable back to it, and shows
 * up in the in-app version readout via genversion), runs the production
 * build-release + npm pack, then restores package.json / package-lock.json /
 * src/version.js so the working tree is left exactly as it was.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const babyGru = fileURLToPath(new URL("..", import.meta.url));
const run = (cmd) => execSync(cmd, { stdio: "inherit", cwd: babyGru });
const capture = (cmd) => execSync(cmd, { encoding: "utf8", cwd: babyGru }).trim();

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const base = pkg.version.split("-dev.")[0]; // strip any prior dev suffix
const sha = capture("git rev-parse --short HEAD");
// "dirty" = uncommitted *tracked* changes (untracked files like dist/ don't count)
const dirty = capture("git status --porcelain --untracked-files=no") ? ".dirty" : "";
const devVersion = `${base}-dev.g${sha}${dirty}`;

console.log(`\n[pack-versioned] building tarball as ${devVersion}\n`);
run(`npm version ${devVersion} --no-git-tag-version --allow-same-version`);
try {
    run("npm run build-release");
    run("cd dist && npm pack");
} finally {
    // Restore tracked files npm version touched, and regenerate the (gitignored)
    // version.js from the restored package.json — leaves the tree pristine.
    run("git checkout -- package.json package-lock.json");
    run("npm run create-version");
    console.log(`\n[pack-versioned] restored working tree; tarball: dist/moorhen-${devVersion}.tgz\n`);
}
