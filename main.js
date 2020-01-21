
dc.config.defaultColors(d3.schemeCategory20c);

var
    partnerNd = dc.numberDisplay("#dc-partner-nd"),
    individualNd = dc.numberDisplay("#dc-individual-nd"),
    householdNd = dc.numberDisplay("#dc-household-nd"),
    targetNd = dc.numberDisplay("#dc-target-nd"),
    pinNd = dc.numberDisplay("#dc-pin-nd"),
    ipNd = dc.numberDisplay("#dc-ip-nd"),
    donorNd = dc.numberDisplay("#dc-donor-nd"),
    partnerSelect = dc.selectMenu("#dc-partner-select"),
    organSelect = dc.selectMenu("#dc-organ-select"),
    donorSelect = dc.selectMenu("#dc-donor-select"),
    locationSelect = dc.selectMenu("#dc-location-select");

var demoBarStack = dc.barChart("#dc-demo-bar-stack");
var pcmPie = dc.pieChart("#dc-pcm-pie");
var crfmPie = dc.pieChart("#dc-crfm-pie");
var modalityRow = dc.rowChart("#dc-modality-row");
var ruralUrbanRow = dc.rowChart("#dc-rural-urban-row");
var crisisRow = dc.rowChart("#dc-crisis-row");
var programRow = dc.rowChart("#dc-program-row");
var statusRow = dc.rowChart("#dc-status-row");
var benefBar = dc.barChart("#dc-benef-bar-stack");
var monthBar = dc.barChart("#dc-month-bar");
var regionMap = dc.geoChoroplethChart("#dc-region-map");
var districtMap = dc.geoChoroplethChart("#dc-district-map");
var programBenefHeat = dc.heatMap("#dc-program-benef-heat");

var numberFormat = d3.format(",.0f");

var dateParse = d3.timeParse("%d/%m/%Y");
var dateFormat = d3.timeFormat("%d/%m/%Y");
var dateLongFormat = d3.timeFormat("%Y-%m-%d");

var yearFormat = d3.timeFormat("%Y");
// Correct end date due to month rounding off 
// by adding or deducting a day
var dayOffset = d3.timeDay.offset;
var monthOffset = d3.timeMonth.offset;

var rowTip = d3.tip()
  .attr('class', 'd3-tip')
  .offset([-5, 0])
  .html(function (d) { 
    return "<div class='dc-tooltip'><span class='dc-tooltip-title'>" + (d.key) + "</span> | <span class='dc-tooltip-value'>" + numberFormat(d.value) + "</span></div>"; 
  });

var barTip = d3.tip()
  .attr('class', 'd3-tip')
  .offset([-5, 0])
  .html(function (d) { 
    return "<div class='dc-tooltip'><span class='dc-tooltip-title'>" + (d.data.key) + "</span> | <span class='dc-tooltip-value'>" + numberFormat(d.data.value) + "</span></div>"; 
  });

var heatTip = d3.tip()
  .attr('class', 'd3-tip')
  .offset([-5, 0])
  .html(function (d) { 
    return "<div class='dc-tooltip'><span class='dc-tooltip-title'>" + (d.key[1] + "<br>" + d.key[0]) + "</span> | <span class='dc-tooltip-value'>" + numberFormat(d.value) + "</span></div>"; 
  });

var stackTip = d3.tip()
  .attr('class', 'd3-tip')
  .offset([-5, 0])
  .html(function (d) { 
    return "<div class='dc-tooltip'><span class='dc-tooltip-title'>" + (d.layer) + "</span> | <span class='dc-tooltip-value'>" + numberFormat(d.data.value[d.layer.toLowerCase()]) + "</span></div>"; 
  });

var mapTip = d3.tip()
  .attr('class', 'd3-map-tip')
  .offset([-5, 0])
  .html(function (d) {
    var t = d3.select(this).select('title').html();
    var tA = t.split(':');

    return "<div class='dc-tooltip'><span class='dc-tooltip-title'>" + (tA[0]) + "</span> | <span class='dc-tooltip-value'>" + (tA[1]) + "</span></div>";
  });

var lastUpdated;

var ndx; // crossfilter global variable 

