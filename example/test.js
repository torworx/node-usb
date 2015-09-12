'use strict';

var usb = require('../');

var device = usb.findByIds(0x05ac, 0x0262);

console.log(device.enableAutoAttachKernelDrive());