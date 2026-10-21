const DFA = require("dfa-variability");

const { Readable } = require("stream");

// ---------------------------------------------------------------------------
// Signal types
//
// Each named type maps to a target DFA alpha. A few legacy names select a
// specific generator instead of an alpha target ("Perlin", "Sequential").
// ---------------------------------------------------------------------------

const SIGNAL_TYPES = {
	// alpha ≈ 0.5 — uncorrelated / white noise
	aleatory: { alpha: 0.5, legacy: "white" },
	random: { alpha: 0.5, legacy: "white" },
	stochastic: { alpha: 0.5, legacy: "voss" }, // v1 fell through to the pink-noise default
	uniform: { alpha: 0.5, legacy: "voss" },
	whitenoise: { alpha: 0.5, legacy: "white" },
	white_noise: { alpha: 0.5, legacy: "white" },
	"white noise": { alpha: 0.5, legacy: "white" },
	perlin: { alpha: 0.5, generator: "perlin", legacy: "perlin" },
	structured: { alpha: 0.5, generator: "ordered", legacy: "ordered" },
	sequential: { alpha: 0.5, generator: "ordered", legacy: "ordered" },

	// alpha ≈ 0.75 — short-term correlations, stationary
	stable: { alpha: 0.75, legacy: "voss4" },
	regular: { alpha: 0.75, legacy: "voss4" },
	mosaic: { alpha: 0.75, legacy: "voss4" },
	stationary: { alpha: 0.75, legacy: "voss4" },

	// alpha ≈ 1 — 1/f, fractal
	fractal: { alpha: 1, legacy: "voss" },
	pinknoise: { alpha: 1, legacy: "voss" },
	pink_noise: { alpha: 1, legacy: "voss" },
	"pink noise": { alpha: 1, legacy: "voss" },
	adaptive: { alpha: 1, legacy: "voss" },
	transitional: { alpha: 1, legacy: "voss" },

	// alpha ≈ 1.5 — random walk, non-stationary
	unstable: { alpha: 1.5, legacy: "brownian" },
	gradient: { alpha: 1.5, legacy: "brownian" },
	shifting: { alpha: 1.5, legacy: "brownian" },
	brownnoise: { alpha: 1.5, legacy: "brownian" },
	brown_noise: { alpha: 1.5, legacy: "brownian" },
	"brown noise": { alpha: 1.5, legacy: "brownian" },
	nonstationary: { alpha: 1.5, legacy: "brownian" },
	non_stationary: { alpha: 1.5, legacy: "brownian" },
	"non stationary": { alpha: 1.5, legacy: "brownian" },
};

function resolveSignalType(signalType) {
	const key = String(signalType || "Fractal").toLowerCase();
	return SIGNAL_TYPES[key] || SIGNAL_TYPES.fractal;
}

// ---------------------------------------------------------------------------
// Random number generation (optionally seeded, mulberry32)
// ---------------------------------------------------------------------------

