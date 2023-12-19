const DFA = require("dfa-variability");

const generateSignal = function ({
	signalLength = 128,
	minWindow = 4,
	scaleGrow = 0.5,
	signalRange = [0, 30000],
	signalType = "Fractal",
}) {
	const numPoints = signalLength;
	const numWhiteNoise = 16;
	const numTrials = 100;
	const generatedRange = [signalRange[0], signalRange[1]];
	const generateIntegers = true;

	let bestDifference = Infinity;
	let bestSequence;
	let dfa;
	let alphaComponent;
	let alphaValue;

	let idealAlpha = 1;

	switch (signalType) {
		case "Random":
		case "Perlin":
			idealAlpha = 0.5;
			break;
		case "Stable":
			idealAlpha = 0.75;
			break;
		case "Unstable":
			idealAlpha = 1.5;
			break;
		case "Fractal":
		default:
			idealAlpha = 1;
			break;
	}

	for (let i = 0; i < numTrials; i++) {
		let sequence = [];

		switch (signalType) {
			case "Random":
				sequence = generateWhiteNoise(numPoints);
				break;
			case "Stable":
				sequence = generatePinkNoiseByVoss(numPoints, 4);
				break;
			case "Perlin":
				sequence = generatePerlinNoise(numPoints);
				break;
			case "Unstable":
				sequence = generateBrownianNoise(numPoints);
				break;
			case "Fractal":
			default:
				sequence = generatePinkNoiseByVoss(numPoints, numWhiteNoise);
				break;
		}

		dfa = new DFA(sequence);

		alphaComponent = dfa.compute(minWindow, scaleGrow);

		alphaValue = alphaComponent.alpha;

		const difference = Math.abs(alphaValue - idealAlpha);

		if (difference < bestDifference) {
			bestDifference = difference;
			bestSequence = sequence;
		}
	}

	return {
		timeSeries: bestSequence,
		alpha: alphaValue,
		signalLength,
		minWindow,
		scaleGrow,
		signalRange,
		desiredSignalType: signalType,
	};

	function generateWhiteNoise(length) {
		return new Array(length).fill(0).map(() => {
			let randomVal =
				Math.random() * (generatedRange[1] - generatedRange[0]) +
				generatedRange[0];
			return generateIntegers ? Math.round(randomVal) : randomVal;
		});
	}

	function generateBrownianNoise(length) {
		let brownianNoise = new Array(length);

		brownianNoise[0] =
			Math.random() * (generatedRange[1] - generatedRange[0]) +
			generatedRange[0];

		for (let i = 1; i < length; i++) {
			let delta =
				((Math.random() * 2 - 1) * (generatedRange[1] - generatedRange[0])) /
				50; // Adjust the divisor for more/less drift
			brownianNoise[i] = brownianNoise[i - 1] + delta;

			// Ensure the value stays within the range
			if (brownianNoise[i] > generatedRange[1]) {
				brownianNoise[i] = generatedRange[1];
			} else if (brownianNoise[i] < generatedRange[0]) {
				brownianNoise[i] = generatedRange[0];
			}

			if (generateIntegers) {
				brownianNoise[i] = Math.round(brownianNoise[i]);
			}
		}

		return brownianNoise;
	}

	function generatePerlinNoise(numPoints) {
		let perlin = {
			rand_vect: function () {
				let theta = Math.random() * 2 * Math.PI;
				return { x: Math.cos(theta), y: Math.sin(theta) };
			},
			dot_prod_grid: function (x, y, vx, vy) {
				let g_vect;
				let d_vect = { x: x - vx, y: y - vy };
				if (this.gradients[[vx, vy]]) {
					g_vect = this.gradients[[vx, vy]];
				} else {
					g_vect = this.rand_vect();
					this.gradients[[vx, vy]] = g_vect;
				}
				return d_vect.x * g_vect.x + d_vect.y * g_vect.y;
			},
			orientation: function (x, y) {
				let angleRadians = Math.atan2(y, x); // Angle in radians
				let angleDegrees = angleRadians * (180 / Math.PI); // Convert to degrees
				return angleDegrees;
			},
			smootherstep: function (x) {
				return 6 * x ** 5 - 15 * x ** 4 + 10 * x ** 3;
			},
			interp: function (x, a, b) {
				return a + this.smootherstep(x) * (b - a);
			},
			seed: function () {
				this.gradients = {};
				this.memory = {};
			},
			get: function (x, y) {
				if (this.memory.hasOwnProperty([x, y])) return this.memory[[x, y]];
				let xf = Math.floor(x);
				let yf = Math.floor(y);
				//interpolate
				let tl = this.dot_prod_grid(x, y, xf, yf);
				let tr = this.dot_prod_grid(x, y, xf + 1, yf);
				let bl = this.dot_prod_grid(x, y, xf, yf + 1);
				let br = this.dot_prod_grid(x, y, xf + 1, yf + 1);
				let xt = this.interp(x - xf, tl, tr);
				let xb = this.interp(x - xf, bl, br);
				let v = this.interp(y - yf, xt, xb);
				this.memory[[x, y]] = v;
				return v;
			},
		};
		perlin.seed();

		let perlinNoise = new Array(numPoints).fill(0).map(() => {
			return perlin.get(Math.random(), Math.random());
		});

		// Normalize pink noise to fall within the specified range
		const maxVal = Math.max(...perlinNoise);
		const minVal = Math.min(...perlinNoise);

		let finalNoise = [];

		for (let i = 0; i < numPoints; i++) {
			finalNoise[i] =
				((perlinNoise[i] - minVal) / (maxVal - minVal)) *
					(generatedRange[1] - generatedRange[0]) +
				generatedRange[0];
			if (generateIntegers) {
				finalNoise[i] = Math.round(finalNoise[i]);
			}
		}
		return finalNoise;
	}

	function generatePinkNoiseByVoss(numPoints, numWhiteNoise) {
		let whiteNoises = [];
		for (let i = 0; i < numWhiteNoise; i++) {
			whiteNoises.push(generateWhiteNoise(numPoints));
		}

		let pinkNoise = new Array(numPoints).fill(0);

		for (let i = 0; i < numPoints; i++) {
			for (let j = 0; j < numWhiteNoise; j++) {
				pinkNoise[i] +=
					j === 0
						? whiteNoises[j][i]
						: whiteNoises[j][Math.floor(i / Math.pow(2, j))];
			}
		}

		// Normalize pink noise to fall within the specified range
		const maxVal = Math.max(...pinkNoise);
		const minVal = Math.min(...pinkNoise);
		for (let i = 0; i < numPoints; i++) {
			pinkNoise[i] =
				((pinkNoise[i] - minVal) / (maxVal - minVal)) *
					(generatedRange[1] - generatedRange[0]) +
				generatedRange[0];
			if (generateIntegers) {
				pinkNoise[i] = Math.round(pinkNoise[i]);
			}
		}

		return pinkNoise;
	}
};

const GenerateSignal = {
	create: (settings) => {
		return { settings };
	},
	generateSignal,
};

module.exports = GenerateSignal;
