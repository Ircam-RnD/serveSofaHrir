# BinauralFIR sound module

> Processing node/library which spatializes an incoming audio stream in three-dimensional space for binaural audio.

The `binauralFIR` object provides several methods:

- `connect()`
- `disconnect()`
- `loadHRTF(hrtfData)`
- `setPosition(azimuth, elevation, distance, optImmediate)`
- `getPosition()`
- `isCrossfading()`
- `getTimeBeforeCrossfadingEnd()`
- `setCrossfadeDuration(duration)`
- `getCrossfadeDuration()`
- `getMetaDataAboutCurrentHRTF(metadataName)`


## Requirements

- 

## Example

Load binauralFIR.js, for instance in your html file by using:

```html
    <script src="binuralfir.min.js"></script>
```

```js
  // we need an audio context
  var audioContext = new AudioContext();

  // create one virtual source and pass the HRTF set
  var binauralFIRNode = createBinauralFIR(hrtfData);
  player.connect(binauralFIRNode.input);
  binauralFIRNode.connect(node);
  //set the position of the virtual source
  binauralFIRNode.setPosition(0, 0, 1);
 
```

## API

The `binauralFIR` object exposes the following API:

Method | Description
--- | ---
`binauralFIR.loadHRTF(hrtfData)` | Set hrtf set buffer to be used and update the current position with the new HRTF.
`binauralFIR.setPosition(azimuth, elevation, distance, optImmediate)` | Set position of the virtual source.
`binauralFIR.getPosition()` | Get the current position of the virtual source.
`binauralFIR.isCrossfading()` | Get if the ramps are crossfading (`true`) or not (`false`).
`binauralFIR.setCrossfadeDuration(duration)` | Set the duration of crossfading in miliseconds.
`binauralFIR.getCrossfadeDuration()` | Get the duration of crossfading in miliseconds.
`binauralFIR.getTimeBeforeCrossfadingEnd()` | If the ramps are crossfading, get the time before the crossfading finish.
`binauralFIR.getMetaDataAboutCurrentHRTF(metadataName)` | Get metadata about the current HRTF set.



## Tests

If grunt is not installed

```bash
$ npm install -g grunt-cli
```

Install all depencies in the module folder

```bash
$ npm install
```

Run the server on 9001 port (you can change the port in the Grunfile.js)

```bash
$ grunt test
```

Run the test via the web browser on `http://localhost:9001/tests`

## License

This module is released under the [BSD-3-Clause license](http://opensource.org/licenses/BSD-3-Clause).

## Acknowledgments

This code has been developed from both Acoustic And Cognitive Spaces (http://recherche.ircam.fr/equipes/salles/) and Analysis of Musical Practises IRCAM research teams. It is also part of the WAVE project (http://wave.ircam.fr), funded by ANR (The French National Research Agency), ContInt program, 2012-2015.