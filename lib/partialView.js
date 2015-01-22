/**
 * Created by julian on 19/01/15.
 * Inspired by https://github.com/nicktindall/cyclon.p2p/blob/master/lib/NeighbourSet.js
 */
'use strict';

var EventEmitter = require('events').EventEmitter;
var Utils = require('yutils');
var Peer = require('./peer.js');
var _ = require("underscore");
var Protocol = require('./protocol');

/**
 * Definition of a neighbor element.
 * @type {{address: (String|*|Function), age: (Number|*|Function), peer: (*|exports)}}
 */
var NEIGHBOR_DEFINITION = {
    address: String,
    age: Number,
    peer: Peer
};

var SEND_ELEMENT_DEFINITION = {
    age: Number,
    address: String
};

var ADDRESS = require("./address").LocalAddress;

function PartialView() {
    EventEmitter.call(this);

    /**
     *
     * @type {Object} {
     *
     *      'address1': { age: {Number}, peer: {Peer} }
     *      'address2': { ... }
     * }
     */
    this.neighbors = {};
    this.isBlocked = false;
}
Utils.inherit(PartialView, EventEmitter);

/**
 *
 * @param address {String}
 * @returns {boolean}
 */
PartialView.prototype.contains = function (address) {
    return address in this.neighbors;
};

/**
 *
 * @param neighbor {NEIGHBOR_DEFINITION}
 */
PartialView.prototype.insert = function (neighbor) {
    if (!Utils.defines(neighbor, NEIGHBOR_DEFINITION)) {
        throw new Error('Cannot insert invalid neighbor object: ' + JSON.stringify(neighbor));
    }

    if (neighbor.address in this.neighbors) {
        this.emit('conflict', 'insert', neighbor.address);
    }

    // we don't really care if we already have it and just overwrite old settings
    this.neighbors[neighbor.address] = neighbor;
    this.emit('insert', neighbor);
};

/**
 * Removes the element from the partial view
 * @param address {String}
 */
PartialView.prototype.remove = function (address) {
    var removed = this.neighbors[address];
    delete this.neighbors[address];
    this.emit('delete', removed);
};

PartialView.prototype.get = function (address) {
    return this.neighbors[address];
};

/**
 *
 * @returns {NEIGHBOR_DEFINITION}
 */
PartialView.prototype.findOldest = function () {
    var oldest = {age : -1}, key, entry, nothing = true;
    for(key in this.neighbors){
        entry = this.neighbors[key];
        if (entry.age > oldest.age) {
            oldest = entry;
            nothing = false;
        }
    }
    if (nothing) {
        return null;
    }
    return oldest;
};


/**
 * get a random subset
 * @param n {Number}
 * @param filter {Array} [{String}, {String}]
 */
PartialView.prototype.sample = function (n, filter) {
    //var sample = _.sample(this.neighbors, n);
    //console.log('sample', sample);
    //return sample;
    var keys = Object.keys(this.neighbors), i = 0, L, sample = [], temp, current;
    if (Utils.isDefined(filter)) {
        if (!Array.isArray(filter)) throw new Error('{filter} must be an Array!');
        L = keys.length;
        temp = [];
        for (;i<L;i++) {
            current = keys[i];
            if (filter.indexOf(current) === -1) {
                temp.push(current);
            }
        }
        keys = temp; // switch the lists
    }
    i = 0;
    if (Utils.isDefined(n)) {
        keys = Utils.sample(keys, n);
        L = keys.length;
        for (;i<L;i++){
            sample.push(this.neighbors[keys[i]]);
        }
    } else {
        L = keys.length;
        for (;i<L;i++) {
            sample.push(this.neighbors[keys[i]]);
        }
    }
    return sample;
};

/**
 * Removes the peer for sending smaller data
 * @param n {number}
 * @returns {Array}
 */
PartialView.prototype.sampleForSending = function (n, filter) {
    var sample = this.sample(n, filter);
    return _.map(sample, function (e) {
       return {
           age: e.age,
           address: e.address
       };
    });
};

/**
 * increment the age of all nodes by 1
 */
PartialView.prototype.incrementAge = function () {
    var key;
    for (key in this.neighbors) {
        this.neighbors[key].age += 1;
    }
};

