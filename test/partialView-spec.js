/**
 * Created by julian on 19/01/15.
 */
var PartialView = require("./../lib/partialView.js");
var Peer = require("./../lib/peer.js");
var _ = require('underscore');

describe("init", function () {

    var a = {
        age : 1,
        address: "a",
        peer: new Peer()
    };

    var b = {
        age : 3,
        address: "b",
        peer: new Peer()
    };

    // ===========================================================
    // ***********************************************************
    // ===========================================================

    it("should insert", function () {
        var pv = new PartialView();
        pv.insert(a);
        expect(pv.neighbors).toEqual({
            a: {
                age : 1,
                address: "a",
                peer: new Peer()
            }
        });
    });

    it("should insert 2", function () {
        var pv = new PartialView();
        pv.insert(a);
        pv.insert(b);
        expect(pv.neighbors).toEqual({
            a: {
                age : 1,
                address: "a",
                peer: new Peer()
            },
            b:{
                age : 3,
                address: "b",
                peer: new Peer()
            }
        });
    });

    // ===========================================================
    // ***********************************************************
    // ===========================================================

    it("should delete", function () {
        var pv = new PartialView();
        pv.insert(a);
        pv.remove('a');
        expect(pv.neighbors).toEqual({

        });
    });

    it("should delete 2", function () {
        var pv = new PartialView();
        pv.insert(a);
        pv.insert(b);
        pv.remove('a');
        expect(pv.neighbors).toEqual({
            b:{
                age : 3,
                address: "b",
                peer: new Peer()
            }
        });
    });

    // ===========================================================
    // ***********************************************************
    // ===========================================================

    it("should increment", function () {
        var pv = new PartialView();
        pv.insert(_.clone(a));
        pv.insert(_.clone(b));
        pv.incrementAge();
        expect(pv.neighbors).toEqual({
            a: {
                age : 2,
                address: "a",
                peer: new Peer()
            },
            b:{
                age : 4,
                address: "b",
                peer: new Peer()
            }
        });
    });

    // ===========================================================
    // ***********************************************************
    // ===========================================================

    it("should sample", function () {
        var pv = new PartialView();

        var c = _.clone(a);
        var d = _.clone(a);
        c.address = 'c';
        d.address = 'd';

        pv.insert(_.clone(a));
        pv.insert(_.clone(b));
        pv.insert(c);
        pv.insert(d);
        expect(pv.sample(3).length).toEqual(3);
    });

    // ===========================================================
    // ***********************************************************
    // ===========================================================

    it("should find the oldest", function () {
        var pv = new PartialView();

        var c = _.clone(a);
        var d = _.clone(a);
        c.address = 'c';
        c.age = 99;
        d.address = 'd';

        pv.insert(_.clone(a));
        pv.insert(_.clone(b));
        pv.insert(c);
        pv.insert(d);
        expect(pv.findOldest()).toEqual(c);
    });

    // ===========================================================
    // ***********************************************************
    // ===========================================================

});