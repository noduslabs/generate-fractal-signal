const generatedRange = [1, 4];

const generateIntegers = true;

function generateBrownianNoise(length) {
	let brownianNoise = new Array(length);

	brownianNoise[0] =
		Math.random() * (generatedRange[1] - generatedRange[0]) + generatedRange[0];

	if (generateIntegers) {
		brownianNoise[0] = Math.round(brownianNoise[0]);
	}

	for (let i = 1; i < length; i++) {
		let prevValue = i - 2 > 0 ? brownianNoise[i - 2] : brownianNoise[i - 1];

		let prevDelta = Math.abs(brownianNoise[i - 1] - prevValue);

		if (prevDelta === 0) {
			prevDelta = generatedRange[1] - generatedRange[0];
		}

		let delta = Math.random() * prevDelta;

		let nextValue =
			Math.random() > 0.5
				? brownianNoise[i - 1] + delta
				: brownianNoise[i - 1] - delta;

		brownianNoise[i] = nextValue;

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

function generateBrownianNoiseNew(length) {
	let brownianNoise = new Array(length);

	brownianNoise[0] =
		Math.random() * (generatedRange[1] - generatedRange[0]) + generatedRange[0];

	if (generateIntegers) {
		brownianNoise[0] = Math.round(brownianNoise[0]);
	}

	for (let i = 1; i < length; i++) {
		let delta =
			(Math.random() * (generatedRange[1] - generatedRange[0]) +
				generatedRange[0]) /
			(generatedRange[1] - generatedRange[0]);

		if (brownianNoise[i - 1] + delta > generatedRange[1]) {
			brownianNoise[i] = generatedRange[1];
		} else if (brownianNoise[i - 1] - delta < generatedRange[0]) {
			brownianNoise[i] = generatedRange[0];
		} else {
			brownianNoise[i] =
				Math.random() > 0.5
					? brownianNoise[i - 1] + delta
					: brownianNoise[i - 1] - delta;
		}

		if (generateIntegers) {
			brownianNoise[i] = Math.round(brownianNoise[i]);
		}
	}

	return brownianNoise;
}

function generateBrownianNoiseNew2(length) {
	let brownianNoise = new Array(length);

	brownianNoise[0] =
		Math.random() * (generatedRange[1] - generatedRange[0]) + generatedRange[0];

	if (generateIntegers) {
		brownianNoise[0] = Math.round(brownianNoise[0]);
	}

	for (let i = 1; i < length; i++) {
		let delta =
			(Math.random() * (generatedRange[1] - generatedRange[0]) +
				generatedRange[0]) /
			(generatedRange[1] - generatedRange[0]);

		let newValue =
			Math.random() > 0.5
				? brownianNoise[i - 1] + delta
				: brownianNoise[i - 1] - delta;

		if (newValue > generatedRange[1]) {
			brownianNoise[i] = generatedRange[1];
		} else if (newValue < generatedRange[0]) {
			brownianNoise[i] = generatedRange[0];
		} else {
			brownianNoise[i] = newValue;
		}

		if (generateIntegers) {
			brownianNoise[i] = Math.round(brownianNoise[i]);
		}
	}

	return brownianNoise;
}

console.log(JSON.stringify(generateBrownianNoise(128)));
