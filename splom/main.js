//instantiate tooltip
var toolTip = d3.tip()
    .attr("class", "d3-tip")
    .offset([-12, 0])
    .html(function (d) {
        return "<h5>" + d['state'] + "</h5>";
    });

var content = document.getElementById('main');

var svg = d3.select('svg');
svg.call(toolTip);

// Get layout parameters
var svgWidth = +svg.attr('width');
var svgHeight = +svg.attr('height');

var padding = { t: 40, r: 40, b: 40, l: 40 };
var cellPadding = 15;

// Create a group element for appending chart elements
var chartG = svg.append('g')
    .attr('transform', 'translate(' + [padding.l, padding.t] + ')');

// Format axis ticks
var formatAxis = d3.format('.2s');

var dataAttributes = ['total population', 'revenue', 'federal aid', 'outstanding debt',
    'per pupil salaries', 'per pupil employee benefits', 'average sat score', 'average act score',
    'act % students tested', 'IEP per 1000', 'youth substance abuse per 100', 'high school diploma %',
    'bachelor degree %', 'advanced degree %', 'school lunch students', 'school lunch reduced %',
    'local education grants', 'per pupil spending (pps)'];

var N = dataAttributes.length;

// Compute chart dimensions
var cellWidth = (svgWidth - padding.l - padding.r) / N;
var cellHeight = (svgHeight - padding.t - padding.b) / N;

// Global x and y scales to be used for all SplomCells
var xScale = d3.scaleLinear().range([0, cellWidth - cellPadding]);
var yScale = d3.scaleLinear().range([cellHeight - cellPadding, 0]);
// axes that are rendered already for you
var xAxis = d3.axisTop(xScale).tickFormat(formatAxis).ticks(5).tickSize(-cellHeight * N, 0, 0).tickPadding(7);;
var yAxis = d3.axisLeft(yScale).tickFormat(formatAxis).ticks(5).tickSize(-cellWidth * N, 0, 0).tickPadding(7);;
console.log(xAxis)
// Map for referencing min/max per each attribute
var extentByAttribute = {};
// Object for keeping state of which cell is currently being brushed
var brushCell;

// ****** Add reusable components here ****** //
function SplomCell(x, y, col, row) {
    this.x = x;
    this.y = y;
    this.col = col;
    this.row = row;
}

//instantiate brush object
var brush = d3.brush()
    .extent([[0, 0], [cellWidth - cellPadding, cellHeight - cellPadding]])
    .on("start", brushstart)
    .on("brush", brushmove)
    .on("end", brushend);


d3.csv('education.csv', dataPreprocessor).then(function (dataset) {
    // Create map for each attribute's extent
    dataAttributes.forEach(function (attribute) {
        extentByAttribute[attribute] = d3.extent(dataset, function (d) {
            return d[attribute];
        });
    });

    // Render gridlines and labels
    chartG.selectAll('.x.axis')
        .data(dataAttributes)
        .enter()
        .append('g')
        .attr('class', 'x axis')
        .attr('transform', function (d, i) {
            return 'translate(' + [(N - i - 1) * cellWidth + cellPadding / 2, 8] + ')';
        })
        .each(function (attribute) {
            xScale.domain(extentByAttribute[attribute]);
            d3.select(this).call(xAxis);
            var labelx = d3.select(this).append('text')
                .text(attribute)
                .attr('class', 'axis-label')
                .attr('transform', 'translate(' + [cellWidth / 2, -20] + ')');
        });

    chartG.selectAll('.y.axis')
        .data(dataAttributes)
        .enter()
        .append('g')
        .attr('class', 'y axis')
        .attr('transform', function (d, i) {
            return 'translate(' + [8, i * cellHeight + cellPadding / 2] + ')';
        })
        .each(function (attribute) {
            yScale.domain(extentByAttribute[attribute]);
            d3.select(this).call(yAxis);
            var labely = d3.select(this).append('text')
                .text(attribute)
                .attr('class', 'axis-label')
                .attr('transform', 'translate(' + [-30, cellHeight / 2] + ')rotate(270)');
        });

    // fixed scrolling
    content.addEventListener('scroll', function (evt) {
        labelx.node().setAttribute('x', 10 + this.scrollTop);
    }, false);
    content.addEventListener('scroll', function (evt) {
        labely.node().setAttribute('y', 10 + this.scrollLeft);
    }, false);

    // ********* data dependent code *********//
    var cells = [];
    dataAttributes.forEach(function (attrX, col) {
        dataAttributes.forEach(function (attrY, row) {
            cells.push(new SplomCell(attrX, attrY, col, row));
        });
    });

    //initialize
    SplomCell.prototype.init = function (g) {
        var cell = d3.select(g);

        cell.append('rect')
            .attr('class', 'frame')
            .attr('width', cellWidth - cellPadding)
            .attr('height', cellHeight - cellPadding);
    }

    //update cell based on incoming data
    SplomCell.prototype.update = function (g, data) {
        var cell = d3.select(g);

        // Update the global x,yScale objects for this cell's x,y attribute domains
        xScale.domain(extentByAttribute[this.x]);
        yScale.domain(extentByAttribute[this.y]);

        // Save a reference of this SplomCell, to use within anon function scopes
        var _this = this;

        var dots = cell.selectAll('.dot')
            .data(data, function (d) {
                return d.state + '-' + d.region; // Create a unique id for each state
            });

        var dotsEnter = dots.enter()
            .append('circle')
            .attr('class', 'dot')
            .attr('id', function (d) { return d.region; })
            .style("fill", function (d) {
                if (d.region === 'Northeast') {
                    return '#5bc0de';
                } else if (d.region === 'South') {
                    return '#d9534f';
                } else if (d.region === 'Midwest') {
                    return '#5cb85c';
                } else if (d.region === 'West') {
                    return '#800080';
                } else {
                    return '#ffffff';
                }
            })
            .attr('r', 4);

        dots.merge(dotsEnter)
            .attr('cx', function (d) {
                return xScale(d[_this.x]);
            })
            .attr('cy', function (d) {
                return yScale(d[_this.y]);
            });

        //tooltip
        dotsEnter.on('mouseover', toolTip.show)
            .on('mouseout', toolTip.hide);

        dots.exit().remove();
    }

    //drawing the cells
    var cellEnter = chartG.selectAll('.cell')
        .data(cells)
        .enter()
        .append('g')
        .attr('class', 'cell')
        .attr('transform', function (d) {
            // Start from the far right for columns to get a better looking chart
            var tx = (N - d.col - 1) * cellWidth + cellPadding / 2;
            var ty = d.row * cellHeight + cellPadding / 2;
            return "translate(" + [tx, ty] + ")";
        });

    cellEnter.append('g')
        .attr('class', 'brush')
        .call(brush);

    cellEnter.each(function (cell) {
        cell.init(this);
        cell.update(this, dataset);
    });
});

