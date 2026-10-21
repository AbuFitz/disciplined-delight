import type { Action, State } from "./model";

export type ProtoProps = {
  s: State;
  act: (a: Action) => void;
  /** Reduced motion: state changes are shown without movement; no ambient loops. */
  reduced: boolean;
  mode: "dark" | "light";
  /** Low-power: atmosphere is static. */
  low: boolean;
};
