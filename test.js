const GenerateSignal = require("./generate-signal");

const signalGenerator = GenerateSignal;
const signalConfig = {
	fractalGap: 128,
	minWindow: 4,
	scaleGrow: 0.5,
	signalRange: [0, 1],
	signalType: "Fractal",
};
const generatedSignal = signalGenerator.generateSignal(signalConfig);

console.log(generatedSignal);
