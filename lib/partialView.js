/**
 * Created by julian on 19/01/15.
 * Inspired by https://github.com/nicktindall/cyclon.p2p/blob/master/lib/NeighbourSet.js
 */
'use strict';

var EventEmitter = require('events').EventEmitter;
var Utils = require('yutils');
var Peer = require('./peer.js');
var _ = require("underscore");

/**
 * Definition of a neighbor element.
 * @type {{address: (String|*|Function), age: (Number|*|Function), peer: (*|exports)}}
 */
var NEIGHBOR_DEFINITION = {
    address: String,
    age: Number,
    peer: Peer
};

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
    var oldest = {age : -1}, key, entry;
    for(key in this.neighbors){
        entry = this.neighbors[key];
        if (entry.age > oldest.age) {
            oldest = entry;
        }
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

module.exports = PartialView;