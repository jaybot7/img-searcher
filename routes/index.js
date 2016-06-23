var express = require('express');
var router = express.Router();
var mongodb = require('mongodb');
var shortid = require('shortid');
var validUrl = require('valid-url');
var config = require('../config');
var mLab = 'mongodb://' + config.db.host + '/' + config.db.name;
var MongoClient = mongodb.MongoClient
var http = require("http");
var https = require("https");
var urlOffset = 1;

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Image Searching' });
});

//no input on search page
router.get('/imagesearch/', function(req, res, next) {
  res.render('index', { title: 'No Search Entry!' });
});

router.get('/imagesearch/:url(*)', function (req, res, next) {
    ///keeping track of queries in a mongodb
    MongoClient.connect(mLab, function (err, db) {
        if (err) {
            console.log("Unable to connect to server", err);
        } else {
            console.log("Connected to server")
            var collection = db.collection('links');
            //console.log(req);     
            var params = req.params.url;
            var queries = req.query.offset; //for the ?offset= 
            if (queries != undefined){
                urlOffset = queries;
            } else {
                //don't do anything
                urlOffset = 1;
                }
            var timey = new Date();
            var newLink = function (db, callback) {
                var insertLink = { terms: params, when: timey.toISOString() };
                collection.insert([insertLink]);
            };
            newLink(db, function () {
                db.close();
            });     
        };
    });

var offSet = (urlOffset - 1) * 10 + 1;
var dummyAddress = "https://www.googleapis.com/customsearch/v1?q=" + req.params.url + "&start=" + offSet + "&searchType=image&cx=012429970650300200969:ro5qzmseays&key=AIzaSyBQIVc6p3cJmMVqw3KdFoOK4vRMcYIiyxU";
console.log(dummyAddress);

    //doing the actual query using gcse 
    var googleResult = https.get(dummyAddress, function(respon) { //res here would have scope problems
        var tempList = [];
        var bodyChunks = [];
        respon.on('data', function(chunk) {
            bodyChunks.push(chunk);
        }).on('end', function() {
            var body = Buffer.concat(bodyChunks).toString();
            var parsey = JSON.parse(body);
            for (var i = 0; i < 10; i++){
                var tempItem = parsey.items[i];
                var tempLink = {'image url': tempItem['link'], 
                    'alt-text': tempItem['snippet'],
                    'page url': tempItem['image']['contextLink']};
                tempList.push(tempLink);
                }
            res.send(tempList); //see? i needed the other res
            })
    });

});

router.get('/latest/', function (req, res, next) {
    MongoClient.connect(mLab, function (err, db) {
    if (err) {
        console.log("Unable to connect to server", err);
    } else {
        console.log("Connected to server")
        var collection = db.collection('links');
        var findLink = function (db, callback) {   
             collection.find({},{ terms: 1, when: 1, _id: 0 }).sort( { when: -1 } ).toArray(function (err, doc) {
                 if (doc != null) {
                 res.send(doc);
                 //console.log(doc);
                 } else {
                     res.json({ error: "No corresponding database." });
                 };
             });
        };

      findLink(db, function () {
        db.close();
      });
        
    };
    });
});

module.exports = router;