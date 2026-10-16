import "fake-indexeddb/auto";
import { setScope } from "./data/scope";

// Tests run in the guest scope unless they switch explicitly.
setScope({ kind: "guest" });
