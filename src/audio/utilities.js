/**
 * @fileOverview Audio utilities
 * @author Jean-Philippe.Lambert@ircam.fr
 * @copyright 2016 IRCAM, Paris, France
 * @license BSD-3-Clause
 */

/**
 * Convert an array, typed or not, to a Float32Array, with possible re-sampling.
 *
 * @param {Object} options
 * @param {Array} options.inputSamples input array
 * @param {Number} options.inputSampleRate in Hertz
 * @param {Number} [options.outputSampleRate=options.inputSampleRate]
 * @returns {Promise.<Float32Array|Error>}
 */
export function resampleFloat32Array(options = {}) {
  const promise = new Promise( (resolve, reject) => {
    const inputSamples = options.inputSamples;
    const inputSampleRate = options.inputSampleRate;

    const outputSampleRate = (typeof options.outputSampleRate !== 'undefined'
                              ? options.outputSampleRate
                              : inputSampleRate);

    if (inputSampleRate === outputSampleRate) {
      resolve(new Float32Array(inputSamples) );
    } else {
      try {
        const outputSamplesNb = Math.ceil(inputSamples.length
                                          * outputSampleRate / inputSampleRate);

        const context = new window.OfflineAudioContext(1, outputSamplesNb,
                                                       outputSampleRate);

        const inputBuffer = context.createBuffer(1, inputSamples.length,
                                                 inputSampleRate);

        inputBuffer.getChannelData(0).set(inputSamples);

        const source = context.createBufferSource();
        source.buffer = inputBuffer;
        source.connect(context.destination);

        source.start(); // will start with offline context

        context.oncomplete = (event) => {
          const outputSamples = event.renderedBuffer.getChannelData(0);
          resolve(outputSamples);
        };

        context.startRendering();
      } catch (error) {
        reject(new Error(`Unable to re-sample Float32Array. ${error.message}`) );
      }
    }
  });

  return promise;
}

export default {
  resampleFloat32Array,
};
