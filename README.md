# Fractal Signal Generator

[![npm version](https://img.shields.io/npm/v/generate-fractal-signal.svg)](https://www.npmjs.com/package/generate-fractal-signal)
[![npm downloads](https://img.shields.io/npm/dm/generate-fractal-signal.svg)](https://www.npmjs.com/package/generate-fractal-signal)
[![license](https://img.shields.io/npm/l/generate-fractal-signal.svg)](https://github.com/noduslabs/generate-fractal-signal)

### Generates mono- and multifractal time series of a specified length and range with a chosen [DFA](https://github.com/deemeetree/dfa) exponent (global α, short-term α₁, long-term α₂, or a crossover between the two).

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

Version 2 works in two steps:

1. **Synthesise candidates.** The default generator uses spectral synthesis (the Fourier filtering method): a random-phase spectrum with power `1/f^β` is inverse-transformed into a time series. The DFA exponent relates to the spectral exponent as `β = 2α − 1`, so any `α` between roughly 0.2 and 1.7 can be requested directly. For a signal with different short- and long-term scaling the spectrum is piecewise, with a crossover at scale 16 (the α₁/α₂ boundary used by DFA). For a multifractal signal a random binomial multiplicative cascade modulates the amplitude of that noise, so that small and large fluctuations scale differently.

2. **Measure and select.** Every candidate is analysed with [dfa-variability](https://github.com/deemeetree/dfa) (`compute()` for α, α₁, α₂ and `computeMultifractal()` for the h(q) spectrum). The measured error feeds back into the spectral exponent and cascade intensity for the next candidate, and the series closest to the targets is returned together with its full DFA report. Because DFA on finite series is biased and noisy, this measure-and-correct loop is what makes the targets reliable.

The legacy v1 generators (Voss pink noise, a rule-based random walk, Perlin, white noise) are still available via the `generator` option, see [Generators](#generators) below.

--

## How to Use

To install as an NPM module:

```sh
npm install generate-fractal-signal
```

```js
const { generateSignal } = require("generate-fractal-signal");
```

### Minimal example

```js
const result = generateSignal({
	signalLength: 256,
	signalRange: [10000, 30000],
	signalType: "Fractal", // α ≈ 1
});

console.log(result.timeSeries); // 256 integers between 10000 and 30000
console.log(result.alpha, result.alpha1, result.alpha2); // measured exponents
```

### Any target alpha

```js
generateSignal({ signalLength: 512, targetAlpha: 1.25, signalRange: [0, 1], generateIntegers: false });
```

`targetAlpha` overrides the preset of `signalType`. Useful range is about **0.2 – 1.7**; DFA cannot measure much beyond that on a few hundred points, so higher targets saturate around 1.6–1.7.

### Short-term (α₁), long-term (α₂) or global α

```js
// steer the short-term exponent (scales 4–16) to 0.7
generateSignal({ signalLength: 256, targetAlpha: 0.7, alphaType: "alpha1" });

// steer the long-term exponent (scales 16–N/4); needs N ≥ 256
generateSignal({ signalLength: 512, targetAlpha: 1.2, alphaType: "alpha2" });
```

`alphaType` chooses which measured exponent is compared with the target, exactly like the "Global α / Short-term α1 / Long-term α2" switch in the Eunosoma entrainer. `achievedAlpha` in the result holds that exponent; `alpha`, `alpha1` and `alpha2` are always reported as well.

### Crossover: α₁ and α₂ at the same time

```js
// bursty, persistent short-term dynamics on top of an anti-persistent long-term trend
generateSignal({ signalLength: 1024, targetAlpha1: 1.2, targetAlpha2: 0.6 });
```

When both `targetAlpha1` and `targetAlpha2` are set the spectrum is built piecewise and the candidate is scored on both exponents. `crossoverScale` (default 16, same as DFA's `shortMax`) sets where the two regimes meet. α₂ needs roughly 256+ points to be estimated; 1024 or more is recommended.

### Multifractal signals

```js
const result = generateSignal({
	signalLength: 1024,
	targetAlpha: 1, // second-order scaling h(2)
	fractality: "multifractal",
	multifractalWidth: 0.5, // target h(qMin) − h(qMax)
	signalRange: [0, 1],
	generateIntegers: false,
});

result.multifractal.width; // measured width, e.g. 0.49
result.multifractal.label; // "monofractal" | "weak" | "multifractal"
result.multifractal.verdict.global; // { label, source, significant, z, p, ... }
result.multifractal.hq; // h(q) curve, index-aligned with result.multifractal.q
```

A monofractal signal scales the same way whatever the size of the fluctuation. A multifractal one does not: large bursts and small ripples have different exponents, so the generalised Hurst exponent `h(q)` falls as `q` grows. `multifractalWidth` is the single-number summary of that spread. The result includes the full `computeMultifractal()` report from dfa-variability (`multifractal.full`), including the shuffled-surrogate verdict that tells whether the width comes from the temporal ordering (`source: "correlations"`), from a fat-tailed value distribution (`"distribution"`) or both.

What to expect:

- Widths of **0.4 and above** come out as significant, correlation-based multifractality on 1024 points. Around **0.2** the width is indistinguishable from the finite-size floor of a plain monofractal series (about 0.18 at N = 1024), so the verdict will say "monofractal" even though the cascade is present.
- Below ~256 points there is no α₂ curve and the verdict is unreliable; a warning is added to `result.warnings`.
- `targetAlpha`, `alphaType`, `targetAlpha1`/`targetAlpha2` all combine with `fractality: "multifractal"`.
- `multifractalIntensity` (0–1) fixes the cascade strength instead of searching for it; `cascadeMinCell` (default: `minWindow`, 4) is the smallest cascade cell in samples. Set `analyzeMultifractal: true` on a monofractal run to get the same report for comparison.

### Full option list

| Option | Default | Meaning |
| --- | --- | --- |
| `signalLength` | `128` | number of points (powers of two suit DFA best) |
| `signalRange` | `[0, 30000]` | min and max of the output values |
| `signalType` | `"Fractal"` | named preset, see [Signal types](#possible-signal-types-generated) |
| `targetAlpha` | preset | DFA exponent to aim for; overrides the preset |
| `alphaType` | `"global"` | `"global"`, `"alpha1"` or `"alpha2"`: which exponent `targetAlpha` applies to |
| `targetAlpha1`, `targetAlpha2` | `null` | set both for a crossover signal |
| `fractality` | `"monofractal"` | or `"multifractal"` |
| `multifractalWidth` | `0.4` | target h(qMin) − h(qMax) |
| `multifractalIntensity` | `null` | fixed cascade intensity (0–1); `null` searches |
| `cascadeMinCell` | `minWindow` | smallest cascade cell in samples |
| `multifractalOptions` | `{}` | passed to `computeMultifractal()` (`qMin`, `qMax`, `qStep`, `surrogateCount`, `seed`, ...) |
| `analyzeMultifractal` | `null` | attach the MFDFA report (defaults to true for multifractal runs) |
| `generator` | `"auto"` | `"fourier"`, `"legacy"`, `"voss"`, `"voss4"`, `"white"`, `"brownian"`, `"perlin"`, `"ordered"` |
| `numTrials` | `100` / `40` | candidates to try (monofractal / multifractal) |
| `tolerance` | `0.02` | stop early once the score is below this; `0` disables |
| `seed` | `null` | integer seed for reproducible output |
| `accentuation` | `1` | contrast exponent; `> 1` pushes values toward the range extremes |
| `discreteLevels` | `null` | array of allowed values, each point snaps to the nearest |
| `generateIntegers` | `true` | round to integers (ignored when `discreteLevels` is set) |
| `vossLayers` | `16` | white-noise layers for the Voss generator |
| `minWindow`, `scaleGrow`, `linearStep` | `4`, `0.25`, `2` | DFA scale settings (`minWindow`, `expStep`, `step` in dfa-variability) |
| `shortMax`, `longMin`, `longMaxFraction` | `16`, `16`, `0.25` | α₁ / α₂ fit ranges |
| `crossoverScale` | `shortMax` | where the α₁ and α₂ spectra meet |
| `streaming` | `false` | return a readable stream that emits each value after a delay equal to the value (ms) |
| `verbose` | `false` | log every trial |

### Result object

```js
{
  timeSeries: [...],          // the signal (absent when streaming; use `stream`)
  alpha: 1.004,               // measured global α
  alpha1: 0.97,               // measured short-term α₁ (null if not estimable)
  alpha2: 1.02,               // measured long-term α₂ (null below ~256 points)
  achievedAlpha: 1.004,       // the exponent that was targeted (per alphaType)
  achievedAlpha1, achievedAlpha2, // present in crossover mode
  score: 0.004,               // sum of |measured − target| over all targets (+ width error)
  targetAlpha, alphaType, targets: { global: 1 },
  fractality: "monofractal",  // or "multifractal"
  multifractal: null,         // MFDFA report (see above) when requested
  generator: "fourier",       // generator actually used
  trials: 3,                  // candidates evaluated
  warnings: [],               // e.g. alpha2 unavailable for short series
  dfa: { ... },               // full dfa-variability compute() result of the chosen series
  signalLength, signalRange, minWindow, scaleGrow, linearStep, desiredSignalType, seed
}
```

### Streaming

```js
const { stream } = generateSignal({ signalLength: 64, signalRange: [500, 3000], streaming: true });
stream.on("data", (chunk) => console.log(chunk.toString()));
stream.on("end", () => console.log("done"));
```

Each value is pushed after a delay equal to the value itself in milliseconds, so the stream can drive an activity directly.

--

## Possible Signal Types Generated

`signalType` presets map to a target α. Names are case-insensitive.

- `Aleatory` — random, no correlation (synonyms: `Random`, `Stochastic`, `WhiteNoise`, `Uniform`). α ≈ 0.5. Suitable for emulating random processes, seeding sequences, white noise, aleatory composition.

- `Stationary` — short-term patterns, values grouped around a mean (synonyms: `Stable`, `Regular`, `Mosaic`). α ≈ 0.75. Short-term memory: a value is likely to be followed by a similar one, but not for long. Suitable for emulating "normal", "regular" behaviours.

- `Fractal` — balanced short- and long-term correlations, self-similar across scales (synonyms: `PinkNoise`, `Transitional`, `Adaptive`). α ≈ 1. Characteristic of adaptive, resilient systems. The default.

- `Gradient` — random walk, each step depends on the previous one (synonyms: `BrownNoise`, `Shifting`, `NonStationary`, `Unstable`). α ≈ 1.5. Long trends overpower short-term variation. Suitable for processes with prolonged periods of stability.

- `Perlin`, `Sequential` / `Structured` — legacy generators kept for compatibility (see below).

--

## Generators

`generator: "auto"` (default) uses spectral synthesis for every preset and target, except the `Perlin` and `Sequential` presets which keep their own generators. You can pick one explicitly:

| `generator` | What it does | Limitations |
| --- | --- | --- |
| `"fourier"` | Spectral synthesis with feedback on the measured α. Default. | Targets above ~1.7 saturate (DFA bias). Values are Gaussian-ish before range normalisation, so extremes are rare unless `accentuation > 1`. |
| `"legacy"` | Reproduces v1 behaviour: the generator is fixed by `signalType` (`white` for Random, `voss4` for Stationary, `voss` for Fractal, `brownian` for Gradient). | Ignores `targetAlpha`, `alphaType` and crossover targets (a warning is added). Only selects the best of random candidates, no steering. |
| `"voss"` | Voss–McCartney pink noise, `vossLayers` white-noise layers. | Produces α ≈ 1 only. Dyadic update rate leaves a staircase structure visible in short series. |
| `"voss4"` | Voss with 4 layers. | Produces α ≈ 0.75–0.85; often needs many trials to land near 0.75. |
| `"white"` | Uniform random values. | α ≈ 0.5 only. |
| `"brownian"` | v1 rule-based random walk with short/long trend feedback. | **Does not reach α = 1.5** in practice: measured α hovers around 0.95–1.05 at 128–512 points. Its step size is in absolute units, so the dynamics depend on `signalRange`. Kept for compatibility only. |
| `"perlin"` | 2D Perlin noise sampled at random points. | Effectively white noise (α ≈ 0.5). |
| `"ordered"` | Alternating step pattern with random choice between two sequences. | α ≈ 0.5; not fractal. |

Multifractal generation always uses the spectral generator with a cascade envelope; another `generator` value is ignored with a warning.

The generators are also exported for direct use: `require("generate-fractal-signal").generators.fourier(n, { beta }, Math.random)` etc., together with `shapeToRange()`.

--

## What changed in version 2

- Dependency updated to `dfa-variability` ^2.4.0 (α₁ / α₂ ranges, multifractal DFA with surrogate verdicts).
- Default generator is spectral synthesis with a feedback loop instead of Voss / rule-based noise. Presets now reach their nominal α (notably `Gradient` → 1.5, which v1 never achieved). Use `generator: "legacy"` for the v1 behaviour.
- New options: `targetAlpha`, `alphaType`, `targetAlpha1` / `targetAlpha2`, `fractality`, `multifractalWidth`, `seed`, `accentuation`, `discreteLevels`, `generateIntegers`, `tolerance`, `numTrials`, `verbose`.
- Result now includes `alpha1`, `alpha2`, `achievedAlpha`, `score`, `warnings`, the full `dfa` report and, for multifractal runs, `multifractal`.
- Per-trial `console.log` output removed (use `verbose: true`).
- `npm test` runs a seeded check of every mode.

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
