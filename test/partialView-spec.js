/**
 * Created by julian on 19/01/15.
 */

describe("init", function () {

    var Peer = require("./../lib/peer.js");
    var PartialView = require("./../lib/partialView.js");
    var _ = require('underscore');

    var a = {
        age : 1,
        address: "a",
        peer: new Peer(true)
    };

    var b = {
        age : 3,
        address: "b",
        peer: new Peer(true)
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
                peer: new Peer(true)
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
                peer: new Peer(true)
            },
            b:{
                age : 3,
                address: "b",
                peer: new Peer(true)
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
                peer: new Peer(true)
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
                peer: new Peer(true)
            },
            b:{
                age : 4,
                address: "b",
                peer: new Peer(true)
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

    it("should sample with filter", function () {
        var pv = new PartialView();

        var c = _.clone(a);
        var d = _.clone(a);
        c.address = 'c';
        d.address = 'd';

        pv.insert(_.clone(a));
        pv.insert(_.clone(b));
        pv.insert(c);
        pv.insert(d);
        expect(pv.sample(3, ['a','b','c'])).toEqual([d]);
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

    it("should not find the oldest", function () {
        var pv = new PartialView();
        expect(pv.findOldest()).toEqual(null);
    });

    // ===========================================================
    // ***********************************************************
    // ===========================================================

    it("should merge fine", function (done) {
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
        var mediator = new Peer(true);
        pv.merge(mediator,
            [{address:'c', age:2}, {address:'q', age:4}],
            [{address:'a', age:4}, {address:'b', age:2}],3, function () {
                expect(_.plunck(pv.neighbors, 'address')).toEqual(['c','d','q']);
                done();
        });
    });

    // ===========================================================
    // ***********************************************************
    // ===========================================================

});