const cl = console.log;
const {	Provider } = ReactRedux;


/*
TODOS
- OK: error: add reply in all-reply-mode + change to recent -> old list is shown
- OK: error: add reply > adds reply sometimes to wrong thread
- OK: show info-message on begin of API request
- OK: show error messages
- OK: error: empty password is allowed: add thread+add reply
- IGNORE: error: invalid password (üüü) allowed for add thred
- OK: report thread
- OK: report reply
- OK: delete thread
- OK: delete reply
- delete all old entries on server start
- testing
*/

// ========= HELPER =============================
// fetch-helper
// https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
// method: POST, PUT, DELETE, GET
async function fetchData(method, url = '', data = {}) {
  const obj = {
    method: method, 
    mode: 'cors', // no-cors, *cors, same-origin
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    credentials: 'same-origin', // include, *same-origin, omit
    headers: {
      'Content-Type': 'application/json'
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: 'follow', // manual, *follow, error
    referrer: 'no-referrer' // no-referrer, *client
  };
  if(method=="POST" || method=="PUT" || method=="DELETE") obj.body = JSON.stringify(data) // body data type must match "Content-Type" header
  const response = await fetch(url, obj);
  return await response.json(); 
}


// ========= REACT =============================
// action-types -------------------------------------
const ADD_THREAD = "ADD_THREAD"; // async
const ADD_REPLY = "ADD_REPLY";
const GET_ALL_LIST = "GET_ALL_LIST";
const GET_ALL_REPLYS = "GET_ALL_REPLYS";
const REPORT_THREAD = "REPORT_THREAD";
const REPORT_REPLY = "REPORT_REPLY";
const DELETE_THREAD = "DELETE_THREAD";
const DELETE_REPLY = "DELETE_REPLY";

const RESET_ALL_REPLYS = "RESET_ALL_REPLYS"; // sync
const REQUEST_START = "REQUEST_START";
const USER_EVENT = "USER_EVENT";

// returns action object
function receiveAction(action, json, board) {
  return {
    type: action,
    board: board,
    data: json,
    receivedAt: Date.now()
  }
}



// (1) Headline --------------------------------------
const mapHeadlineStateToProps = (state) => {return { board: state.board}}
const HeadlineObj = (props) => <h1>Board: {props.board}</h1>;
const Headline = ReactRedux.connect(mapHeadlineStateToProps)(HeadlineObj); // no dispatcher


// (2) Message --------------------------------------
const mapMessageStateToProps = (state) => {return { message: state.message, messageIsError: state.messageIsError}}
const MessageObj = (props) => {
  const cls = ['message'];
  if (props.message=='') cls.push('hide');  
  else cls.push('show');
  if (props.messageIsError) cls.push('error');
  return <p className={cls.join(' ')}>{props.message}</p>;
}
const Message = ReactRedux.connect(mapMessageStateToProps)(MessageObj);


// (3) New Thread -----------------------------------
const mapNewThreadStateToProps = (state) => {return {
  threadHeadline: state.threadHeadline,
  labelText: state.labelText,
  labelDelete: state.labelDelete,
  labelAddThread: state.labelAddThread,
  board: state.board
}}

function newThreadDispatch(dispatch) {
  return {
    setVal: (text, delete_password, board) => dispatch(
      fetchAction(
        ADD_THREAD,
        {text: text, delete_password: delete_password},
        board,
        () => dispatch(fetchAction(GET_ALL_LIST, {}, board)) // callback
      )
    ) 
  };
}

// uses local react state to manage text fields
class NewThreadClass extends React.Component {
  constructor(props) {
    super(props); // store state
    this.state = { // local state
      text: '',
      delete_password: ''
    };
    this.handleSubmit = this.handleSubmit.bind(this);
    this.set = this.set.bind(this);
  }
  handleSubmit(e) {
    e.preventDefault();
    this.props.setVal(this.state.text, this.state.delete_password, this.props.board); // dispatch
    this.setState({text: '', delete_password: ''});
  }
  
  set(e) { // local state only
    let obj = {};
    obj[e.target.name] = e.target.value;
    this.setState(obj);
  }

  render() {   
    // if you specify value the input becomes "controlled". This means you must update the corresponding state in onChange
    return (
      <div className="addthread">
        <form onSubmit={this.handleSubmit}>
          <h2>{this.props.threadHeadline}</h2>
          <label><span>{this.props.labelText}</span><textarea name="text" onChange={this.set} value={this.state.text} /></label>
          <label><span>{this.props.labelDelete}</span><input name="delete_password" onChange={this.set} type="text" value={this.state.delete_password} /></label>
          <span className="submit"><button className="button" type="submit">{this.props.labelAddThread}</button></span>
        </form>
      </div>    
    );
  }  
}
const NewThread = ReactRedux.connect(mapNewThreadStateToProps, newThreadDispatch)(NewThreadClass);



// (4) Threadlist (parent) -----------------------------------
const mapNewThreadListStateToProps = (state) => {return {
  allThreads: state.allThreads,
  allThreadsComplete: state.allThreadsComplete,
  board: state.board
}}

function ThreadListDispatch(dispatch) {
  return {
    getAllList: (board) => dispatch(fetchAction(GET_ALL_LIST, {}, board))
  };
}

class ThreadListClass extends React.Component {
  constructor(props) {
    super(props);
  }
  
  // get list on load
  componentDidMount() {
    this.props.getAllList(this.props.board);
  }
 
  render() {
    return (
      <React.Fragment>
        {this.props.allThreads.map((thread)=>{
          let replys = thread.replys;
          const t = this.props.allThreadsComplete.filter(v=>{
            if(v._id==thread._id) return true;
            return false;
          });
          if(t.length==1) replys=t[0].replys;
          
          return (
            <div className="threadlist">
              <ThreadListElement data-class="is-thread" thread='1' thread_id={thread._id} data={thread} />
              {replys.map((reply, i, a)=>{
                if(i<a.length-1) return (<ThreadListElement  thread='0' thread_id={thread._id} data={reply} />);
                else return (<ThreadListElement data-class="last" thread='0' thread_id={thread._id} data={reply} />);
              })}
              <ShowAll numreplys={thread.replys.length} replycount={thread.replycount} thread_id={thread._id} />
              <NewReply thread_id={thread._id} />
            </div>
          );
        })}
      </React.Fragment>
    );    
  }
}
const ThreadList = ReactRedux.connect(mapNewThreadListStateToProps, ThreadListDispatch)(ThreadListClass);


// (5) Add Reply (child) -----------------------------------
const mapNewReplyStateToProps = (state) => {return {
  allThreadsComplete: state.allThreadsComplete,
  board: state.board
}}

// we have 2 dispatches: first updates replys und a callback that gets current list
function NewReplyDispatch(dispatch) {
  return {
    setValRecent: (text, delete_password, thread_id, board) => dispatch(
      fetchAction(ADD_REPLY,
                  {text: text, delete_password: delete_password, thread_id: thread_id},
                  board,
                  () => dispatch(fetchAction(GET_ALL_LIST, {}, board)) 
      )
    ),
    setValAllReply: (text, delete_password, thread_id, board) => dispatch(
      fetchAction(ADD_REPLY, 
                  {text: text, delete_password: delete_password, thread_id: thread_id},
                  board,
                  () => {
                      dispatch(fetchAction(GET_ALL_LIST, {}, board));
                      return dispatch(fetchAction(GET_ALL_REPLYS, {thread_id: thread_id}, board))
                  }
      )
    )
  };
}

class NewReplyClass extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      text: '',
      delete_password: ''
    };
    this.handleSubmit = this.handleSubmit.bind(this);
    this.set = this.set.bind(this);
  }

  handleSubmit(e) {
    e.preventDefault();
    const check = this.props.allThreadsComplete.filter(v=>v._id==this.props.thread_id);
    if(check.length==1) {
      // show-all-replys-mode and must update the reply-list
      this.props.setValAllReply(this.state.text, this.state.delete_password, this.props.thread_id, this.props.board); // dispatch
    } else {
      // show-recent-mode
      this.props.setValRecent(this.state.text, this.state.delete_password, this.props.thread_id, this.props.board); // dispatch      
    }
    
    this.setState({text: '', delete_password: ''});
  }
  
  set(e) { // local state only
    let obj = {};
    obj[e.target.name] = e.target.value;
    this.setState(obj);
  }
  
  render() {
    return (
      <div class="addreply">
        <form onSubmit={this.handleSubmit}>
          <label><span>Text</span><textarea onChange={this.set} value={this.state.text} name="text"></textarea></label>
          <label><span>Delete Password</span><input type="text" onChange={this.set} value={this.state.delete_password} name="delete_password" /></label>
          <span class="submit"><button class="button" type="submit">add reply</button></span>
          <input type="hidden" name="thread_id" value={this.props.thread_id} />
        </form>
      </div> 
    );    
  }
}
const NewReply = ReactRedux.connect(mapNewReplyStateToProps, NewReplyDispatch)(NewReplyClass);


