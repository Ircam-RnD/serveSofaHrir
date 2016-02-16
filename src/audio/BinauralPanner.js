/**
 * @fileOverview Multi-source binaural panner.
 * @author Jean-Philippe.Lambert@ircam.fr
 * @copyright 2016 IRCAM, Paris, France
 * @license CECILL-2.1
 */

import glMatrix from 'gl-matrix';

import { glToTyped, typedToGl } from '../geometry/coordinates';

import HrtfSet from '../sofa/HrtfSet';
import Source from './Source';
import Listener from '../geometry/Listener';

/**
 * Binaural panner with multiple sources and a listener.
 */
export class BinauralPanner {

  /**
   * Constructs an HRTF set. Note that the filter positions are applied
   * during the load of an HRTF URL.
   *
   * See {@link HrtfSet}.
   * See {@link BinauralPanner#loadHrtfSet}.
   *
   * @param {Object} options
   * @param {AudioContext} options.audioContext mandatory for the creation
   * of FIR audio buffers
   * @param {coordinatesType} [options.positionsType='gl']
   * {@link BinauralPanner#positionsType}
   * @param {Number} [options.sourceCount=1]
   * @param {Array.<coordinates>} [options.sourcePositions=undefined] must
   * be of length options.sourceCount {@link BinauralPanner#sourcePositions}
   * @param {Number} [options.crossfadeDuration] in seconds.
   * @param {HrtfSet} [options.hrtfSet] refer an external HRTF set.
   * {@link BinauralPanner#hrtfSet}
   * @param {coordinatesType} [options.filterPositionsType=options.positionsType]
   * {@link BinauralPanner#filterPositionsType}
   * @param {Array.<coordinates>} [options.filterPositions=undefined]
   * array of positions to filter. Use undefined to use all positions from the HRTF set.
   * {@link BinauralPanner#filterPositions}
   * @param {Boolean} [options.filterAfterLoad=false] true to filter after
   * full load of SOFA file
   * @param {Listener} [options.listener] refer an external listener.
   * {@link BinauralPanner#listener}
   * @param {coordinatesType} [options.listenerPositionsType=options.positionsType]
   * {@link BinauralPanner#listenerPositionsType}
   * @param {coordinates} [options.listenerPosition=[0,0,0]]
   * {@link BinauralPanner#listenerPosition}
   * @param {coordinates} [options.listenerUp=[0,1,0]]
   * {@link BinauralPanner#listenerUp}
   * @param {coordinates} [options.listenerView=[0,0,-1]]
   * {@link BinauralPanner#listenerView}
   */
  constructor(options = {}) {
    this._audioContext = options.audioContext;

    this.positionsType = options.positionsType;

    const sourceCount = (typeof options.sourceCount !== 'undefined'
                         ? options.sourceCount
                         : 1);
    // allocate first
    this._listener = (typeof options.listener !== 'undefined'
                      ? options.listener
                      : new Listener() );

    // set coordinates type, that defaults to BinauralPanner's own type
    this.listenerPositionsType = options.listenerPositionsType;

    // use setters for internal or external listener
    this.listenerPosition = (typeof options.listenerPosition !== 'undefined'
                             ? options.listenerPosition
                             : glToTyped([], [0, 0, 0],
                                         this._listener.positionsType) );

    this.listenerView = (typeof options.listenerView !== 'undefined'
                         ? options.listenerView
                         : glToTyped([], [0, 0, -1],
                                     this._listener.positionsType) );

    this.listenerUp = (typeof options.listenerUp !== 'undefined'
                       ? options.listenerUp
                       : glToTyped([], [0, 1, 0],
                                   this._listener.positionsType) );

    this._sourcesOutdated = new Array(sourceCount).fill(true);

    this._sources = this._sourcesOutdated.map( () => {
      return new Source({
        audioContext: this._audioContext,
        crossfadeDuration: options.crossfadeDuration,
      });
    });

    this._sourcePositionsAbsolute = this._sourcesOutdated.map( () => {
      return [0, 0, 1]; // allocation and default value
    });

    this._sourcePositionsRelative = this._sourcesOutdated.map( () => {
      return [0, 0, 1]; // allocation and default value
    });

    this.hrtfSet = (typeof options.hrtfSet !== 'undefined'
                    ? options.hrtfSet
                    : new HrtfSet({
                      audioContext: this._audioContext,
                      positionsType: 'gl',
                    }) );

    this.filterPositionsType = options.filterPositionsType;
    this.filterPositions = options.filterPositions;
    this.filterAfterLoad = options.filterAfterLoad;

    if (typeof options.sourcePositions !== 'undefined') {
      this.sourcePositions = options.sourcePositions;
    }

    this.update();
  }

