var cl = console.log;

// just by including react-redux '<Provider>' is NOT available
// add it like this:
// (1) <ReactRedux.Provider>
// (or 2) const Provider = ReactRedux.Provider;
// (or 3)
const {	Provider } = ReactRedux;



// ========= REACT =============================
// (1) mapStateToProps -------------------------
// Display has 
// - state: props.name, props.color (props: read-only)
const DisplayObj = (props) => <div style={{color:props.color}}>{props.name}</div>;
const mapStateToProps = (state) => {return {name: state.name, color: state.color}}
const Display = ReactRedux.connect(mapStateToProps)(DisplayObj)


// (2) mapDispatchToProps ----------------------
function mapDispatchToProps(dispatch) {
  return {
    setVal: (name, color) => dispatch({name:name, color:color, type:"SET"})
  };
}
class ButtonClass extends React.Component {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
  }
  handleChange(e) {
    const v = e.target.dataset.val.split(',');
    this.props.setVal(v[0], v[1]); // dispatch
  }
  
  render() {
    return ( <button data-val={['Green', '#00ff00']} onClick={this.handleChange}>{this.props.name}</button>);
  }
}
// Button has 
// - state: this.props.name, this.props.color (props: read-only)
// - dispatcher: this.props.setVal()
const Button = ReactRedux.connect(mapStateToProps, mapDispatchToProps)(ButtonClass);


// ======== REDUX ===============================
const defaultState = {
  name: "Red",  
  color: 'red'
}
const reducer = (state=defaultState, action) => {
  //const cState = Object.assign({}, state); // -> no deep copy!
  const cState = JSON.parse( JSON.stringify(state) );
  if(action.type=="SET") {
    cState.name = action.name;
    cState.color = action.color;
  }
  cl(cState);
  return cState;
}
const store = Redux.createStore(reducer);


// ======= main =============================
// Provider connects React with Redux store
ReactDOM.render(
	<Provider store={store}>
    <Display />
    <Button />
  </Provider>,
	document.getElementById('main')
);