// (6) Thread List Element (child) -----------------------------------
const mapThreadListElementStateToProps = (state) => {return {
  board: state.board,
  allThreadsComplete: state.allThreadsComplete
}}

function threadListElementDispatch(dispatch) {
  return {
    setValThread: (thread_id, board) => dispatch(fetchAction(REPORT_THREAD, {thread_id: thread_id}, board)), // async
    setValReply: (thread_id, reply_id, board) => dispatch(fetchAction(REPORT_REPLY, {thread_id: thread_id, reply_id: reply_id}, board)),
    deleteThread: (thread_id, delete_password, board) => dispatch(
      fetchAction(DELETE_THREAD,
                  {thread_id: thread_id, delete_password: delete_password},
                  board,
                  () => {
                    dispatch({type: RESET_ALL_REPLYS, thread_id: thread_id});
                    return dispatch(fetchAction(GET_ALL_LIST, {}, board));
                  }
                 )
    ),
    deleteReplyAll: (thread_id, reply_id, delete_password, board) => dispatch(
      fetchAction(DELETE_REPLY,
                  {thread_id: thread_id, reply_id: reply_id, delete_password: delete_password},
                  board,
                  () => {
                      dispatch(fetchAction(GET_ALL_LIST, {}, board));
                      return dispatch(fetchAction(GET_ALL_REPLYS, {thread_id: thread_id}, board))
                  }
                 )
    ),
    deleteReplyRecent: (thread_id, reply_id, delete_password, board) => dispatch(
      fetchAction(DELETE_REPLY,
                  {thread_id: thread_id, reply_id: reply_id, delete_password: delete_password},
                  board,
                  () => dispatch(fetchAction(GET_ALL_LIST, {}, board)) 
                 )
    ),    
    userEvent: () => dispatch({type:USER_EVENT}) // sync
  };
}

