const cl = console.log;
const {	Provider } = ReactRedux;


// ========= HELPER =============================
// fetch-helper
// https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
// method: POST, PUT, DELETE
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
  if(method=="POST") obj.body = JSON.stringify(data) // body data type must match "Content-Type" header
  const response = await fetch(url, obj);
  return await response.json(); // parses JSON response into native JavaScript objects
}


// ========= REACT =============================
// action-types -------------------------------------
const ADD_THREAD = "ADD_THREAD";
const ADD_REPLY = "ADD_REPLY";
const GET_ALL_LIST = "GET_ALL_LIST";

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
    setVal: (text, delete_password) => dispatch(fetchAction(ADD_THREAD, {text: text, delete_password: delete_password})) 
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
  allThreads: state.allThreads
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
          return (
            <div className="threadlist">
              <ThreadListElement data-class="is-thread" data={thread} />
              {thread.replys.map((reply, i, a)=>{
                if(i<a.length-1) return (<ThreadListElement data={reply} />);
                else return (<ThreadListElement data-class="last" data={reply} />);
              })}
              <p>DUMMY SHOW ALL</p>
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
function NewReplyDispatch(dispatch) {
  return {
    setVal: (text, delete_password, thread_id) => dispatch(fetchAction(ADD_REPLY, {text: text, delete_password: delete_password, thread_id: thread_id}))
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
    this.props.setVal(this.state.text, this.state.delete_password, this.state.thread_id); // dispatch
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
          <input type="text" onChange={this.set} name="thread_id" value={this.state.thread_id} />
        </form>
      </div> 
    );    
  }
}
const NewReply = ReactRedux.connect(null, NewReplyDispatch)(NewReplyClass);


// (6) Thread List Element (child) -----------------------------------
class ThreadListElementClass extends React.Component {
  constructor(props) {
    super(props);
  }
 
  render() {
    const cl = ['reply'];
    if(typeof this.props['data-class'] !== 'undefined') cl.push(this.props['data-class']);
    let cls = cl.join(' ');
    return (
      <div className={cls}>
        <p className="date">11 {this.props.data.created_on}</p>
        <p className="text">22 {this.props.data.text}</p>
        <p className="buttons">
          <button className="button button-small" title="report that reply" data-id={this.props.data._id}>report</button>
          <button className="button button-small" title="delete that reply" data-id={this.props.data._id}>delete</button>
        </p>
      </div> 
    );    
  }
}
const ThreadListElement = ReactRedux.connect(null, null)(ThreadListElementClass);




// ======== REDUX ===============================
const defaultState = {
  board: "unknown",
  threadHeadline: "Create new thread",
  labelText:"Text",
  labelDelete: "Delete Password",
  labelAddThread: "add thread",
  message: '',
  allThreads: []
}


// [1] this function is called by dispatcher (instead of action-object)
// something like a 'pre-store' for async-actions
// eg click-event -> dispatch:fetchAction -> dispatch:receiveAction -> store
function fetchAction(action, data, board = 'general') {
  return function(dispatch) {
    let mt = 'POST'; // method-check
    if([GET_ALL_LIST].indexOf(action)!==-1) mt = 'GET'; 
    
    let pt = 'threads'; // path-check
    if([ADD_REPLY].indexOf(action)!==-1) pt = 'replies';
    
    return fetchData(mt, 'https://s-projects18-fcc-65.glitch.me/api/'+pt+'/'+board, data)
      .then(json => {
        // refresh threadlist -> not automatic on async-stuff
        // TODO: check - is this the right way?
        if([ADD_REPLY, ADD_THREAD].indexOf(action)!==-1) dispatch(fetchAction(GET_ALL_LIST, {})); 
        return json;
      })
      .then(json =>
        dispatch(receiveAction(action, json, board)) // return action-object
      )
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