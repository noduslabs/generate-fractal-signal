# Fractal Signal Generator

### Generates fractal time series of a specified length based on [DFA algorithm](https://github.com/deemeetree/dfa) within a specified range.

--

## Use Cases

- Adaptive scheduling

- Natural activity emulation

- CAPTCHA bypass (emulating human activity)

- Music

- Art

etc.

Try this generator online: [Fractal Variability App](https://fractal-feedback.vercel.app/) - click on the Data tab to generate your signal and visualize it.

![Image Alt Text](https://pbs.twimg.com/media/GBo8ew5WcAAGQFJ?format=png&name=large)

Contact us via [support.noduslabs.com](https://support.noduslabs.com) or on Twitter: [@noduslabs](https://twitter.com/noduslabs)

--

## Fractal Dynamics and Time

Fractal dynamics is shown to be prevalent in natural systems that are adaptive and resilient.

Fractals, at their core, are patterns that repeat across different scales. What you see on the small scale is similar to what you see on the big scale and vice versa. There are mainly two reasons for their natural existence. First, fractals can be easily built from a simple formula: e.g. move forward and then go left and go right double the previous distance, repeat. As a result, you'll get a complex self-similar structure. Trees grow like this. Secondly, fractals enable living systems to be sensitive across different scales: both at the miniature level (think of capillars on the leaves) and the bigger level (think of the roots that get food from the earth). They emerge because of multiple environmental forces acting upon a system, so in order to adapt to the environment it adopts the fractal structure.

It's easy to represent fractals in space, but what about the time dimension? We have multiple [examples](https://noduslabs.com/tag/fractal/) or fractals also present in time. For example, the healthiest rhythm for our heart beat is fractal. A healthy gait will also have fractal properties.

In time, fractals are the same as in space: _self-similar structures_. What is self-similarity in time? When the patterns of change repeat across different scales. No matter how big or how small you zoom in or out, you'll see the same patterns of change. That's why fractal dynamics is sometimes called scale-free or scale-invariant.

It is also associated with the so-called _pink noise_, which is a sign of multiple signals interacting and forming complex intricate patterns. It is also called _1/f fractal noise_, because the higher is the frequency `f`, the lower is the `amplitude` and vice versa. In other words, you'll see multiple small changes, but the bigger the change, the rarer it is. It's very different from the so-called _white noise_ where the signal is random: there will be a clearly defined typical range (e.g. mid-amplitude) and smaller or bigger amplitudes will follow normal distribution (e.g. the higher is the deviation from the mean, the less likely it is to occur). In fractal signal, the smaller is the deviation in absolute terms, the more likely it is to occur. There is no average in a fractal. The only constant is its self-similarity.

This library helps you generate a fractal signal, which you can then use for any purposes: for example, planning your daily activities or trying to pretend you're a human when bypassing CAPTCHA automatically.

Fractal dynamics emulates the natural one, so if you want to seem like — at least in the time dimension — that you are a living creature, perhaps you should be using fractal dynamics too.

--

## How is the Fractal Signal Generated?

The best is to see the source code of this module. In general, it first generates several power-law distributions within the range that you specify and then calculates [DFA alpha component](https://github.com/deemeetree/dfa) using our other NPM module [dfa-variability](https://github.com/deemeetree/dfa). The signal time series with the best DFA alpha component that equals 1 will be selected and shown to the user.

--

## How to Use

To install as an NPM module:

```sh
npm install generate-fractal-signal
```

Then add include it in your script using

```js
const GenerateFractalSignal = require("generate-fractal-signal");
```

Simple initiation with a config that contains all the parameters of your expected signal:

```js
const GenerateSignal = require("./generate-signal");

const signalGenerator = GenerateSignal;
const signalConfig = {
	signalLength: 128,
	minWindow: 4,
	scaleGrow: 0.5,
	signalRange: [10000, 30000],
	signalType: "Fractal",
};
const generatedSignal = signalGenerator.generateSignal(signalConfig);

console.log(generatedSignal);
```

In this case, we ask it to generate time series based on:

- `signalLength`: the number of datapoints in our expected signal — `128` in this case (note, it is better if it's in the 2^x increments, e.g. 128, 256, 512, etc due to the math behind DFA)

- `signalRange`: each data point will be in the range between 0 and 5000 (e.g. milliseconds)

- `minWindow`: `2^(scaleWindow^0.5)` is the smallest scale we look for patterns, in our case, it's `2^2` = 4 data points.

- `scaleGrow`: grow scale by a factor of `0.5` for each step, that is, the next one is `2^(4.5^0.5)`, then `2^(5^0.5)` etc. resulting in the scale lengths 5, 8, etc. until it reaches 128.

- `signalType`: "fractal" — the others don't work so well for now.

As a result, you'll generate a JSON object as a response, which has the `timeSeries` property with an array of results, and there are other properties that contain information about the DFA alpha component (`1.04` in this case, almost perfectly fractal), and your initial parameters.

```
{
  timeSeries: [
    14174, 17113, 13844,  9608, 17521, 13895, 19655, 16988, 16391,
    12445, 15590, 13284,  9786, 13756, 13237, 15960, 11059, 13385,
    19780, 18349, 14968,  9250, 17155, 12995, 12440, 15314, 21198,
    18083, 22827, 16612, 25768, 23430, 12410, 10153, 14083, 17586,
     7138,  7240,  8383, 14013,  5940,  9361,  8532,  9253,  9071,
     9159, 16713, 19059,  9472, 10806, 12491, 17257, 14141, 15589,
    17244, 17788,     0,  5446,  2080,  4828, 10404,  8534,  5926,
     7460, 20269, 21556, 12448, 13049, 22697, 25182, 19426, 25537,
    12100, 17657, 22232, 18109, 16120, 13022, 15815, 10967,  6864,
    10408, 14161, 14639, 10319, 11611, 10963,  7974, 16090, 11312,
    15349, 11372, 15516, 11644, 15659, 12976, 22681, 25083, 14940,
    18082,
    ... 28 more items
  ],
  alpha: 1.0400067555820016,
  signalLength: 128,
  minWindow: 4,
  scaleGrow: 0.5,
  signalRange: [ 0, 30000 ],
  desiredSignalType: 'Fractal'
}
```

You can then take this time series and use it to emulate a certain activity that should happen every 10000 to 30000 milliseconds (10 to 30) seconds. Nobody will be able to tell that it's a machine doing that, because it is not random but has a certain pattern to it.

--

## Possible Signal Types Generated

Multiple signal types (`signalType` variable) which correlate with various types of distributions are available:

- `Aleatory` — a random process where every value from the range has a similar chance of appearing (synonyms: `Random`, `Stochastic`, `WhiteNoise`, `Uniform`). Random variability. The values will most likely fit normal distribution, the average will most likely be somewhat in the middle of the range. Suitable for emulating random processes, seeding sequences, white noise, aleatory musical composition, light installations. The calculated alpha component is around 0.5 or below. Generated using white noise generator (`Math.random` function).

- `Stationary` - short-term patterns start to emerge and the signal becomes stationary in that most values are grouped around a certain mean (synonyms: `Stable`, `Regular`, `Mosaic`). Mosaic variability. It can be interpreted as the emergence of short-term memory in the system. If a certain value appears it is likely to be followed by a similar value but not for too long. Then the pattern may change, hence the term "Mosaic". Suitable for emulating "normal", "regular" behaviors. The calculated alpha component is around 0.75. Generated using a combinatino of white noise and pink noise generators.

- `Fractal` — balanced interaction between short-term and long-term patterns in a time series, self-similar patterns of variability across different time scales (synonyms: `PinkNoise`, `Transitional`, `Adaptive`). Characteristic for the processes that combine long-term and short-term memory, thus highly sensitive to a wide range of impulses from the environment and, thus, inherently more adaptive. Suitable for modeling highly resilient, agile, adaptive systems or "natural" sound and visuals. The calculated alpha component is 1. Generated using pink noise generators, which .

- `Gradient` - random walk process where each next step depends on the previous one (synonyms: `BrownNoise`, `Shifting`, `NonStationary`). Typical for many everyday processes where long-term influences (trends) overpower the short-term ones (e.g. stock markets). Suitable for emulating human behaviors or processes with prolonged periods of stability. The calculated alpha component is 1.5. Generated using a rule-based system.

## To-Do

- Other type of signal generators don't always deliver clean results

- Provide more examples of use

- Add floating point generator

--

## References

- [Nodus Labs / Fractals for HRV - heart monitoring](https://noduslabs.com/research/how-to-measure-heart-rate-variability-hrv-using-fractals/)

- [Nodus Labs / Movement Resilience using Fractals](https://noduslabs.com/featured/fractal-variability-feedback-system/)

Some code was used from [https://github.com/joeiddon/perlin](https://github.com/joeiddon/perlin) for Perlin noise creation.

coming soon:

- Fractals for emulating natural human action in time

- Fractal life rhythms

--

## License

GPL License

Use it in your projects, but, please, contact us if you're intending commercial use. Capitalism works but it's not so fractal, so we need to make sure it doesn't grow in a destructive way.

--

## Contact Us

Created by Dmitry Paranyushkin from Nodus Labs.

Contact us via [support.noduslabs.com](https://support.noduslabs.com) or on Twitter: [@noduslabs](https://twitter.com/noduslabs)

Also check out our AI tool for text network analysis and creative thinking: [www.infranodus.com](https://infranodus.com)