class ThreadListElementClass extends React.Component {
  constructor(props) {
    super(props);
    this.handleReport = this.handleReport.bind(this);
    this.handleDelete = this.handleDelete.bind(this);
  }
 
  handleReport(e) {
    e.preventDefault();
    this.props.userEvent();
    
    if(this.props['thread']==1) this.props.setValThread(this.props['thread_id'], this.props.board);
    else this.props.setValReply(this.props['thread_id'], this.props['data']._id, this.props.board);
  }
  
  handleDelete(e) {
    e.preventDefault();
    this.props.userEvent();
    
    const password = prompt("Enter password", "");   
    if(this.props['thread']==1) this.props.deleteThread(this.props['thread_id'], password, this.props.board); // thread
    else { // reply
      const check = this.props.allThreadsComplete.filter(v=>v._id==this.props.thread_id);
      if(check.length==1) {
        // show-all-replys-mode and must update the reply-list
        this.props.deleteReplyAll(this.props['thread_id'], this.props['data']._id, password, this.props.board); // dispatch
      } else {
        // show-recent-mode
        this.props.deleteReplyRecent(this.props['thread_id'], this.props['data']._id, password, this.props.board); // dispatch      
      }      
    }
  }
  
  render() {
    const cl = ['reply'];
    if(typeof this.props['data-class'] !== 'undefined') cl.push(this.props['data-class']);
    let cls = cl.join(' ');
    const data = this.props['data'];
   
    return (
      <div className={cls}>
        <p className="date">{data.created_on}</p>
        <p className="text">{data.text}</p>
        <p className="buttons">
          <button onClick={this.handleReport} className="button button-small" title="report that reply" data-id={data._id}>report</button>
          <button onClick={this.handleDelete} className="button button-small" title="delete that reply" data-id={data._id}>delete</button>
        </p>
      </div> 
    );    
  }
}
const ThreadListElement = ReactRedux.connect(mapThreadListElementStateToProps, threadListElementDispatch)(ThreadListElementClass);


