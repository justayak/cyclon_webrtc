/**
 * Specific implementation of the CYCLON protocol
 *
 * Created by julian on 20/01/15.
 */

var Peer = require('./peer');
var _ = require('underscore');

var ADDRESS = require("./address").LocalAddress;
var MESSAGE_TYPE = require('./MESSAGE_TYPE');

/**
 *
 * @param cyclon
 * @param peer
 */
module.exports.applyListeners = function (cyclon, peer) {
    console.warn('apply fuck to shit fuck ' + peer.address);
    peer.on('shuffle', receiveShuffle(cyclon, peer));
    peer.on('shuffleresponse', receiveShuffleResponse(cyclon, peer));
    peer.on('cannotmediate', function (addr) {
        console.error('cannotintermediate ' + addr, peer);
        if (peer.oncannotmediate !== null) {
            peer.oncannotmediate(addr);
        }
    });
    peer.on('disconnect', function () {
        console.error('disconnect', peer);
    });
};

/**
 * starts the shuffeling
 */
module.exports.startShuffle = function (cyclon) {
    shuffle(cyclon);
};

/* ====================================================
   F U N C T I O N A L I T Y
 * ====================================================*/


function shuffle(cyclon) {
    setInterval(function () {
        var partialView = cyclon.partialView, lastShuffleNode = cyclon.lastShuffleNode, oldest,
            l = cyclon.l, sample;

        if (lastShuffleNode !== null) {
            // the node timed out...
            partialView.remove(lastShuffleNode.address);
            lastShuffleNode.emit('timeout');
            lastShuffleNode.disconnect();
        }

        if (partialView.size()  > 0) {

            cyclon.isShuffleing = true;

            partialView.incrementAge();

            oldest = partialView.findOldest();
            cyclon.lastShuffleNode = oldest.peer;

            sample = partialView.sampleForSending(l-1, [oldest.address]);

            cyclon.lastSample = _.clone(sample);

            sample.push({
                address: cyclon.address,
                age: 0
            });

            Peer.sendSpecific(oldest.peer, MESSAGE_TYPE.SHUFFLE, sample);
        }
    }, cyclon.delta_t);
}

/**
 * +++ B O B +++
 * @param cyclon
 * @param peer
 * @returns {Function}
 */
function receiveShuffle(cyclon, peer) {
    return function (remotePartialView) {

        console.log('reveive shuffle', remotePartialView);

        var partialView = cyclon.partialView, l = cyclon.l, c = cyclon.c;
        var sample = partialView.sampleForSending(l);

        Peer.sendSpecific(peer, MESSAGE_TYPE.SHUFFLE_RESPONSE, sample);

        partialView.merge(cyclon, peer, remotePartialView, sample, c, function () { });
    };
}

/**
 * +++ A L I C E +++
 * @param cyclon
 * @param peer
 */
function receiveShuffleResponse(cyclon, peer) {
    return function (remotePartialView) {

        console.log('reveive shuffleresp', remotePartialView);

        var partialView = cyclon.partialView, c = cyclon.c, sample = cyclon.lastSample;
        if (cyclon.lastShuffleNode.address !== peer.address) {
            throw new Error('wrong order in receive! expected ' +
                cyclon.lastShuffleNode.address + ' but got ' + peer.address);
        }

        partialView.merge(cyclon, peer, remotePartialView, sample, c, function () {
            // merge is complete
        });

        cyclon.lastShuffleNode = null;
        cyclon.lastSample = null;
    }
}