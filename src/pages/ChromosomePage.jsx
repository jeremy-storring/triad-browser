import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import Loader from 'react-loading';
import { getFile } from '../utils/fetchData';
import _ from 'lodash';
import { ChromosomeMap, SubRegionMap, FilterPanel, TriadGenomeMap, Tooltip, GeneRefMap } from '../components';
import { scaleLinear } from 'd3';
import { CHART_WIDTH } from '../utils/chartConstants';
import { setGenomeData, setChromosomeData, setDefaultDataChromosome, setRegion, setGenomeDataThreshold, setActiveSubGenome} from '../redux/actions/actions';


class ChromosomePage extends Component {

    constructor(props) {
        super(props)
        this.state = {
            loader: false,
            hideChromosome: false,
            subGenomes: [],
            chromosomes: [],
        }
    }

    onSubGenomeChange = (event) => {
        this.props.actions.setGenomeData(event.value, this.props.activeChromosome);
    }

    onSubGenomeChangeThreshold = () => {
        let SG1Value = parseFloat(document.getElementById("sortingPercent").value.slice(0, -1));
        let SG2Value = parseFloat(document.getElementById("sortingPercent2").value.slice(0, -1));
        let SG3Value = parseFloat(document.getElementById("sortingPercent3").value.slice(0, -1));
        let SubGenomeThreshold = { "SG1": SG1Value, "SG2": SG2Value, "SG3": SG3Value };

        this.props.actions.setGenomeDataThreshold(SubGenomeThreshold, this.props.activeChromosome);
    }

    onChromosomeChange = (activeChromosome) => {
        this.props.actions.setChromosomeData(activeChromosome, this.props.genomeData);
    }

    componentDidMount() {

        let { activeSubGenome, activeChromosome, actions } = this.props;

        let geneData = [];
        // Turn loader onON
        this.setState({ 'loader': true });

        getFile('data/AT_genes.gff')
            .then((geneFile) => {

                let lineData = geneFile.split('\n').slice(1).map((d) => d.split('\t'));

                geneData = _.groupBy(_.map(lineData, (d) => {
                    let coords = _.sortBy([+d[2], +d[3]]);
                    return {
                        'Chromosome': d[0],
                        'gene': d[1],
                        'start': coords[0],
                        'end': coords[1]
                    };
                    // group the array by Chromosome
                }), (e) => e.Chromosome);
                return getFile('data/AT.txt');
            })
            .then((rawData) => {
                // processing the data
                let lineArray = rawData.split("\n");
                let columns = lineArray.slice(0, 1)[0].trim().split('\t'),
                    records = lineArray.slice(1)
                        .map((d) => {
                            let lineData = d.split('\t'), tempStore = {};
                            columns.map((columnName, columnIndex) => {
                                // typecast to number 
                                tempStore[columnName] = columnIndex == 0 ? lineData[columnIndex] : +lineData[columnIndex];
                            })
                            // TODO deal with +10 chromosomes
                            tempStore['activeChromosome'] = lineData[0].slice(0, 3);
                            return tempStore;
                        });

                actions.setActiveSubGenome("N/A");
                activeSubGenome = "N/A";

                let genomeData = _.groupBy(records, (d) => d.activeChromosome);
                let originalGenomeData = _.cloneDeep(genomeData);

                // Get the chromosome names and put into array
                let chromosomes = _.sortBy(Object.keys(genomeData));

                // Sort each array of chromosomes by the active subGenome
                _.map(chromosomes, (chromosome) => {
                    genomeData[chromosome] = _.sortBy(genomeData[chromosome], (d) => d[activeSubGenome])
                })

                // sort the data by the default set sort key
                let chromosomeData = _.sortBy(genomeData[activeChromosome], (d) => d[activeSubGenome]);
                let originalChromosomeData = _.cloneDeep(chromosomeData);

                let subGenomes = [...columns.slice(1)]

                // Dumping original data to window so that it can be used later on
                window.triadBrowserStore = { 'chromosomeData': originalChromosomeData, 'genomeData': originalGenomeData };

                const chartScale = scaleLinear()
                    .domain([0, chromosomeData.length - 1])
                    .range([0, CHART_WIDTH]);

                // want window to be 50px, take 25 on either side
                let genomeWindowRange = chartScale.invert(75);

                let centerPoint = chromosomeData.length / 2;

                let start = centerPoint - genomeWindowRange;
                let end = centerPoint + genomeWindowRange;

                actions.setDefaultDataChromosome(chromosomeData, genomeData, geneData, {start, end});

                // Set the data onto the state
                this.setState({ subGenomes, chromosomes });
            })
            .catch(() => {
                alert("Sorry there was an error in fetching and parsing the file");
                console.log('error');
            })
            .finally(() => { this.setState({ 'loader': false }) });

    }

    render() {

        const { genomeData, chromosomeData, isTooltipVisible, tooltipData, activeSubGenome, activeChromosome, region } = this.props;

        const { loader = false, chromosomes = [], subGenomes = [], hideChromosome = false } = this.state;

        const chartScale = scaleLinear()
            .domain([0, chromosomeData.length - 1])
            .range([0, CHART_WIDTH]);

        let { start, end } = region;

        if (end == 0) {
            end = Math.round(chartScale.invert(150));
        }

        const innerTriadData = chromosomeData.slice(start, end);
        const innerChartScale = scaleLinear()
            .domain([0, innerTriadData.length - 1])
            .range([0, CHART_WIDTH]);

        // set the dimensions of the graph
        return (
            <div className='dashboard-root container-fluid'>
                {loader ?
                    <Loader className='loading-spinner' type='spin' height='100px' width='100px' color='#d6e5ff' delay={- 1} /> :
                    <div className='dashboard-inner-root text-center'>
                        {/* <FilterPanel
                            activeSubGenome={activeSubGenome}
                            subGenomes={subGenomes}
                            onSubGenomeChange={this.onSubGenomeChange}
                            onSubGenomeChangeThreshold={this.onSubGenomeChangeThreshold} /> */}
                        {chromosomeData.length > 0 ?
                            <div className='m-t-lg'>
                                {/* code chunk to show tooltip*/}
                                {isTooltipVisible && <Tooltip {...tooltipData} />}
                                {/* <TriadGenomeMap
                                    genomeData={genomeData}
                                    subGenomes={subGenomes}
                                    chartScale={chartScale}
                                    chromosomes={chromosomes}
                                    onChromosomeChange={this.onChromosomeChange} /> */}
                                <ChromosomeMap
                                    subGenomes={subGenomes}
                                    hideChromosome={hideChromosome}
                                    activeChromosome={activeChromosome}
                                    chromosomeData={chromosomeData}
                                    chartScale={chartScale} />
                                {/* <SubRegionMap
                                    subGenomes={subGenomes}
                                    hideChromosome={hideChromosome}
                                    activeChromosome={activeChromosome}
                                    subRegionData={innerTriadData}
                                    chartScale={innerChartScale}/>
                                <GeneRefMap /> */}
                            </div>
                            : <h2>Sorry the data file is empty.</h2>}
                    </div>}

            </div>
        );
    }
}

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

export default connect(mapStateToProps, mapDispatchToProps)(ChromosomePage);