// (7) Show All Button (child) -----------------------------------
const mapShowAllStateToProps = (state) => {return {
  labelsShowAll: state.labelsShowAll,
  board: state.board
}}

function showAllDispatch(dispatch) {
  return {
    setVal: (thread_id, board) => dispatch(fetchAction(GET_ALL_REPLYS, {thread_id: thread_id}, board)), // async
    resetVal: (thread_id) => dispatch({type:RESET_ALL_REPLYS, thread_id: thread_id}), // sync
    userEvent: () => dispatch({type:USER_EVENT}) // sync
  };
}

class ShowAllClass extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      showAllFlag: false
    };
    this.handleClick = this.handleClick.bind(this);
    this.getLabel = this.getLabel.bind(this);
  }
  
  getLabel() {
    return this.props.labelsShowAll[1*this.state.showAllFlag].replace('#', this.props.replycount);
  }
  
  handleClick(e) {
    e.preventDefault();
    this.props.userEvent();
    if(this.state.showAllFlag) this.props.resetVal(this.props.thread_id);
    else this.props.setVal(this.props.thread_id, this.props.board);
    this.setState({showAllFlag: !this.state.showAllFlag});
  }
  
  render() { 
    if(this.props.replycount>this.props.numreplys) {
      return (
        <div className="reply toggle-list">
          <p><button onClick={this.handleClick} class="button button-middle" title="Show full list of this thread">{this.getLabel(this.props.replycount)}</button></p>      
        </div>
      );        
    }
    return (<React.Fragment></React.Fragment>);
  }
}
const ShowAll = ReactRedux.connect(mapShowAllStateToProps, showAllDispatch)(ShowAllClass);



// ======== REDUX ===============================
const defaultState = {
  board: window.location.pathname.split('/').pop(),
  threadHeadline: "Create new thread",
  labelText:"Text",
  labelDelete: "Delete Password",
  labelAddThread: "add thread",
  labelsShowAll: ['show all # replies', 'show recent replies'],
  message: '',
  messageIsError: false,
  allThreads: [],
  allThreadsComplete: []
}


