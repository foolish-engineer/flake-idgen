const assert = require('node:assert');
const FlakeId = require('../flake-id-gen');

describe('FlakeId', () => {
  const idGen = new FlakeId();

  describe('next', () => {
    it('should return unique id when callback is not present', () => {
      testSynch(idGen, 1000);
    });

    it('should return unique ids when callback is present', () => {
      testWithCallback(idGen, 5000);
    });
  });

  describe('property id', () => {
    it('should return default value (0)', () => {
      assert.equal(idGen.id, 0);
    });
  });

  describe('property datacenter', () => {
    it('should return default value (0)', () => {
      assert.equal(idGen.datacenter, 0);
    });
  });

  describe('property worker', () => {
    it('should return defaulted value (0)', () => {
      assert.equal(idGen.worker, 0);
    });
  });
});

describe('FlakeId({id:0x100})', () => {
  const idGen = new FlakeId({ id: 0x100 });

  describe('next', () => {
    it('should return unique id when callback is not present', () => {
      testSynch(idGen, 1000);
    });
    it('should return unique ids when callback is present', () => {
      testWithCallback(idGen, 5000);
    });
  });

  describe('property id', () => {
    it('should return id value used to create generator', () => {
      assert.equal(idGen.id, 0x100);
    });
  });

  describe('property datacenter', () => {
    it("should return 'undefined'", () => {
      assert.equal(typeof idGen.datacenter, 'undefined');
    });
  });

  describe('property worker', () => {
    it("should return 'undefined'", () => {
      assert.equal(typeof idGen.worker, 'undefined');
    });
  });
});

describe('FlakeId({seqMask:0x0F})', () => {
  const idGen = new FlakeId({ seqMask: 0x0f });

  describe('next', () => {
    it('should return unique id when callback is not present', () => {
      // Maximum unique ids depends on seqMask - 16 in this case
      testSynch(idGen, 16);
    });

    it('should return unique ids when callback is present', () => {
      testWithCallback(idGen, 1000);
    });

    it('should throw an exception if counter has been exceeded and callback is not present', () => {
      assert.throws(() => {
        testSynch(idGen, 100);
      });
    });
  });
});

describe('FlakeId({datacenter: 0x0A, worker: 0x15})', () => {
  const idGen = new FlakeId({ datacenter: 0x0a, worker: 0x15 });

  describe('id property', () => {
    it('should return value generated from datacenter and worker', () => {
      assert.equal(idGen.id, 0x155);
    });
  });

  describe('datacenter property', () => {
    it('should return datacenter number used to create generator', () => {
      assert.equal(idGen.datacenter, 10);
    });
  });

  describe('worker property', () => {
    it('should return worker number used to create generator', () => {
      assert.equal(idGen.worker, 21);
    });
  });
});

describe('Clock moving backwards', () => {
  it('should throw an error when clock moves backwards and no callback is passed', () => {
    const idGen = new FlakeId();
    idGen.lastTime = BigInt(Date.now() + 5000);
    assert.throws(() => {
      idGen.next();
    }, /Clock moved backwards/);
  });

  it('should wait and return id when callback is passed and clock moved backwards', async () => {
    const idGen = new FlakeId();
    idGen.lastTime = BigInt(Date.now() + 50);

    await new Promise((resolve, reject) => {
      idGen.next((err, id) => {
        if (err) return reject(err);
        assert.ok(Buffer.isBuffer(id));
        resolve();
      });
    });
  });
});

function testSynch(generator, howMany) {
  const ids = new Array(howMany);

  for (let i = 0; i < ids.length; i++) {
    ids[i] = generator.next().toString('hex');
  }

  for (let i = 0; i < ids.length - 1; i++) {
    assert.notEqual(ids[i], ids[i + 1]); // Two sibling ids are not equal
    assert.ok(ids[i] < ids[i + 1]); // Each id is greater than an id generated before
  }
}

function testWithCallback(generator, howMany) {
  const ids = new Array(howMany);
  let index = 0;

  for (let i = 0; i < ids.length; i++) {
    generator.next((err, id) => {
      assert.ifError(err);
      ids[index++] = id.toString('hex');

      if (index === ids.length) {
        for (let j = 0; j < ids.length - 1; j++) {
          assert.notEqual(ids[j], ids[j + 1]); // Two sibling ids are not equal
          assert.ok(ids[j] < ids[j + 1]); // Each id is greater than an id generated before
        }
      }
    });
  }
}
