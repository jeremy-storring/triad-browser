/*global $*/
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Container } from './components';
import ChromosomePage from './pages/ChromosomePage';
import GenomePage from './pages/GenomePage';
import configureStore from './redux/store/configureStore';
import { Provider } from 'react-redux';
import { Router, Route, IndexRoute, hashHistory } from 'react-router';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import './utils/collaborate';


//Root sass file for webpack to compile
import './sass/main.scss';

//Initial Default settings 
const store = configureStore();


class App extends Component {

  render() {
    return (
      <Provider store={store}>
        <Router history={hashHistory}>
          <Route path='/' component={Container}>
            <IndexRoute component={ChromosomePage} />
            <Route path='genome-view' component={GenomePage} />
          </Route>
        </Router>
      </Provider>
    )
  }
}

ReactDOM.render(<App />, document.getElementById('triad-browser-mount'));

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators({
      setGenomeData,
      setGenomeDataThreshold,
      setChromosomeData,
      setDefaultDataChromosome,
      setActiveSubGenome,
    }, dispatch)
  };
}

function mapStateToProps(state) {
  return {
    // fill in with props that you need to read from state
    genomeData: state.genome.genomeData,
    chromosomeData: state.genome.chromosomeData,
    geneData: state.genome.geneData,
    activeSubGenome: state.oracle.activeSubGenome,
    activeChromosome: state.oracle.activeChromosome,
    isTooltipVisible: state.oracle.isTooltipVisible,
    tooltipData: state.oracle.tooltipData,
    region: state.oracle.region
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(App);


