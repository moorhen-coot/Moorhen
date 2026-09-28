#!/usr/bin/env node
/*
 * Trace pthread-pool occupancy in a built emscripten glue file.
 *
 * Moorhen's wasm links with a fixed PTHREAD_POOL_SIZE. When coot spawns more
 * concurrent threads than the pool holds, emscripten falls back to creating a
 * worker on demand, which requires returning to the JS event loop -- and coot's
 * spawn-then-join() loops never do. The result is a hang with no stack and no
 * error, which is very hard to diagnose from the application side.
 *
 * This script patches the *generated* glue (moorhen.js / moorhen64.js) to log
 * pool occupancy, so you can see how many threads an operation actually asks
 * for and whether the pool ever runs dry. It is a developer tool: it is not
 * referenced by the build, the app, or CI, and it changes only build output,
 * never source. Run it against a build, take your measurement, then --revert.
 *
 *   node scripts/instrument-pthread-pool.mjs <glue.js> [more.js ...]
 *   node scripts/instrument-pthread-pool.mjs --revert <glue.js> [...]
 *
 * Writes <file>.prepatch as a backup; --revert restores it. Idempotent
 * (re-running rebases off the backup rather than stacking probes).
 *
 * Reported per burst (a run of acquires with no intervening release, i.e. the
 * thread count a single spawning loop actually used):
 *
 *   BURST spawned=N  live A->B  peak=P  freeAfter=F  t=Tms
 *
 * Burst size is the useful number: it is what the C++ side asked for, which
 * cannot otherwise be read from outside the wasm. Comparing it against
 * navigator.hardwareConcurrency (printed once, at first event) tells you
 * whether a thread-count pin is binding or whether demand is still scaling
 * with the host's core count.
 *
 * Per-event detail is off by default because each line costs a stack capture
 * via printErr. Enable it in the worker context with:
 *   globalThis.__mhPoolVerbose = true
 *
 * Works on minified and unminified glue: the PThread object and err() are
 * name-mangled by the dist minifier, so both are recovered by pattern-matching
 * getNewWorker's body rather than assumed. If emscripten changes the shape of
 * that code the script reports a FAILED-to-locate error rather than silently
 * patching nothing.
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";

const MARKER = "__mhPoolProbe";
const STAMP = new Date().toISOString();

const PROBE = `globalThis.__mhPoolPeak=0;globalThis.__mhPoolT0=Date.now();
globalThis.__mhPoolInit=0;globalThis.__mhPoolBurst=0;globalThis.__mhPoolBurstFrom=0;
globalThis.__mhPoolVerbose=false;
function __mhPoolIsWorker(){
// The glue is evaluated once per pthread worker, so an unguarded load banner
// prints once per thread (up to PTHREAD_POOL_SIZE lines of identical noise).
// Emscripten identifies its own pthread workers by the worker name prefix
// "em-pthread"; that is a string literal, so it survives minification. Node
// pthreads are worker_threads instead, hence the second probe.
try{if(globalThis.name&&String(globalThis.name).indexOf("em-pthread")===0)return true}catch(e){}
try{if(typeof process!=="undefined"&&process.versions&&process.versions.node){
return !require("node:worker_threads").isMainThread}}catch(e){}
return false;
}
if(!__mhPoolIsWorker())console.log("[mh-pool] instrumented glue LOADED (build stamp ${STAMP})");
function __mhPoolSay(E,msg){
// Route through emscripten's err(): printErr is wired up by CootWorker and
// demonstrably reaches the console (it carried the original pool-exhaustion
// warning). Fall back to console.log.
try{if(typeof E==="function"){E(msg);return}}catch(e){}
try{console.log(msg)}catch(e){}
}
function ${MARKER}(ev,P,E){try{
var free=P.unusedWorkers.length,live=Object.keys(P.pthreads).length;
if(ev==="acquire")live=live+1;
if(live>globalThis.__mhPoolPeak)globalThis.__mhPoolPeak=live;
if(!globalThis.__mhPoolInit){globalThis.__mhPoolInit=1;
var hc="?";try{hc=navigator.hardwareConcurrency}catch(e){}
__mhPoolSay(E,"[mh-pool] probe ACTIVE  poolSize="+free+"  navigator.hardwareConcurrency="+hc+"  (burst size == hardwareConcurrency would mean set_max_number_of_threads is NOT binding)");}
if(ev==="acquire"){
if(globalThis.__mhPoolBurst===0)globalThis.__mhPoolBurstFrom=live-1;
globalThis.__mhPoolBurst++;
}else if(globalThis.__mhPoolBurst>0){
var n=globalThis.__mhPoolBurst,from=globalThis.__mhPoolBurstFrom;
__mhPoolSay(E,"[mh-pool] BURST spawned="+n+"  live "+from+"->"+(from+n)+"  peak="+globalThis.__mhPoolPeak+"  freeAfter="+free+"  t="+(Date.now()-globalThis.__mhPoolT0)+"ms");
globalThis.__mhPoolBurst=0;
}
if(globalThis.__mhPoolVerbose){
__mhPoolSay(E,"[mh-pool] t="+(Date.now()-globalThis.__mhPoolT0)+"ms "+ev+" live="+live+" free="+free+" peak="+globalThis.__mhPoolPeak+((ev==="acquire"&&free===0)?"  <<<< POOL EXHAUSTED":""));
}
}catch(e){}}
`;

const args = process.argv.slice(2);
const revert = args[0] === "--revert";
const files = revert ? args.slice(1) : args;

if (files.length === 0) {
    console.error("usage: instrument-pthread-pool.mjs [--revert] <glue.js> [...]");
    process.exit(1);
}

for (const file of files) {
    if (!existsSync(file)) {
        console.error(`SKIP (missing): ${file}`);
        continue;
    }
    const backup = `${file}.prepatch`;

    if (revert) {
        if (existsSync(backup)) {
            copyFileSync(backup, file);
            console.log(`reverted: ${file}`);
        } else {
            console.log(`no backup, left alone: ${file}`);
        }
        continue;
    }

    let src = readFileSync(file, "utf8");
    if (src.includes(MARKER)) {
        // Re-instrumenting: start from the pristine backup so probes don't stack.
        if (existsSync(backup)) {
            src = readFileSync(backup, "utf8");
        } else {
            console.log(`already instrumented and no backup to rebase on: ${file}`);
            continue;
        }
    }

    // Capture the (possibly mangled) PThread object name from getNewWorker's body.
    // Unminified: getNewWorker(){if(PThread.unusedWorkers.length==0)
    // Minified:   getNewWorker(){if(0==Me.unusedWorkers.length)
    const nameMatch = src.match(
        /getNewWorker\(\)\{if\((?:0==)?([A-Za-z_$][\w$]*)\.unusedWorkers/
    );
    if (!nameMatch) {
        console.error(`FAILED to locate getNewWorker/unusedWorkers in ${file}`);
        continue;
    }
    const obj = nameMatch[1];

    // Capture emscripten's err() off the pool-exhaustion call site (minified: err -> S).
    const errMatch = src.match(/([A-Za-z_$][\w$]*)\("Tried to spawn a new thread/);
    const errFn = errMatch ? errMatch[1] : "null";
    if (!errMatch) {
        console.warn(`  note: could not locate err() in ${file}; falling back to console.log`);
    }

    const beforeAcquire = src;
    src = src.replace("getNewWorker(){", `getNewWorker(){${MARKER}("acquire",${obj},${errFn});`);
    if (src === beforeAcquire) {
        console.error(`FAILED to inject acquire hook in ${file}`);
        continue;
    }

    const beforeRelease = src;
    src = src.replace(
        /returnWorkerToPool:([A-Za-z_$][\w$]*)=>\{/,
        (_m, p) => `returnWorkerToPool:${p}=>{${MARKER}("release",${obj},${errFn});`
    );
    if (src === beforeRelease) {
        console.error(`FAILED to inject release hook in ${file}`);
        continue;
    }

    if (!existsSync(backup)) copyFileSync(file, backup);
    writeFileSync(file, PROBE + src);
    console.log(`instrumented: ${file}  (PThread="${obj}", err="${errFn}")`);
}
