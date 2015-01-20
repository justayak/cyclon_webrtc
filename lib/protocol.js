/**
 * Specific implementation of the CYCLON protocol
 *
 * Created by julian on 20/01/15.
 */

var Peer = require('./peer');

var ADDRESS = require("./address").LocalAddress;
var MESSAGE_TYPE = require('./MESSAGE_TYPE');

/**
 *
 * @param cyclon
 * @param peer
 */
module.exports.applyListeners = function (cyclon, peer) {
    peer.on('shuffle', receiveShuffle(cyclon, peer));
    peer.on('shuffleresponse', receiveShuffleResponse(cyclon, peer));
    peer.on('cannotmediate', function () {
        console.error('cannotintermediate', peer);
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
        if (partialView.size()  > 0) {

            if (lastShuffleNode !== null) {
                // the node timed out...
                partialView.remove(lastShuffleNode.address);
                lastShuffleNode.emit('timeout');
                lastShuffleNode.disconnect();
            }

            partialView.incrementAge();

            oldest = partialView.findOldest();
            cyclon.lastShuffleNode = oldest.peer;

            sample = partialView.sampleForSending(l-1, [oldest.address]);
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
        var partialView = cyclon.partialView;

        console.log('a', remotePartialView);

    };
}

/**
 * +++ A L I C E +++
 * @param cyclon
 * @param peer
 */
function receiveShuffleResponse(cyclon, peer) {
    return function (remotePartialView) {
        var partialView = cyclon.partialView;
        if (cyclon.lastShuffleNode.address !== peer.address) {
            throw new Error('wrong order in receive! expected ' +
                cyclon.lastShuffleNode.address + ' but got ' + peer.address);
        }

        console.log('b', remotePartialView);

        cyclon.lastShuffleNode = null;
    }
}