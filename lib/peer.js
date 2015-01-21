/**
 * Created by julian on 19/01/15.
 */
'use strict';

var WebRTC = require("webrtc-adapter");
var RTCPeerConnection = WebRTC.RTCPeerConnection;
var EventEmitter = require('events').EventEmitter;
var _ = require("underscore");
var Utils = require('yutils');
var PeerCache = require("./peerCache.js");

/* ================================================== *
   C O N S T A N T S
 * ================================================== */

var ADDRESS = require("./address").LocalAddress;

var MESSAGE_TYPE = require('./MESSAGE_TYPE');

var ICE_CONFIG = {"iceServers":[
    {"url":"stun:23.21.150.121"},
    {
        'url': 'turn:192.158.29.39:3478?transport=udp',
        'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
        'username': '28224511:1379330808'
    }
]};

var CONN = { 'optional': [{'DtlsSrtpKeyAgreement': true}] };

var INIT_TIMEOUT = 30000;

/* ================================================== *
 P E E R
 * ================================================== */

function Peer(debug) {
    if (debug) {
        // there is no WebRTC in the jasmine-environment
        this.debug = true;
        return;
    } else {
        this.debug = false;
    }

    EventEmitter.call(this);
    var pc = new RTCPeerConnection(ICE_CONFIG, CONN);
    this.pc = pc;
    this.createCallback = null;
    this.offerCallback = null;
    this.dc = null;
    this.address = null; // the address of the other node!
    this.disconnectListener = listenForDisconnect(this);
    this.disconnectCounter = 0; // there might be some false alarms..
    this.iceTimeout = null;
    this.oncannotmediate = null;
    handleICE(this);
}
Utils.inherit(Peer, EventEmitter);

/**
 * checks if the connection is open or not
 * @returns {boolean}
 */
Peer.prototype.isOpen = function () {
    if (this.dc !== null) {
        return this.dc.readyState === 'open';
    }
    return false;
};

/**
 * Disconnect the peer
 */
Peer.prototype.disconnect = function () {
    if (this.dc === null) {
        this.pc.close();
    } else {
        this.dc.close();
    }
};

/**
 * Send arbitrary data to the peer
 * @param message {Object}
 */
Peer.prototype.send = function (message) {
    sendSpecific(this, MESSAGE_TYPE.MESSAGE, message);
};

/**
 *
 * @param address
 * @returns {Peer}
 */
Peer.prototype.requestPeer = function(address) {
    if (this.debug) {
        // FAKE the connection handshake!!
        var self = this, p = new Peer(true);
        setTimeout(function () {
            p.emit('open');
        },100);
        return p
    }
    var self = this;
    var other = Peer.createOffer(function (offer) {
        sendSpecific(self, MESSAGE_TYPE.REQUEST_PEER, {
            sender: ADDRESS,
            target: address,
            offer: offer
        });
    });
    PeerCache.putPending(other, address);
    return other;
};

/* ================================================== *
 S T A T I C  F U N C T I O N S
 * ================================================== */

/**
 *
 * @param callback {function}
 */
Peer.createOffer = function(callback) {
    var peer = new Peer(), pc = peer.pc;
    //peer.on('offer', callback);
    peer.offerCallback = callback;

    var dc = pc.createDataChannel("q", {reliable:true});
    pc.createOffer(function (desc) {
        pc.setLocalDescription(desc, function() { });
    }, function failure(e) { console.error(e); });

    peer.dc = dc;
    dc.onopen = function () {
        //dc.send(JSON.stringify({type: MESSAGE_TYPE.TELL_ADDRESS, payload: ADDRESS}));
        sendSpecific(peer, MESSAGE_TYPE.TELL_ADDRESS, ADDRESS);
    };

    dc.onmessage = handleMessage(peer);

    peer.dc = dc;
    return peer;
};

/**
 *
 * @param offer {String}
 * @param callback {function}
 */
Peer.createAnswer = function(offer, callback) {
    var peer = new Peer(), pc = peer.pc;
    var offerDesc = new RTCSessionDescription(JSON.parse(offer));
    peer.createCallback = callback;
    pc.setRemoteDescription(offerDesc);
    pc.createAnswer(function (answerDesc) {
        pc.setLocalDescription(answerDesc);
    }, function () { console.warn("No create answer"); });

    pc.ondatachannel = function (e) {
        var dc = e.channel || e; // Chrome sends event, FF sends raw channel
        peer.dc = dc;

        dc.onopen = function () {
            //dc.send(JSON.stringify({type: MESSAGE_TYPE.TELL_ADDRESS, payload: ADDRESS}));
            sendSpecific(peer, MESSAGE_TYPE.TELL_ADDRESS, ADDRESS);
            // delay open until the response is in
        };

        dc.onmessage = handleMessage(peer);
    };

    // TIMEOUT
    setTimeout(function () {
        if (!peer.isOpen()) {
            peer.disconnect();
            peer.emit('inittimeout');
        }
    }, INIT_TIMEOUT);
    return peer;
};

/**
 *
 * @param peer {Peer}
 * @param answer {String}
 */
Peer.handleAnswer = function(peer, answer) {
    var answerDesc = new RTCSessionDescription(JSON.parse(answer));
    peer.pc.setRemoteDescription(answerDesc);

    // TIMEOUT
    setTimeout(function () {
        if (!peer.isOpen()) {
            peer.disconnect();
            peer.emit('inittimeout');
        }
    }, INIT_TIMEOUT);
};

