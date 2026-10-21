const assert = require("assert");
const { generateSignal } = require("./generate-signal");

const f = (v) => (v === null || v === undefined ? "null" : v.toFixed(3));
let failures = 0;

function check(name, fn) {
	try {
		fn();
		console.log(`ok   ${name}`);
	} catch (error) {
		failures++;
		console.log(`FAIL ${name}\n     ${error.message}`);
	}
}

// -- legacy config still works ---------------------------------------------
check("legacy config (signalType + range) returns integers in range", () => {
	const r = generateSignal({ signalLength: 128, signalType: "Fractal", signalRange: [1, 4], seed: 1 });
	assert.strictEqual(r.timeSeries.length, 128);
	assert.ok(r.timeSeries.every((v) => Number.isInteger(v) && v >= 1 && v <= 4));
	assert.ok(Math.abs(r.alpha - 1) < 0.1, `alpha ${f(r.alpha)}`);
	assert.strictEqual(r.desiredSignalType, "Fractal");
});

check("legacy generator mode reproduces v1 generator choice", () => {
	const r = generateSignal({ signalLength: 128, signalType: "Gradient", generator: "legacy", signalRange: [1, 4], seed: 1, numTrials: 10 });
	assert.strictEqual(r.generator, "brownian");
	assert.strictEqual(r.timeSeries.length, 128);
});

// -- named presets via fourier ---------------------------------------------
for (const [type, alpha] of [["Random", 0.5], ["Stationary", 0.75], ["Fractal", 1], ["Gradient", 1.5]]) {
	check(`preset ${type} reaches alpha ${alpha} (N=256)`, () => {
		const r = generateSignal({ signalLength: 256, signalType: type, signalRange: [1000, 2000], seed: 2 });
		assert.ok(Math.abs(r.alpha - alpha) < 0.08, `alpha ${f(r.alpha)}`);
	});
}

// -- explicit targets ---------------------------------------------------------
for (const target of [0.3, 0.9, 1.25, 1.6]) {
	check(`targetAlpha ${target} (N=512)`, () => {
		const r = generateSignal({ signalLength: 512, targetAlpha: target, signalRange: [0, 1], generateIntegers: false, seed: 3 });
		assert.ok(Math.abs(r.alpha - target) < 0.08, `alpha ${f(r.alpha)}`);
		assert.strictEqual(r.alphaType, "global");
	});
}

check("alphaType alpha1 scores on the short-term exponent", () => {
	const r = generateSignal({ signalLength: 256, targetAlpha: 0.7, alphaType: "alpha1", signalRange: [0, 1], generateIntegers: false, seed: 4 });
	assert.strictEqual(r.alphaType, "alpha1");
	assert.ok(Math.abs(r.alpha1 - 0.7) < 0.08, `alpha1 ${f(r.alpha1)}`);
	assert.strictEqual(r.achievedAlpha, r.alpha1);
});

check("alphaType alpha2 on a short series warns and falls back to global", () => {
	const r = generateSignal({ signalLength: 64, targetAlpha: 1, alphaType: "alpha2", signalRange: [0, 1], seed: 4, numTrials: 5 });
	assert.ok(r.warnings.some((w) => /alpha2/.test(w)));
	assert.ok(Number.isFinite(r.achievedAlpha));
});

check("crossover: targetAlpha1 and targetAlpha2 together (N=1024)", () => {
	const r = generateSignal({ signalLength: 1024, targetAlpha1: 1.2, targetAlpha2: 0.6, signalRange: [0, 1], generateIntegers: false, seed: 5, numTrials: 60 });
	assert.ok(Math.abs(r.alpha1 - 1.2) < 0.1, `alpha1 ${f(r.alpha1)}`);
	assert.ok(Math.abs(r.alpha2 - 0.6) < 0.1, `alpha2 ${f(r.alpha2)}`);
	assert.deepStrictEqual(Object.keys(r.targets).sort(), ["alpha1", "alpha2"]);
});

// -- multifractal ------------------------------------------------------------
check("multifractal: width target and correlation-based verdict (N=1024)", () => {
	const r = generateSignal({
		signalLength: 1024,
		targetAlpha: 1,
		fractality: "multifractal",
		multifractalWidth: 0.5,
		signalRange: [0, 1],
		generateIntegers: false,
		seed: 6,
	});
	assert.strictEqual(r.fractality, "multifractal");
	assert.ok(Math.abs(r.alpha - 1) < 0.15, `alpha ${f(r.alpha)}`);
	assert.ok(Math.abs(r.multifractal.width - 0.5) < 0.12, `width ${f(r.multifractal.width)}`);
	assert.strictEqual(r.multifractal.label, "multifractal");
	assert.ok(r.multifractal.verdict.global.significant === true, `z ${f(r.multifractal.verdict.global.z)}`);
	assert.strictEqual(r.multifractal.q.length, r.multifractal.hq.length);
});

check("monofractal control stays narrow under the same analysis (N=1024)", () => {
	const r = generateSignal({ signalLength: 1024, targetAlpha: 1, analyzeMultifractal: true, signalRange: [0, 1], generateIntegers: false, seed: 6 });
	assert.strictEqual(r.fractality, "monofractal");
	assert.ok(r.multifractal.width < 0.3, `width ${f(r.multifractal.width)}`);
});

// -- shaping options ----------------------------------------------------------
check("discreteLevels quantises every value", () => {
	const levels = [1, 1.5, 2, 3];
	const r = generateSignal({ signalLength: 128, discreteLevels: levels, signalRange: [1, 3], seed: 7, numTrials: 5 });
	assert.ok(r.timeSeries.every((v) => levels.includes(v)));
});

check("seed makes the output reproducible", () => {
	const a = generateSignal({ signalLength: 128, seed: 99, signalRange: [1, 4] });
	const b = generateSignal({ signalLength: 128, seed: 99, signalRange: [1, 4] });
	assert.deepStrictEqual(a.timeSeries, b.timeSeries);
});

check("streaming returns a readable stream and no timeSeries", () => {
	const r = generateSignal({ signalLength: 16, signalRange: [1, 3], streaming: true, seed: 8, numTrials: 3 });
	assert.ok(r.stream && typeof r.stream.on === "function");
	assert.strictEqual(r.timeSeries, undefined);
	r.stream.destroy();
});

if (failures) {
	console.log(`\n${failures} check(s) failed`);
	process.exit(1);
}
console.log("\nall checks passed");
