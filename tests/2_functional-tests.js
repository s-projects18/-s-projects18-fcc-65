/*
*
*
*       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
*       -----[Keep the tests in the same order!]-----
*       (if additional are added, keep them at the very end!)
*/

var chaiHttp = require('chai-http');
var chai = require('chai');
var assert = chai.assert;
var server = require('../server');
var database = require('../helper/database.js');

chai.use(chaiHttp);

let globalThreads = [];
let testBoard = "TestboardUnitTest";
let numThreads = 11;
let numReplies = 4;

// use Promise in suiteSetup / before!
// https://stackoverflow.com/questions/24723374/async-function-in-mocha-before-is-alway-finished-before-it-spec
function createThreads() {
    return new Promise((resolve, reject)=>{
      for(let i=0; i<numThreads; i++) {
        chai.request(server)
          .post('/api/threads/'+testBoard)
          .send({
            text: 'text'+i,
            delete_password: 'delete'+i
          })
          .end(function(err, res){        
            let thread;
            // bad performance, so we're testing only replies of the last thread
            if(i==numThreads-1) { 
              let pr = [];
              for(let j=0; j<numReplies; j++) {       
                let p = new Promise((resolve2, reject)=>{
                  chai.request(server)
                    .post('/api/replies/'+testBoard)
                    .send({
                      thread_id: res.body.data[0]._id,
                      text: 'text-reply'+i+' '+j,
                      delete_password: 'delete-reply'+i+' '+j
                    }).end(function(e2, r2){
                      thread = r2.body.data;
                      resolve2(thread); 
                  });                   
                });
                pr.push(p);
              }
              Promise.all(pr).then(d=>{
                // all replys are added here. but there is no guarantee that
                // all replys are included in (previously received) last thread
                // solution: request last thread
                chai.request(server)
                  .get('/api/replies/'+testBoard)
                  .query({thread_id: d[0][0]._id})
                  .end(function(err, doc){
                    thread = doc.body.data[0];
                    globalThreads.push(thread);
                    globalThreads.forEach((v,i)=>{
                        globalThreads[i].now = new Date(v.bumped_on).getTime(); // for testing purposes only
                    });
                    resolve();
                  }); 
              });
            } else {
              globalThreads.push(res.body.data[0]); 
            }
          });  // end
          
      } // for     
    }); // Promise
   
}

