import { exec as execCb } from "child_process";
import { promisify } from "util";

const exec = promisify(execCb);

interface ISinkInputObject {
  index: number;
  appName: string;
  id: string;
  mediaName: string;
  sink: number;
}

export async function getSinkInputs() {
  const rawResult = await exec("pacmd list-sink-inputs");
  const filteredResult = rawResult.stdout
    .trim()
    .split("\n")
    .reduce<Array<ISinkInputObject>>((accumulator, current) => {
      const trimmed = current.trim();
      const newIndexLine = trimmed.match(/^index: ([\d]+)$/);
      const appName = trimmed.match(/^application\.name = "([^"]+)"$/);
      const mediaName = trimmed.match(/^media\.name = "([^"]+)"$/);
      const sink = trimmed.match(/^sink: ([\d]+)/);
      const id = trimmed.match(/^application.id = "([^"]+)"$/);
      if (newIndexLine) {
        accumulator.push({
          index: parseInt(newIndexLine[1], 10),
          appName: "",
          id: "",
          mediaName: "",
          sink: -1,
        });
      }
      if (appName) {
        accumulator[accumulator.length - 1].appName = appName[1];
      }
      if (id) {
        accumulator[accumulator.length - 1].id = id[1];
      }
      if (mediaName) {
        accumulator[accumulator.length - 1].mediaName = mediaName[1];
      }
      if (sink) {
        accumulator[accumulator.length - 1].sink = parseInt(sink[1], 10);
      }
      return accumulator;
    }, []);
  return filteredResult;
}
