# Summary of what I know about the workflows:

* js-documentation - Triggered on push to release branches. Builds the js documentation and pushes it to the gh-pages branch. Needs to be fixed. It might never have worked.
* run-tests - Triggered on push and pull request. Similar to 'nightly-tests' but only does Typescript and React testing (`npm run test-react`).

## Deleted workflows:

* node16-modules-cache.yml - Triggered by changes to 'baby-gru/package.json' and also every week. Writes 'node16-modules-cache'. Can be deleted right away because the resulting cache is not used anywhere. Also uses node 22 instead of node 16.
* npm-modules-cache - Triggered manually. Redundant emsdk operations with broken version management. Writes 'emdsk-node-modules-cache'. Used by 'install-cache'. Highly redundant. Can be deleted right away. The cache is useless because GitHub deletes caches after 7 days of inactivity.
* install-cache - Triggered manually. Very rarely ran. Does a full build of Moorhen. Not sure what for. Highly redundant / confusing (probably erroneous) cache operations. Can probably be deleted.
* nightly-tests - As the name implies: Runs every night. Builds the entirety of Moorhen with all dependencies and runs 'npm test' (probably same as 'npm run test'). Very wasteful: Needs improved dependency caching. How does 'npm test' differ from 'npm test-react'?
* emsdk-cache - Triggered manually. Updates the cached emsdk version. Can be deleted after I'm done with updating the workflows. Now obsolete because we manually specify the emsdk version in the workflows.


# What I will change:

* All workflows which use emsdk need to extract/set the emsdk version

## What I have done:

* Merge 'nightly-tests' and 'run-tests' into a single workflow which tests everything and manages caches correctly.
* Drop usage of hard-coded absolute paths in the runnner.