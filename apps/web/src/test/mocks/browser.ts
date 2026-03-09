import { setupWorker } from "msw/browser";
import { rowsHandlers } from "./handlers/rows";
import { topicsHandlers } from "./handlers/topics";
import { smartColumnsHandlers } from "./handlers/smart-columns";
import { insightAgentHandlers } from "./handlers/insight-agent";
import { reportsHandlers } from "./handlers/reports";
import { sharingHandlers } from "./handlers/sharing";

export const worker = setupWorker(
  ...rowsHandlers,
  ...topicsHandlers,
  ...smartColumnsHandlers,
  ...insightAgentHandlers,
  ...reportsHandlers,
  ...sharingHandlers,
);
