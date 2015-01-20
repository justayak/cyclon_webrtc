/**
 * Specific implementation of the CYCLON protocol
 *
 * Created by julian on 20/01/15.
 */

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
var deferShuffle = module.exports.startShuffle = function (cyclon) {
    setTimeout(function () {
        shuffle(cyclon);
    }, cyclon.delta_t);
};

/* ====================================================
   F U N C T I O N A L I T Y
 * ====================================================*/


function shuffle(cyclon) {

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

        // We only precede with shuffling when we got the answer!
        deferShuffle(cyclon);
    }
}