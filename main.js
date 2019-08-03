
dc.config.defaultColors(d3.schemeCategory20c);

var
    partnerNd = dc.numberDisplay("#dc-partner-nd"),
    individualNd = dc.numberDisplay("#dc-individual-nd"),
    householdNd = dc.numberDisplay("#dc-household-nd"),
    targetNd = dc.numberDisplay("#dc-target-nd"),
    partnerSelect = dc.selectMenu("#dc-partner-select"),
    organSelect = dc.selectMenu("#dc-organ-select"),
    donorSelect = dc.selectMenu("#dc-donor-select"),
    locationSelect = dc.selectMenu("#dc-location-select");

var demoBarStack = dc.barChart("#dc-demo-bar-stack");
var modalityRow = dc.rowChart("#dc-modality-row");
var ruralUrbanRow = dc.rowChart("#dc-rural-urban-row");
var crisisRow = dc.rowChart("#dc-crisis-row");
var programRow = dc.rowChart("#dc-program-row");
var statusRow = dc.rowChart("#dc-status-row");
var benefBarStack = dc.barChart("#dc-benef-bar-stack");
var monthBar = dc.barChart("#dc-month-bar");
var regionMap = dc.geoChoroplethChart("#dc-region-map");
var districtMap = dc.geoChoroplethChart("#dc-district-map");
var programBenefHeat = dc.heatMap("#dc-program-benef-heat");

var dateParse = d3.timeParse("%d-%m-%Y");
var dateFormat = d3.timeFormat("%d/%m/%Y");
var dateLongFormat = d3.timeFormat("%Y-%m-%d");
// Correct end date due to month rounding off 
// by adding or deducting a day
var dayOffset = d3.timeDay.offset;
var monthOffset = d3.timeMonth.offset;

var ndx; // crossfilter global variable 

var 
    parseHash,
    parsed;

// URL filters utilities:
// prototyped array function that returns an array with unique values
// from any that contains duplicate values, referred to in the 
// valueAccessor below
Array.prototype.unique = function () {
    return this.filter(function (value, index, self) {
        return self.indexOf(value) === index;
    });
}

// sets ranged filters for monthly bar chart
var resetFilter = function (filterValues) {
    if (filterValues.length == 0) return filterValues;

    var start = filterValues[0][0];
    var end = dayOffset(filterValues[0][1], -1);

    var filter = dc.filters.RangedFilter(dateLongFormat(start), dateLongFormat(end));
    return filter;
}

// divides a long odd number array into one array with multiple subarrays
// each subarray is of length size(2) for two dimensional filters
function chunk(array, size) {
    const chunked_arr = [];
    let index = 0;
    while (index < array.length) {
        chunked_arr.push(array.slice(index, size + index));
        index += size; 
    }
    return chunked_arr;
}

// Implement bookmarking chart filters status 
// Serializing filters values in URL
function getFiltersValues() {
    var filters = [
        { name: 'st', value: statusRow.filters() }, //1
        { name: 'pt', value: modalityRow.filters() }, // 2
        { name: 'pn', value: partnerSelect.filters() }, //3
        { name: 'mo', value: resetFilter(monthBar.filters()) }, //7
        { name: 'rs', value: crisisRow.filters() }, //8
        { name: 'pl', value: benefBarStack.filters() }, //9
        { name: 'rg', value: programRow.filters() }, //12
        { name: 'rp', value: programBenefHeat.filters() }, //13
        { name: 'do', value: donorSelect.filters() }, //14
        { name: 'rm', value: regionMap.filters() }, //18
        { name: 'dm', value: districtMap.filters() }, //19
        { name: 'q', value: 'q' } // 29

    ];
    // console.log(filters[23]);
    var recursiveEncoded = $.param(filters);
    location.hash = recursiveEncoded;
}

