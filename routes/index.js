'use strict';
var express = require('express');
var router = express.Router();
// var tweetBank = require('../tweetBank');
var client = require('../db');


module.exports = function makeRouterWithSockets (io) {

  // a reusable function
  function respondWithAllTweets (req, res, next){
    var allTheTweets = client.query('SELECT tweets.id, tweets.userid, tweets.content, users.name, users.pictureurl FROM tweets INNER JOIN users on users.id=tweets.userid', function (err, result) {
      if (err) return next(err);
      var tweets = result.rows;
      res.render('index', {
        title: 'Twitter.js',
        tweets: tweets,
        showForm: true
      });
    });
  }

  // here we basically treet the root view and tweets view as identical
  router.get('/', respondWithAllTweets);
  router.get('/tweets', respondWithAllTweets);

  // single-user page
  router.get('/users/:username', function(req, res, next){
    var userTweets = client.query('SELECT tweets.id, tweets.userid, tweets.content, users.name, users.pictureurl FROM tweets INNER JOIN users on users.id=tweets.userid WHERE users.name=$1',[req.params.username], function(err, result) {
      var tweets = result.rows;
      if (err) return next(err);
      res.render('index', {
        title: 'Twitter.js',
        tweets: tweets,
        showForm: true,
        username: req.params.username
      });
    }); 
    // var tweetsForName = tweetBank.find({ name: req.params.username });
  });

  // single-tweet page
  router.get('/tweets/:id', function(req, res, next){
    var tweetId = client.query('SELECT tweets.id, tweets.userid, tweets.content, users.name, users.pictureurl FROM tweets INNER JOIN users on users.id=tweets.userid WHERE tweets.id=$1', [req.params.id], function(err, result) {
        var tweet = result.rows;
        if (err) return next(err);
        res.render('index', {
        title: 'Twitter.js',
        tweets: tweet// an array of only one element ;-)
      });
    });
    // var tweetsWithThatId = tweetBank.find({ id: Number(req.params.id) });
    
  });

        //SELECT ID --> IF INSERT USER --> INSERT TWEET
        //              ELSE INSERT TWEET
  // create a new tweet

  router.post('/tweets', function(req, res, next){
    var userId = client.query('SELECT id, pictureurl FROM users WHERE name=$1', [req.body.name], function(err, result) {
      if(result.rows.length === 0) {
        console.log("User does not exist... inserting");
        var newUser = client.query('INSERT INTO users (name) VALUES ($1)', [req.body.name], function (err) {
          if (err) return next(err);
          // Call Insert into tweets
          _insertIntoTweets(req, res, result);

        });
    
      } else {
        // Call Insert into tweets
        _insertIntoTweets(req, res, result);
      }



    });
  });

  function _insertIntoTweets(req, res, result) {
    console.log(result);
    var newTweet = client.query('INSERT INTO tweets (userId, content) VALUES ($1, $2) RETURNING userid, content', [result.rows[0].id, req.body.content], function(err) {
        console.log("newTweet: ", newTweet);
        var userName = req.body.name;
        var userPic = [result.rows[0].pictureurl];
        var userTweetContent = newTweet.values[1];
        var socketResult = {
          name: userName,
          id: result.rows[0].id,
          content: userTweetContent
        }
        //console.log("result.rows: ", result.rows);
        if (err) return next(err);
        io.sockets.emit('new_tweet', socketResult);


        res.redirect('/');  
      });
  }



              
    


    /*var newTweet = tweetBank.add(req.body.name, req.body.content);
    io.sockets.emit('new_tweet', newTweet);
    res.redirect('/');*/


  // // replaced this hard-coded route with general static routing in app.js
  // router.get('/stylesheets/style.css', function(req, res, next){
  //   res.sendFile('/stylesheets/style.css', { root: __dirname + '/../public/' });
  // });

  return router;
}