/* ================================================== *
 P R I V A T E  F U N C T I O N S
 * ================================================== */

/**
 *
 * @param peer {Peer}
 */
function handleMessage(peer) {
    return function (e) {
        var msg = Utils.isString(e.data) ? JSON.parse(e.data) : e.data, otherPeer;
        switch (msg.type) {
            case MESSAGE_TYPE.MESSAGE:
                // =======================================
                // M E S S A G E
                // =======================================
                peer.emit('message', msg.payload);
                break;
            case MESSAGE_TYPE.TELL_ADDRESS:
                // =======================================
                // T E L L  A D D R E S S
                // =======================================
                peer.address = msg.payload;
                PeerCache.put(peer);
                peer.emit('open', msg.payload);
                break;
            case MESSAGE_TYPE.REQUEST_PEER:
                // =======================================
                // R E Q U E S T  P E E R
                // =======================================
                if (PeerCache.has(msg.payload.target)) {
                    otherPeer = PeerCache.get(msg.payload.target);
                    sendSpecific(otherPeer, MESSAGE_TYPE.REQUEST_ANSWER, msg.payload);
                } else {
                    sendSpecific(peer, MESSAGE_TYPE.CANNOT_MEDIATE, msg.payload.target);
                }
                break;
            case MESSAGE_TYPE.CANNOT_MEDIATE:
                // =======================================
                // C A N N O T  M E D I A T E
                // =======================================
                console.warn('cannot mediate from ' + peer.address + ' to ' + msg.payload);
                peer.emit('cannotmediate', msg.payload);
                break;
            case MESSAGE_TYPE.REQUEST_ANSWER:
                // =======================================
                // R E Q U E S T  A N S W E R
                // =======================================
                otherPeer = Peer.createAnswer(msg.payload.offer, function (answer) {
                    sendSpecific(peer, MESSAGE_TYPE.TUNNEL_ANSWER, {target: msg.payload.sender, answer: answer});
                });
                break;
            case MESSAGE_TYPE.TUNNEL_ANSWER:
                // =======================================
                // T U N N E L  A N S W E R
                // =======================================
                console.log('TUNNEL');
                if (PeerCache.has(msg.payload.target)) {
                    otherPeer = PeerCache.get(msg.payload.target);
                    sendSpecific(otherPeer, MESSAGE_TYPE.SEND_REMOTE_ANSWER, {
                        sender:peer.address, answer: msg.payload.answer
                    });
                } else {
                    sendSpecific(peer, MESSAGE_TYPE.CANNOT_MEDIATE, msg.payload.target);
                }
                break;
            case MESSAGE_TYPE.SEND_REMOTE_ANSWER:
                // =======================================
                // S E N D  R E M O T E  A N S W E R
                // =======================================
                console.log('SEND_REMOTE_ANSWER');
                otherPeer = PeerCache.getPending(msg.payload.sender);
                Peer.handleAnswer(otherPeer, msg.payload.answer);
                break;
            case MESSAGE_TYPE.SHUFFLE:
                peer.emit('shuffle', msg.payload);
                break;
            case MESSAGE_TYPE.SHUFFLE_RESPONSE:
                peer.emit('shuffleresponse', msg.payload);
                break;
        }

    };
}

/**
 *
 * @param peer {Peer}
 * @param type {Number}
 * @param message {Object}
 */
function sendSpecific(peer, type, message) {
    if (peer.dc === null) {
        throw new Error('Handshake incomplete! Sending is not possible.');
    } else if (peer.dc.readyState !== 'open') {
        throw new Error('Cannot send. Status:' + dc.readyState);
    }
    peer.dc.send(JSON.stringify({type:type, payload:message}));
}

Peer.sendSpecific = sendSpecific;

/**
 * handle the ice candidate search
 * @param peer
 */
function handleICE(peer) {
    function exec() {
        clearTimeout(peer.iceTimeout);
        //peer.emit('offer', JSON.stringify(peer.pc.localDescription));
        var d = JSON.stringify(peer.pc.localDescription);
        if (peer.offerCallback !== null) {
            peer.offerCallback.call(self, d);
            peer.offerCallback = null;
        } else if (peer.createCallback !== null) {
            peer.createCallback.call(self, d);
            peer.createCallback = null;
        }
        peer.pc.onicecandidate = null;

    }
    peer.pc.onicecandidate = function (e) {
        if (e.candidate === null) {
            exec();
        } else {
            if (peer.iceTimeout !== null) {
                clearTimeout(self.iceTimeout);
            }
            peer.iceTimeout = setTimeout(function () {
                exec();
            }, 1000);
        }
    };
}

/**
 * check if we are disconnected and if so, tell that!
 * @param peer
 * @returns {number}
 */
function listenForDisconnect(peer) {
    return setInterval(function () {
        if (peer.dc !== null) {
            if (peer.dc.readyState === 'closed') {
                if (peer.disconnectCounter > 5) {
                    peer.emit('disconnect');
                    clearInterval(peer.disconnectListener);
                } else {
                    peer.disconnectCounter += 1;
                }
            } else {
                peer.disconnectCounter = 0; // reset counter
            }
        }
    });
}

module.exports = Peer;