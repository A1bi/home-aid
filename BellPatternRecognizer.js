'use strict';

var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;

var Door = require('./Door');

module.exports = BellPatternRecognizer;

function BellPatternRecognizer(timeoutTime, silentBellNumber) {
  this._bells = [];
  this._timeout;
  this._patterns = [];
  this._patternCallbacks = [];
  this._maxPatternLength = 0;

  this._timeoutTime = timeoutTime || 800;
  this._silentBellNumber = silentBellNumber || 5;

  Door.on('bellRang', this._bellRang.bind(this));
}

inherits(BellPatternRecognizer, EventEmitter);

BellPatternRecognizer.prototype.addPattern = function (pattern, callback) {
  this._patterns.push(pattern);
  this._patternCallbacks.push(callback);

  var _this = this;
  this._patterns.forEach(function (p) {
    _this._maxPatternLength = Math.max(_this._maxPatternLength, p.length);
  });
};

BellPatternRecognizer.prototype._bellRang = function (duration) {
  this._bells.push(duration);

  clearTimeout(this._timeout);

  var baseLength = this._bells[0];

  for (var j = 0; j < this._patterns.length; j++) {
    var pattern = this._patterns[j];

    for (var i = 1; i < pattern.length; i++) {
      if (!(this._bells[i] / baseLength > pattern[i] * 0.7 && this._bells[i] / baseLength < pattern[i] * 1.3)) {
        break;
      }
      if (i === pattern.length-1) {
        this._reset();
        this._patternCallbacks[j]();
        return;
      }
    }

  }

  if (this._bells.length >= this._maxPatternLength) {
    this._timedOut();

  } else {
    this._timeout = setTimeout(this._timedOut.bind(this), this._timeoutTime);
  }
};

BellPatternRecognizer.prototype._reset = function () {
  this._bells = [];
};

BellPatternRecognizer.prototype._timedOut = function () {
  if (this._bells.length < this._silentBellNumber) {
    this.emit('bellRang');
  }
  this._reset();
};
