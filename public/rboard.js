var cl = console.log;

// just by including react-redux '<Provider>' is NOT available
// add it like this:
// (1) <ReactRedux.Provider>
// (or 2) const Provider = ReactRedux.Provider;
// (or 3)
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



// () Threadlist -----------------------------------
const mapNewThreadListStateToProps = (state) => {return {
  allThreads: state.allThreads
}}


function ThreadListDispatch(dispatch) {
  return {
    setVal: (text, delete_password, thread_id) => dispatch(fetchAction(ADD_REPLY, {text: text, delete_password: delete_password, thread_id: thread_id})),
    getAllList: () => dispatch(fetchAction(GET_ALL_LIST, {}))
  };
}

class ThreadListClass extends React.Component {
  constructor(props) {
    super(props);
    this.state = { // do we need this???
      allThreads: []
    };
  }
  
  // get list on load
  componentDidMount() {
    this.props.getAllList();
  }

  // ??? OWN CHILD FOR ADD REPLY: clean react state!!!
  handleSubmit(e) {
    e.preventDefault();
    this.props.setVal(this.state.text, this.state.delete_password, this.state.thread_id); // dispatch
    this.setState({text: '', delete_password: '', thread_id: ''});
  }
  
  render() {
    return (
      <React.Fragment>
        {this.props.allThreads.map((thread,i)=>{
          console.log(888, thread)
          return (
            <React.Fragment>
              <p>DUMMY-CHILD-COMPONENT</p>
              <div class="addreply">
                <form>
                  <label><span>Text</span><textarea name="text"></textarea></label>
                  <label><span>Delete Password</span><input type="text" name="delete_password" /></label>
                  <span class="submit"><button class="button" type="submit">add reply</button></span>
                  <input type="text" name="thread_id" value={thread._id} />
                </form>
              </div> 
            </React.Fragment>
          );
        })}
      </React.Fragment>
    );    
  }
}
const ThreadList = ReactRedux.connect(mapNewThreadListStateToProps, ThreadListDispatch)(ThreadListClass);



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

const reducer = (state=defaultState, action) => {
  //const cState = Object.assign({}, state); // -> no deep copy!
  const cState = JSON.parse( JSON.stringify(state) );
  cState.message="";
  
  if(action.type==ADD_THREAD) {
    cState.message="success";
    console.log(action.data)
  } else if(action.type==GET_ALL_LIST) {
    cState.allThreads = action.data;
  }
  
  cl("store",action);
  return cState;
}
const store = Redux.createStore(reducer, Redux.applyMiddleware(ReduxThunk.default));


// this function is called by dispatcher (instead of action-object)
// something like a pre-store for async-actions...
// eg click-event -> dispatch:fetchAction -> dispatch:receiveAction -> store
function fetchAction(action, data, board = 'general') {
  return function(dispatch) {
    let mt = 'POST';
    if([GET_ALL_LIST].indexOf(action)!==-1) mt = 'GET'; 
    return fetchData(mt, 'https://s-projects18-fcc-65.glitch.me/api/threads/'+board, data)
      .then(json =>
        dispatch(receiveAction(action, json, board)) // return action-object
      )
      .catch(err => console.log(err))
  }
}



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