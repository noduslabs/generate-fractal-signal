# Fractal Signal Generator

### Generates fractal time series of a specified length based on [DFA algorithm](https://github.com/deemeetree/dfa) within a specified range.

## Use Cases

- Adaptive scheduling

- Natural activity emulation

- CAPTCHA bypass (emulating human activity)

- Music

- Art

etc.

## Fractal Dynamics and Time

Fractal dynamics is shown to be prevalent in natural systems that are adaptive and resilient.

Fractals, at their core, are patterns that repeat across different scales. What you see on the small scale is similar to what you see on the big scale and vice versa. There are mainly two reasons for their natural existence. First, fractals can be easily built from a simple formula: e.g. move forward and then go left and go right double the previous distance, repeat. As a result, you'll get a complex self-similar structure. Trees grow like this. Secondly, fractals enable living systems to be sensitive across different scales: both at the miniature level (think of capillars on the leaves) and the bigger level (think of the roots that get food from the earth). They emerge because of multiple environmental forces acting upon a system, so in order to adapt to the environment it adopts the fractal structure.

It's easy to represent fractals in space, but what about the time dimension? We have multiple [examples](https://noduslabs.com/tag/fractal/) or fractals also present in time. For example, the healthiest rhythm for our heart beat is fractal. A healthy gait will also have fractal properties.

In time, fractals are the same as in space: _self-similar structures_. What is self-similarity in time? When the patterns of change repeat across different scales. No matter how big or how small you zoom in or out, you'll see the same patterns of change. That's why fractal dynamics is sometimes called scale-free or scale-invariant.

It is also associated with the so-called _pink noise_, which is a sign of multiple signals interacting and forming complex intricate patterns. It is also called _1/f fractal noise_, because the higher is the frequency `f`, the lower is the `amplitude` and vice versa. In other words, you'll see multiple small changes, but the bigger the change, the rarer it is. It's very different from the so-called _white noise_ where the signal is random: there will be a clearly defined typical range (e.g. mid-amplitude) and smaller or bigger amplitudes will follow normal distribution (e.g. the higher is the deviation from the mean, the less likely it is to occur). In fractal signal, the smaller is the deviation in absolute terms, the more likely it is to occur. There is no average in a fractal. The only constant is its self-similarity.

This library helps you generate a fractal signal, which you can then use for any purposes: for example, planning your daily activities or trying to pretend you're a human when bypassing CAPTCHA automatically.

Fractal dynamics emulates the natural one, so if you want to seem like — at least in the time dimension — that you are a living creature, perhaps you should be using fractal dynamics too.

## How is the Fractal Signal Generated?

The best is to see the source code of this module. In general, it first generates several power-law distributions within the range that you specify and then calculates [DFA alpha component](https://github.com/deemeetree/dfa) using our other NPM module [dfa-variability](https://github.com/deemeetree/dfa). The signal time series with the best DFA alpha component that equals 1 will be selected and shown to the user.

## To-Do

- Other type of signal generators don't always deliver clean results

- Provide more examples of use

## References

- [Nodus Labs / Fractals for HRV - heart monitoring](https://noduslabs.com/research/how-to-measure-heart-rate-variability-hrv-using-fractals/)

- [Nodus Labs / Movement Resilience using Fractals](https://noduslabs.com/featured/fractal-variability-feedback-system/)

coming soon:

- Fractals for emulating natural human action in time

- Fractal life rhythms

## License

GPL License

Use it in your projects, but, please, contact us if you're intending commercial use. Capitalism works but it's not so fractal, so we need to make sure it doesn't grow in a destructive way.