  // ----------- accessors

  /**
   * Set coordinates type for positions.
   *
   * @param {coordinatesType} [type='gl']
   */
  set positionsType(type) {
    this._positionsType = (typeof type !== 'undefined'
                           ? type
                           : 'gl');
  }

  /**
   * Get coordinates type for positions.
   *
   * @returns {coordinatesType}
   */
  get positionsType() {
    return this._positionsType;
  }

  /**
   * Refer an external HRTF set, and update sources. Its positions
   * coordinate type must be 'gl'.
   *
   * See {@link HrtfSet}.
   * See {@link BinauralPanner#update}.
   *
   * @param {HrtfSet} hrtfSet
   * @throws {Error} when hrtfSet in undefined or hrtfSet.positionsType is
   * not 'gl'.
   */
  set hrtfSet(hrtfSet) {
    if (typeof hrtfSet !== 'undefined') {
      if (hrtfSet.positionsType !== 'gl') {
        throw new Error(`positions type of HRTF set must be 'gl' `
                        + `(and not '${hrtfSet.positionsType}') `
                        `for use with BinauralPannerNode`);
      }
      this._hrtfSet = hrtfSet;
    } else {
      throw new Error('Undefined HRTF set for BinauralPanner');
    }

    // update HRTF set references
    this._sourcesOutdated.fill(true);
    this._sources.forEach( (source) => {
      source.hrtfSet = this._hrtfSet;
    });

    this.update();
  }

  /**
   * Get the HrtfSet.
   *
   * @returns {HrtfSet}
   */
  get hrtfSet() {
    return this._hrtfSet;
  }

  // ------------- HRTF set proxies

  /**
   * Set the filter positions of the HRTF set
   *
   * See {@link HrtfSet#filterPositions}.
   *
   * @param {Array.<coordinates>} positions
   */
  set filterPositions(positions) {
    this._hrtfSet.filterPositions = positions;
  }

  /**
   * Get the filter positions of the HRTF set
   *
   * See {@link HrtfSet#filterPositions}.
   *
   * @return {Array.<coordinates>} positions
   */
  get filterPositions() {
    return this._hrtfSet.filterPositions;
  }

  /**
   * Set coordinates type for filter positions.
   *
   * @param {coordinatesType} [type='gl']
   */
  set filterPositionsType(type) {
    this._hrtfSet.filterPositionsType = (typeof type !== 'undefined'
                                         ? type
                                         : this.positionsType);
  }

  /**
   * Get coordinates type for filter positions.
   *
   * @returns {coordinatesType}
   */
  get filterPositionsType() {
    return this._hrtfSet.filterPositionsType;
  }

  /**
   * Set post-filtering flag. When false, try to load a partial set of
   * HRTF.
   *
   * @param {Boolean} [post=false]
   */
   set filterAfterLoad(post) {
     this._hrtfSet.filterAfterLoad = post;
   }

  /**
   * Get post-filtering flag. When false, try to load a partial set of
   * HRTF.
   *
   * @returns {Boolean}
   */
  get filterAfterLoad() {
    return this._hrtfSet.filterAfterLoad;
  }

  /**
   * Refer an external listener, and update sources.
   *
   * See {@link Listener}.
   * See {@link BinauralPanner#update}.
   *
   * @param {Listener} listener
   * @throws {Error} when listener in undefined.
   */
  set listener(listener) {
    if (typeof listener !== 'undefined') {
      this._listener = listener;
    } else {
      throw new Error('Undefined listener for BinauralPanner');
    }

    this._sourcesOutdated.fill(true);
    this.update();
  }