// [1] this function is called by dispatcher (instead of action-object)
// - something like a 'pre-store' for async-actions
//   > eg click-event -> dispatch:fetchAction -> dispatch:receiveAction -> store
// - just get async data (no decisions based on state here!)
// next(): optional callback if 2 depending fetchActions must be called
function fetchAction(action, data, board, next=false) {
  return function(dispatch) {
    // user-feedback
    if([ADD_REPLY, ADD_THREAD].indexOf(action)!==-1) dispatch({type:REQUEST_START});
    
    let mt = 'POST'; // method-check
    if([GET_ALL_LIST, GET_ALL_REPLYS].indexOf(action)!==-1) mt = 'GET'; 
    if([REPORT_THREAD, REPORT_REPLY].indexOf(action)!==-1) mt = 'PUT';
    if([DELETE_THREAD, DELETE_REPLY].indexOf(action)!==-1) mt = 'DELETE';
    
    let pt = 'threads'; // path-check
    if([ADD_REPLY, GET_ALL_REPLYS, REPORT_REPLY, DELETE_REPLY].indexOf(action)!==-1) pt = 'replies';
    
    let q = ''; // query-check
    if([GET_ALL_REPLYS].indexOf(action)!==-1) q = '?thread_id='+data.thread_id;
  
    return fetchData(mt, 'https://s-projects18-fcc-65.glitch.me/api/'+pt+'/'+board+q, data)
      .then(json =>{
        if(next) next(); 
        return dispatch(receiveAction(action, json, board)) // return action-object   
      })
      .catch(err => console.log(err))
  }
}

// reducer-helper
const isErrorMessage = (action, cState, messageOK=false, messageError=false) => {
  if(action.data.hasOwnProperty('errors')) {
    if(messageError) {
      cState.message=messageError;
      console.log(action.data.errors[0].details);
    } else {
      cState.message=action.data.errors[0].details;  
    }
    cState.messageIsError=true;
    return true;
  } if(messageOK) {
    cState.message=messageOK;
    cState.messageIsError=false;
    return false;
  }  
}

// [2] handles only synchroneous stuff (async -> fetchAction)
const reducer = (state=defaultState, action) => {
  const cState = JSON.parse( JSON.stringify(state) );
  
  // ------------ async ------------------------
  if(action.type==ADD_THREAD) {
    isErrorMessage(action, cState, "added thread");
  } else if(action.type==DELETE_THREAD) {
    isErrorMessage(action, cState, "deleted thread"); 
  } else if(action.type==DELETE_REPLY) {
    isErrorMessage(action, cState, "deleted reply");     
  } else if(action.type==REPORT_THREAD) {
    isErrorMessage(action, cState, "reported thread"); 
  } else if(action.type==REPORT_REPLY) {
    isErrorMessage(action, cState, "reported reply");     
  } else if(action.type==GET_ALL_LIST) {
    if(!isErrorMessage(action, cState)) cState.allThreads = action.data.data;
  } else if(action.type==ADD_REPLY) {
    isErrorMessage(action, cState, "added reply");
  } else if(action.type==GET_ALL_REPLYS) {
    if(!isErrorMessage(action, cState)) {
      cState.allThreadsComplete = cState.allThreadsComplete.filter(v=>{ // remove thread with old replys...
        if(v._id!==action.data.data[0]._id) return true;
        return false;
      });
      cState.allThreadsComplete.push(action.data.data[0]); // ...and insert thread with new reply      
    }
  // ------------ sync ------------------------  
  } else if(action.type==REQUEST_START) {
    cState.message="sending request...";
    cState.messageIsError=false;
  } else if(action.type==RESET_ALL_REPLYS) {
    cState.allThreadsComplete = cState.allThreadsComplete.filter(v=>{
      if(v._id == action.thread_id) return false;
      return true;
    });
  } else if(action.type==USER_EVENT) { // reset message state
    cState.message="";
    cState.messageIsError=false;    
  }
  
  console.log("store",cState);
  //console.log("action",action);
  return cState;
}
const store = Redux.createStore(reducer, Redux.applyMiddleware(ReduxThunk.default));



// ======= main =============================
// Provider connects React with Redux store
ReactDOM.render(
	<Provider store={store}>
    <Headline />
    <NewThread />
    <ThreadList />
    <Message />
  </Provider>,
	document.getElementById('main')
);