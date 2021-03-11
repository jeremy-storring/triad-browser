import React, { Component } from 'react';
import { CHART_WIDTH, CHART_HEIGHT } from '../utils/chartConstants';
import { clearAndGetContext } from '../utils/canvasUtilities';
import _ from 'lodash';
import { schemeTableau10, scaleLinear } from 'd3';


export default class TriadStackedMap extends Component {

    componentDidMount() {
        const { genomeData = [], subGenomes = [], chromosomes = [] } = this.props;

        _.map(chromosomes, (chromosome, chromIndex) => {
            let subWidth = ChartScale(genomeData, chromosomes, chromIndex);
            this.drawChart(genomeData, subGenomes, chromosome, subWidth)
        })
    }

    componentDidUpdate() {
        const { genomeData = [], subGenomes = [], chromosomes = [], } = this.props;

        _.map(chromosomes, (chromosome, chromIndex) => {
            let subWidth = ChartScale(genomeData, chromosomes, chromIndex);
            this.drawChart(genomeData, subGenomes, chromosome, subWidth)
        })
    }

    chromosomeClick = (event) => {
        const chromosomeID = event.currentTarget.id.split('-')[1];
        this.props.onChromosomeChange(chromosomeID);
    }

    drawChart = (genomeData, subGenomes, chromosome, subWidth) => {

        let context = clearAndGetContext(this['canvas-' + chromosome]);

        let chartData = _.map(genomeData[chromosome], (dataPoint) => {

            let values = _.map(subGenomes, (d) => dataPoint[d]);

            return _.map(values, (d, i) => _.sum(values.slice(0, i + 1)));

        });

        let yMax = _.max(_.map(chartData, (d) => _.max(d)));

        let scaleFactor = CHART_HEIGHT / yMax;

        context.lineWidth = subWidth / genomeData[chromosome].length;

        _.map(chartData, (dataPoint, dataIndex) => {

            const scale = CreateScale(chartData, subWidth);
            const padding_from_left = scale(dataIndex);

            _.map(dataPoint, (d, stackIndex) => {
                context.beginPath();
                context.strokeStyle = schemeTableau10[stackIndex];
                context.moveTo(padding_from_left, CHART_HEIGHT - (stackIndex == 0 ? 0 : dataPoint[stackIndex - 1] * scaleFactor));
                context.lineTo(padding_from_left, CHART_HEIGHT - (dataPoint[stackIndex] * scaleFactor));
                context.stroke();
            })
        });
    }

    render() {
        const { genomeData = [], chromosomes = [], activeChromosome, } = this.props;

        const canvasList = _.map(chromosomes, (chrom, chromIndex) => {
            const subWidth = ChartScale(genomeData, chromosomes, chromIndex);
            return <div
                key={"canvas-" + chromIndex}
                id={'chromID-' + chrom}
                className={'genomemap-canvas-wrapper ' + (activeChromosome == chrom ? 'selected' : '')}
                onClick={this.chromosomeClick}>
                <canvas className='genomemap-canvas'
                    width={subWidth}
                    height={CHART_HEIGHT}
                    ref={(el) => { this['canvas-' + chrom] = el }} />
                <h3>{chrom}</h3>
            </div>
        });

        return (
            <div className='genomemap-container'>
                <h4 className='text-primary chart-title'>Genome</h4>
                {canvasList}
            </div>
        );
    }
}

function ChartScale(genomeData, chromosomes, chromIndex) {
    return Math.round((genomeData[chromosomes[chromIndex]].length / _.sum(_.map(genomeData, (genome) => genome.length)) * CHART_WIDTH));
}

function CreateScale(data, width) {
    return scaleLinear()
        .domain([0, data.length - 1])
        .range([0, width]);
}
