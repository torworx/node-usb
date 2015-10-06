var assert = require('assert');
var util = require('util');
var usb = require("../usb.js");

if (typeof gc === 'function') {
  // running with --expose-gc, do a sweep between tests so valgrind blames the right one
  afterEach(function () {
    gc();
  });
}

describe.only('Module', function() {
  it('should describe basic constants', function() {
    assert.notEqual(usb, void 0, "usb must be undefined");
    assert.ok(usb.LIBUSB_CLASS_PER_INTERFACE !== void 0, "Constants must be described");
    assert.ok(usb.LIBUSB_ENDPOINT_IN === 128);
  });
  it('should handle abuse without crashing', function() {
    assert.throws(function() {
      return new usb.Device();
    });
    assert.throws(function() {
      return usb.Device();
    });
    return assert.throws(function() {
      return usb.Device.prototype.open.call({});
    });
  });
  return describe('setDebugLevel', function() {
    it('should throw when passed invalid args', function() {
      assert.throws((function() {
        usb.setDebugLevel();
      }), TypeError);
      assert.throws((function() {
        usb.setDebugLevel(-1);
      }), TypeError);
      return assert.throws((function() {
        usb.setDebugLevel(5);
      }), TypeError);
    });
    return it('should succeed with good args', function() {
      assert.doesNotThrow(function() {
        usb.setDebugLevel(0);
      });
    });
  });
});

describe('getDeviceList', function() {
  return it('should return at least one device', function() {
    var l = usb.getDeviceList();
    assert.ok(l.length > 0);
  });
});

describe('findByIds', function() {
  return it('should return an array with length > 0', function() {
    var dev = usb.findByIds(0x59e3, 0x0a23);
    assert.ok(dev, "Demo device is not attached");
  });
});

describe('Device', function() {
  var device = null;
  before(function() {
    device = usb.findByIds(0x59e3, 0x0a23);
  });
  it('should have sane properties', function() {
    assert.ok(device.busNumber > 0, "busNumber must be larger than 0");
    assert.ok(device.deviceAddress > 0, "deviceAddress must be larger than 0");
    assert.ok(util.isArray(device.portNumbers), "portNumbers must be an array");
  });
  it('should have a deviceDescriptor property', function() {
    assert.ok(device.deviceDescriptor);
  });
  it('should have a configDescriptor property', function() {
    assert.ok(device.configDescriptor);
  });
  it('should open', function() {
    device.open();
  });
  it('gets string descriptors', function(done) {
    device.getStringDescriptor(device.deviceDescriptor.iManufacturer, function(e, s) {
      assert.ok(e === void 0, e);
      assert.equal(s, 'Nonolith Labs');
      return done();
    });
  });
  describe('control transfer', function() {
    var b;
    b = Buffer([48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63]);
    it('should OUT transfer when the IN bit is not set', function(done) {
      device.controlTransfer(0x40, 0x81, 0, 0, b, function(e) {
        assert.ok(!e, e);
        done();
      });
    });
    it("should fail when bmRequestType doesn't match buffer / length", function() {
      return assert.throws(function() {
        return device.controlTransfer(0x40, 0x81, 0, 0, 64);
      });
    });
    it('should IN transfer when the IN bit is set', function(done) {
      return device.controlTransfer(0xc0, 0x81, 0, 0, 128, function(e, d) {
        assert.ok(e === void 0, e);
        assert.equal(d.toString(), b.toString());
        return done();
      });
    });
    return it('should signal errors', function(done) {
      return device.controlTransfer(0xc0, 0xff, 0, 0, 64, function(e, d) {
        assert.equal(e.errno, usb.LIBUSB_TRANSFER_STALL);
        return done();
      });
    });
  });
  describe('Interface', function() {
    var iface;
    iface = null;
    before(function() {
      iface = device.interfaces[0];
      return iface.claim();
    });
    it('should have one interface', function() {
      return assert.notEqual(iface, void 0);
    });
    it('should be the same as the interfaceNo 0', function() {
      return assert.strictEqual(iface, device["interface"](0));
    });
    if (process.platform === 'linux') {
      it("shouldn't have a kernel driver", function() {
        return assert.equal(iface.isKernelDriverActive(), false);
      });
      it("should fail to detach the kernel driver", function() {
        return assert.throws(function() {
          return iface.detachKernelDriver();
        });
      });
      it("should fail to attach the kernel driver", function() {
        return assert.throws(function() {
          return iface.attachKernelDriver();
        });
      });
    }
    describe('IN endpoint', function() {
      var inEndpoint;
      inEndpoint = null;
      before(function() {
        return inEndpoint = iface.endpoints[0];
      });
      it('should be able to get the endpoint', function() {
        return assert.ok(inEndpoint != null);
      });
      it('should be able to get the endpoint by address', function() {
        return assert.equal(inEndpoint, iface.endpoint(0x81));
      });
      it('should have the IN direction flag', function() {
        return assert.equal(inEndpoint.direction, 'in');
      });
      it('should have a descriptor', function() {
        assert.equal(inEndpoint.descriptor.bEndpointAddress, 0x81);
        return assert.equal(inEndpoint.descriptor.wMaxPacketSize, 64);
      });
      it('should fail to write', function() {
        return assert.throws(function() {
          return inEndpoint.transfer(b);
        });
      });
      it('should support read', function(done) {
        return inEndpoint.transfer(64, function(e, d) {
          assert.ok(e === void 0, e);
          assert.ok(d.length === 64);
          return done();
        });
      });
      it('times out', function(done) {
        iface.endpoints[2].timeout = 20;
        return iface.endpoints[2].transfer(64, function(e, d) {
          assert.equal(e.errno, usb.LIBUSB_TRANSFER_TIMED_OUT);
          return done();
        });
      });
      return it('polls the device', function(done) {
        var pkts;
        pkts = 0;
        inEndpoint.startPoll(8, 64);
        inEndpoint.on('data', function(d) {
          assert.equal(d.length, 64);
          pkts++;
          if (pkts === 100) {
            return inEndpoint.stopPoll();
          }
        });
        inEndpoint.on('error', function(e) {
          throw e;
        });
        return inEndpoint.on('end', function() {
          return done();
        });
      });
    });
    describe('OUT endpoint', function() {
      var outEndpoint;
      outEndpoint = null;
      before(function() {
        return outEndpoint = iface.endpoints[1];
      });
      it('should be able to get the endpoint', function() {
        return assert.ok(outEndpoint != null);
      });
      it('should be able to get the endpoint by address', function() {
        return assert.equal(outEndpoint, iface.endpoint(0x02));
      });
      it('should have the OUT direction flag', function() {
        return assert.equal(outEndpoint.direction, 'out');
      });
      it('should support write', function(done) {
        return outEndpoint.transfer([1, 2, 3, 4], function(e) {
          assert.ok(e === void 0, e);
          return done();
        });
      });
      return it('times out', function(done) {
        iface.endpoints[3].timeout = 20;
        return iface.endpoints[3].transfer([1, 2, 3, 4], function(e) {
          assert.equal(e.errno, usb.LIBUSB_TRANSFER_TIMED_OUT);
          return done();
        });
      });
    });
    return after(function(cb) {
      return iface.release(cb);
    });
  });
  return after(function() {
    return device.close();
  });
});
