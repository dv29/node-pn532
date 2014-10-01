var util = require('util');
var EventEmitter = require('events').EventEmitter;
var logger = require('winston').loggers.get('frame-emitter');

import { Frame, DataFrame, ErrorFrame } from './frame';

export class FrameEmitter extends EventEmitter {
    constructor(serial) {
        this.serial = serial;
        this.buffer = new Buffer(0);

        this.serial.on('data', (data) => {
            logger.debug('Data received', util.inspect(data));
            this.buffer = Buffer.concat([this.buffer, data]);
            this._processBuffer();
        });

        this.serial.on('error', (error) => {
            this.emit('error', error);
        });
    }

    _processBuffer() {
        // TODO: filter garbage at front of buffer (anything not 0x00, 0x00, 0xFF at start?)

        logger.debug('processing buffer', util.inspect(this.buffer));

        if (Frame.isFrame(this.buffer)) {
            logger.debug('Frame found in buffer', util.inspect(this.buffer));

            var frame = Frame.fromBuffer(this.buffer);
            this.emit('frame', frame);

            if (frame instanceof ErrorFrame) {
                logger.debug('ErrorFrame found in buffer', util.inspect(frame));
                this.emit('error', frame);
            } else if (frame instanceof DataFrame) {
                logger.debug('DataFrame found in buffer', util.inspect(frame));
                this.emit('response', frame);
            }

            this.buffer = this.buffer.slice(frame.getFrameLength()); // strip off frame's data from buffer

            // If more data still on buffer, process buffer again,
            // otherwise next 'data' event on serial will process the buffer after more data is receive
            if (this.buffer.length) {
                this._processBuffer();
            }
        }
    }

}