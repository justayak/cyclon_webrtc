/**
 * Created by julian on 18/01/15.
 */
var EventEmitter = require('events').EventEmitter;
var PartialView = require('./partialView');
var Peer = require('./peer');
var Protocol = require('./protocol');
var Utils = require('yutils');
var _ = require('underscore');

var ADDRESS = require("./address").LocalAddress;

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
    if (Utils.isDefined(options)) {
        this.delta_t = options.delta_t || delta_t;
        this.c = options.c || c;
        this.l = options.l || l;
    } else {
        this.delta_t = delta_t;
        this.c = c;
        this.l = l;
    }
    this.partialView = new PartialView();
    this.isReady = false;
    this.onReadyCallbacks = [];
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
    Utils.assertLength(arguments, 1);

    if (this.isReady) {
        throw new Error("Cannot launch Cyclon twice!");
    }

    var self = this;
    var peer = Peer.createOffer(onOffer);
    var partialView = this.partialView;

    peer.on('open', function (address) {
        if (partialView.size() > 1) {
            throw new Error('Partial view must not be populated at this point!');
        } else {
            // remove the dummy!
            partialView.remove('dummy');
            partialView.insert({
                address: address,
                age: 0,
                peer: peer
            });

            execOnReady(self);
            startShuffle(self);
        }
    });

    partialView.insert({
        address: 'dummy',
        age: 0,
        peer: peer
    });

    // TODO: IMPLEMENT LISTENERS!
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
    Utils.assertLength(arguments, 2);

    var peer = Peer.createAnswer(offer, onAnswer), self = this, partialView = this.partialView;
    peer.on('open', function (address) {
        partialView.insert({
            address: address,
            age: 0,
            peer: peer
        });
        if (!self.isReady) {
            execOnReady(self);
            startShuffle(self);
        }
    });

    // TODO: IMPLEMENT LISTENERS!

};

/**
 * +++ A L I C E +++
 *
 * This is the final handshake-function that gets called after an answer is received
 * @param answer {String} remote answer
 */
Cyclon.prototype.handshake = function(answer){
    Utils.assertLength(arguments, 1);

    var peer = this.partialView.get('dummy'); // saved peer from {launch}
    if (this.partialView.size() !== 1 || typeof peer === 'undefined') {
        throw new Error('There was an error in transition from {launch} -> {handshake}');
    }

    Peer.handleAnswer(peer.peer, answer);
};

/**
 * This function checks if the membership protocol is already connected to the network and is "ready" or if
 * the handshake is still pending.
 * The parameter is a callback that gets called as soon as the peer is connected to the network.
 * @param callback {function}
 */
Cyclon.prototype.ready = function (callback) {
    Utils.assertLength(arguments, 1);
    this.onReadyCallbacks.push(callback);
};

/**
 * Peer-Sampling-Service-function. When provided with a parameter n, a given number of randomly
 * sampled peers is returned, otherwise the whole PartialView of the RPS is returned.
 * @param n {Number}
 */
Cyclon.prototype.getPeers = function(n){
    return _.pluck(_.filter(this.partialView.sample(n), function (e) { return e.address !== 'dummy';}), 'peer');
};

/* ================================================
   H E L P E R S
 * ================================================*/
function execOnReady(cyclon) {
    if (cyclon.isReady) throw new Error('Cannot apply again');
    cyclon.isReady = true;
    var i = 0, L = cyclon.onReadyCallbacks.length;
    for (;i<L;i++) {
        cyclon.onReadyCallbacks[i].call(cyclon);
    }
}

/**
 *
 */
function startShuffle(cyclon) {

}

module.exports = Cyclon;