import { gql, GraphQLClient } from "graphql-request";
import * as $ from "@dz-ssbm/util";
import { fs, path } from "@dz-ssbm/sys";

export type NetworkControl = "use-cache" | "cache-only" | "force-fetch";
export const NetworkControl = {
  useCache: "use-cache" as NetworkControl,
  cacheOnly: "cache-only" as NetworkControl,
  forceFetch: "force-fetch" as NetworkControl,
};

export type VarsType = Record<string, string | number | boolean | null>;
export type ResType = Record<string, unknown>;
export type Opts = {
  log?: (...s: string[]) => void;
  networkControl?: NetworkControl | undefined;
  rawQueryStr?: string | undefined;
  cachePath?: string | undefined;
};
export function Opts(opts: Opts): Opts {
  return opts;
}

export const Error: $.T.VariantDef<
  "@dz-ssbm/gql|Error",
  {
    NetworkError: $.T.ZodUnknown;
    CachePrepError: $.T.ZodUnknown;
    CacheWriteError: $.T.ZodUnknown;
    CacheOnlyEmpty: $.T.ZodUndefined;
  }
> = $.T.defVariant("@dz-ssbm/gql|Error", {
  NetworkError: $.T.unknown(),
  CachePrepError: $.T.unknown(),
  CacheWriteError: $.T.unknown(),
  CacheOnlyEmpty: $.T.undefined(),
});
export type Error = $.T.inferDefined<typeof Error>;

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

export type Operation<VT extends VarsType, RT extends ResType> = {
  query: string;
  vt: $.T.ZodType<VT>;
  rt: $.T.ZodType<RT>;
};
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

const operateUnknown: (
  client: Client,
  query: string,
  vars?: VarsType,
  opts?: Opts,
) => $.Xa<ResType, Error> = $.X(function* operateUnknown(
  client,
  query,
  vars = {},
  opts = {},
) {
  console.log("PROXY");
  console.log(this.proxy);
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

  const getCached = this.fn(function* () {
    if (!cachePath || networkControl === "force-fetch") {
      return undefined;
    }
    return yield* this.trying(
      function* () {
        const cachedText = yield* $.Xawait(() =>
          fs.tryReadTextFile(getQpathCached(), ""),
        );
        const res = JSON.parse(cachedText);
        return [res[0], res[1]] as [ResType, string];
      },
      () => $.Ok(undefined),
    );
  });
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
    return yield* $.fail(Error.CacheOnlyEmpty);
  }
  const q = gql(query.split("\n") as any);
  const fline = (query.trim().split("\n")[0] || "").trim();
  log("sgg:graphql", `![${fline}]`, `![${JSON.stringify(vars)}]`);

  yield* $.Xawait(() => $.timeout(6 * 1000));

  const res = yield* $.Xawait(
    () =>
      grClient.request({ document: q, ...(vars ? { variables: vars } : {}) }),
    (e) => $.Err(Error.NetworkError(e)),
  );

  yield* $.Xawait(
    () => fs.writeFilep(getQpathCached(), JSON.stringify([res, qkeyStr])),
    (e) => $.Err(Error.CacheWriteError(e)),
  );

  return res;
});
