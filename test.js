const GenerateSignal = require("./generate-signal");

const signalGenerator = GenerateSignal;
const signalConfig = {
	fractalGap: 128,
	minWindow: 4,
	scaleGrow: 0.25,
	signalRange: [1, 4],
	signalType: "Fractal",
	streaming: false,
};
const generatedSignal = signalGenerator.generateSignal(signalConfig);

console.log(JSON.stringify(generatedSignal));

// const stream = generatedSignal.stream;

// stream.on("data", (number) => {
// 	const buffer = Buffer.from(number);
// 	const decodedString = buffer.toString("utf-8");
// 	console.log(decodedString); // Do something with each number
// });

// stream.on("end", () => {
// 	console.log("finished the stream");
// });