  // ---------- Listener proxies

  /**
   * Set coordinates type for listener.
   *
   * @param {coordinatesType} [type='gl']
   */
  set listenerPositionsType(coordinatesType) {
    this._listener.positionsType = (typeof coordinatesType !== 'undefined'
                                    ? coordinatesType
                                    : this.positionsType);
  }

  /**
   * Get coordinates type for listener.
   *
   * @returns {coordinatesType}
   */
  get listenerPositionsType() {
    return this._listener.positionsType;
  }

  /**
   * Set listener position. It will update the relative positions of the
   * sources after a call to the update method.
   *
   * Default value is [0, 0, 0] in 'gl' coordinates.
   *
   * See {@link Listener#position}.
   * See {@link BinauralPanner#update}.
   *
   * @param {coordinates} positionRequest
   */
  set listenerPosition(positionRequest) {
    this._listener.position = positionRequest;
  }

  /**
   * Get listener position.
   *
   * @returns {coordinates}
   */
  get listenerPosition() {
    return this._listener.position;
  }

  /**
   * Set listener up direction (not an absolute position). It will update
   * the relative positions of the sources after a call to the update
   * method.
   *
   * Default value is [0, 1, 0] in 'gl' coordinates.
   *
   * See {@link Listener#up}.
   * See {@link BinauralPanner#update}.
   *
   * @param {coordinates} positionRequest
   */
  set listenerUp(upRequest) {
    this._listener.up = upRequest;
  }

  /**
   * Get listener up direction.
   *
   * @returns {coordinates}
   */
  get listenerUp() {
    return this._listener.up;
  }

  /**
   * Set listener view, as an aiming position. It is an absolute position,
   * and not a direction. It will update the relative positions of the
   * sources after a call to the update method.
   *
   * Default value is [0, 0, -1] in 'gl' coordinates.
   *
   * See {@link Listener#view}.
   * See {@link BinauralPanner#update}.a
   *
   * @param {coordinates} positionRequest
   */
  set listenerView(viewRequest) {
    this._listener.view = viewRequest;
  }

  /**
   * Get listener view.
   *
   * @returns {coordinates}
   */
  get listenerView() {
    return this._listener.view;
  }

  /**
   * Set the sources positions. It will update the relative positions after
   * a call to the update method.
   *
   * See {@link BinauralPanner#update}.
   * See {@link BinauralPanner#setSourcePositionByIndex}.
   *
   * @param {Array.<coordinates>} positionsRequest
   * @throws {Error} if the length of positionsRequest is not the same as
   * the number of sources
   */
  set sourcePositions(positionsRequest) {
    if (positionsRequest.length !== this._sources.length) {
      throw new Error(`Bad number of source positions: `
                      + `${positionsRequest.length} `
                      + `instead of ${this._sources.length}`);
    }

    positionsRequest.forEach( (position, index) => {
      this._sourcesOutdated[index] = true;
      this.setSourcePositionByIndex(index, position);
    });
  }

  /**
   * Get the source positions.
   *
   * @returns {Array.<coordinates>}
   */
  get sourcePositions() {
    return this._sourcePositionsAbsolute.map( (position) => {
      return glToTyped([], position, this.positionsType);
    });
  }

  /**
   * Set the position of one source. It will update the corresponding
   * relative position after a call to the update method.
   *
   * See {@link BinauralPanner#update}.
   *
   * @param {Number} index
   * @param {coordinates} positionRequest
   * @returns {this}
   */
  setSourcePositionByIndex(index, positionRequest) {
    this._sourcesOutdated[index] = true;
    typedToGl(this._sourcePositionsAbsolute[index],
              positionRequest,
              this.positionsType);

    return this;
  }

  /**
   * Get the position of one source.
   *
   * @param {Number} index
   * @returns {coordinates}
   */
  getSourcePositionByIndex(index) {
    return glToTyped([], this._sourcePositionsAbsolute[index],
                     this.positionsType);
  }

  // ----------- public methods