function initFilters() {

    function filter(chart, rank) {  // for instance chart = sector_chart and rank in URL hash = 1

        // sector chart
        if (parsed[rank] == "") {
            chart.filter(null);
        } else if (rank == 7) {
            var filterValues = parsed[rank].split(",");

            var start = new Date(filterValues[0]);
            var end = new Date(filterValues[1]);

            // initialize date to midnight
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);

            var filter = dc.filters.RangedFilter(start, dayOffset(end, 1));
            // var filter = dc.filters.RangedFilter(new Date(2017,2,1), new Date(2017,2,31));              
            chart.filter(filter);
        } else if (rank == 13) {
            var filterValues = parsed[rank].split(",");
            var chunkValues = chunk(filterValues, 2);

            for (var i = 0; i < chunkValues.length; i++) {
                var filter = dc.filters.TwoDimensionalFilter(chunkValues[i]);
                chart.filter(filter);
            }
           
        } else {
            var filterValues = parsed[rank].split(",");
            for (var i = 0; i < filterValues.length; i++) {
                chart.filter(filterValues[i]);
            }
        }
    }
    // debugger;
    if (parsed) {
        filter(statusRow, 1);
        filter(modalityRow, 2);
        filter(partnerSelect, 3);
        filter(monthBar, 7);
        filter(crisisRow, 8);
        filter(benefBarStack, 9);
        filter(programRow, 12);
        filter(programBenefHeat, 13);
        filter(donorSelect, 14);
        filter(regionMap, 18);
        filter(districtMap, 19);
        // no q filter 
    }

}

// get maximum value of an array property in an object
function arr_max_val(t) {
    //var arr = Object.values(t); // experimental function not being supported in IE
    var arr = Object.keys(t).map(function (itm) { return t[itm]; });
    return arr.reduce(function (a, b) {
        // if array `b` is empty return `a`, 
        // otherwise return max value of `b`
        return (b.length == 0) ? a : a + d3.max(b);
    }, 0);
}
// returns extents (min and max values) of CSV 'Year' field
function rangeDate(data) {
    // var yr = d3.max(data, function (d) {
    //     return +d.EndYear;
    // });
    var yr = 2019;
    var rng = [new Date(yr, 0, 1), new Date(yr + 1, 0, 31)];
    return rng;
}
// loads CSV file based the button clicked
function load_button(file) {
    dc.filterAll(); // removes all filters prior to replacing data source
    render_plots(file); // renders plots based on selected file
}

// d3.selectAll('#select-year input')
//     .on('click', function () {
//         yearFilter = this.value;
//         getFiltersValues();
//         parsed = parseHash.exec(decodeURIComponent(location.hash));
//         load_button('api/dashboard/online_' + yearFilter + '.php'),
//             dc.redrawAll();
//     });

// loader settings
var target = document.getElementById('dc-partner-nd');


// check url filter to determine which year's dataset to load
// regExp accepts special characters
parseHash = /^#st=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&pt=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&pn=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&ig=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&iu=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&rf=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&mo=([\d{4}-\d{2}-\d{2},\d{4}-\d{2}-\d{2}]*)&rs=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&pl=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&it=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&fc=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&rg=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&rp=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&do=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&cc=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&of=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&fn=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&rm=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&dm=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&t1=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&t2=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&t3=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&ob=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&op=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&pi=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&se=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&yr=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&tab=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&q=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)$/;
parsed = parseHash.exec(decodeURIComponent(location.hash));

