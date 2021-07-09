import { exec as execCb } from "child_process";
import { promisify } from "util";

const exec = promisify(execCb);

interface ISinkObject {
  name: string;
  state: "IDLE" | "RUNNING";
  description: string;
  index: number;
}

function isValidState(input: string): input is "IDLE" | "RUNNING" {
  return input === "IDLE" || input === "RUNNING";
}

async function getSinks() {
  const rawResult = await exec("pactl list sinks");
  const filteredResult = rawResult.stdout
    .trim()
    .split("\n")
    .reduce<Array<ISinkObject>>((accumulator, current) => {
      const trimmed = current.trim();
      const newIndexLine = current.match(/^Sink #([\d]+)$/);
      const name = trimmed.match(/^Name (.+)$/);
      const state = trimmed.match(/^State (.)$/);
      const description = trimmed.match(/^Description: (.+)$/);
      if (newIndexLine) {
        accumulator.push({
          index: parseInt(newIndexLine[1], 10),
          name: "",
          state: "IDLE",
          description: "",
        });
      }
      if (name) {
        accumulator[accumulator.length - 1].name = name[1];
      }
      if (state) {
        const stateValue = state[0];
        if (!isValidState(stateValue)) {
          throw new Error(
            `Unknown sink (index: ${
              accumulator[accumulator.length - 1].index
            }) state: ${state[1]}`
          );
        }
        accumulator[accumulator.length - 1].state = stateValue;
      }
      if (description) {
        accumulator[accumulator.length - 1].description = description[1];
      }
      return accumulator;
    }, []);
  return filteredResult;
}

export async function getValidSinks(valid_descriptions: Array<string>) {
  const sinks = (await getSinks()).filter((sink) =>
    valid_descriptions.includes(sink.description)
  );
  return sinks;
}
