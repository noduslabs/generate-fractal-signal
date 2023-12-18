const DFA = require("dfa-variability");

const generateSignal = function ({
	fractalGap = 128,
	minWindow = 4,
	scaleGrow = 0.5,
	fractalRange = [0, 30000],
	signalType = "Fractal",
}) {
	const numPoints = fractalGap;
	const numWhiteNoise = 16;
	const numTrials = 100;
	const generatedRange = [fractalRange[0], fractalRange[1]];
	const generateIntegers = true;

	let bestDifference = Infinity;
	let bestSequence;
	let dfa;
	let alphaComponent;
	let alphaValue;

	let idealAlpha = 1;

	switch (signalType) {
		case "Random":
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
			case "random":
				sequence = generateWhiteNoise(numPoints);
				break;
			case "stable":
				sequence = generateWhiteNoise(numPoints, numWhiteNoise);
				break;
			case "unstable":
				sequence = generateWhiteNoise(numPoints, numWhiteNoise);
				break;
			case "fractal":
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
		fractalGap,
		minWindow,
		scaleGrow,
		fractalRange,
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
