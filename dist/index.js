import { gql, GraphQLClient } from "graphql-request";
import * as $ from "@dz-ssbm/util";
import { fs, path } from "@dz-ssbm/sys";
import { Error, } from "./T.js";
export function Client(url, clientOpts = {}) {
    const { authToken, ...baseOpts } = clientOpts;
    const client = {
        url,
        authToken,
        baseOpts,
        operate: (...args) => operate(client, ...args),
        operateUnknown: (...args) => operateUnknown(client, ...args),
    };
    return client;
}
export function Operation(query, vt, rt) {
    return { query, vt, rt };
}
function* operate(client, op, vars, opts) {
    const res = yield* operateUnknown(client, op.query, op.vt.parse(vars), opts);
    return op.rt.parse(res);
}
function* operateUnknown(client, query, vars = {}, opts = {}) {
    const fullOpts = { ...client.baseOpts, ...opts };
    const { cachePath } = fullOpts;
    const { url: apiUrl } = client;
    const log = fullOpts.log || (() => { });
    const networkControl = fullOpts.networkControl || "use-cache";
    const grClient = new GraphQLClient(apiUrl, !client.authToken ? {} : {
        headers: { authorization: `Bearer ${client.authToken}` },
    });
    const keys = Object.keys(vars || {});
    keys.sort();
    if (keys.length === 2 && keys[0] === "page" && keys[1] === "phaseGroupId") {
        keys.reverse();
    }
    const qkeyStr = (() => {
        let qkey_ = `${query}`;
        if (keys.length === 0) {
            return `${qkey_}|`;
        }
        for (const key of keys) {
            qkey_ += `|${vars[key]}`;
        }
        return qkey_;
    })();
    const qkey = $.simpleHash(qkeyStr);
    let cacheCollisions = 0;
    function getQpathCached() {
        const midfix = cacheCollisions ? `$.{cacheCollisions}` : "";
        return path.join(cachePath, `${qkey}${midfix}.json`);
    }
    const getCached = function* () {
        if (!cachePath || networkControl === "force-fetch") {
            return undefined;
        }
        return yield* $.xTry(function* () {
            const cachedText = yield* $.xWait(() => fs.tryReadTextFile(getQpathCached(), ""));
            const res = JSON.parse(cachedText);
            return [res[0], res[1]];
        }, () => $.Ok(undefined));
    };
    let cached = undefined;
    while (true) {
        cached = yield* getCached();
        if (!cached || cached[1] === qkeyStr) {
            break;
        }
        cacheCollisions++;
    }
    if (cached) {
        return cached[0];
    }
    if (networkControl === "cache-only") {
        return yield* $.xFail(Error.CacheOnlyEmpty);
    }
    const q = gql(query.split("\n"));
    const fline = (query.trim().split("\n")[0] || "").trim();
    log("sgg:graphql", `![${fline}]`, `![${JSON.stringify(vars)}]`);
    yield* $.xWait(() => $.timeout(6 * 1000));
    const res = yield* $.xWait(() => grClient.request({ document: q, ...(vars ? { variables: vars } : {}) }), (e) => $.Err(Error.NetworkError(e)));
    yield* $.xWait(() => fs.writeFilep(getQpathCached(), JSON.stringify([res, qkeyStr])), (e) => $.Err(Error.CacheWriteError(e)));
    return res;
}
export * from "./T.js";
//# sourceMappingURL=index.js.map