  /**
   * Load an HRTF set form an URL, and update sources.
   *
   * See {@link HrtfSet#load}.
   *
   * @param {String} sourceUrl
   * @returns {Promise.<this|Error>} resolve when URL successfully
   * loaded.
   */
  loadHrtfSet(sourceUrl) {
    return this._hrtfSet.load(sourceUrl)
      .then( () => {
        this._sourcesOutdated.fill(true);
        this.update();
        return this;
      });
  }

  /**
   * Connect the input of a source.
   *
   * @param {Number} index
   * @param {(AudioNode|Array.<AudioNode>)} nodesToConnect
   * @param {Number} [output=0] output to connect from
   * @param {Number} [input=0] input to connect to
   * @returns {this}
   */
  connectInputByIndex(index, nodesToConnect, output, input) {
    this._sources[index].connectInput(nodesToConnect, output, input);

    return this;
  }

  /**
   * Disconnect the input of one source.
   *
   * @param {Number} index
   * @param {(AudioNode|Array.<AudioNode>)} nodesToDisconnect disconnect
   * all when undefined.
   * @returns {this}
   */
  disconnectInputByIndex(index, nodesToDisconnect) {
    this._sources[index].disconnectInput(nodesToDisconnect);

    return this;
  }

  /**
   * Disconnect the input of each source.
   *
   * @param {(AudioNode|Array.<AudioNode>)} nodesToDisconnect disconnect
   * all when undefined.
   * @returns {this}
   */
  disconnectInputs(nodesToDisconnect) {
    const nodes = (Array.isArray(nodesToDisconnect)
                   ? nodesToDisconnect
                   : [nodesToDisconnect] ); // make array

    this._sources.forEach( (source, index) => {
      source.disconnectInput(nodes[index]);
    });

    return this;
  }

  /**
   * Connect the output of a source.
   *
   * @param {Number} index
   * @param {(AudioNode|Array.<AudioNode>)} nodesToConnect
   * @param {Number} [output=0] output to connect from
   * @param {Number} [input=0] input to connect to
   * @returns {this}
   */
  connectOutputByIndex(index, nodesToConnect, output, input) {
    this._sources[index].connectOutput(nodesToConnect, output, input);

    return this;
  }

  /**
   * Disconnect the output of a source.
   *
   * @param {Number} index
   * @param {(AudioNode|Array.<AudioNode>)} nodesToDisconnect disconnect
   * all when undefined.
   * @returns {this}
   */
  disconnectOutputByIndex(index, nodesToDisconnect) {
    this._sources[index].disconnectOutput(nodesToDisconnect);

    return this;
  }

  /**
   * Connect each output of each source. Note that the number of nodes to
   * connect must match the number of sources.
   *
   * See {@link BinauralPanner#connectOutputByIndex}.
   *
   * @param {(AudioNode|Array.<AudioNode>)} nodesToConnect
   * @param {Number} [output=0] output to connect from
   * @param {Number} [input=0] input to connect to
   * @returns {this}
   */
  connectOutputs(nodesToConnect, output, input) {
    this._sources.forEach( (source) => {
      source.connectOutput(nodesToConnect, output, input);
    });

    return this;
  }

  /**
   * Disconnect the output of each source.
   *
   * @param {(AudioNode|Array.<AudioNode>)} nodesToDisconnect
   * @returns {this}
   */
  disconnectOutputs(nodesToDisconnect) {
    this._sources.forEach( (source) => {
      source.disconnectOutput(nodesToDisconnect);
    });

    return this;
  }

  /**
   * Update the sources filters, according to pending changes in listener,
   * and source positions.
   *
   * @returns {Boolean} true when at least a change occurred.
   */
  update() {
    let updated = false;
    if (this._listener.update() ) {
      this._sourcesOutdated.fill(true);
      updated = true;
    }

    if (this._hrtfSet.isReady) {
      this._sourcePositionsAbsolute.forEach( (positionAbsolute, index) => {
        if (this._sourcesOutdated[index] ) {
          glMatrix.vec3.transformMat4(this._sourcePositionsRelative[index],
                                      positionAbsolute,
                                      this._listener.lookAt);

          this._sources[index].position = this._sourcePositionsRelative[index];

          this._sourcesOutdated[index] = false;
          updated = true;
        }
      });
    }

    return updated;
  }
}

export default BinauralPanner;
