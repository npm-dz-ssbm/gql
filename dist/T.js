import * as $ from "@dz-ssbm/util";
export const NetworkControl = {
    useCache: "use-cache",
    cacheOnly: "cache-only",
    forceFetch: "force-fetch",
};
export function Opts(opts) {
    return opts;
}
export const Error = $.T.defVariant("@dz-ssbm/gql|Error", {
    NetworkError: $.T.unknown(),
    CachePrepError: $.T.unknown(),
    CacheWriteError: $.T.unknown(),
    CacheOnlyEmpty: $.T.undefined(),
});
//# sourceMappingURL=T.js.map