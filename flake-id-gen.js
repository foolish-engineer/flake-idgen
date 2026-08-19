/**
 * Flake ID generator yields k-ordered, conflict-free ids in a distributed environment.
 */
class FlakeId {
  /**
   * Represents an ID generator.
   * @param {object} [options] - Generator options
   * @param {number} [options.id] - Generator identifier (0 to 1023). Provided instead of datacenter and worker.
   * @param {number} [options.datacenter] - Datacenter identifier (0 to 31).
   * @param {number} [options.worker] - Worker identifier (0 to 31).
   * @param {number} [options.epoch] - Number used to reduce value of generated timestamp.
   * @param {number} [options.seqMask] - Mask for sequence numbers (default: 0xFFF = 4095).
   */
  constructor(options = {}) {
    this.options = options;

    if (typeof options.id !== 'undefined') {
      this.id = options.id & 0x3ff;
    } else {
      this.datacenter = (options.datacenter || 0) & 0x1f;
      this.worker = (options.worker || 0) & 0x1f;
      this.id = (this.datacenter << 5) | this.worker;
    }

    this.genId = BigInt((this.id & 0x3ff) << 12);
    this.epoch = BigInt(+options.epoch || 0);
    this.seq = 0;
    this.lastTime = 0n;
    this.overflow = false;
    this.seqMask = options.seqMask || 0xfff;
  }

  /**
   * Generates conflict-free id.
   * @param {Function} [cb] - Optional callback function (err, id)
   * @returns {Buffer|void} Generated Buffer id if no callback provided
   */
  next(cb) {
    const time = BigInt(Date.now()) - this.epoch;

    // Clock moved backwards
    if (time < this.lastTime) {
      const waitMs = Number(this.lastTime - time);
      if (cb) {
        setTimeout(() => this.next(cb), waitMs);
        return;
      }
      throw new Error(
        `Clock moved backwards. Refusing to generate id for ${waitMs} milliseconds`,
      );
    }

    if (time === this.lastTime) {
      if (this.overflow) {
        return this._handleOverflow(cb);
      }

      this.seq = (this.seq + 1) & this.seqMask;
      if (this.seq === 0) {
        this.overflow = true;
        return this._handleOverflow(cb);
      }
    } else {
      this.overflow = false;
      this.seq = 0;
    }

    this.lastTime = time;

    // 64-bit ID: 42 bits timestamp | 10 bits generator id (datacenter + worker) | 12 bits sequence
    const flakeId = (time << 22n) | this.genId | BigInt(this.seq);
    const id = Buffer.alloc(8);
    id.writeBigUInt64BE(flakeId, 0);

    if (cb) {
      process.nextTick(() => cb(null, id));
      return;
    }
    return id;
  }

  /**
   * @private
   */
  _handleOverflow(cb) {
    if (cb) {
      setTimeout(() => this.next(cb), 1);
      return;
    }
    throw new Error(
      'Sequence exceeded its maximum value. Provide callback function to handle sequence overflow',
    );
  }
}

module.exports = FlakeId;
