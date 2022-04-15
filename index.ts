import iohook from "iohook";
import { exec as execCb } from "child_process";
import { promisify } from "util";
import { getValidSinks } from "./getSinks";
import { getSinkInputs } from "./getSinkInputs";

const exec = promisify(execCb);

// List of valid output descriptions for devices that can be toggled between
// use `pactl list sinks` and look into the description fields to see which you have
const VALID_OUTPUT_DESCRIPTIONS = [
  "Sound Blaster Play! Analog Stereo",
  "Family 17h (Models 00h-0fh) HD Audio Controller Digital Stereo (IEC958)",
];
// After startup set this device as the output
const BOOT_OUTPUT = VALID_OUTPUT_DESCRIPTIONS[0];
// Wait this long (in s) before setting the boot output
const BOOT_DELAY = 5;
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

/**
 * Retrieve the sink input that is functioning as the output for all pulseeffect pipes.
 */
async function getPulseEffectOutputSinkInput() {
  const allInputs = await getSinkInputs();
  const input = allInputs.find((input) => {
    return (
      input.mediaName === "Playback Stream" &&
      input.appName === "PulseEffects" &&
      input.id === "com.github.wwmm.pulseeffects.sinkinputs"
    );
  });
  if (!input) {
    console.error(
      "Available inputs:",
      allInputs[0].mediaName === "Playback Stream" &&
        allInputs[0].appName === "PulseEffects" &&
        allInputs[0].id === "com.github.wwmm.pulseeffects.sinkinputs"
    );
    throw new Error("PulseEffect output sink input could not be found");
  }
  return input;
}

/**
 * Retrieve the sink input that is functioning as the input for the pulseeffect mic pipe.
 */
async function getPulseEffectInputSinkInput() {
  const allInputs = await getSinkInputs();
  const input = allInputs.find((input) => {
    return (
      input.mediaName === "Playback Stream" &&
      input.appName === "PulseEffects" &&
      input.id === "com.github.wwmm.pulseeffects.sourceoutputs"
    );
  });
  if (!input) {
    console.error(
      "Available inputs:",
      allInputs[0].mediaName === "Playback Stream",
      allInputs[0].appName === "PulseEffects",
      allInputs[0].id === "com.github.wwmm.pulseeffects.sourceoutputs"
    );
    console.error("Available inputs:", allInputs);
    throw new Error("PulseEffect input sink input could not be found");
  }
  return input;
}

async function toggleOutput() {
  const sinks = await getValidSinks(VALID_OUTPUT_DESCRIPTIONS);
  const peSinkInput = await getPulseEffectOutputSinkInput();
  const newSinkIndex = sinks.filter(
    (sink) => sink.index !== peSinkInput.sink
  )[0].index; // this is lazy and only works for 2 outputs... good enough for me.
  return setOutputToIndex(newSinkIndex);
}

async function setOutputToIndex(index: number) {
  const peSinkInput = await getPulseEffectOutputSinkInput();
  const result = await exec(
    `pacmd move-sink-input ${peSinkInput.index} ${index}`
  );
  // pacmd succeeds silently but prints an error to stdout when something goes wrong;
  if (result.stdout.length !== 0) {
    console.error(
      `Failed command: pacmd move-sink-input ${peSinkInput.index} ${index}`
    );
    throw new Error(result.stdout);
  }
}

async function playDummySound() {
  // this is useful to make input/output sinks show up on boot.
  exec(`espeak "booting audio switcher" -a 1`).catch((e) => {
    console.error("Cannot play dummy sound.");
  });
  await setTimeoutAsync(500);
}

async function setBootOutput() {
  await playDummySound();
  const sinks = await getValidSinks(VALID_OUTPUT_DESCRIPTIONS);
  const newSinkIndex = sinks.filter(
    (sink) => sink.description === BOOT_OUTPUT
  )[0].index;
  return setOutputToIndex(newSinkIndex);
}

async function setInputOutputToIndex(index: number) {
  const peSinkInput = await getPulseEffectInputSinkInput();
  const result = await exec(
    `pacmd move-sink-input ${peSinkInput.index} ${index}`
  );
  // pacmd succeeds silently but prints an error to stdout when something goes wrong;
  if (result.stdout.length !== 0) {
    console.error(
      `Failed command: pacmd move-sink-input ${peSinkInput.index} ${index}`
    );
    throw new Error(result.stdout);
  }
}

async function activateMicInput() {
  // this is useful to make input/output sinks show up on boot.
  exec(`arecord -d 2 /dev/null `).catch((e) => {
    console.error("Cannot activate mic input.");
  });
  await setTimeoutAsync(500);
}

async function setMicPEInputOutputSinkInput() {
  await activateMicInput();
  const PEInputOutputSinkInputDescription = "PulseEffects(mic)";
  const sinks = await getValidSinks([PEInputOutputSinkInputDescription]);
  return setInputOutputToIndex(sinks[0].index);
}

let outputSet = false;
let inputSet = false;

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

  console.info("Hotkey set up.");

  await setTimeoutAsync(BOOT_DELAY * 1000);

  const maxTimeout = 20000;
  let currentTimeout = 5000;
  let tryBoot = true;
  while (tryBoot) {
    try {
      if (!outputSet) {
        await setBootOutput();
        outputSet = true;
        console.info(
          "Booted up output setting successfully. Trying input next."
        );
      }

      if (!inputSet) {
        await setMicPEInputOutputSinkInput();
        inputSet = true;
      }
      tryBoot = false;
      console.info("Booted up successfully.");
    } catch (e) {
      if (currentTimeout < maxTimeout) {
        currentTimeout *= 1.5;
      } else {
        currentTimeout = maxTimeout;
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