function makeRandom(seed) {
	if (seed === undefined || seed === null) return Math.random;
	let a = (Number(seed) >>> 0) || 0x9e3779b9;
	return function () {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function gaussian(random) {
	// Box–Muller
	let u = 0;
	let v = 0;
	while (u === 0) u = random();
	while (v === 0) v = random();
	return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ---------------------------------------------------------------------------
// FFT (iterative radix-2, in place). Used by the spectral synthesis generator.
// ---------------------------------------------------------------------------

function nextPow2(n) {
	let p = 1;
	while (p < n) p *= 2;
	return p;
}

function fftInPlace(re, im, inverse) {
	const n = re.length;
	// bit reversal
	for (let i = 1, j = 0; i < n; i++) {
		let bit = n >> 1;
		for (; j & bit; bit >>= 1) j ^= bit;
		j ^= bit;
		if (i < j) {
			let t = re[i];
			re[i] = re[j];
			re[j] = t;
			t = im[i];
			im[i] = im[j];
			im[j] = t;
		}
	}
	for (let len = 2; len <= n; len <<= 1) {
		const ang = ((inverse ? 2 : -2) * Math.PI) / len;
		const wRe = Math.cos(ang);
		const wIm = Math.sin(ang);
		for (let i = 0; i < n; i += len) {
			let curRe = 1;
			let curIm = 0;
			for (let j = 0; j < len / 2; j++) {
				const aRe = re[i + j];
				const aIm = im[i + j];
				const bRe = re[i + j + len / 2] * curRe - im[i + j + len / 2] * curIm;
				const bIm = re[i + j + len / 2] * curIm + im[i + j + len / 2] * curRe;
				re[i + j] = aRe + bRe;
				im[i + j] = aIm + bIm;
				re[i + j + len / 2] = aRe - bRe;
				im[i + j + len / 2] = aIm - bIm;
				const nRe = curRe * wRe - curIm * wIm;
				curIm = curRe * wIm + curIm * wRe;
				curRe = nRe;
			}
		}
	}
	if (inverse) {
		for (let i = 0; i < n; i++) {
			re[i] /= n;
			im[i] /= n;
		}
	}
}

// ---------------------------------------------------------------------------
// Generators. All return a plain array of `n` numbers on an arbitrary scale;
// `shapeToRange` maps them into the requested range afterwards.
// ---------------------------------------------------------------------------

/**
 * Spectral synthesis (Fourier filtering method).
 *
 * Builds a series whose power spectrum follows 1/f^beta, where the DFA
 * exponent relates to beta as beta = 2*alpha - 1:
 *   alpha 0.5 → beta 0 (white), alpha 1 → beta 1 (pink), alpha 1.5 → beta 2 (brown).
 *
 * With `beta2` and `crossoverScale` set, the spectrum is piecewise: `beta`
 * applies to scales shorter than `crossoverScale` (short-term alpha1) and
 * `beta2` to longer scales (long-term alpha2), continuous at the crossover.
 */
function generateFourierNoise(n, { beta, beta2 = null, crossoverScale = 16 }, random) {
	const m = nextPow2(Math.max(2 * n, 8));
	const re = new Array(m).fill(0);
	const im = new Array(m).fill(0);
	const fc = 1 / crossoverScale;
	const half = m / 2;

	for (let k = 1; k <= half; k++) {
		const f = k / m; // cycles per sample
		let amplitude;
		if (beta2 === null || f > fc) {
			amplitude = Math.pow(f, -beta / 2);
		} else {
			amplitude = Math.pow(fc, -beta / 2) * Math.pow(f / fc, -beta2 / 2);
		}
		// Gaussian amplitude jitter gives the realistic chi-square periodogram
		amplitude *= Math.abs(gaussian(random));
		const phase = random() * 2 * Math.PI;
		re[k] = amplitude * Math.cos(phase);
		im[k] = amplitude * Math.sin(phase);
		if (k < half) {
			re[m - k] = re[k];
			im[m - k] = -im[k];
		} else {
			im[k] = 0; // Nyquist bin must be real
		}
	}
	fftInPlace(re, im, true);
	return re.slice(0, n);
}

function generateWhiteNoise(n, random) {
	const out = new Array(n);
	for (let i = 0; i < n; i++) out[i] = random();
	return out;
}

/** Voss–McCartney pink noise: sum of white noises updated at halving rates. */
function generateVossNoise(n, numLayers, random) {
	const layers = [];
	for (let j = 0; j < numLayers; j++) layers.push(generateWhiteNoise(n, random));
	const out = new Array(n).fill(0);
	for (let i = 0; i < n; i++) {
		for (let j = 0; j < numLayers; j++) {
			out[i] += j === 0 ? layers[j][i] : layers[j][Math.floor(i / Math.pow(2, j))];
		}
	}
	return out;
}

/** Legacy structured sequence: alternates between two step patterns. */
function generateOrderedSequence(n, random) {
	const out = new Array(n);
	for (let i = 0; i < n; i++) {
		const oneValue = ((i % 4) + 1) / 4;
		const anotherValue = ((i % 2) + 1) / 4;
		out[i] = random() > 0.5 ? oneValue : anotherValue;
	}
	return out;
}

/** Legacy rule-based random walk with short/long trend feedback. */
function generateBrownianWalk(n, range, random) {
	const out = new Array(n);
	const valueRange = range[1] - range[0];
	out[0] = random() * valueRange + range[0];

	for (let i = 1; i < n; i++) {
		const delta = random();
		let operation = random() > 0.5 ? 1 : -1;
		let multiplier = 1;
		let longTrend = 0;
		let shortTrend = 0;

		if (i >= 8) {
			for (let s = 1; s <= 3; s++) shortTrend += out[i - s] - out[i - s - 1];
			const longRange = Math.min(15, i - 1);
			for (let l = 1; l <= longRange; l++) longTrend += out[i - l] - out[i - l - 1];

			if (shortTrend > 0) {
				operation = 1;
				multiplier = 0.5;
			} else if (shortTrend < 0) {
				operation = -1;
				multiplier = 0.5;
			}
			if (longTrend > 0) operation = -1;
			else if (longTrend < 0) operation = 1;
		}

		let newValue = out[i - 1] + operation * delta * multiplier;
		if (shortTrend === 0) newValue = out[i - 1];
		if (longTrend === 0) {
			newValue = out[i - 1] + (random() > 0.5 ? 1 : -1) * delta * (valueRange / 4);
		}
		out[i] = newValue > range[1] || newValue < range[0] ? out[i - 1] : newValue;
	}
	return out;
}

/** Legacy 2D Perlin sampled at random points. */
function generatePerlinNoise(n, random) {
	const gradients = {};
	const memory = {};
	const randVect = () => {
		const theta = random() * 2 * Math.PI;
		return { x: Math.cos(theta), y: Math.sin(theta) };
	};
	const dotProdGrid = (x, y, vx, vy) => {
		const key = vx + "," + vy;
		if (!gradients[key]) gradients[key] = randVect();
		const g = gradients[key];
		return (x - vx) * g.x + (y - vy) * g.y;
	};
	const smootherstep = (x) => 6 * x ** 5 - 15 * x ** 4 + 10 * x ** 3;
	const interp = (x, a, b) => a + smootherstep(x) * (b - a);
	const get = (x, y) => {
		const key = x + "," + y;
		if (memory[key] !== undefined) return memory[key];
		const xf = Math.floor(x);
		const yf = Math.floor(y);
		const tl = dotProdGrid(x, y, xf, yf);
		const tr = dotProdGrid(x, y, xf + 1, yf);
		const bl = dotProdGrid(x, y, xf, yf + 1);
		const br = dotProdGrid(x, y, xf + 1, yf + 1);
		const v = interp(y - yf, interp(x - xf, tl, tr), interp(x - xf, bl, br));
		memory[key] = v;
		return v;
	};
	const out = new Array(n);
	for (let i = 0; i < n; i++) out[i] = get(random(), random());
	return out;
}

/**
 * Random binomial multiplicative cascade on a dyadic grid.
 *
 * Returns a positive envelope of length `n` with mean ≈ 1. Each cell is split
 * in two; one half is multiplied by 2a and the other by 2(1-a), the side
 * chosen at random, so the mass is conserved at every level. `intensity` in
 * (0, 1) maps to a = 0.5 + 0.5*intensity: 0 is a flat envelope, values near
 * 1 concentrate almost everything in a few bursts.
 */
function generateCascadeEnvelope(n, intensity, random, minCell = 1) {
	const m = nextPow2(Math.max(n, 2));
	const a = 0.5 + 0.5 * Math.min(Math.max(intensity, 0), 0.98);
	const cellSize = Math.max(1, nextPow2(Math.floor(minCell)));
	let cells = [1];
	while (cells.length < m / cellSize) {
		const next = new Array(cells.length * 2);
		for (let i = 0; i < cells.length; i++) {
			const left = random() < 0.5 ? 2 * a : 2 * (1 - a);
			next[2 * i] = cells[i] * left;
			next[2 * i + 1] = cells[i] * (2 - left);
		}
		cells = next;
	}
	// expand each cell to cellSize samples, then take a random window of
	// length n so the burst positions vary between candidates
	const envelope = new Array(m);
	for (let i = 0; i < m; i++) envelope[i] = cells[Math.floor(i / cellSize)];
	const offset = m > n ? Math.floor(random() * (m - n + 1)) : 0;
	return envelope.slice(offset, offset + n);
}

/**
 * Multifractal signal: a multiplicative cascade envelope modulates a
 * monofractal noise. For targets above alpha 1 the modulation is applied to
 * the increments and the result is integrated, which keeps the second-order
 * scaling (alpha, i.e. h(2)) at the target while the cascade spreads h(q)
 * across q.
 */
function generateMultifractalNoise(n, { alpha, alpha2 = null, crossoverScale, intensity, minCell = 1 }, random) {
	// Stationarity is decided by the long-scale exponent: when it is above 1
	// the series is a walk, so the cascade modulates the increments and the
	// result is integrated.
	const longAlpha = alpha2 === null ? alpha : alpha2;
	const integrate = longAlpha > 1;
	const shift = integrate ? 1 : 0;
	const beta = 2 * (alpha - shift) - 1;
	const beta2 = alpha2 === null ? null : 2 * (alpha2 - shift) - 1;
	const base = generateFourierNoise(n, { beta, beta2, crossoverScale }, random);
	const envelope = generateCascadeEnvelope(n, intensity, random, minCell);
	const out = new Array(n);
	for (let i = 0; i < n; i++) out[i] = base[i] * envelope[i];
	if (integrate) {
		let acc = 0;
		for (let i = 0; i < n; i++) {
			acc += out[i];
			out[i] = acc;
		}
	}
	return out;
}

// ---------------------------------------------------------------------------
// Shaping: normalise into the requested range, optional contrast, quantise
// ---------------------------------------------------------------------------

function quantizeToLevel(value, levels) {
	let best = levels[0];
	let bestDist = Math.abs(value - best);
	for (let i = 1; i < levels.length; i++) {
		const d = Math.abs(value - levels[i]);
		if (d < bestDist) {
			bestDist = d;
			best = levels[i];
		}
	}
	return best;
}

function shapeToRange(raw, { range, accentuation, discreteLevels, generateIntegers }) {
	let minVal = Infinity;
	let maxVal = -Infinity;
	for (const v of raw) {
		if (v < minVal) minVal = v;
		if (v > maxVal) maxVal = v;
	}
	const span = maxVal - minVal;
	const out = new Array(raw.length);
	for (let i = 0; i < raw.length; i++) {
		let t = span > 0 ? (raw[i] - minVal) / span : 0.5;
		if (accentuation > 1) {
			const centered = t - 0.5;
			const mag = Math.pow(Math.abs(centered) * 2, 1 / accentuation) / 2;
			t = (centered < 0 ? -mag : mag) + 0.5;
		}
		let value = t * (range[1] - range[0]) + range[0];
		if (discreteLevels && discreteLevels.length) value = quantizeToLevel(value, discreteLevels);
		else if (generateIntegers) value = Math.round(value);
		out[i] = value;
	}
	return out;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Generate a time series with a chosen fractal structure.
 *
 * Mono-fractal targets: `signalType` (named presets) or an explicit
 * `targetAlpha`, measured on `alphaType` ("global" | "alpha1" | "alpha2").
 * Set both `targetAlpha1` and `targetAlpha2` for a signal with a crossover
 * (different short- and long-term scaling).
 *
 * Multi-fractal targets: `fractality: "multifractal"` plus an optional
 * `multifractalWidth` (target h(qMin) − h(qMax), default 0.4).
 *
 * Candidate series are generated `numTrials` times; each is analysed with
 * dfa-variability and the one closest to the targets is returned.
 */
const generateSignal = function (config = {}) {
	const {
		signalLength = 128,
		signalRange = [0, 30000],
		signalType = "Fractal",
		streaming = false,

		// what to aim for
		targetAlpha = null,
		alphaType = "global", // "global" | "alpha1" | "alpha2"
		targetAlpha1 = null,
		targetAlpha2 = null,
		fractality = "monofractal", // "monofractal" | "multifractal"
		multifractalWidth = 0.4,
		multifractalIntensity = null, // fixed cascade intensity (0–1); null = search
		cascadeMinCell = null, // smallest cascade cell in samples; defaults to minWindow
		multifractalOptions = {}, // passed to dfa.computeMultifractal for the final report
		analyzeMultifractal = null, // attach MFDFA result; defaults to true when multifractal

		// how to generate
		generator = "auto", // "auto" | "fourier" | "legacy" | "voss" | "voss4" | "white" | "brownian" | "perlin" | "ordered"
		numTrials = null,
		tolerance = 0.02, // stop early once the score is below this (0 disables)
		seed = null,
		accentuation = 1, // >1 pushes values toward the range extremes
		discreteLevels = null, // array of allowed values; overrides generateIntegers
		generateIntegers = true,
		vossLayers = 16,

		// DFA settings (see dfa-variability)
		minWindow = 4,
		scaleGrow = 0.25,
		linearStep = 2,
		shortMax = 16,
		longMin = 16,
		longMaxFraction = 0.25,
		crossoverScale = null, // scale separating alpha1 / alpha2 spectra; defaults to shortMax

		verbose = false,
	} = config;

	const warnings = [];
	const random = makeRandom(seed);
	const n = Math.max(2, Math.floor(signalLength));
	const range = [Number(signalRange[0]), Number(signalRange[1])];
	const preset = resolveSignalType(signalType);
	const isMultifractal = String(fractality).toLowerCase().startsWith("multi");
	const crossover = crossoverScale || shortMax;

	// -- resolve targets --------------------------------------------------
	const targets = {};
	const hasCrossoverTargets = targetAlpha1 !== null && targetAlpha2 !== null;
	if (hasCrossoverTargets) {
		targets.alpha1 = Number(targetAlpha1);
		targets.alpha2 = Number(targetAlpha2);
		if (targetAlpha !== null) targets.global = Number(targetAlpha);
	} else if (targetAlpha1 !== null) {
		targets.alpha1 = Number(targetAlpha1);
	} else if (targetAlpha2 !== null) {
		targets.alpha2 = Number(targetAlpha2);
	} else {
		const type = alphaType === "alpha1" || alphaType === "alpha2" ? alphaType : "global";
		targets[type] = targetAlpha !== null ? Number(targetAlpha) : preset.alpha;
	}
	const primaryType = hasCrossoverTargets ? "global" : Object.keys(targets)[0];
	const primaryTarget = hasCrossoverTargets
		? (targets.alpha1 + targets.alpha2) / 2
		: targets[primaryType];

	if (targets.alpha2 !== undefined && n < 256) {
		warnings.push(
			`alpha2 needs roughly 256+ points to be estimated; with signalLength ${n} it may be unavailable and the global alpha will be used instead.`
		);
	}

	// -- resolve generator ------------------------------------------------
	let chosenGenerator = String(generator).toLowerCase();
	if (chosenGenerator === "auto") {
		chosenGenerator = preset.generator && targetAlpha === null && !hasCrossoverTargets ? preset.generator : "fourier";
	}
	if (chosenGenerator === "legacy") {
		// v1 behaviour: the generator is fixed by the signal type, not by the target alpha
		chosenGenerator = preset.legacy;
		if (targetAlpha !== null || hasCrossoverTargets || targetAlpha1 !== null || targetAlpha2 !== null) {
			warnings.push(
				`The legacy generators cannot be steered to an arbitrary alpha; "${chosenGenerator}" only selects the closest of ${trialsLabel(numTrials)} random candidates. Use generator "fourier" (default) for precise targets.`
			);
		}
	}
	if (isMultifractal && chosenGenerator !== "fourier") {
		warnings.push(`Multifractal generation uses the fourier generator; "${chosenGenerator}" was ignored.`);
		chosenGenerator = "fourier";
	}

	const trials = numTrials !== null ? Math.max(1, numTrials) : isMultifractal ? 40 : 100;

	// Cascade intensity: the width grows roughly as 2 × intensity, so start
	// there and let the feedback below refine it from the measured width.
	const cascadeCell = cascadeMinCell !== null ? cascadeMinCell : minWindow;
	let intensityEstimate = Math.min(0.9, Math.max(0.03, multifractalWidth * 0.5));
	const intensityGain = 0.4;

	// Feedback on the spectral exponents: DFA on finite series is biased, so
	// after each trial the exponent we synthesise is nudged by the measured
	// error (exponentially averaged). This is what makes the search converge
	// instead of relying on luck.
	const correction = { alpha: 0, alpha1: 0, alpha2: 0 };
	const feedbackGain = 0.5;
	const updateCorrection = (measured) => {
		if (chosenGenerator !== "fourier") return;
		if (hasCrossoverTargets) {
			const a1 = pick(measured.dfa, "alpha1");
			const a2 = pick(measured.dfa, "alpha2");
			if (a1 !== null) correction.alpha1 += feedbackGain * (targets.alpha1 - a1);
			if (a2 !== null) correction.alpha2 += feedbackGain * (targets.alpha2 - a2);
		} else {
			let value = pick(measured.dfa, primaryType);
			if (value === null) value = pick(measured.dfa, "alpha");
			if (value !== null) correction.alpha += feedbackGain * (primaryTarget - value);
		}
		for (const key of Object.keys(correction)) {
			correction[key] = Math.min(0.6, Math.max(-0.6, correction[key]));
		}
		if (isMultifractal && multifractalIntensity === null && measured.width !== null) {
			intensityEstimate += intensityGain * (multifractalWidth - measured.width);
			intensityEstimate = Math.min(0.95, Math.max(0.02, intensityEstimate));
		}
	};

	const generateCandidate = (trialIndex) => {
		const spectral = hasCrossoverTargets
			? { alpha: targets.alpha1 + correction.alpha1, alpha2: targets.alpha2 + correction.alpha2 }
			: { alpha: primaryTarget + correction.alpha, alpha2: null };

		if (isMultifractal) {
			let intensity;
			if (multifractalIntensity !== null) intensity = Number(multifractalIntensity);
			else {
				// small jitter around the running estimate keeps the search exploring
				const spread = trialIndex === 0 ? 1 : Math.exp((random() - 0.5) * 0.4);
				intensity = Math.min(0.95, Math.max(0.02, intensityEstimate * spread));
			}
			return {
				raw: generateMultifractalNoise(
					n,
					{ alpha: spectral.alpha, alpha2: spectral.alpha2, crossoverScale: crossover, intensity, minCell: cascadeCell },
					random
				),
				intensity,
			};
		}

		switch (chosenGenerator) {
			case "white":
				return { raw: generateWhiteNoise(n, random) };
			case "voss":
				return { raw: generateVossNoise(n, vossLayers, random) };
			case "voss4":
				return { raw: generateVossNoise(n, 4, random) };
			case "brownian":
				return { raw: generateBrownianWalk(n, range, random) };
			case "perlin":
				return { raw: generatePerlinNoise(n, random) };
			case "ordered":
				return { raw: generateOrderedSequence(n, random) };
			case "fourier":
			default: {
				const beta = 2 * spectral.alpha - 1;
				const beta2 = spectral.alpha2 === null ? null : 2 * spectral.alpha2 - 1;
				return { raw: generateFourierNoise(n, { beta, beta2, crossoverScale: crossover }, random) };
			}
		}
	};

	const measure = (sequence) => {
		const dfa = new DFA(sequence);
		const result = dfa.compute(minWindow, scaleGrow, linearStep, shortMax, longMin, longMaxFraction);
		let width = null;
		if (isMultifractal) {
			// cheap width estimate: only the two extreme q values, no surrogates
			const qMin = multifractalOptions.qMin !== undefined ? multifractalOptions.qMin : -5;
			const qMax = multifractalOptions.qMax !== undefined ? multifractalOptions.qMax : 5;
			const mf = dfa.computeMultifractal({
				qMin,
				qMax,
				qStep: qMax - qMin,
				minWindow,
				expStep: scaleGrow,
				step: linearStep,
				shortMax,
				longMin,
				longMaxFraction,
				surrogateCount: 0,
			});
			width = mf.multifractalWidth;
		}
		return { dfa: result, width };
	};

	const pick = (result, type) => {
		const value = result[type];
		return typeof value === "number" && Number.isFinite(value) ? value : null;
	};

	const scoreOf = (measured) => {
		let score = 0;
		for (const type of Object.keys(targets)) {
			let value = pick(measured.dfa, type);
			if (value === null) value = pick(measured.dfa, "alpha");
			if (value === null) return Infinity;
			score += Math.abs(value - targets[type]);
		}
		if (isMultifractal) {
			if (measured.width === null || !Number.isFinite(measured.width)) return Infinity;
			score += Math.abs(measured.width - multifractalWidth);
		}
		return score;
	};

	// -- search -----------------------------------------------------------
	let best = null;
	let trialsRun = 0;
	for (let i = 0; i < trials; i++) {
		trialsRun++;
		const candidate = generateCandidate(i);
		const sequence = shapeToRange(candidate.raw, { range, accentuation, discreteLevels, generateIntegers });
		const measured = measure(sequence);
		const score = scoreOf(measured);
		if (verbose) {
			console.log(
				`trial ${i + 1}/${trials}: alpha=${fmt(measured.dfa.alpha)} alpha1=${fmt(measured.dfa.alpha1)} alpha2=${fmt(measured.dfa.alpha2)}` +
					(isMultifractal ? ` width=${fmt(measured.width)} intensity=${fmt(candidate.intensity)}` : "") +
					` score=${fmt(score)}`
			);
		}
		if (best === null || score < best.score) {
			best = { sequence, measured, score, intensity: candidate.intensity };
		}
		if (tolerance > 0 && best.score < tolerance) break;
		updateCorrection(measured);
	}

	const dfaResult = best.measured.dfa;
	const alphaUsed = (type) => {
		const value = pick(dfaResult, type);
		return value === null ? pick(dfaResult, "alpha") : value;
	};

	// -- optional full multifractal report --------------------------------
	let multifractal = null;
	const wantMf = analyzeMultifractal === null ? isMultifractal : Boolean(analyzeMultifractal);
	if (wantMf) {
		const dfa = new DFA(best.sequence);
		const mf = dfa.computeMultifractal({
			minWindow,
			expStep: scaleGrow,
			step: linearStep,
			shortMax,
			longMin,
			longMaxFraction,
			...multifractalOptions,
		});
		multifractal = {
			width: mf.multifractalWidth,
			width1: mf.width1,
			width2: mf.width2,
			label: mf.multifractalLabel,
			label1: mf.multifractalLabel1,
			label2: mf.multifractalLabel2,
			verdict: mf.verdict,
			q: mf.q,
			hq: mf.hq,
			hq1: mf.hq1,
			hq2: mf.hq2,
			hCurveSlope: mf.hCurveSlope,
			hCurveCurvature: mf.hCurveCurvature,
			hCurveNonlinearity: mf.hCurveNonlinearity,
			cascadeIntensity: best.intensity === undefined ? null : best.intensity,
			full: mf,
		};
		if (isMultifractal && n < 256) {
			warnings.push(
				"Multifractal verdicts are unreliable below ~256 points (and alpha2 curves need 256+); treat `multifractal.label` as indicative only."
			);
		}
	}

	const returnObject = {
		// measured on the selected sequence
		alpha: pick(dfaResult, "alpha"),
		alpha1: pick(dfaResult, "alpha1"),
		alpha2: pick(dfaResult, "alpha2"),
		achievedAlpha: alphaUsed(primaryType),
		achievedAlpha1: targets.alpha1 !== undefined ? alphaUsed("alpha1") : undefined,
		achievedAlpha2: targets.alpha2 !== undefined ? alphaUsed("alpha2") : undefined,
		score: best.score,

		// what was asked for
		targetAlpha: primaryTarget,
		alphaType: primaryType,
		targets,
		fractality: isMultifractal ? "multifractal" : "monofractal",
		targetMultifractalWidth: isMultifractal ? multifractalWidth : undefined,
		multifractal,

		// echo of the configuration
		generator: chosenGenerator,
		trials: trialsRun,
		signalLength: n,
		minWindow,
		scaleGrow,
		linearStep,
		signalRange: range,
		desiredSignalType: signalType,
		seed,
		warnings,
		dfa: dfaResult,
	};

	if (streaming) {
		const bestSequence = best.sequence;
		const stream = new Readable({
			read() {
				let previousTimer = 0;
				for (let i = 0; i < bestSequence.length; i++) {
					setTimeout(() => {
						this.push(bestSequence[i].toString());
					}, previousTimer + bestSequence[i]);
					previousTimer += bestSequence[i];
				}
				setTimeout(() => {
					this.push(null);
				}, previousTimer);
			},
		});
		return { stream, ...returnObject };
	}

	return { timeSeries: best.sequence, ...returnObject };
};

function trialsLabel(numTrials) {
	return numTrials !== null ? numTrials : 100;
}

function fmt(v) {
	return typeof v === "number" && Number.isFinite(v) ? v.toFixed(3) : String(v);
}

const GenerateSignal = {
	create: (settings) => ({ settings }),
	generateSignal,
	generators: {
		fourier: generateFourierNoise,
		voss: generateVossNoise,
		white: generateWhiteNoise,
		brownian: generateBrownianWalk,
		perlin: generatePerlinNoise,
		ordered: generateOrderedSequence,
		cascade: generateCascadeEnvelope,
		multifractal: generateMultifractalNoise,
	},
	shapeToRange,
	signalTypes: SIGNAL_TYPES,
};

module.exports = GenerateSignal;
