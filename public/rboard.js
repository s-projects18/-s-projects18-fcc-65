const cl = console.log;
const {	Provider } = ReactRedux;


/*
TODOS
- include (general) board
- show error messages
- show info-message on begin of API request
- report thread
- report reply
- delete thread
- delete reply
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
  if(method=="POST" || method=="PUT") obj.body = JSON.stringify(data) // body data type must match "Content-Type" header
  const response = await fetch(url, obj);
  return await response.json(); // parses JSON response into native JavaScript objects
}


// ========= REACT =============================
// action-types -------------------------------------
const ADD_THREAD = "ADD_THREAD"; // async
const ADD_REPLY = "ADD_REPLY";
const GET_ALL_LIST = "GET_ALL_LIST";
const GET_ALL_REPLYS = "GET_ALL_REPLYS";

const RESET_ALL_REPLYS = "RESET_ALL_REPLYS"; // sync

// returns action object
function receiveAction(action, json, board) {
console.log("receiveAction", action)
  return {
    type: action,
    board: board,
    data: json.data,
    receivedAt: Date.now()
  }
}



// (1) Headline --------------------------------------
const mapHeadlineStateToProps = (state) => {return { board: state.board}}
const HeadlineObj = (props) => <h1>Board: {props.board}</h1>;
const Headline = ReactRedux.connect(mapHeadlineStateToProps)(HeadlineObj); // no dispatcher

// (2) Message --------------------------------------
const mapMessageStateToProps = (state) => {return { message: state.message}}
const MessageObj = (props) => (props.message=='')  ? null: <p className="message">{props.message}</p>;
const Message = ReactRedux.connect(mapMessageStateToProps)(MessageObj);


// (3) New Thread -----------------------------------
const mapNewThreadStateToProps = (state) => {return {
  threadHeadline: state.threadHeadline,
  labelText: state.labelText,
  labelDelete: state.labelDelete,
  labelAddThread: state.labelAddThread
}}

function newThreadDispatch(dispatch) {
  return {
    setVal: (text, delete_password) => dispatch(
      fetchAction(
        ADD_THREAD,
        {text: text, delete_password: delete_password},
        'general',
        () => dispatch(fetchAction(GET_ALL_LIST, {})) // callback
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
    this.props.setVal(this.state.text, this.state.delete_password); // dispatch
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
  allThreadsComplete: state.allThreadsComplete
}}

function ThreadListDispatch(dispatch) {
  return {
    getAllList: () => dispatch(fetchAction(GET_ALL_LIST, {}))
  };
}

class ThreadListClass extends React.Component {
  constructor(props) {
    super(props);
  }
  
  // get list on load
  componentDidMount() {
    this.props.getAllList();
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
              <ThreadListElement data-class="is-thread" thread_id={thread._id} data={thread} />
              {replys.map((reply, i, a)=>{
                if(i<a.length-1) return (<ThreadListElement  thread_id={thread._id} data={reply} />);
                else return (<ThreadListElement data-class="last" thread_id={thread._id} data={reply} />);
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
  allThreadsComplete: state.allThreadsComplete
}}

// we have 2 dispatches: first updates replys und a callback that gets current list
function NewReplyDispatch(dispatch) {
  return {
    setValRecent: (text, delete_password, thread_id) => dispatch(
      fetchAction(ADD_REPLY,
                  {text: text, delete_password: delete_password, thread_id: thread_id},
                  'general',
                  () => dispatch(fetchAction(GET_ALL_LIST, {})) // callback
      )
    ),
    setValAllReply: (text, delete_password, thread_id) => dispatch(
      fetchAction(ADD_REPLY, 
                  {text: text, delete_password: delete_password, thread_id: thread_id},
                  'general',
                  () => dispatch(fetchAction(GET_ALL_REPLYS, {thread_id: thread_id})) // callback
      )
    )
  };
}

class NewReplyClass extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      text: '',
      delete_password: '',
      thread_id: this.props.thread_id
    };
    this.handleSubmit = this.handleSubmit.bind(this);
    this.set = this.set.bind(this);
  }

  handleSubmit(e) {
    e.preventDefault();
    const check = this.props.allThreadsComplete.filter(v=>v._id==this.state.thread_id);
    if(check.length==1) {
      // show-all-replys-mode and must update the reply-list
      this.props.setValAllReply(this.state.text, this.state.delete_password, this.state.thread_id); // dispatch
    } else {
      // show-recent-mode
      this.props.setValRecent(this.state.text, this.state.delete_password, this.state.thread_id); // dispatch      
    }
    
    this.setState({text: '', delete_password: ''}); // thread_id will not change
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
          <input type="hidden" onChange={this.set} name="thread_id" value={this.state.thread_id} />
        </form>
      </div> 
    );    
  }
}
const NewReply = ReactRedux.connect(mapNewReplyStateToProps, NewReplyDispatch)(NewReplyClass);


// (6) Thread List Element (child) -----------------------------------
const mapThreadListElementStateToProps = (state) => {return {
  allThreads: state.allThreads
}}

class ThreadListElementClass extends React.Component {
  constructor(props) {
    super(props);
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
          <button className="button button-small" title="report that reply" data-id={data._id}>report</button>
          <button className="button button-small" title="delete that reply" data-id={data._id}>delete</button>
        </p>
      </div> 
    );    
  }
}
const ThreadListElement = ReactRedux.connect(mapThreadListElementStateToProps, null)(ThreadListElementClass);


// (7) Show All Button (child) -----------------------------------
const mapShowAllStateToProps = (state) => {return {
  labelsShowAll: state.labelsShowAll
}}

function showAllDispatch(dispatch) {
  return {
    setVal: (thread_id) => dispatch(fetchAction(GET_ALL_REPLYS, {thread_id: thread_id})), // async
    resetVal: (thread_id) => dispatch({type:RESET_ALL_REPLYS, thread_id: thread_id}) // sync
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
    if(this.state.showAllFlag) this.props.resetVal(this.props.thread_id);
    else this.props.setVal(this.props.thread_id);
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
  board: "unknown",
  threadHeadline: "Create new thread",
  labelText:"Text",
  labelDelete: "Delete Password",
  labelAddThread: "add thread",
  labelsShowAll: ['show all # replies', 'show recent replies'],
  message: '',
  allThreads: [],
  allThreadsComplete: []
}


// [1] this function is called by dispatcher (instead of action-object)
// - something like a 'pre-store' for async-actions
//   > eg click-event -> dispatch:fetchAction -> dispatch:receiveAction -> store
// - just get async data (no decisions based on state here!)
// next(): optional callback if 2 depending fetchActions must be called
function fetchAction(action, data, board='general', next=false) {
  return function(dispatch) {
    let mt = 'POST'; // method-check
    if([GET_ALL_LIST, GET_ALL_REPLYS].indexOf(action)!==-1) mt = 'GET'; 
    
    let pt = 'threads'; // path-check
    if([ADD_REPLY, GET_ALL_REPLYS].indexOf(action)!==-1) pt = 'replies';
    
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


// [2] handles only synchroneous stuff (async -> fetchAction)
const reducer = (state=defaultState, action) => {
  const cState = JSON.parse( JSON.stringify(state) );
  cState.message=""; // reset
  
  if(action.type==ADD_THREAD) {
    cState.message="success";
  } else if(action.type==GET_ALL_LIST) {
    cState.allThreads = action.data;
  } else if(action.type==ADD_REPLY) {
    cState.message="success";
  } else if(action.type==GET_ALL_REPLYS) {
    cState.allThreadsComplete = cState.allThreadsComplete.filter(v=>{ // remove thread with old replys...
      if(v._id!==action.data[0]._id) return true;
      return false;
    });
    cState.allThreadsComplete.push(action.data[0]); // ...and insert thread with new reply
    cState.message="success";
  } else if(action.type==RESET_ALL_REPLYS) {
    cState.allThreadsComplete = cState.allThreadsComplete.filter(v=>{
      if(v._id == action.thread_id) return false;
      return true;
    });
    cState.message="success";
    console.log(999, action)
  }
  
  cl("store",action);
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