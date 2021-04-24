declare module "pactl" {
  export interface ISinkObject {
    name: string;
    state: "IDLE" | "RUNNING";
    description: string;
  }

  export function list(sink = "sink"): Array<{} | ISinkObject>;
}
