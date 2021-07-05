import iohook from "iohook";
import { exec as execCb } from "child_process";
import { promisify } from "util";

const exec = promisify(execCb);

// List of valid output descriptions for devices that can be toggled between
// use `pactl list sinks` and look into the description fields to see which you have
const VALID_OUTPUT_DESCRIPTIONS = [
  "Sound Blaster Play! Analog Stereo",
  "Family 17h (Models 00h-0fh) HD Audio Controller Digital Stereo (IEC958)",
];
// After startup set this device as the output
const BOOT_OUTPUT = VALID_OUTPUT_DESCRIPTIONS[1];
// Wait this long (in s) before setting the boot output
const BOOT_DELAY = 1;
// Hotkey key code to use for toggling between outputs
const HOTKEY_CODE = [29, 56, 22]; // ctrl+alt+u
// Hotkey debugging can be used to figure out the key codes by pressing keys while the script is running and then
// checking out the log output.
const HOTKEY_DEBUG = false;

function setTimeoutAsync(time: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

interface ISinkObject {
  name: string;
  state: "IDLE" | "RUNNING";
  description: string;
  index: number;
}

function isValidState(input: string): input is 'IDLE'|'RUNNING' {
  return input === 'IDLE' || input === 'RUNNING';
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
          description: ""
        });
      }
      if (name) {
        accumulator[accumulator.length - 1].name = name[1];
      }
      if (state) {
        const stateValue = state[0];
        if (!isValidState(stateValue)) {
          throw new Error(`Unknown sink (index: ${accumulator[accumulator.length - 1].index}) state: ${state[1]}`)
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

async function getValidSinks() {
  const sinks = (await getSinks()).filter((sink) =>
    VALID_OUTPUT_DESCRIPTIONS.includes(sink.description)
  );
  return sinks;
}

interface ISinkInputObject {
  index: number;
  appName: string;
  mediaName: string;
  sink: number;
}

async function getSinkInputs() {
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
      if (newIndexLine) {
        accumulator.push({
          index: parseInt(newIndexLine[1], 10),
          appName: "",
          mediaName: "",
          sink: -1,
        });
      }
      if (appName) {
        accumulator[accumulator.length - 1].appName = appName[1];
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

async function getPulseEffectSinkInput() {
  const allInputs = await getSinkInputs();
  const input = allInputs.find((input) => {
    return (
      input.mediaName === "Playback Stream" && input.appName === "PulseEffects"
    );
  });
  if (!input) {
    throw new Error("PulseEffect sink input could not be found");
  }
  return input;
}

async function toggleOutput() {
  const sinks = await getValidSinks();
  const peSinkInput = await getPulseEffectSinkInput();
  const newSinkIndex = sinks.filter(
    (sink) => sink.index !== peSinkInput.sink
  )[0].index; // this is lazy and only works for 2 outputs... good enough for me.
  return setOutputToIndex(newSinkIndex);
}

async function setOutputToIndex(index: number) {
  const peSinkInput = await getPulseEffectSinkInput();
  const result = await exec(
    `pacmd move-sink-input ${peSinkInput.index} ${index}`
  );
  // pacmd succeeds silently but prints an error to stdout when something goes wrong;
  if (result.stdout.length !== 0) {
    console.error(`Failed command: pacmd move-sink-input ${peSinkInput.index} ${index}`)
    throw new Error(result.stdout);
  }
}

async function setBootOutput() {
  const sinks = await getValidSinks();
  const newSinkIndex = sinks.filter(
    (sink) => sink.description === BOOT_OUTPUT
  )[0].index;
  return setOutputToIndex(newSinkIndex);
}

async function main() {
  iohook.registerShortcut(HOTKEY_CODE, async () => {
    try {
      console.info("Hotkey detected, toggling output.");
      await toggleOutput();
    } catch (err) {
      console.error("Toggling output failed:", err);
    }
  });
  iohook.start(HOTKEY_DEBUG);

  await setTimeoutAsync(BOOT_DELAY * 1000);

  const maxTimeout = 15000;
  let currentTimeout = 10000;
  let tryBoot = true;
  while (tryBoot) {
    try {
      await setBootOutput();
      tryBoot = false;
      console.info("Booted up successfully.");
    } catch (e) {
      if (currentTimeout < maxTimeout) {
        currentTimeout += 1000;
      }
      console.warn(
        "Failed boot, trying again in %ss.",
        currentTimeout / 1000,
        e
      );
      await setTimeoutAsync(currentTimeout);
    }
  }
}

main().then(
  () => {
    console.info("Booted audio-switcher successfully.");
  },
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
