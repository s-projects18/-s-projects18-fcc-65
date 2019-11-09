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

chai.use(chaiHttp);

suite('Functional Tests', function() {
/*
  suite('API ROUTING FOR /api/threads/:board', function() {
    
    suite('POST', function() {
      
    });
    
    suite('GET', function() {
      
    });
    
    suite('DELETE', function() {
      
    });
    
    suite('PUT', function() {
      
    });
    

  });
  
  suite('API ROUTING FOR /api/replies/:board', function() {
    
    suite('POST', function() {
      
    });
    
    suite('GET', function() {
      
    });
    
    suite('PUT', function() {
      
    });
    
    suite('DELETE', function() {
      
    });
    
  });
*/  

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