// load csv data
d3.csv('data/dataset.csv', function (error, data) {
    // load region JSON file
    d3.json("data/Som_Admbnda_Adm1_UNDP.json", function (regionJson) {
        // load district JSON file
        d3.json("data/Som_Admbnda_Adm2_UNDP.json", function (districtJson) {

            // format data
            data.forEach(function (d) {
                d.Individuals = +d.Individuals
                d.Households = +d.Households
                d.Boys = +d.Boys
                d.Girls = +d.Girls
                d.Women = +d.Women
                d.Men = +d.Men
                d.Target = +d.Target
                d.StartMonth = dateParse(d.StartMonth);
                d.EndMonth = dateParse(d.EndMonth);
                d.Month = d3.timeMonth(d.EndMonth);
            });

            $("#last-updated").html("as at " + dateFormat(Date.now()));

            // attach data to crossfilter
            var ndx = crossfilter(data);

            // partners
            // reduce function returns an object with unique partner acronyms
            // as object keys and # of partner occurences as object values

            var partnerNdGroup = ndx.groupAll().reduce(
                function (p, v) { //add
                    if (p[v.IP]) {
                        p[v.IP]++;
                    } else {
                        p[v.IP] = 1;
                    }
                    return p;
                },
                function (p, v) { //remove
                    p[v.IP]--;
                    if (p[v.IP] === 0) {
                        delete p[v.IP];
                    }
                    return p;
                },
                function () { //init
                    //initial p - only one since using groupAll
                    return {};
                }
            );

            partnerNd
                .group(partnerNdGroup)
                .valueAccessor(function (d) {
                    return Object.keys(d).length;
                })
                .formatNumber(d3.format(","));
            partnerNd.render();

            var targetNdGroup = ndx.groupAll().reduceSum(function (d) {
                return d.Target;
            });

            targetNd
                .group(targetNdGroup)
                .valueAccessor(function (d) {
                    return d;
                })
                .formatNumber(d3.format(","));

            targetNd.render();

            var individualNdGroup = ndx.groupAll().reduceSum(function (d) {
                return d.Individuals;
            });

            individualNd
                .group(individualNdGroup)
                .valueAccessor(function (d) {
                    return d;
                })
                .formatNumber(d3.format(","));

            individualNd.render();

            var householdNdGroup = ndx.groupAll().reduceSum(function (d) {
                return d.Households;
            });

            householdNd
                .group(householdNdGroup)
                .valueAccessor(function (d) {
                    return d;
                })
                .formatNumber(d3.format(","));

            householdNd.render();


            var 
                donorDim = ndx.dimension(function (d) { return d.Donor }),
                partnerDim = ndx.dimension(function (d) { return d.IP }),
                organDim = ndx.dimension(function (d) { return d.Organisation }),
                locationDim = ndx.dimension(function (d) { return d.Location });

            donorSelect
                .dimension(donorDim)
                .group(donorDim.group())
                .multiple(true)
                // .numberVisible(15)
                .controlsUseVisibility(true)
                .on("filtered", getFiltersValues)
                .title(function (d) {
                    return d.key;
                })
                ;
            donorSelect.render();

            partnerSelect
                // .width(100)
                // .height(100)
                .dimension(partnerDim)
                .group(partnerDim.group())
                .multiple(true)
                // .numberVisible(14)
                .controlsUseVisibility(true)
                .on("filtered", getFiltersValues)
                .title(function (d) {
                    return d.key;
                })
                ;
            partnerSelect.render();

            organSelect
                // .width(100)
                // .height(100)
                .dimension(organDim)
                .group(organDim.group())
                .multiple(true)
                // .numberVisible(14)
                .controlsUseVisibility(true)
                .on("filtered", getFiltersValues)
                .title(function (d) {
                    return d.key;
                })
                ;
            organSelect.render();

            locationSelect
                // .width(100)
                // .height(100)
                .dimension(locationDim)
                .group(locationDim.group())
                .multiple(true)
                // .numberVisible(14)
                .controlsUseVisibility(true)
                .on("filtered", getFiltersValues)
                .title(function (d) {
                    return d.key;
                })
                ;
            locationSelect.render();


            // demographic stacked bar chart
            var demoDim = ndx.dimension(function (d) {
                return "Age/Gender";
            });
            var demoGroup = demoDim.group().reduce(
                function (p, v) {
                    p.boys += +v.Boys;
                    p.girls += +v.Girls;
                    p.women += +v.Women;
                    p.men += +v.Men;
                    p.individuals += +v.Individuals;

                    return p;
                },
                function (p, v) {
                    p.boys -= +v.Boys;
                    p.girls -= +v.Girls;
                    p.women -= +v.Women;
                    p.men -= +v.Men;
                    p.individuals -= +v.Individuals;

                    return p;
                },
                function () {
                    return { boys: 0, girls: 0, women: 0, men: 0, individuals: 0 };
                }
            );
            demoBarStack
                .width(160)
                .height(110)
                .margins({ top: 7, right: 10, bottom:20, left: 80 })
                .dimension(demoDim)
                .group(demoGroup, "Girls")
                .valueAccessor(function (d) {
                    return d.value.girls / d.value.individuals;
                })
                .stack(demoGroup, "Boys", function (d) {
                    return d.value.boys / d.value.individuals;
                })
                .stack(demoGroup, "Women", function (d) {
                    return d.value.women / d.value.individuals;
                })
                .stack(demoGroup, "Men", function (d) {
                    return d.value.men / d.value.individuals;
                })
                .title("Men", function (d) {
                    return "Men: " + d3.format(".0%")(d.value.men / d.value.individuals);
                })
                .title("Women", function (d) {
                    return "Women: " + d3.format(".0%")(d.value.women / d.value.individuals);
                })
                .title("Boys", function (d) {
                    return "Boys: " + d3.format(".0%")(d.value.boys / d.value.individuals);
                })
                .title("Girls", function (d) {
                    return "Girls: " + d3.format(".0%")(d.value.girls / d.value.individuals);
                })
                .controlsUseVisibility(true)
                .gap(20)
                .barPadding(0.001)
                .ordinalColors(['#525252', '#969696', '#b7b7b7', '#dadada'])
                //.ordinalColors(colorbrewer.GnBu[4])
                .renderHorizontalGridLines(true)
                .x(d3.scaleBand())
                .xUnits(dc.units.ordinal)
                .yAxis().tickFormat(function (v) {
                    return d3.format(".0%")(v);
                })

            demoBarStack.yAxis().ticks(3);

            demoBarStack.render();

            // rural urban row chart
            var ruralUrbanDim = ndx.dimension(function (d) {
                return d.RuralUrban;
            });

            var ruralUrbanGroup = ruralUrbanDim.group().reduceSum(function (d) {
                return d.Individuals;
            });

            ruralUrbanRow
                .width(155)
                .height(110)
                .margins({ top: 5, right: 0, bottom: 20, left: 5 })
                .dimension(ruralUrbanDim)
                .group(ruralUrbanGroup)
                .ordinalColors(["#41b6c4"])
                .on("filtered", getFiltersValues)
                .title(function (d) {
                    return d.key + ": " + d3.format(",")(d.value)
                })
                .controlsUseVisibility(true)
                .gap(2)
                .elasticX(true)
                .xAxis().ticks(3);

            ruralUrbanRow.xAxis().tickFormat(function (v) {
                return d3.format(".1s")(v);
            });
            ruralUrbanRow.render();

            // crisis row chart
            var crisisDim = ndx.dimension(function (d) {
                return d.Crisis;
            });

            var crisisGroup = crisisDim.group().reduceSum(function (d) {
                return d.Individuals;
            });

            crisisRow
                .width(160)
                .height(220)
                .margins({ top: 5, right: 10, bottom: 20, left: 5 })
                .dimension(crisisDim)
                .group(crisisGroup)
                .ordinalColors(["#41b6c4"])
                .on("filtered", getFiltersValues)
                .title(function (d) {
                    return d.key + ": " + d3.format(",")(d.value)
                })
                .controlsUseVisibility(true)
                .gap(2)
                .elasticX(true)
                .xAxis().ticks(3);

            crisisRow.xAxis().tickFormat(function (v) {
                return d3.format(".1s")(v);
            });
            crisisRow.render();

            // programme row chart
            var programDim = ndx.dimension(function (d) {
                return d.Programme;
            });
            var programGroup = programDim.group().reduceSum(function (d) {
                return d.Individuals;
            });
            programRow
                .width(210)
                .height(220)
                .margins({ top: 5, right: 10, bottom: 20, left: 5 })
                .dimension(programDim)
                .group(programGroup)
                .ordinalColors(["#41b6c4"])
                .on("filtered", getFiltersValues)
                .title(function (d) {
                    return d.key + ": " + d3.format(",")(d.value)
                })
                .controlsUseVisibility(true)
                .gap(2)
                .elasticX(true)
                .xAxis().ticks(3);
            programRow.xAxis().tickFormat(function (v) {
                return d3.format(".1s")(v);
            });
            programRow.render();

            // rights group and Pillar heatmap        
            var programBenefDim = ndx.dimension(function (d) {
                return [d.BeneficiaryType, d.Programme];
            });
            var programBenefGroup = programBenefDim.group().reduceSum(function (d) {
                return d.Individuals;
            });
            programBenefHeat
                .width(345)
                .height(225)
                .margins({ top: 5, right: 30, bottom: 20, left: 180 })
                .dimension(programBenefDim)
                .group(programBenefGroup)
                .keyAccessor(function (d) { return d.key[0]; })
                .valueAccessor(function (d) { return d.key[1]; })
                .colorAccessor(function (d) { return +d.value; })
                .on("filtered", getFiltersValues)
                .title(function (d) {
                    return d.key[1] + "\n" +
                        d.key[0] + ": " + d3.format(",")(d.value);
                })
                // .colors(["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58"])
                .colors(["#ddfdff", "#b9e9ec", "#a3deeb", "#93d3e9", "#86c5e5", "#7bb9e1", "#71acdb", "#68a1d5", "#6094cd", "#5888c5", "#517dba", "#4a71b0", "#4466a3", "#3e5b96", "#385188"])
                .colorCalculator(function (d) {
                    return d.value !== 0 ? programBenefHeat.colors()(d.value) : '#ccc';
                })
                .calculateColorDomain()
                .controlsUseVisibility(true);

            programBenefHeat.on("preRedraw", function (chart) {
                chart.calculateColorDomain();
            })

            programBenefHeat.render();

            // monthly reached bar charts
            monthDim = ndx.dimension(function (d) {
                return d.EndMonth;
            });

            monthGroup = monthDim.group().reduceSum(function (d) {
                return d.Individuals;
            });

            monthBar
                .width(340)
                .height(110)
                .margins({ top: 10, right: -13, bottom: 20, left: 30 })
                .dimension(monthDim)
                .group(monthGroup)
                .valueAccessor(function (d) {
                    // return d.value;
                    return Math.round(d.value * 100) / 100
                })
                .gap(1)
                .ordinalColors(['#41b6c4'])
                //.centerBar(true)
                .renderHorizontalGridLines(true)
                .controlsUseVisibility(true)
                .x(d3.scaleTime().domain(rangeDate(data)))
                .xUnits(d3.timeMonths)
                .round(d3.timeMonth)
                .brushOn(true)
                //.clipPadding(10) // function not clear
                .elasticY(true)
                .on("filtered", getFiltersValues)
                .title(function (d) {
                    return d3.timeFormat("%b")(d.key) + ": " + d3.format(",")(d.value);
                })
                .yAxis().tickFormat(function (v) {
                    return d3.format(".1s")(v);
                }).ticks(5);
            
            monthBar.xAxis().tickFormat(function (v) {
                return d3.timeFormat("%b")(v)
            });

            monthBar.on('renderlet', function (chart) {
                chart.selectAll("g.axis.x")
                    .attr('transform', "translate(45,90)");
                chart.selectAll("g.chart-body")
                    .attr('transform', "translate(7,10)");
            });

            monthBar.filterPrinter(function (filters) {
                var start = filters[0][0];
                var end = dayOffset(filters[0][1], -1);    // correct month rounding off 
                return "[" + dateFormat(start) + ' - ' + dateFormat(end) + "]";
            });

            monthBar.render();

            // region reached map
            var regionDim = ndx.dimension(function (d) {
                return d.RegionMap;
            });

            var regionGroup = regionDim.group().reduceSum(function (d) {
                return d.Individuals;
            });

            regionMap
                .width(280)
                .height(330)
                .transitionDuration(1000)
                .dimension(regionDim)
                .group(regionGroup)
                .projection(d3.geoMercator()
                    .scale(1340)
                    .translate([-950, 285])
                )
                .keyAccessor(function (d) { return d.key; })
                .valueAccessor(function (d) { return d.value; })
                .controlsUseVisibility(true)
                // .colors(['#ccc'].concat(colorbrewer.Blues[9])) 
                .colors(d3.scaleQuantize().range(["#ddfdff", "#b9e9ec", "#a3deeb", "#93d3e9", "#86c5e5", "#7bb9e1", "#71acdb", "#68a1d5", "#6094cd", "#5888c5", "#517dba", "#4a71b0", "#4466a3", "#3e5b96", "#385188"]))
                .colorDomain([0, regionGroup.top(1)[0].value / 2])
                .colorCalculator(function (d) { return d ? regionMap.colors()(d) : '#ccc'; })
                .overlayGeoJson(regionJson.features, "admin2Name", function (d) {
                    // console.log(d.properties.admin1Name);
                    return d.properties.admin1Name;
                })
                .on("filtered", getFiltersValues)
                .title(function (d) {
                    return d.key + ": " + d3.format(",")(d.value);
                });

            regionMap.on("preRender", function (chart) {
                chart.colorDomain(d3.extent(chart.group().all(), chart.valueAccessor()));
            });
            regionMap.on("preRedraw", function (chart) {
                chart.colorDomain(d3.extent(chart.group().all(), chart.valueAccessor()));
            });

            regionMap.render();

            // district reached map
            var districtDim = ndx.dimension(function (d) {
                return d.DistrictMap;
            });

            var districtGroup = districtDim.group().reduceSum(function (d) {
                return d.Individuals;
            });

            districtMap
                .width(280)
                .height(330)
                .transitionDuration(1000)
                .dimension(districtDim)
                .group(districtGroup)
                .projection(d3.geoMercator()
                    .scale(1340)
                    .translate([-950, 285])
                )
                .keyAccessor(function (d) { return d.key; })
                .valueAccessor(function (d) { return d.value; })
                .controlsUseVisibility(true)
                // .colors(['#ccc'].concat(colorbrewer.Blues[9])) 
                .colors(d3.scaleQuantize().range(["#ddfdff", "#b9e9ec", "#a3deeb", "#93d3e9", "#86c5e5", "#7bb9e1", "#71acdb", "#68a1d5", "#6094cd", "#5888c5", "#517dba", "#4a71b0", "#4466a3", "#3e5b96", "#385188"]))
                .colorDomain([0, districtGroup.top(1)[0].value / 2])
                .colorCalculator(function (d) { return d ? districtMap.colors()(d) : '#ccc'; })
                .overlayGeoJson(districtJson.features, "admin2Name", function (d) {
                    // console.log(d.properties.admin2Name);
                    return d.properties.admin2Name;
                })
                .on("filtered", getFiltersValues)
                .title(function (d) {
                    return d.key + ": " + d3.format(",")(d.value);
                });

            districtMap.on("preRender", function (chart) {
                chart.colorDomain(d3.extent(chart.group().all(), chart.valueAccessor()));
            });
            districtMap.on("preRedraw", function (chart) {
                chart.colorDomain(d3.extent(chart.group().all(), chart.valueAccessor()));
            })

            districtMap.render();

            // reach vs target stacked bar chart 
            var benefDim = ndx.dimension(function (d) {
                return d.BeneficiaryType;
            });

            var benefGroup = benefDim.group().reduce(
                function (p, v) {
                    // if (p.TARGET[v["RightsDistrict"]]) {
                    //     p.TARGET[v["RightsDistrict"]].push(v["Target"]);
                    // } else {
                    //     p.TARGET[v["RightsDistrict"]] = [v["Target"]];
                    // }
                    p.INDIVIDUALS += +v.Individuals;
                    return p;
                },
                function (p, v) {
                    // var index = p.TARGET[v["RightsDistrict"]].indexOf(v["Target"]);
                    // if (index > -1) {
                    //     p.TARGET[v["RightsDistrict"]].splice(index, 1);
                    // }
                    p.INDIVIDUALS -= +v.Individuals;
                    return p;
                },
                function () {
                    return {
                        // TARGET: {},
                        INDIVIDUALS: 0
                    };
                }
            );

            benefBarStack
                .width(200)
                .height(110)
                .margins({ top: 5, right: 30, bottom: 20, left: 40 })
                .dimension(benefDim)
                .group(benefGroup, "INDIVIDUALS")
                .valueAccessor(function (d) {
                    return d.value.INDIVIDUALS;
                })
                // .stack(benefGroup, "TARGETED", function (d) {
                //     var r = arr_max_val(d.value.TARGET) - d.value.REACH;
                //     return r < 0 ? 0 : r;
                // })
                .title("INDIVIDUALS", function (d) {
                    return d.key + ": " + d3.format(",")(d.value.INDIVIDUALS);
                })
                // .title("TARGETED", function (d) {
                //     return d.key + " Targeted: " + d3.format(",")(arr_max_val(d.value.TARGET));
                // })
                .gap(2)
                .ordinalColors(['#3182bd', '#d3e4facc'])
                .renderHorizontalGridLines(true)
                .controlsUseVisibility(true)
                .x(d3.scaleBand())
                .xUnits(dc.units.ordinal)
                .elasticY(true)
                .yAxis().tickFormat(function (v) {
                    return d3.format(".1s")(v);
                });

            benefBarStack.yAxis().ticks(4)
            benefBarStack.render();

  
            // status row chart
            var statusDim = ndx.dimension(function (d) {
                return d.Status;
            });
            var statusGroup = statusDim.group().reduceSum(function (d) {
                return d.Individuals;
            });
            statusRow
                .width(155)
                .height(60)
                .margins({ top: 5, right: 0, bottom: 0, left: 5 })
                .dimension(statusDim)
                .group(statusGroup)
                .ordinalColors(["#41b6c4"])
                .on("filtered", getFiltersValues)
                .title(function (d) {
                    return d.key + ": " + d3.format(",.0f")(d.value)
                })
                .controlsUseVisibility(true)
                .gap(2)
                .elasticX(true)
                .xAxis().ticks(3);
            statusRow.xAxis().tickFormat(function (v) {
                return d3.format(".1s")(v);
            });
            statusRow.render();

            // modality barchart
            var modalityDim = ndx.dimension(function (d) {
                return d.Modality;
            });

            var modalityGroup = modalityDim.group().reduceSum(
                function (d) {
                    return d.Individuals;
                });

            modalityRow
                .width(155)
                .height(40)
                .margins({ top: 5, right: 0, bottom: 0, left: 5 })
                .dimension(modalityDim)
                .group(modalityGroup)
                .ordinalColors(["#41b6c4"])
                .on("filtered", getFiltersValues)
                .title(function (d) {
                    return d.key + ": " + d3.format(",.0f")(d.value);
                })
                .controlsUseVisibility(true)
                .gap(2)
                .elasticX(true)
                .xAxis().ticks(3);

            modalityRow.xAxis().tickFormat(function (v) {
                return d3.format(".1s")(v);
            });

            modalityRow.render();

            dc.renderAll();

            // initFilters();

            dc.redrawAll();

            rangeDate(data);
            
        });   /* district json */
    }); /* region json */

});





