var Subprovider = require('web3-provider-engine/subproviders/subprovider.js');
var inherits = require("util").inherits;

inherits(ReactiveBlockTracker, Subprovider);

module.exports = ReactiveBlockTracker;

function ReactiveBlockTracker() {
  this.methods = {
    "eth_call": "before",
    "eth_getStorageAt": "before",

    // Speed up block filter requests by getting the next block after the first request.
    "eth_getFilterChanges": "after"
  };
};

// Fetch the block before certain requests to make sure we're completely updated
// before those methods are processed. Also, fetch the block after certain requests
// to speed things up.
ReactiveBlockTracker.prototype.handleRequest = function(payload, next, end) {
  var self = this;

  var when = this.methods[payload.method];

  if (when == null) {
    return next();
  }

  function fetchBlock(cb) {
    self.engine._fetchBlock("latest", function(err, block) {
      if (err) return end(err);
      if (!self.engine.currentBlock || 0 !== self.engine.currentBlock.hash.compare(block.hash)) {
        self.engine._setCurrentBlock(block);
      }
      cb();
    });
  }

  if (when == "before") {
    fetchBlock(function() {
      next();
    });
  } else {
    next(function(error, result, cb) {
      fetchBlock(cb);
    });
  }
};