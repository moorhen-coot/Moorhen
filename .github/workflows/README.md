# Summary of what I know about the workflows:

* emsdk-cache - Triggered manually. Updates the cached emsdk version. Poorly named. Needs renaming.
* install-cache - Triggered manually. Very rarely ran. Does a full build of Moorhen. Not sure what for. Highly redundant / confusing (probably erroneous) cache operations. Can probably be deleted.

# What I will change:

* All workflows which use emsdk need to extract the emsdk version