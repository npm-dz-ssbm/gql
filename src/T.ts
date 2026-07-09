import * as $ from "@dz-ssbm/util";

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
