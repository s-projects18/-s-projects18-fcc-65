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
  text:{type: String}, //*
  delete_password:{type: String}, //*    
  created_on: {type: Date, default: Date.now}, // auto
  reported:{type: Boolean, default: false }
});

const threadsSchema = new Schema({
  board:{type: String}, //*
  text:{type: String}, //*
  delete_password:{type: String}, //*
  replys:[replysSchema], // subdocuments or nested schema
  created_on: {type: Date, default: Date.now}, // auto
  bumped_on: {type: Date, default: Date.now}, // bump: "Bring Up My Post", updated on new reply
  reported:{type: Boolean, default: false }
});

// model --------------------------------
const Threads = mongoose.model('thread', threadsSchema ); // Mongoose:thread <=> MongoDB:threads
const Replys = mongoose.model('reply', replysSchema ); // Mongoose:reply <=> MongoDB:replys

// crud --------------------------------
// Promise-schema: Foo.then().catch()
// Promises used instead of callback

// get all threads
// https://stackoverflow.com/questions/42685297/mongodb-with-mongoose-limit-subdocuments
exports.getThreads = (limitThreads, limitReplys) => {
  return new Promise( (resolve, reject)=>{
    Threads
      .find({replies: {$slice: limitReplys}})
      .sort({bumped_on:1})
      .limit(limitThreads)
      .then(data=>{
        resolve(data);
      })
      .catch(err=>{
        reject(err);
      });    
  });
}

// get one thread with all replys
exports.getThread = (threadId) => {
  return new Promise( (resolve,reject)=>{
    Threads
      .findOne({_id:threadId})
      .then(data=>{
        resolve(data);
      })
      .catch(err=>{
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
    const newReply = Replys.create(dataObj);
    
    Threads
      .findOne({_id:threadId})
      .replys.push(newReply)
      .save()
      .then(data=>{
        resolve(data);
      })
      .catch(err=>{
        reject(err);
      });   
  } );    
}

/*
exports.deleteAllLikes = (numMinutes, next) => {
  var d = new Date();
  d.setMinutes(d.getMinutes()-numMinutes);
  let filter = {created_on: {$lt:d}};
  Likes.deleteMany(filter, (err, resultObject) => {
    if(err==null) {
      next(null, resultObject); 
    } else {
      console.log(err); 
      next(err, null);     
    }
  });
}
*/