var statusFilter = "Completed"; 

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
        { name: 'loc', value: locationSelect.filters() }, //1
        { name: 'mod', value: modalityRow.filters() }, // 2
        { name: 'par', value: partnerSelect.filters() }, //3
        { name: 'mon', value: resetFilter(monthBar.filters()) }, //4
        { name: 'crs', value: crisisRow.filters() }, //5
        { name: 'bnf', value: benefBar.filters() }, //6
        { name: 'prg', value: programRow.filters() }, //7
        { name: 'pbn', value: programBenefHeat.filters() }, //8
        { name: 'don', value: donorSelect.filters() }, //9
        { name: 'reg', value: regionMap.filters() }, //10
        { name: 'dis', value: districtMap.filters() }, //11
        { name: 'org', value: organSelect.filters() }, //12
        { name: 'rub', value: ruralUrbanRow.filters() }, //13
        { name: 'sta', value: statusRow.filters() }, //14

    ];
    // console.log(filters[23]);
    var recursiveEncoded = $.param(filters);
    location.hash = recursiveEncoded;
}

function initFilters() {
    // check url filter to determine which year's dataset to load
    // regExp accepts special characters
    var parseHash, parsed;

    parseHash = /^#loc=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&mod=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&par=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&mon=([\d{4}-\d{2}-\d{2},\d{4}-\d{2}-\d{2}]*)&crs=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&bnf=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&prg=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&pbn=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&don=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&reg=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&dis=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&org=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&rub=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)&sta=([A-Za-z0-9,!@#\$%\^\&*\)\(\/+=._-\s]*)$/;
    parsed = parseHash.exec(decodeURIComponent(location.hash));

    function filter(chart, rank) {  // for instance chart = sector_chart and rank in URL hash = 1

        // sector chart
        if (parsed[rank] == "") {
            
            if (rank == 14) {
                chart.filter(statusFilter);
                getFiltersValues();
            } else {
                chart.filter(null);
                getFiltersValues();
            }
        } else if (rank == 4) {     // monthBar
            var filterValues = parsed[rank].split(",");

            var start = new Date(filterValues[0]);
            var end = new Date(filterValues[1]);

            // initialize date to midnight
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);

            var filter = dc.filters.RangedFilter(start, dayOffset(end, 1));
            // var filter = dc.filters.RangedFilter(new Date(2017,2,1), new Date(2017,2,31));              
            chart.filter(filter);
            getFiltersValues();
        } else if (rank == 8) {     // heatmap
            var filterValues = parsed[rank].split(",");
            var chunkValues = chunk(filterValues, 2);

            for (var i = 0; i < chunkValues.length; i++) {
                var filter = dc.filters.TwoDimensionalFilter(chunkValues[i]);
                chart.filter(filter);
            }
            getFiltersValues();
        } else if (rank == 14) {
            var filterValues = parsed[rank].split(",");
      
            var filter = filterValues[0] == "" ? statusFilter : filterValues[0];
            chart.filter(filter);
            getFiltersValues();        
        } else {
            var filterValues = parsed[rank].split(",");
            for (var i = 0; i < filterValues.length; i++) {
                chart.filter(filterValues[i]);
            }
            getFiltersValues();
        }
    }
    
    if (parsed) {
        filter(locationSelect, 1);
        filter(modalityRow, 2);
        filter(partnerSelect, 3);
        filter(monthBar, 4);
        filter(crisisRow, 5);
        filter(benefBar, 6);
        filter(programRow, 7);
        filter(programBenefHeat, 8);
        filter(donorSelect, 9);
        filter(regionMap, 10);
        filter(districtMap, 11);
        filter(organSelect, 12);
        filter(ruralUrbanRow, 13);
        filter(statusRow, 14);
    } else {
        // assign default year
        statusRow.filter(statusFilter);
        getFiltersValues();
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
function rangeDate() {
    // var yr = d3.max(data, function (d) {
    //     return +d.LastUpdated;
    // });
    // var yr = 2019;
    var y = dateParse(lastUpdated,4).getFullYear();
    var rng = [new Date(y, 0, 1), new Date(y + 1, 0, 31)];
    return rng;
}
// loads CSV file based the button clicked
function load_button(file) {
    dc.filterAll(); // removes all filters prior to replacing data source
    render_plots(file); // renders plots based on selected file
}

// loader settings
var target = document.getElementById('dc-partner-nd');

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

                // last updated date 
                if (lastUpdated === undefined) lastUpdated = d.LastUpdated
                lastUpdated = lastUpdated > d.LastUpdated ? lastUpdated : d.LastUpdated;
            });

            // console.log(data);

            $("#last-updated").html("as at " + lastUpdated);

            // attach data to crossfilter
            var ndx = crossfilter(data);

            // partners
            // reduce function returns an object with unique partner acronyms
            // as object keys and # of partner occurences as object values

            var partnerNdGroup = ndx.groupAll().reduce(
                function (p, v) { //add
                    if (p[v.Organization]) {
                        p[v.Organization]++;
                    } else {
                        p[v.Organization] = 1;
                    }
                    return p;
                },
                function (p, v) { //remove
                    p[v.Organization]--;
                    if (p[v.Organization] === 0) {
                        delete p[v.Organization];
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
                .formatNumber(d3.format(","))
                .transitionDuration(0);
            partnerNd.render();
            
            // implementing partners
            var ipNdGroup = ndx.groupAll().reduce(
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

            ipNd
                .group(ipNdGroup)
                .valueAccessor(function (d) {
                    return Object.keys(d).length;
                })
                .formatNumber(d3.format(","))
                .transitionDuration(0);
            ipNd.render();

            // donors
            var donorNdGroup = ndx.groupAll().reduce(
                function (p, v) { //add
                    if (p[v.Donor]) {
                        p[v.Donor]++;
                    } else {
                        p[v.Donor] = 1;
                    }
                    return p;
                },
                function (p, v) { //remove
                    p[v.Donor]--;
                    if (p[v.Donor] === 0) {
                        delete p[v.Donor];
                    }
                    return p;
                },
                function () { //init
                    //initial p - only one since using groupAll
                    return {};
                }
            );

            donorNd
                .group(donorNdGroup)
                .valueAccessor(function (d) {
                    return Object.keys(d).length;
                })
                .formatNumber(d3.format(","))
                .transitionDuration(0);
            donorNd.render();

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

            // var targetNdGroup = ndx.groupAll().reduceSum(function (d) {
            //     return d.Target;
            // });
            var targetNdGroup = ndx.groupAll().reduce(
                function (p, v) {
                    p.Target = +v.Target;
                    return p;
                },
                function (p, v) {
                    p.Target = +v.Target;
                    return p;
                },
                function () {
                    return { Target:0 };
                }
            );

            targetNd
                .group(targetNdGroup)
                .valueAccessor(function (d) {
                    return d.Target;
                })
                .formatNumber(d3.format(".2s"))
                .transitionDuration(0);

            targetNd.render();

            var pinNdGroup = ndx.groupAll().reduce(
                function (p, v) {
                    p.PIN = +v.PIN;
                    return p;
                },
                function (p, v) {
                    p.PIN = +v.PIN;
                    return p;
                },
                function () {
                    return { PIN:0 };
                }
            );

            pinNd
                .group(pinNdGroup)
                .valueAccessor(function (d) {
                    return d.PIN;
                })
                .formatNumber(d3.format(".2s"))
                .transitionDuration(0);

            pinNd.render();            


            var 
                donorDim = ndx.dimension(function (d) { return d.Donor }),
                partnerDim = ndx.dimension(function (d) { return d.IP }),
                organDim = ndx.dimension(function (d) { return d.Organization }),
                locationDim = ndx.dimension(function (d) { return d.Location });

            var locationGroup = locationDim.group().reduceSum(function(d){
                d.Individuals;
            });

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
                .group(locationDim.group().reduceSum(function(d){
                    return d.Individuals;
                }))
                .multiple(true)
                // .numberVisible(14)
                .controlsUseVisibility(true)
                .on("filtered", getFiltersValues)
                .title(function (d) {
                    return d.key.substring(0,(d.key.length - 17)) + " - " + numberFormat(d.value) + "";
                })
                ;
            locationSelect.render();


            // demographic stacked bar chart
            var demoDim = ndx.dimension(function (d) {
                return "";
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
                .width(100)
                .height(120)
                .margins({ top: 7, right: 5, bottom:20, left: 35 })
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
                    // return "Men: " + d3.format(".0%")(d.value.men / d.value.individuals);
                    return '';
                })
                .title("Women", function (d) {
                    // return "Women: " + d3.format(".0%")(d.value.women / d.value.individuals);
                    return '';
                })
                .title("Boys", function (d) {
                    // return "Boys: " + d3.format(".0%")(d.value.boys / d.value.individuals);
                    return '';
                })
                .title("Girls", function (d) {
                    // return "Girls: " + d3.format(".0%")(d.value.girls / d.value.individuals);
                    return '';
                })
                .controlsUseVisibility(true)
                .gap(20)
                .barPadding(0.001)
                .ordinalColors(['#8b2b2d','#a55a5b', '#bf898a', '#d8b8b9'])
                //.ordinalColors(colorbrewer.GnBu[4])
                .renderHorizontalGridLines(true)
                .x(d3.scaleBand())
                .xUnits(dc.units.ordinal)
                .yAxis().tickFormat(function (v) {
                    return d3.format(".0%")(v);
                })

            demoBarStack.yAxis().ticks(3);

            demoBarStack.on('renderlet', function (chart) {
                chart.selectAll('rect')
                  .attr('data-tooltip', 'hello');
                
                chart.selectAll(".bar").call(stackTip);
                chart.selectAll(".bar").on('mouseover', stackTip.show)
                  .on('mouseout', stackTip.hide);
              });

            demoBarStack.render();

            // PCM/PDM pie chart
            var pcmDim = ndx.dimension(function (d) {
                return d.PCM;
            });

            var pcmGroup = pcmDim.group().reduceCount(function (d) {
                return d.Id;
            });

            pcmPie
                .width(100)
                .height(100)
                // .radius(90)
                .innerRadius(25)
                .dimension(pcmDim)
                .group(pcmGroup)
                .label(function (d) {
                    // var k = d.key == "Known" ? "KN" : "UNK"
                    // return k;
                    return d.key
                })
                // .title(function (d) {
                //     return d.key + ": " + numKFormat(d.value)
                // })
                .ordinalColors(['#8b2b2d','#a55a5b', '#bf898a', '#d8b8b9'])
                .controlsUseVisibility(true)
                .on("filtered", getFiltersValues);

            pcmPie.render();

            // CRFM pie chart
            var crfmDim = ndx.dimension(function (d) {
                return d.CRFM;
            });

            var crfmGroup = crfmDim.group().reduceCount(function (d) {
                return d.Id;
            });

            crfmPie
                .width(100)
                .height(100)
                // .radius(90)
                .innerRadius(25)
                .dimension(crfmDim)
                .group(crfmGroup)
                .label(function (d) {
                    // var k = d.key == "Known" ? "KN" : "UNK"
                    // return k;
                    return d.key
                })
                // .title(function (d) {
                //     return d.key + ": " + numKFormat(d.value)
                // })
                .ordinalColors(['#8b2b2d','#a55a5b', '#bf898a', '#d8b8b9'])
                .controlsUseVisibility(true)
                .on("filtered", getFiltersValues);

            crfmPie.render();


            // rural urban row chart
            var ruralUrbanDim = ndx.dimension(function (d) {
                return d.RuralUrban;
            });

            var ruralUrbanGroup = ruralUrbanDim.group().reduceSum(function (d) {
                return d.Individuals;
            });

            ruralUrbanRow
                .width(110)
                .height(120)
                .margins({ top: 5, right: 0, bottom: 20, left: 5 })
                .dimension(ruralUrbanDim)
                .group(ruralUrbanGroup)
                .ordinalColors(["#b27273"])
                .on("filtered", getFiltersValues)
                .title(function (d) {
                    // return d.key + ": " + d3.format(",")(d.value)
                    return ''
                })
                .controlsUseVisibility(true)
                .gap(2)
                .elasticX(true)
                .xAxis().ticks(3);

            ruralUrbanRow.xAxis().tickFormat(function (v) {
                return d3.format(".1s")(v);
            });

            ruralUrbanRow.on('renderlet', function (chart) {
                chart.selectAll(".row").call(rowTip);
                chart.selectAll(".row").on('mouseover', rowTip.show)
                  .on('mouseout', rowTip.hide);
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
                .height(190)
                .margins({ top: 5, right: 10, bottom: 20, left: 5 })
                .dimension(crisisDim)
                .group(crisisGroup)
                .ordinalColors(["#b27273"])
                .on("filtered", getFiltersValues)
                .title(function (d) {
                    // return d.key + ": " + d3.format(",")(d.value)
                    return '';
                })
                .controlsUseVisibility(true)
                .gap(2)
                .elasticX(true)
                .xAxis().ticks(3);

            crisisRow.xAxis().tickFormat(function (v) {
                return d3.format(".1s")(v);
            });

            crisisRow.on('renderlet', function (chart) {
                chart.selectAll(".row").call(rowTip);
                chart.selectAll(".row").on('mouseover', rowTip.show)
                  .on('mouseout', rowTip.hide);
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
                .height(190)
                .margins({ top: 5, right: 10, bottom: 20, left: 5 })
                .dimension(programDim)
                .group(programGroup)
                .ordinalColors(["#b27273"])
                .on("filtered", getFiltersValues)
                .title(function (d) {
                    // return d.key + ": " + d3.format(",")(d.value)
                    return '';
                })
                .controlsUseVisibility(true)
                .gap(2)
                .elasticX(true)
                .xAxis().ticks(3);
            
            programRow.xAxis().tickFormat(function (v) {
                return d3.format(".1s")(v);
            });

            programRow.on('renderlet', function (chart) {
                chart.selectAll(".row").call(rowTip);
                chart.selectAll(".row").on('mouseover', rowTip.show)
                  .on('mouseout', rowTip.hide);
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
                .height(195)
                .margins({ top: 5, right: 30, bottom: 20, left: 180 })
                .dimension(programBenefDim)
                .group(programBenefGroup)
                .keyAccessor(function (d) { return d.key[0]; })
                .valueAccessor(function (d) { return d.key[1]; })
                .colorAccessor(function (d) { return +d.value; })
                .on("filtered", getFiltersValues)
                .title(function (d) {
                    // return d.key[1] + "\n" +
                    //     d.key[0] + ": " + d3.format(",")(d.value);
                    return '';
                })
                .colors(["#f2e7e7", "#e5d0d0", "#d8b8b9", "#cba1a1", "#bf898a", "#b27273", "#a55a5b", "#984244", "#8b2b2d", "#7f1416", "#721213", "#651011", "#580e0f", "#4c0c0d", "#3f0a0b"])
                .colorCalculator(function (d) {
                    return d.value !== 0 ? programBenefHeat.colors()(d.value) : '#ccc';
                })
                .calculateColorDomain()
                .controlsUseVisibility(true);

            programBenefHeat.on("preRedraw", function (chart) {
                chart.calculateColorDomain();
            });

            programBenefHeat.on('renderlet', function (chart) {
                // chart.selectAll('rect')
                //   .attr('data-tooltip', 'hello');
                
                chart.selectAll(".heat-box").call(heatTip);
                chart.selectAll(".heat-box").on('mouseover', heatTip.show)
                  .on('mouseout', heatTip.hide);
              });

            programBenefHeat.render();

            // monthly reached bar charts
            monthDim = ndx.dimension(function (d) {
                return d.EndMonth;
            });

            monthGroup = monthDim.group().reduceSum(function (d) {
                return d.Individuals;
            });

            monthBar
                .width(300)
                .height(120)
                .margins({ top: 10, right: -17, bottom: 20, left: 30 })
                .dimension(monthDim)
                .group(monthGroup)
                .valueAccessor(function (d) {
                    // return d.value;
                    return Math.round(d.value * 100) / 100
                })
                .gap(1)
                .ordinalColors(['#984244'])
                //.centerBar(true)
                .renderHorizontalGridLines(true)
                .controlsUseVisibility(true)
                .x(d3.scaleTime().domain(rangeDate()))
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
                    .attr('transform', "translate(42,100)");
                chart.selectAll("g.chart-body")
                    .attr('transform', "translate(10,10)");
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
                .height(350)
                .transitionDuration(1000)
                .dimension(regionDim)
                .group(regionGroup)
                .projection(d3.geoMercator()
                    .scale(1430)
                    .translate([-1010, 305])
                )
                .keyAccessor(function (d) { return d.key; })
                .valueAccessor(function (d) { return d.value; })
                .controlsUseVisibility(true)
                // .colors(['#ccc'].concat(colorbrewer.Blues[9]))
                .colors(d3.scaleQuantize().range(["#f2e7e7", "#e5d0d0", "#d8b8b9", "#cba1a1", "#bf898a", "#b27273", "#a55a5b", "#984244", "#8b2b2d", "#7f1416", "#721213", "#651011", "#580e0f", "#4c0c0d", "#3f0a0b"]))
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

            regionMap.on("renderlet", function (chart) {
                chart.selectAll(".admin2Name").call(mapTip);
                chart.selectAll(".admin2Name").on('mouseover', mapTip.show)
                .on('mouseout', mapTip.hide);
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
                .height(350)
                .transitionDuration(1000)
                .dimension(districtDim)
                .group(districtGroup)
                .projection(d3.geoMercator()
                    .scale(1430)
                    .translate([-1010, 305])
                )
                .keyAccessor(function (d) { return d.key; })
                .valueAccessor(function (d) { return d.value; })
                .controlsUseVisibility(true)
                // .colors(['#ccc'].concat(colorbrewer.Blues[9])) 
                .colors(d3.scaleQuantize().range(["#f2e7e7", "#e5d0d0", "#d8b8b9", "#cba1a1", "#bf898a", "#b27273", "#a55a5b", "#984244", "#8b2b2d", "#7f1416", "#721213", "#651011", "#580e0f", "#4c0c0d", "#3f0a0b"]))
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
            });

            districtMap.on("renderlet", function (chart) {
                chart.selectAll(".admin2Name").call(mapTip);
                chart.selectAll(".admin2Name").on('mouseover', mapTip.show)
                .on('mouseout', mapTip.hide);
            }); 
            
            districtMap.render();

            // beneficiary type vs ip stacked bar chart 
            var benefDim = ndx.dimension(function (d) {
                return d.BeneficiaryType;
            });

            var benefGroup = benefDim.group().reduceSum(
                function (d) {
                    return +d.Individuals;
                }
            );

            benefBar
                .width(200)
                .height(120)
                .margins({ top: 5, right: 30, bottom: 20, left: 40 })
                .dimension(benefDim)
                .group(benefGroup, "Individuals")
                .title(function (d) {
                    // return d.key + ": " + d3.format(",")(d.value.INDIVIDUALS);
                    return '';
                })
                .gap(2)
                .ordinalColors(['#984244'])
                .renderHorizontalGridLines(true)
                .controlsUseVisibility(true)
                .x(d3.scaleBand())
                .xUnits(dc.units.ordinal)
                .elasticY(true)
                .yAxis().tickFormat(function (v) {
                    return d3.format(".1s")(v);
                });

            benefBar.yAxis().ticks(4);

            benefBar.on('renderlet', function (chart) {
              chart.selectAll('rect')
                .attr('data-tooltip', 'hello');
              
              chart.selectAll(".bar").call(barTip);
              chart.selectAll(".bar").on('mouseover', barTip.show)
                .on('mouseout', barTip.hide);
            });

            benefBar.render();

  
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
                .ordinalColors(["#b27273"])
                .on("filtered", getFiltersValues)
                .on("filtered", function(){
                    var filter = statusRow.filters()[0];
                    // get filtered year 
                    filter = filter == undefined ? statusFilter : filter;
                  })                
                .title(function (d) {
                    // return d.key + ": " + numberFormat(d.value);s
                    return '';
                })
                .controlsUseVisibility(true)
                .gap(2)
                .elasticX(true)
                .xAxis().ticks(3);
            
            statusRow.xAxis().tickFormat(function (v) {
                    return d3.format(".1s")(v);
                });

            // single select
            statusRow.addFilterHandler(function(filters, filter) {return [filter];}); // this
            // custom filter handler (no-op)
            statusRow.removeFilterHandler(function(filters, filter) {
                return filters;
            });

            statusRow.on('renderlet', function (chart) {
                chart.selectAll(".row").call(rowTip);
                chart.selectAll(".row").on('mouseover', rowTip.show)
                  .on('mouseout', rowTip.hide);
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
                .ordinalColors(["#b27273"])
                .on("filtered", getFiltersValues)
                .title(function (d) {
                    // return d.key + ": " + numberFormat(d.value);
                    return '';
                })
                .controlsUseVisibility(true)
                .gap(2)
                .elasticX(true)
                .xAxis().ticks(3);

            modalityRow.xAxis().tickFormat(function (v) {
                return d3.format(".1s")(v);
            });

            modalityRow.on('renderlet', function (chart) {
                chart.selectAll(".row").call(rowTip);
                chart.selectAll(".row").on('mouseover', rowTip.show)
                  .on('mouseout', rowTip.hide);
              });  

            modalityRow.render();

            dc.renderAll();

            initFilters();

            dc.redrawAll();
            
        });   /* district json */
    }); /* region json */

});

$(document).ready(function(){
    $('[data-toggle="tooltip"]').tooltip();   
  });