"use strict";

require("run-with-mocha");

const assert = require("power-assert");
const deepEqual = require("deep-equal");
const np = require("../../helpers/np");
const attrTester = require("../../helpers/attrTester");
const AudioNodeInput = require("../../../src/impl/core/AudioNodeInput");
const AudioContext = require("../../../src/impl/AudioContext");
const AudioNode = require("../../../src/impl/AudioNode");

const context = new AudioContext({ sampleRate: 8000, blockSize: 16 });
const testSpec = {};

testSpec.channelCount = {
  defaultValue: 1,
  testCase: [
    { value: 2, expected: 2 },
    { value: 4, expected: 4 },
    { value: 100, expected: 32 },
    { value: 0, expected: 1 }
  ]
};

testSpec.channelCountMode = {
  defaultValue: "max",
  testCase: [
    { value: "explicit", expected: "explicit" },
    { value: "clamped-max", expected: "clamped-max" },
    { value: "max", expected: "max" },
    { value: "unknown", expected: "max" }
  ]
};

testSpec.channelInterpretation = {
  defaultValue: "speakers",
  testCase: [
    { value: "speakers", expected: "speakers" },
    { value: "discrete", expected: "discrete" },
    { value: "unknown", expected: "discrete" }
  ]
};

describe("AudioNodeInput", () => {
  describe("basic attributes", () => {
    attrTester.makeTests(context, {
      class: AudioNodeInput,
      create: context => new AudioNode(context, { inputs: [ 1 ], outputs: [ 1 ] }).inputs[0],
      testSpec
    });
  });

  describe("channel configuration", () => {
    let node1, node2, input;

    beforeEach(() => {
      node1 = new AudioNode(context, { inputs: [ 1 ], outputs: [ 1 ] });
      node2 = new AudioNode(context, { inputs: [ 1 ], outputs: [ 1 ] });
      input = node2.inputs[0];
      node1.connect(node2);
      node1.outputs[0].enable();
    });

    it("input 1ch", () => {
      node1.outputs[0].setNumberOfChannels(1);
      node2.setChannelCount(4);

      node2.setChannelCountMode("max");
      assert(input.computeNumberOfChannels() === 1);

      node2.setChannelCountMode("clamped-max");
      assert(input.computeNumberOfChannels() === 1);

      node2.setChannelCountMode("explicit");
      assert(input.computeNumberOfChannels() === 4);
    });
    it("input 8ch", () => {
      node1.outputs[0].setNumberOfChannels(8);
      node2.setChannelCount(4);

      node2.setChannelCountMode("max");
      assert(input.computeNumberOfChannels("max") === 8);

      node2.setChannelCountMode("clamped-max");
      assert(input.computeNumberOfChannels("clamped-max") === 4);

      node2.setChannelCountMode("explicit");
      assert(input.computeNumberOfChannels("explicit") === 4);
    });
  });

  describe("connection", () => {
    it("connect", () => {
      const node1 = new AudioNode(context, { outputs: [ 1 ] });
      const node2 = new AudioNode(context, { inputs: [ 1 ] });

      node1.outputs[0].enable();
      node1.connect(node2);

      assert(node1.outputs[0].inputs.length === 1);
      assert(node1.outputs[0].isConnectedTo(node2) === true);
      assert(node2.inputs[0].outputs.length === 1);
      assert(node2.inputs[0].isConnectedFrom(node1) === true);

      node1.connect(node2);

      assert(node1.outputs[0].inputs.length === 1);
      assert(node2.inputs[0].outputs.length === 1);
    });

    it("disconnect", () => {
      const node1 = new AudioNode(context, { outputs: [ 1 ] });
      const node2 = new AudioNode(context, { inputs: [ 1 ] });

      node1.outputs[0].enable();
      node1.connect(node2);

      assert(node1.outputs[0].inputs.length === 1);
      assert(node1.outputs[0].isConnectedTo(node2) === true);
      assert(node2.inputs[0].outputs.length === 1);
      assert(node2.inputs[0].isConnectedFrom(node1) === true);

      node1.disconnect();

      assert(node1.outputs[0].inputs.length === 0);
      assert(node1.outputs[0].isConnectedTo(node2) === false);
      assert(node2.inputs[0].outputs.length === 0);
      assert(node2.inputs[0].isConnectedFrom(node1) === false);
    });

    it("disconnect - destination", () => {
      const node1 = new AudioNode(context, { outputs: [ 1 ] });
      const node2 = new AudioNode(context, { inputs: [ 1 ] });
      const node3 = new AudioNode(context, { inputs: [ 1 ] });

      node1.outputs[0].enable();
      node1.connect(node2);

      assert(node1.outputs[0].inputs.length === 1);
      assert(node1.outputs[0].isConnectedTo(node2) === true);
      assert(node1.outputs[0].isConnectedTo(node3) === false);
      assert(node2.inputs[0].outputs.length === 1);
      assert(node2.inputs[0].isConnectedFrom(node1) === true);
      assert(node3.inputs[0].outputs.length === 0);
      assert(node3.inputs[0].isConnectedFrom(node1) === false);

      node1.disconnect(node3);

      assert(node1.outputs[0].inputs.length === 1);
      assert(node1.outputs[0].isConnectedTo(node2) === true);
      assert(node1.outputs[0].isConnectedTo(node3) === false);
      assert(node2.inputs[0].outputs.length === 1);
      assert(node2.inputs[0].isConnectedFrom(node1) === true);
      assert(node3.inputs[0].outputs.length === 0);
      assert(node3.inputs[0].isConnectedFrom(node1) === false);

      node1.disconnect(node2);

      assert(node1.outputs[0].inputs.length === 0);
      assert(node1.outputs[0].isConnectedTo(node2) === false);
      assert(node1.outputs[0].isConnectedTo(node3) === false);
      assert(node2.inputs[0].outputs.length === 0);
      assert(node2.inputs[0].isConnectedFrom(node1) === false);
      assert(node3.inputs[0].outputs.length === 0);
      assert(node3.inputs[0].isConnectedFrom(node1) === false);
    });

    it("disconnect - destination / input", () => {
      const node1 = new AudioNode(context, { outputs: [ 1, 1 ] });
      const node2 = new AudioNode(context, { inputs: [ 1 ] });
      const node3 = new AudioNode(context, { inputs: [ 1 ] });

      node1.outputs[0].enable();
      node1.connect(node2);

      assert(node1.outputs[0].inputs.length === 1);
      assert(node1.outputs[0].isConnectedTo(node2) === true);
      assert(node1.outputs[0].isConnectedTo(node3) === false);
      assert(node1.outputs[1].inputs.length === 0);
      assert(node1.outputs[1].isConnectedTo(node2) === false);
      assert(node1.outputs[1].isConnectedTo(node3) === false);
      assert(node2.inputs[0].outputs.length === 1);
      assert(node2.inputs[0].isConnectedFrom(node1) === true);
      assert(node3.inputs[0].outputs.length === 0);
      assert(node3.inputs[0].isConnectedFrom(node1) === false);

      node1.disconnect(node3, 0);

      assert(node1.outputs[0].inputs.length === 1);
      assert(node1.outputs[0].isConnectedTo(node2) === true);
      assert(node1.outputs[0].isConnectedTo(node3) === false);
      assert(node1.outputs[1].inputs.length === 0);
      assert(node1.outputs[1].isConnectedTo(node2) === false);
      assert(node1.outputs[1].isConnectedTo(node3) === false);
      assert(node2.inputs[0].outputs.length === 1);
      assert(node2.inputs[0].isConnectedFrom(node1) === true);
      assert(node3.inputs[0].outputs.length === 0);
      assert(node3.inputs[0].isConnectedFrom(node1) === false);

      node1.disconnect(node2, 1);

      assert(node1.outputs[0].inputs.length === 1);
      assert(node1.outputs[0].isConnectedTo(node2) === true);
      assert(node1.outputs[0].isConnectedTo(node3) === false);
      assert(node1.outputs[1].inputs.length === 0);
      assert(node1.outputs[1].isConnectedTo(node2) === false);
      assert(node1.outputs[1].isConnectedTo(node3) === false);
      assert(node2.inputs[0].outputs.length === 1);
      assert(node2.inputs[0].isConnectedFrom(node1) === true);
      assert(node3.inputs[0].outputs.length === 0);
      assert(node3.inputs[0].isConnectedFrom(node1) === false);

      node1.disconnect(node2, 0);

      assert(node1.outputs[0].inputs.length === 0);
      assert(node1.outputs[0].isConnectedTo(node2) === false);
      assert(node1.outputs[0].isConnectedTo(node3) === false);
      assert(node1.outputs[1].inputs.length === 0);
      assert(node1.outputs[1].isConnectedTo(node2) === false);
      assert(node1.outputs[1].isConnectedTo(node3) === false);
      assert(node2.inputs[0].outputs.length === 0);
      assert(node2.inputs[0].isConnectedFrom(node1) === false);
      assert(node3.inputs[0].outputs.length === 0);
      assert(node3.inputs[0].isConnectedFrom(node1) === false);
    });

    it("fanout", () => {
      // +-------+
      // | node1 |
      // +-------+
      //   |
      // +-------+  +-------+
      // | node2 |  | node3 |
      // +-------+  +-------+
      //   |          |
      //   +----------+
      //   |
      // +-O-----+
      // | node4 |
      // +-------+
      const node1 = new AudioNode(context, { inputs: [ 1 ], outputs: [ 1 ] });
      const node2 = new AudioNode(context, { inputs: [ 1 ], outputs: [ 1 ] });
      const node3 = new AudioNode(context, { inputs: [ 1 ], outputs: [ 1 ] });
      const node4 = new AudioNode(context, { inputs: [ 1 ], outputs: [ 1 ] });

      node1.connect(node2);
      node2.connect(node4);
      node3.connect(node4);

      assert(node2.outputs[0].inputs.length === 1);
      assert(node2.outputs[0].isConnectedTo(node4) === true);
      assert(node3.outputs[0].inputs.length === 1);
      assert(node3.outputs[0].isConnectedTo(node4) === true);
      assert(node4.inputs[0].outputs.length === 0);
      assert(node4.inputs[0].isConnectedFrom(node2) === true);
      assert(node4.inputs[0].isConnectedFrom(node3) === true);
      assert(node4.inputs[0].isEnabled() === false);

      node1.outputs[0].enable();

      assert(node2.outputs[0].inputs.length === 1);
      assert(node2.outputs[0].isConnectedTo(node4) === true);
      assert(node3.outputs[0].inputs.length === 1);
      assert(node3.outputs[0].isConnectedTo(node4) === true);
      assert(node4.inputs[0].outputs.length === 1);
      assert(node4.inputs[0].isConnectedFrom(node2) === true);
      assert(node4.inputs[0].isConnectedFrom(node3) === true);
      assert(node4.inputs[0].isEnabled() === true);

      node3.outputs[0].enable();

      assert(node2.outputs[0].inputs.length === 1);
      assert(node2.outputs[0].isConnectedTo(node4) === true);
      assert(node3.outputs[0].inputs.length === 1);
      assert(node3.outputs[0].isConnectedTo(node4) === true);
      assert(node4.inputs[0].outputs.length === 2);
      assert(node4.inputs[0].isConnectedFrom(node2) === true);
      assert(node4.inputs[0].isConnectedFrom(node3) === true);
      assert(node4.inputs[0].isEnabled() === true);

      node1.disconnect();

      assert(node2.outputs[0].inputs.length === 1);
      assert(node2.outputs[0].isConnectedTo(node4) === true);
      assert(node2.outputs[0].isConnectedTo(node4));
      assert(node3.outputs[0].isConnectedTo(node4) === true);
      assert(node3.outputs[0].inputs.length === 1);
      assert(node4.inputs[0].outputs.length === 1);
      assert(node4.inputs[0].isConnectedFrom(node2) === true);
      assert(node4.inputs[0].isConnectedFrom(node3) === true);
      assert(node4.inputs[0].isEnabled() === true);

      node3.outputs[0].disable();

      assert(node2.outputs[0].inputs.length === 1);
      assert(node2.outputs[0].isConnectedTo(node4) === true);
      assert(node2.outputs[0].isConnectedTo(node4));
      assert(node3.outputs[0].isConnectedTo(node4) === true);
      assert(node3.outputs[0].inputs.length === 1);
      assert(node4.inputs[0].outputs.length === 0);
      assert(node4.inputs[0].isConnectedFrom(node2) === true);
      assert(node4.inputs[0].isConnectedFrom(node3) === true);
      assert(node4.inputs[0].isEnabled() === false);
    });

    it("misc", () => {
      const node = new AudioNode(context, { inputs: [ 1 ], outputs: [ 1 ] });
      const input = node.inputs[0];

      assert(input.isConnectedFrom() === false);
    });
  });

  describe("processing", () => {
    it("pull from the single connection", () => {
      const node1 = new AudioNode(context, { inputs: [ 1 ], outputs: [ 1 ] });
      const node2 = new AudioNode(context, { inputs: [ 1 ], outputs: [ 1 ] });
      const noise1 = np.random_sample(16);
      const noise2 = np.random_sample(16);

      node1.outputs[0].enable();
      node1.connect(node2);

      node1.outputs[0].bus.getMutableData()[0].set(noise1);
      node2.inputs[0].bus.getMutableData()[0].set(noise2);

      const input = node2.inputs[0];

      input.pull();

      const actual = input.bus.getChannelData()[0];
      const expected = noise1;

      assert(deepEqual(actual, expected));
    });
    it("pull from some connections", () => {
      const node1 = new AudioNode(context, { inputs: [ 1 ], outputs: [ 1 ] });
      const node2 = new AudioNode(context, { inputs: [ 1 ], outputs: [ 1 ] });
      const node3 = new AudioNode(context, { inputs: [ 1 ], outputs: [ 1 ] });
      const noise1 = np.random_sample(16);
      const noise2 = np.random_sample(16);
      const noise3 = np.random_sample(16);

      node1.outputs[0].enable();
      node2.outputs[0].enable();
      node1.connect(node3);
      node2.connect(node3);

      node1.outputs[0].bus.getMutableData()[0].set(noise1);
      node2.outputs[0].bus.getMutableData()[0].set(noise2);
      node3.inputs[0].bus.getMutableData()[0].set(noise3);

      const input = node3.inputs[0];

      input.pull();

      const actual = input.bus.getChannelData()[0];
      const expected = noise1.map((_, i) => noise1[i] + noise2[i]);

      assert(deepEqual(actual, expected));
    });
  });
});
