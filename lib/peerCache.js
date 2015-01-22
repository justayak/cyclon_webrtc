/**
 * Caches connections that are opened and not closed yet for the purpose of signaling
 *
 * Created by julian on 20/01/15.
 */
var Utils = require("yutils");

var cache = {};

var pending = {};

module.exports = {

    /**
     * Put a Peer that is already open
     * @param peer {Peer}
     */
    put: function (peer) {
        if (!peer.isOpen()) throw new Error("Cannot put not-opened peers into cache!");
        if (peer.address in cache) {
            console.warn('already has: ', peer);
            throw new Error("Connection is already open! Cannot put into cache.");
        } //TODO really..?

        cache[peer.address] = peer;

        // Clear when disconnected
        peer.on('disconnect', function () {
            delete cache[peer.address];
        });
    },

    has: function (address) {
        return address in cache;
    },

    get: function (address) {
        return cache[address];
    },

    putPending: function (peer, address) {
        if (peer.isOpen()) throw new Error("Cannot add peer to pending because it is already open!");
        if (address in pending) throw new Error("Connection is already pending! Cannot put into cache."); //TODO really..?

        peer.on('open',function () {
            delete pending[address];
        });

        pending[address] = {peer: peer, ts: Date.now()};
    },

    getPending: function (address) {
        return pending[address].peer;
    },

    deletePending: function (address) {
        delete pending[address];

    }

};

// =======================================
// CLEAN PENDING CACHE
// =======================================
setInterval(function () {
    var key, s, now = Date.now(), current;
    for(key in pending) {
        current = pending[key];
        s = Utils.msToS(Utils.timeDifferenceInMs(current.ts, now));
        if (s > 60) {
            // if a connection is pending for more than 1 minute, close it..
            current.peer.disconnect();
            delete pending[key];
        }
    }
}, 30000); // every 30 seconds