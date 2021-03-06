'use strict';

var expect = require('chai').expect;
var proxyrequire = require('proxyquire');
var events = require('events');
var s3 = {};
var Rx = require('rx');

describe('aws', function () {

  var client, uploader, emitter;
  var options = {localPath: 'build', bucket: 'auth0'};

  beforeEach(function () {
    emitter = new events.EventEmitter();
    client = {
        uploadDir: function () {
          return emitter;
        }
    };

    s3.createClient = function () {
      return client;
    };

    uploader = proxyrequire('../aws', {'s3': s3}).uploader;
  });

  it('should return observable', function () {
    expect(uploader('lock/1.2.3', options)).to.be.instanceOf(Rx.Observable);
  });

  it('should start upload with correct params', function (done) {
    client.uploadDir = function (params) {
      expect(params.localDir).to.be.eql(options.localPath);
      expect(params.deleteRemoved).to.be.false;
      expect(params.s3Params.Bucket).to.eql(options.bucket);
      expect(params.s3Params.Prefix).to.eql('lock/1.2.3');
      done();
      return new events.EventEmitter();
    };
    uploader('lock/1.2.3', options).subscribe();
  });

  it('should relay errors', function (done) {
    var expected = new Error('MOCK');
    uploader('lock/1.2.3', options)
    .tapOnError(function (error) {
      expect(error).to.eql(expected);
      done();
    })
    .subscribe();
    emitter.emit('error', expected);
  });

  it('should relay file upload started', function (done) {
    uploader('lock/1.2.3', options)
    .tapOnNext(function (file) {
      expect(file).to.eql('lock.js');
      done();
    })
    .subscribe();
    emitter.emit('fileUploadStart', 'lock/1.2.3', 'lock.js');
  });

  it('should complete stream when upload ends', function (done) {
    uploader('lock/1.2.3', options)
    .tapOnCompleted(function () {
      done();
    })
    .subscribe();
    emitter.emit('end');
  });

});