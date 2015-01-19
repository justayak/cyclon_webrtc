/**
 * Created by julian on 18/01/15.
 */
var EventEmitter = require('events').EventEmitter;

/********************************************************************
 *                          A P I                                   *
 *  The code below is the implementation of the {membership}        *
 *  Interface that is defined in the library {p2pnetwork}           *
 *  https://github.com/justayak/network                             *
 ********************************************************************/

var delta_t = 4000; // 10 sec
var c = 3;
var l = 2;


/**
 *
 * @param options {Object}
 * @constructor
 */
function Cyclon(options) {
    EventEmitter.call(this);
}
Utils.inherit(Cyclon, EventEmitter);

/**
 * +++ A L I C E +++
 *
 * Starts the Handshaking. This must be done once to connect to the network. {launch} takes a callback
 * as parameter that gets called when the ICE-Candidates are gathered.
 * The {offer} that is created must be transmitted to the other peer (How this is done is out of the scope
 * of this library) in order to initiate the handshake.
 * @param onOffer {function} (offer {String})
 */
Cyclon.prototype.launch = function (onOffer) {

};

/**
 * +++ A L I C E +++
 *
 * This is the final handshake-function that gets called after an answer is received
 * @param answer {String} remote answer
 */
Cyclon.prototype.handshake = function(answer){

};

/**
 * +++ B O B +++
 *
 * Upon receiving an offer from {launch} through the signaling service the peer creates a fitting answer.
 * This answer is propagated to the application with a callback that must be provided to this function.
 * The answer must be send back to the communication initiator.
 * @param onAnswer {function} (answer {String})
 */
Cyclon.prototype.answer = function (offer, onAnswer) {

};

/**
 * This function checks if the membership protocol is already connected to the network and is "ready" or if
 * the handshake is still pending.
 * The parameter is a callback that gets called as soon as the peer is connected to the network.
 * @param callback {function}
 */
Cyclon.prototype.ready = function (callback) {

};