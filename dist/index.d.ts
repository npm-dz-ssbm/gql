import * as $ from "@dz-ssbm/util";
export type NetworkControl = "use-cache" | "cache-only" | "force-fetch";
export declare const NetworkControl: {
    useCache: NetworkControl;
    cacheOnly: NetworkControl;
    forceFetch: NetworkControl;
};
export type VarsType = Record<string, string | number | boolean | null>;
export type ResType = Record<string, unknown>;
export type Opts = {
    log?: (...s: string[]) => void;
    networkControl?: NetworkControl | undefined;
    rawQueryStr?: string | undefined;
    cachePath?: string | undefined;
};
export declare function Opts(opts: Opts): Opts;
export declare const Error: $.T.VariantDef<"@dz-ssbm/gql|Error", {
    NetworkError: $.T.ZodUnknown;
    CachePrepError: $.T.ZodUnknown;
    CacheWriteError: $.T.ZodUnknown;
    CacheOnlyEmpty: $.T.ZodUndefined;
}>;
export type Error = $.T.inferDefined<typeof Error>;
export type Client = {
    url: string;
    authToken?: string | undefined;
    baseOpts: Opts;
    operate<VT extends VarsType, RT extends ResType>(op: Operation<VT, RT>, vars: VT, opts?: Opts): $.Xa<RT, Error>;
    operateUnknown(op: string, vars?: VarsType, opts?: Opts): $.Xa<ResType, Error>;
};
export type ClientOpts = Opts & {
    authToken?: string;
};
export declare function Client(url: string, clientOpts?: ClientOpts): Client;
export type Operation<VT extends VarsType, RT extends ResType> = {
    query: string;
    vt: $.T.ZodType<VT>;
    rt: $.T.ZodType<RT>;
};
export declare function Operation<VT extends VarsType, RT extends ResType>(query: string, vt: $.T.ZodType<VT>, rt: $.T.ZodType<RT>): Operation<VT, RT>;
//# sourceMappingURL=index.d.ts.map