suite('Functional Tests', function() {
  suiteSetup(function() {
    // delete testboard (failures from old testing -> maybe not everything is deleted)
    database.deleteBoard(testBoard);
    
    // https://ethereum.stackexchange.com/questions/19641/how-to-set-the-timeout-for-truffle-tests-before-block
    this.timeout(40000);
    return createThreads();
  });  
  
  suiteTeardown(function() {
    // finally delete al testboard-entries
    database.deleteBoard(testBoard);
  });
  
  // -------------------- THREADS -----------------------
  suite('API ROUTING FOR /api/threads/:board', function() {   
    suite('POST', function() {
      /* I can POST a thread to a specific message board by passing form data text and delete_password
      to /api/threads/{board}.(Recomend res.redirect to board page /b/{board}) Saved will be _id, text,
      created_on(date&time), bumped_on(date&time, starts same as created_on), reported(boolean), delete_password,
      & replies(array) */

      test('Test POST /api/threads/{board}', function(done) {
        assert.isTrue(globalThreads.length==numThreads, "globalThreads has entries");
        globalThreads.forEach((thread,i)=>{
            assert.equal(thread.board, testBoard);
            assert.equal(thread.text.substring(0, 4), 'text');
            assert.property(thread, 'created_on');
            assert.property(thread, 'bumped_on');
            assert.isArray(thread.replys); // used other naming convention 
            const d1 = new Date(thread.created_on).getTime();
            const d2 = new Date(thread.bumped_on).getTime();
            // if replies are inserted: bumped_on is updated
            // 600, 1000: empirical, depending on serverspeed, webspeed...
            if(thread.replys.length==0) assert.isTrue(Math.abs(d1-d2)<600, "no replies");
            else assert.isTrue(d2-d1>1000, "4 replies");
          
            // test these props eg in unit-test:
            assert.notProperty(thread, 'delete_password', "delete_pasword for "+i);
            assert.notProperty(thread, 'reported', "reported for "+i);
        });
        // there must be 1 thread having 4 replies, it could be the last but it must not be
        let hit = false;
        for(let i=0; i<globalThreads.length; i++) {
          if(globalThreads[i].replys.length==numReplies) hit=true;
        }
        assert.isTrue(hit, "one thread has "+numReplies+" replies");
        done();
      });   
    });
    
    suite('GET', function() {
      // I can GET an array of the most recent 10 bumped threads on the board with only the most recent 3 replies
      // from /api/threads/{board}. The reported and delete_passwords fields will not be sent.
      test('10 threads / 3 replies', function(done) {
       chai.request(server)
        .get('/api/threads/'+testBoard)
        .end(function(err, res){
          assert.equal(res.statusCode,200);
          const obj = JSON.parse(res.text);
          assert.property(obj, 'data');
          assert.isTrue(obj.data.length==numThreads-1);

          // [1] 10 most recent threads
          globalThreads.sort((a,b)=>{return a.now-b.now;});
          let first = globalThreads[0]; // will fail for 1..10
          let check=true;     
          let threadReplies;
          obj.data.forEach((v,i)=>{
            if(v._id==first._id) check=false;
            if(v.replys.length==numReplies-1) threadReplies = v; // get thread with 3 replies for next check
          });
          assert.isTrue(check, "first/oldest (of "+numThreads+") is not within "+(numThreads-1)+" most recent threads");
         
         
          // [2] 3 most recent replies
          let globThreadReplies; // thread with replies from 11 globalThreads
          globalThreads.forEach(v=>{
            if(v.replys.length==numReplies) globThreadReplies = v;
          });
          globThreadReplies.replys = globThreadReplies.replys.map(v=>{
            v.now = new Date(v.created_on).getTime();
            return v;
          });
          globThreadReplies.replys.sort((a,b)=>{return a.now-b.now;});
         
          // current replies must NOT have the oldest reply
          let checkR = true;
          threadReplies.replys.forEach(v=>{
            if(v._id==globThreadReplies.replys[0]._id) checkR=false; // will fail for: [1] [2] [3]
          });
          assert.isTrue(checkR, "first/oldest (of "+numReplies+") is not within "+(numReplies-1)+" most recent replies");
          done();
        });
      });         
    });

    // I can delete a thread completely if I send a DELETE request to /api/threads/{board} and pass along the thread_id & delete_password. (Text response will be 'incorrect password' or 'success')
    suite('DELETE', function() {
      test('Test PASSWORD-ERROR DELETE /api/threads/{board}', function(done) {
       chai.request(server)
        .delete('/api/threads/'+testBoard)
        .send({thread_id: globalThreads[0]._id, delete_password: 'WRONG_PASSWORD'})
        .end(function(err, res){
          assert.equal(res.statusCode,400);
          const obj = JSON.parse(res.text);
          assert.equal(obj.errors[0].details, 'incorrect password');
          done();
       });        
      });
      
      test('Test PASSWORD-OK DELETE /api/threads/{board}', function(done) {
       chai.request(server)
        .delete('/api/threads/'+testBoard)
        .send({thread_id: globalThreads[0]._id, delete_password: 'delete'+globalThreads[0].text.substring(4)})
        .end(function(err, res){
          assert.equal(res.statusCode,200);
          const obj = JSON.parse(res.text);
          assert.equal(obj.meta.details, 'success');
          done();
       });        
      });
    });
    
    // I can report a thread and change it's reported value to true by sending a PUT request to /api/threads/{board} and pass along the thread_id. (Text response will be 'success')
    suite('PUT', function() {
      test('Test report=true PUT /api/threads/{board}', function(done) {
       chai.request(server)
        .put('/api/threads/'+testBoard)
        .send({thread_id: globalThreads[0]._id})
        .end(function(err, res){
          assert.equal(res.statusCode,200);
          const obj = JSON.parse(res.text);
          assert.equal(obj.meta.details, 'success');
          done();
       });         
      });  
    });    

  });
  
  
  // ------------------- REPLIES -------------------
  suite('API ROUTING FOR /api/replies/:board', function() {
    let globThreadId;
    let globThreadBumpedOn;
    let globReplyId;
    let globReplyDelete = 'delete-reply';
    
    suiteSetup(function() {
      // we must request this within suiteSetup or globalThreads will be empty (asynchroneous stuff!) 
      // (we could also create a new thread here)
      globThreadId = globalThreads[1]._id;
      globThreadBumpedOn = globalThreads[1].bumped_on;
    }); 
    
     // I can POST a reply to a thead on a specific board by passing form data text, delete_password, & thread_id to /api/replies/{board} and it will also update the bumped_on date to the comments date.  
    suite('POST', function() {
      test('Test NEW REPLY POST /api/replies/{board}', function(done) {
        chai.request(server)
          .post('/api/replies/'+testBoard)
          .send({text:'text-reply', thread_id: globThreadId, delete_password: globReplyDelete})
          .end(function(err, res){
            assert.equal(res.statusCode,200);
            const obj = JSON.parse(res.text);
            assert.equal(obj.meta.details, 'success');
            const thread = obj.data[0];
            const reply = obj.data[0].replys[0];
            assert.property(reply, 'created_on');
            assert.notProperty(reply, 'delete_password');
            assert.notProperty(reply, 'reported');
            assert.equal(reply.text, 'text-reply'); 
         
            assert.property(thread, 'bumped_on');
            assert.notEqual(thread.bumped_on, globThreadBumpedOn, 'bumped_on has changed');

            globReplyId = reply._id;
            done();
        });         
      });
           
    });

    // I can GET an entire thread with all it's replies from /api/replies/{board}?thread_id={thread_id}. Also hiding the same fields.      
    suite('GET', function() {
      test('Test GET entire thread /api/replies/{board}?thread_id={thread_id}', function(done) {
        let threadId; // take thread with 4 replies from 11 globalThreads
        globalThreads.forEach(v=>{
          if(v.replys.length==numReplies) threadId = v._id;
        });

        chai.request(server)
          .get('/api/replies/'+testBoard)
          .query({thread_id: threadId})
          .end(function(err, res){
            assert.equal(res.statusCode,200);
            const thread = JSON.parse(res.text).data[0];
            assert.notProperty(thread, 'reported');
            assert.notProperty(thread, 'delete_password');
            assert.equal(thread.replys.length, numReplies);
            done();
        });         
      });      
    });
    
    // I can report a reply and change it's reported value to true by sending a PUT request to /api/replies/{board} and pass along the thread_id & reply_id. (Text response will be 'success')      
    suite('PUT', function() {
      test('Test PUT reported=true /api/replies/{board}', function(done) {
        chai.request(server)
          .put('/api/replies/'+testBoard)
          .send({thread_id: globThreadId, reply_id: globReplyId})
          .end(function(err, res){
            assert.equal(res.statusCode,200);
            const obj = JSON.parse(res.text);
            assert.equal(obj.meta.details, 'success');
            assert.notProperty(obj.data[0].replys, 'reported');
            assert.notProperty(obj.data[0].replys, 'delete_password');
            done();
        });         
      });       
    });

    // I can delete a post(just changing the text to '[deleted]') if I send a DELETE request to /api/replies/{board} and pass along the thread_id, reply_id, & delete_password. (Text response will be 'incorrect password' or 'success')      
    suite('DELETE', function() {
      test('Test DELETE PASSWORD=WRONG reply /api/replies/{board}', function(done) {
        chai.request(server)
          .delete('/api/replies/'+testBoard)
          .send({thread_id: globThreadId, reply_id: globReplyId, delete_password:'WRONG_PASSWORD'})
          .end(function(err, res){
            assert.equal(res.statusCode,400);
            const obj = JSON.parse(res.text);
            assert.equal(obj.errors[0].details, 'incorrect password');
            done();
        });         
      }); 
      
      test('Test DELETE PASSWORD=OK reply /api/replies/{board}', function(done) {
        chai.request(server)
          .delete('/api/replies/'+testBoard)
          .send({thread_id: globThreadId, reply_id: globReplyId, delete_password:globReplyDelete})
          .end(function(err, res){
            assert.equal(res.statusCode,200);
            const obj = JSON.parse(res.text);
            assert.equal(obj.meta.details, 'success');
            done();
        });         
      });       
    });

  });


  // extra-tests
  suite('extra-tests', function() {
    
    // extra: suite security
  	suite('GET / => check security', function() {
      test('content-security-policy', function(done) {
        chai.request(server)
        .get('/api')
        .end(function(err, res){ 
           assert.equal(res.header['x-frame-options'], 'SAMEORIGIN');
           assert.equal(res.header['x-dns-prefetch-control'], 'off');
           assert.equal(res.header['referrer-policy'], 'same-origin');
           done();
        });         
      });
    });
  });  // extra-tests
  
}); // suite: Functional Tests
