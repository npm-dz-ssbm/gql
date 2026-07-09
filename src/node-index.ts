import { gql, GraphQLClient } from "graphql-request";
import * as $ from "@dz-ssbm/util";
import { fs, path } from "@dz-ssbm/sys";
import { Error, type Opts, type ResType, type VarsType } from "./T.js";

export type Client = {
  url: string;
  authToken?: string | undefined;
  baseOpts: Opts;
  operate<VT extends VarsType, RT extends ResType>(
    op: Operation<VT, RT>,
    vars: VT,
    opts?: Opts,
  ): $.Xa<RT, Error>;
  operateUnknown(
    op: string,
    vars?: VarsType,
    opts?: Opts,
  ): $.Xa<ResType, Error>;
};

export type ClientOpts = Opts & { authToken?: string };
export type Operation<VT extends VarsType, RT extends ResType> = {
  query: string;
  vt: $.T.ZodType<VT>;
  rt: $.T.ZodType<RT>;
};

export function Client(url: string, clientOpts: ClientOpts = {}): Client {
  const { authToken, ...baseOpts } = clientOpts;
  const client: Client = {
    url,
    authToken,
    baseOpts,
    operate: (...args) => operate(client, ...args),
    operateUnknown: (...args) => operateUnknown(client, ...args),
  };
  return client;
}

export function Operation<VT extends VarsType, RT extends ResType>(
  query: string,
  vt: $.T.ZodType<VT>,
  rt: $.T.ZodType<RT>,
): Operation<VT, RT> {
  return { query, vt, rt };
}
function* operate<VT extends VarsType, RT extends ResType>(
  client: Client,
  op: Operation<VT, RT>,
  vars: VT,
  opts?: Opts,
): $.Xa<RT, Error> {
  const res = yield* operateUnknown(client, op.query, op.vt.parse(vars), opts);
  return op.rt.parse(res);
}

function* operateUnknown(
  client: Client,
  query: string,
  vars: VarsType = {},
  opts: Opts = {},
): $.Xa<ResType, Error> {
  const fullOpts = { ...client.baseOpts, ...opts };
  const { cachePath } = fullOpts;
  const { url: apiUrl } = client;
  const log = fullOpts.log || (() => {});
  const networkControl = fullOpts.networkControl || "use-cache";
  const grClient = new GraphQLClient(
    apiUrl,
    !client.authToken
      ? {}
      : {
          headers: { authorization: `Bearer ${client.authToken}` },
        },
  );
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

  let cacheCollisions: number = 0;

  function getQpathCached(): string {
    const midfix = cacheCollisions ? `$.{cacheCollisions}` : "";
    return path.join(cachePath!, `${qkey}${midfix}.json`);
  }

  const getCached = function* (): $.Xa<[ResType, string] | undefined> {
    if (!cachePath || networkControl === "force-fetch") {
      return undefined;
    }
    return yield* $.xTry(
      function* () {
        const cachedText = yield* $.xAwait(() =>
          fs.tryReadTextFile(getQpathCached(), ""),
        );
        const res = JSON.parse(cachedText);
        return [res[0], res[1]] as [ResType, string];
      },
      () => $.Ok(undefined),
    );
  };
  let cached: undefined | [ResType, string] = undefined;
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
  const q = gql(query.split("\n") as any);
  const fline = (query.trim().split("\n")[0] || "").trim();
  log("sgg:graphql", `![${fline}]`, `![${JSON.stringify(vars)}]`);

  yield* $.xAwait(() => $.timeout(6 * 1000));

  const res = yield* $.xAwait(
    () =>
      grClient.request({ document: q, ...(vars ? { variables: vars } : {}) }),
    (e) => $.Err(Error.NetworkError(e)),
  );

  yield* $.xAwait(
    () => fs.writeFilep(getQpathCached(), JSON.stringify([res, qkeyStr])),
    (e) => $.Err(Error.CacheWriteError(e)),
  );

  return res;
}

export * from "./T.js";
