import test from "node:test";
import assert from "node:assert";

import { fs, path } from "@dz-ssbm/sys";
import { fileURLToPath } from "node:url";
import * as GQL from "../src/index.js";
import * as $ from "@dz-ssbm/util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tournamentDataQuery = await fs.readTextFile(
  path.join(__dirname, "test_files", "tournamentData.gql"),
);

const ggApiUrl = `https://api.start.gg/gql/alpha`;
const client = GQL.Client(ggApiUrl, {
  authToken: process.env.CLM_STATS_GG_AUTH!,
  cachePath: path.join(__dirname, "test_files", ".cache-path"),
});

test(async function addTest() {
  const data = await $.execAsync(() =>
    client.operateUnknown(tournamentDataQuery, {
      slug: "tournament/rpm-97/event/melee-singles",
      pageE: 1,
      pageS: 1,
    }),
  );
  console.log(JSON.stringify(data));
  assert.strictEqual(2 + 3, 5);
});
