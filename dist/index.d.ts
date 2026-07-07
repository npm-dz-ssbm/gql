import * as $ from "@dz-ssbm/util";
import { type Client, type ClientOpts, type Operation, type ResType, type VarsType } from "./T.js";
export declare function Client(url: string, clientOpts?: ClientOpts): Client;
export declare function Operation<VT extends VarsType, RT extends ResType>(query: string, vt: $.T.ZodType<VT>, rt: $.T.ZodType<RT>): Operation<VT, RT>;
export * from "./T.js";
//# sourceMappingURL=index.d.ts.map