// *********Event listener functions go here *********//
function brushstart(cell) {
    // cell is the SplomCell object

    // Check if this g element is different than the previous brush
    if (brushCell !== this) {

        // Clear the old brush
        brush.move(d3.select(brushCell), null);

        // Update the global scales for the subsequent brushmove events
        xScale.domain(extentByAttribute[cell.x]);
        yScale.domain(extentByAttribute[cell.y]);

        // Save the state of this g element as having an active brush
        brushCell = this;
    }
}

function brushmove(cell) {
    // cell is the SplomCell object

    // Get the extent or bounding box of the brush event, this is a 2x2 array
    var e = d3.event.selection;
    if (e) {

        // Select all .dot circles, and add the "hidden" class if the data for that circle
        // lies outside of the brush-filter applied for this SplomCells x and y attributes
        svg.selectAll('.dot')
            .classed('hidden', function (d) {
                return e[0][0] > xScale(d[cell.x]) || xScale(d[cell.x]) > e[1][0]
                    || e[0][1] > yScale(d[cell.y]) || yScale(d[cell.y]) > e[1][1];
            })
    }
}

function brushend() {
    // If there is no longer an extent or bounding box then the brush has been removed
    if (!d3.event.selection) {
        // Bring back all hidden .dot elements
        svg.selectAll('.hidden').classed('hidden', false);
        // Return the state of the active brushCell to be undefined
        brushCell = undefined;
    }
}

function regionselect(region) {
    if (region === 'Reset') {
        svg.selectAll('.hidden').classed('hidden', false);
    } else {
        svg.selectAll('.hidden').classed('hidden', false);
        svg.selectAll('*:not(#' + region + ')').classed('hidden', true);
    }
}

// Remember code outside of the data callback function will run before the data loads

function dataPreprocessor(row) {

    return {
        'state': row['State'],
        'region': row['Region'],
        'total population': parseFloat(row['total_population'].replace(/,/g, '')),
        'revenue': parseFloat(row['total_revenue'].replace(/,/g, '')),
        'federal aid': parseFloat(row['total_federal_aid'].replace(/,/g, '')),
        'outstanding debt': parseFloat(row['outstanding_debt'].replace(/,/g, '')),
        'per pupil salaries': parseFloat(row['per_pupil_salaries'].replace(/,/g, '')),
        'per pupil employee benefits': parseFloat(row['per_pupil_employee_benefits'].replace(/,/g, '')),
        'average sat score': parseFloat(row['sat_average_score'].replace(/,/g, '')),
        'average act score': parseFloat(row['avg_act_composite_score'].replace(/,/g, '')),
        'act % students tested': parseFloat(row['act_percent_students_tested'].replace(/,/g, '')),
        'IEP per 1000': parseFloat(row['IEP_per_1000'].replace(/,/g, '')),
        'youth substance abuse per 100': parseFloat(row['youth_substance_use_per_100'].replace(/,/g, '')),
        'high school diploma %': parseFloat(row['educational_attainment_hs_plus'].replace(/,/g, '')),
        'bachelor degree %': parseFloat(row['educational_attainment_bachelor_plus'].replace(/,/g, '')),
        'advanced degree %': parseFloat(row['educational_attainment_advanced_degree_plus'].replace(/,/g, '')),
        'school lunch students': parseFloat(row['school_lunches_num_students_enrolled'].replace(/,/g, '')),
        'school lunch reduced %': parseFloat(row['school_lunches_percent_students_free_lunch'].replace(/,/g, '')),
        'local education grants': parseFloat(row['local_educational_grants'].replace(/,/g, '')),
        'per pupil spending (pps)': parseFloat(row['adjusted_perpupil_spending'].replace(/,/g, ''))
    };
}