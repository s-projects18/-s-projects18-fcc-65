/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
var database = require('../helper/database.js');
const bcrypt = require('bcrypt');

module.exports = function (app) {
  app.route('/api/threads')
    .post((req, res)=>{
      res.formatter.badRequest([{details: 'board not defined'}]);
    });

  app.route('/api/threads/:board')
    // I can POST a thread to a specific message board by passing form data text and delete_password to /api/threads/{board}
    .post( (req, res)=>{
      // encrypt pw
      const saltRounds = 12;
      bcrypt.hash(req.body.delete_password, saltRounds, (err, hash) => { 
        // save
        const obj = {
          board: req.params.board,
          text: req.body.text,
          delete_password: hash
        };
        database.insertThread(obj)
        .then(doc=>{
          res.formatter.ok(doc)
          //res.redirect(301, '/b/'+req.params.board); // Recomend ...
        })
        .catch(err=>res.formatter.badRequest([{details: err.message}]));
      });  
    })
    // I can GET an array of the most recent 10 bumped threads on the board with only the most recent 3 replies from /api/threads/{board}
    .get((req, res)=>{
      const board = req.params.board;
      
      database.getThreads(board, 10, 3)
        .then(d=>res.formatter.ok(d))
        .catch(err=>res.formatter.badRequest([{details: err.message}]));
    });
  
  app.route('/api/replies/:board')
    // I can POST a reply to a thead on a specific board by passing form data text, delete_password, & thread_id to /api/replies/{board}
    // and it will also update the bumped_on date to the comments date  
    // -> reply is related to thread and NOT to another reply = no hierarchy
    .post( (req, res)=>{
      const saltRounds = 12;
      bcrypt.hash(req.body.delete_password, saltRounds, (err, hash) => {
        const obj = {
          text: req.body.text,
          delete_password: hash        
        }; 
        database.insertReply(req.body.thread_id, obj)
        .then(doc=>{
          res.formatter.ok(doc)
          //res.redirect(301, '/b/'+req.params.board+'/'+req.body.thread_id); // Recomend ...
        })
        .catch(err=>res.formatter.badRequest([{details: err.message}]));
      });    

    })
    // I can GET an entire thread with all it's replies from /api/replies/{board}?thread_id={thread_id}
    // => here the board is NOT needed as thread_id is unique 
    .get( (req, res)=>{
      if(req.query.thread_id==undefined) {
        res.formatter.badRequest([{details: 'thread_id required'}])  
      } else {
        database.getThread(req.query.thread_id)
          .then(d=>res.formatter.ok(d))
          .catch(err=>res.formatter.badRequest([{details: err.message}]));
      }
    });

};