/**
 *
 * @returns {Number}
 */
PartialView.prototype.size = function () {
    return Object.keys(this.neighbors).length;
};

/**
 *
 * @param mediator {Peer}
 * @param otherView {Array}
 * @param viewThatWeSend {Array}
 * @param c {Number}
 * @param success {function}
 */
PartialView.prototype.merge = function (cyclon, mediator, otherView, viewThatWeSend, c, success) {
    if (!Utils.defines(otherView, SEND_ELEMENT_DEFINITION)) {
        throw new Error('List (ov) is not properly defined:' + JSON.stringify(otherView));
    }
    if (!Utils.defines(viewThatWeSend, SEND_ELEMENT_DEFINITION)) {
        throw new Error('List (vtws) is not properly defined:' + JSON.stringify(viewThatWeSend));
    }
    var self = this;
    if (this.isBlocked) {
        //throw new Error('PartialView is currently merging! Cannot start another merge!');
        // primitive reentry
        setTimeout(function () {
            console.log('retry!');
            self.merge(cyclon, mediator, otherView, viewThatWeSend, c, success);
        },50);
        return;
    }
    this.isBlocked = true;

    var neighbors = _.clone(this.neighbors);

    // Discard entries that point to ourselves and that are already in our view
    var i = 0, L = otherView.length, current, distinctOtherView = [];
    for (;i<L;i++) {
        current = otherView[i];
        if (current.address !== ADDRESS && !(this.contains(current.address))) {
            distinctOtherView.push(current);
        }
    }

    distinctOtherView = _.sortBy(distinctOtherView, function (e) { return e.age;});

    // Update cache to include all remaining entries, by firstly using empty cache slots (if any)
    // and secondly replacing entries among the ones originally send to the other peer

    // remove the elements that we send...
    i = 0, L = viewThatWeSend.length;
    for (;i<L;i++) {
        delete neighbors[viewThatWeSend[i].address];
    }
    var diffToLimit = c - Object.keys(neighbors).length;
    if (diffToLimit <= 0) {
        throw new Error('Too many neighbors: (' + c +'<' + Object.keys(neighbors).length + ')  ' +
            JSON.stringify(neighbors));
    }

    var counter = 0, threshold = 1;

    function exec() {
        counter += 1;
        if (counter === threshold) {
            self.neighbors = neighbors;
            self.isBlocked = false;
            success.call(self);
        }
    }

    mediator.oncannotmediate = function (addr) {
        delete neighbors[addr];
        exec();
    };

    function onTimeout(addr) {
        return function () {
            delete neighbors[addr];
            exec();
        }
    }

    mediator.onalreadymediating = function (address) {
        delete neighbors[address];
        exec();
    };

    var timeout = Math.floor(cyclon.delta_t * 0.8);
    setTimeout(function () {
        var key, current;
        for (key in neighbors) {
            current = neighbors[key];
            if (!current.peer.isOpen()) {
                console.warn('Could not open peer ' + key + ' ... closing it...');
                current.peer.disconnect();
                delete neighbors[key];
            }
        }
        self.isBlocked = false;
        self.neighbors = neighbors;
        success.call(self);
    }, timeout);

    // insert distinct other view
    var peer;
    L = distinctOtherView.length;
    i = 0;
    for (; i < diffToLimit && i < L; i++) {
        current = distinctOtherView[i];
        console.log('nn', neighbors);
        console.log('ask for ' + current.address);
        peer = mediator.requestPeer(current.address);
        //peer.on('open', exec);
        peer.on('open', function () {
            console.log('OPEN!');
            exec();
        });
        peer.on('timeout', onTimeout(peer.address));
        neighbors[current.address] = {
            address: current.address,
            age: current.age,
            peer: peer
        };
        Protocol.applyListeners(cyclon, peer);
        threshold += 1;
    }

    for (; i < diffToLimit && i < (viewThatWeSend.length + L); i++) {
        current = viewThatWeSend[i-L];
        neighbors[current.address] = {
            address: current.address,
            age: current.age,
            peer: this.get(current.address).peer // this must not fail!
        }
    }

    exec();
};

module.exports = PartialView;