const GenerateSignal = require("./generate-signal");

const signalGenerator = GenerateSignal;
const signalConfig = {
	fractalGap: 128,
	minWindow: 4,
	scaleGrow: 0.5,
	fractalRange: [10000, 30000],
	signalType: "Fractal",
};
const generatedSignal = signalGenerator.generateSignal(signalConfig);

console.log(generatedSignal);
