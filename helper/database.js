var mongo = require('mongodb');
var mongoose = require('mongoose');
// https://mongoosejs.com/docs/deprecations.html#-findandmodify-
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);
var Schema = mongoose.Schema;

// connect --------------------------------
exports.connect = () => {
  // connect to database
  mongoose.connect(process.env.DB, {
      useNewUrlParser: true
    })
    .then(()=>{
      console.log("db connected");
  })
    .catch(err => { 
      console.log(err);
    });
}

// check connection -----------------------
exports.checkConnection = () => {
  /*
  0: disconnected
  1: connected
  2: connecting
  3: disconnecting
  */
  if(mongoose.connection.readyState==0 || mongoose.connection.readyState==3) {
    console.log("no-connection: "+mongoose.connection.readyState);
    return false;
  }  
  return true;
}

// schema --------------------------------
// https://mongoosejs.com/docs/subdocs.html
// - array of objects: schema is used automatically
// - saved when parent is saved: parent save() triggers save() on all subdocuments
// - push()/ pull()
const replysSchema = new Schema({
  text:{
    type: String,
    required:true,
    // attention: validator works also on existing subdocuments,
    // if you add validator later: error is thrown on existing entrys
    validate: {
      validator: function(v) {
        return /^[a-zA-Z0-9 \-_()]+$/.test(v); // mask: -
      },
      message: props => `${props.value}: only letters, numbers and(-_/)  are allowed`
    },  
  }, //*
  delete_password:{type: String, required:true}, //*    
  created_on: {type: Date, default: Date.now}, // auto
  reported:{type: Boolean, default: false }
});

// we can have the same board with different (thread-)id's
// eg: board 'foo' with id=1 and foo with id=2 => 2 threads
const threadsSchema = new Schema({
  board:{
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        return /^[a-zA-Z0-9]+$/.test(v);
      },
      message: props => `${props.value}: only letters and numbers are allowed`
    },    
  },
  text:{type: String, required: true}, //*
  delete_password:{type: String, required: true}, //*
  replys:[replysSchema], // subdocuments or nested schema
  created_on: {type: Date, default: Date.now}, // auto
  bumped_on: {type: Date, default: Date.now}, // bump: "Bring Up My Post", updated on new reply
  reported:{type: Boolean, default: false }
});

// model --------------------------------
const Threads = mongoose.model('thread', threadsSchema ); // Mongoose:thread <=> MongoDB:threads
const Replys = mongoose.model('reply', replysSchema ); // Mongoose:reply <=> MongoDB:replys


// helper --------------------------------
// return a copy of threads without: delete_passwort, reported
const cleanUpThreads = threads => {
    const cp = [];
    threads.forEach((v,i)=>{ 
      let repl = v.replys.map(v2=>{return {_id:v2._id, text:v2.text, created_on:v2.created_on}});
      cp.push({
        _id:v._id, board:v.board, text:v.text, created_on:v.created_on, bumped_on: v.bumped_on, replys:repl, reported: v.reported
      });
    });  
  return cp;
}


// crud ----------------------------------------------
// Promise-schema: Foo.then().catch()
// Promises used instead of callback


// get all threads of a board
// both solutions requires additional cleanup, var 1 probably can be done better
// returns [{...thread-obj1...}, {...thread-obj2...}, ...]

// [var 1] get all threads of a board with aggregate()
exports.getThreads = (board, limitThreads, limitReplys) => {
  return new Promise( (resolve, reject)=>{
    Threads
      .aggregate([
        {$match:{board:board}},
        {$project:{_id:1, board:1, text:1, created_on:1, bumped_on:1, replys:{_id:1, text:1, created_on:1}}}
      ])
      .sort({bumped_on:1})
      .limit(limitThreads)
      .then(data=>{
        data.forEach(v=>v.replys = v.replys.slice(-limitReplys)); // bad-way: should be possible with aggregate...
        resolve(data);
      })
      .catch(err=>{
        reject(err);
      });    
  });  
}

// [var 2] get all threads of a board with find(), select()
// https://stackoverflow.com/questions/42685297/mongodb-with-mongoose-limit-subdocuments
exports.getThreads2 = (board, limitThreads, limitReplys) => {
  return new Promise( (resolve, reject)=>{
    Threads
      .find({board:board}, {replys: {$slice: limitReplys}})
      .select({board:1, text:1, created_on:1, bumped_on:1})
      .sort({bumped_on:1})
      .limit(limitThreads)
      .then(data=>{
        // bad, but in var 2 there is no query-solution
        resolve(cleanUpThreads(data));
      })
      .catch(err=>{
        reject(err);
      });    
  });
}

// get one thread with all replys
// returns [{...thread-obj...}]
exports.getThread = (threadId, completeSelection=false) => {
  return new Promise( (resolve,reject)=>{
    const sel = {board:1, text:1, created_on:1, bumped_on:1, replys:1, delete_password:1, reported:1};
 
    Threads
      .findOne({_id:threadId})
      .select(sel)
      .then(data=>{
        if(data==null) throw new Error('nothing to delete');
        else {
          // bad: see same problem in getThreads(), var 2
          resolve(completeSelection?[data]:cleanUpThreads([data])); 
        }
      })
      .catch(err=>{
        console.log(err);
        reject(err);
      });    
  } );
}

// insert new thread
// dataObj: board, text, delete_password
exports.insertThread = dataObj => {
  return new Promise( (resolve, reject)=>{
    // create object based on model
    new Threads(dataObj)
      .save()
      .then((doc) => {
        resolve(doc);
      })
      .catch((err)=> {
        console.log("insertThread-error", err);
        reject(err);
      });     
  } );  
}

// insert new reply
// dataObj: text, delete_password
exports.insertReply = (threadId, dataObj) => {
  return new Promise( (resolve, reject)=>{
    // this way replies are stored in a extra replies-collection:
    //const newReply = Replys.create(dataObj);   
    Threads
      .findOne({_id:threadId})
      .then(data=>{
        data.replys.push(dataObj)
        data.save() // here subdocument-validator is called!
        .then(d=>resolve(d))
        .catch(e=>reject(e)); 
      })
      .catch(err=>{
        reject(err);
      });   
  } );    
}

// delete complete thread
exports.deleteThread = (threadId) => {
  // attention: if you provide a wrong filter, eg: {typo_id: threadId}
  // no error is thrown and ALL entries are deleted because filter acts like: {}
  let filter = {_id: threadId};
  return new Promise( (resolve, reject)=>{
    if(threadId==undefined) {reject('thread_id is undefined'); return;}
    
    Threads.deleteMany(filter, (err, resultObject) => {
      if(err==null) {
        resolve(resultObject); 
      } else {
        console.log(err); 
        reject(err);     
      }
    });    
  });
}
