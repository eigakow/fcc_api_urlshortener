var express = require('express');
var router = express.Router();
//lets require/import the mongodb native drivers.
var mongodb = require('mongodb');
var assert = require('assert');
var parser = require('url-parse');

//We need to work with "MongoClient" interface in order to connect to a mongodb server.
var MongoClient = mongodb.MongoClient;
var url = 'mongodb://short:short@ds032340.mlab.com:32340/urlshortener';

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Express' });
});

router.get('/new/:url*', function(req, res) {
  console.log('router.get /new/:url*');
  // to get the url after slash:
  var filepath = req.originalUrl.replace(req.baseUrl, "");
  if (/new\/.*/.test(filepath)) { filepath = filepath.match(/new\/(.*)/)[1] }
  console.log(filepath);


  if (validateURL(filepath)) {

    MongoClient.connect(url, function (err, db) {
      if (err) {
        console.log('Unable to connect to the mongoDB server. Error:', err);
      } else {
        console.log('Connection established to', url);
        assert.equal(null, err);

        var shortened = generateRandomURL(db, req.headers.host);
        console.log(shortened)
        insertDocument(db, filepath, shortened, function() {
          db.close();
          res.set('Content-Type', 'application/json');
          res.json({ "original": filepath, "shortened": shortened});
        });
      }
    });
  }
  else {
    //generate error message
    console.log("Not a valid URL");
    res.set('Content-Type', 'application/json');
    res.json({ "error": "This is not a valid URL: " + filepath});
  }
});

router.get('/:short', function(req, res) {
  console.log('router.get(/:short');
  //var path = req.originalUrl.replace(req.baseUrl, "").match(/\/(.*)/)[1];
  var path = "https://" + req.headers.host + req.originalUrl;
  console.log(path);

    MongoClient.connect(url, function (err, db) {
      if (err) {
        console.log('Unable to connect to the mongoDB server. Error:', err);
        res.set('Content-Type', 'application/json');
        res.json({ "error": "This is not a valid URL: " + path});
      } else {
        console.log('Connection established to', url);
        assert.equal(null, err);

        findDocument(db, path, function(result){
          db.close();
          if (!result) {
            res.set('Content-Type', 'application/json');
            res.json({ "error": "This is not a valid URL: " + path});
          }
          else {
            //res.set('Content-Type', 'application/json');
            //res.json({ "original": result.original, "shortened": path});
            console.log("Redirecting to " + result.original);
            res.redirect(result.original)
          }
        })
      }
    })
});

module.exports = router;

var insertDocument = function(db, long, short, callback) {
   db.collection('urlshortener').insertOne( {
      "original" : long,
      "shortened" : short
   }, function(err, result) {
    assert.equal(err, null);
    console.log("Inserted a document into the urlshortener collection.");
    callback();
  });
};

var findDocument = function(db, short, callback) {
   var result;
   db.collection('urlshortener').findOne( {shortened : short}, function(err, result) {
    assert.equal(err, null);
    if (result) {
      console.log("Found this document in urlshortener collection.");
      console.log(result);
      callback(result);
    }
    else {
      console.log("Not found in db");
      callback(false);
    }
  });
};

function generateRandomURL(db, urldepl) {
  var id = Math.random().toString(36).substr(2, 5);
  console.log(id);
  var fullid = "https://" + urldepl + "/" + id;
  db.collection('urlshortener').findOne({shortened : fullid}, function (err, docs) {
    if (docs) {
      console.log('id exists: ');
      generateRandomURL(db, urldepl);
    }
  });
  return fullid;
}

function validateURL(path) {
  //check url format: http://www.example.com
  var valid = false;
  var url = new parser(path);
//  console.log(url);
  if (url.protocol != '' && /.+\..+/.test(url.host)) { valid = true}
//  console.log(url.protocol)
//  console.log(url.host)
  return valid
}
