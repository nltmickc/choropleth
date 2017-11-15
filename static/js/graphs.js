var config = {
    transition: 1500,
    mapCenter: [-7.9, 54.3],
    mapScale: 7650,
    colorBrewerPalette: 'Greens', //Paired', YlGn
    distinctColours: 10,
    spinOpts: {
        lines: 9,
        length: 45,
        width: 21,
        radius: 42,
        scale: 1.0,
        corners: 1,
        trail: 60,
        shadow: true
    },
    //which keys to link on in the two JSON files
    polJsonKey: 'countyname',
    geoJsonKey: 'COUNTYNAME'
};

var mapScale = chroma.scale(config.colorBrewerPalette);

//Spinner while loading
var loadSpinner = new Spinner(config.spinOpts).spin();

$(".application").append(loadSpinner.el);
//Spinner while loading

var commasFormat = d3.format(",.0f");

//Charts
var timeChart = dc.barChart("#time-chart");
var prodTypeChart = dc.rowChart("#product-type-row-chart");
var clusterChart = dc.rowChart("#cluster-row-chart");
var premTypeChart = dc.pieChart("#prem-type-pie-chart");
var genderLife1Chart = dc.pieChart("#genderlife1-type-pie-chart");
var numberPoliciesND = dc.numberDisplay("#number-policies-nd");
var totalPremiumsND = dc.numberDisplay("#total-premiums-nd");
var cpPolicies = dc.geoChoroplethChart("#map");

queue()
    .defer(d3.json, '/static/data/gendata_policy_data.json')
    .defer(d3.json, '/static/geojson/Census2011_Admin_Counties_generalised20m.geojson')
    .await(makeGraphs);

function makeGraphs(error, policyJson, samJson) {

    //Clean Json data
    var dateFormat = d3.time.format("%Y-%m-%d");

    policyJson.forEach(function (d) {
        d["policy_startdate"] = dateFormat.parse(d["policy_startdate"]);
        d["policy_startdate"].setDate(1);
    });

    //Create a Crossfilter instance with policy data
    var ndx = crossfilter(policyJson);

    //Define Dimensions
    var countyDim = ndx.dimension(function (d) {
        return d["countyname"];
    });
    var clusterDim = ndx.dimension(function (d) {
//        return d["cluster_id"];
        return d["clusterdesc"];
    });
    var prodTypeDim = ndx.dimension(function (d) {
        return d["prod_type"];
    });
    var premTypeDim = ndx.dimension(function (d) {
        return d["prem_type"];
    });
    var startDim = ndx.dimension(function (d) {
        return d["policy_startdate"];
    });
    var premAPEDim = ndx.dimension(function (d) {
        return d["prem_ape"];
    });
    var genderLife1Dim = ndx.dimension(function (d) {
        return d["gender_life1"];
    });

    //Calculate metrics
    var numPolsByCounty = countyDim.group();
    var numPolsByCluster = clusterDim.group();
    var numPolsByProdType = prodTypeDim.group();
    var numPolsByPremType = premTypeDim.group();
    var numPolsByStart = startDim.group();
    var numPolsByGender = genderLife1Dim.group();
    var totalPremAPEByCounty = countyDim.group().reduceSum(function (d) {
        return d["prem_ape"];
    });

    var all = ndx.groupAll();

    var totalPremAPE = ndx.groupAll().reduceSum(function (d) {
        return d["prem_ape"];
    });

    //Define values (to be used in charts)
    var minDate = startDim.bottom(1)[0]["policy_startdate"];
    var maxDate = startDim.top(1)[0]["policy_startdate"];

    numberPoliciesND
        .formatNumber(commasFormat)
        .valueAccessor(function (d) {
            return d;
        })
        .group(all);

    totalPremiumsND
        .formatNumber(d3.format(".3s"))
        .valueAccessor(function (d) {
            return d;
        })
        .group(totalPremAPE);

    timeChart
        .width(900)
        .height(275)
        .margins({top: 10, right: 0, bottom: 40   , left: 40})
        .dimension(startDim)
        .group(numPolsByStart)
        .transitionDuration(config.transition)
        .x(d3.time.scale().domain([minDate, maxDate]))
        .elasticX(true)
        .xAxisLabel("Year")
        .xAxisPadding(200)
        .elasticY(true)
        .yAxis().ticks(4);

    clusterChart
        .width(400)
        .height(275)
        .dimension(clusterDim)
        .group(numPolsByCluster)
        .title(function(d){
            return "Cluster Name: " + d.key + "\nTotal Policies: " + (d.value ? commasFormat(d.value) : 0);
        })
        .transitionDuration(config.transition)
        .elasticX(true)
        .xAxis().ticks(4);

    prodTypeChart
        .width(400)
        .height(275)
        .dimension(prodTypeDim)
        .group(numPolsByProdType)
        .title(function(d){
            return "Policy Type: " + d.key + "\nTotal Policies: " + (d.value ? commasFormat(d.value) : 0);
        })
        .transitionDuration(config.transition)
        .elasticX(true)
        .xAxis().ticks(4);

    premTypeChart
        .width(200)
        .height(200)
        .radius(80)
        .innerRadius(30)
        .dimension(premTypeDim)
        .group(numPolsByPremType)
        .transitionDuration(config.transition)
        .title(function (d) {
            return ((d.key == 'SP') ? 'Single' : 'Regular') + ' Premium\nTotal Policies: ' + (d.value ? commasFormat(d.value) : 0);
        });

    genderLife1Chart
        .height(200)
        .width(200)
        .radius(80)
        .innerRadius(30)
        .dimension(genderLife1Dim)
        .group(numPolsByGender)
        .transitionDuration(config.transition)
        .title(function (d) {
            return ((d.key == 'M') ? 'Males: ' : 'Females: ') + (d.value ? commasFormat(d.value) : 0);
        });

    cpPolicies
        .width(800)
        .height(871)
        .transitionDuration(config.transition)
        .dimension(countyDim)
        .group(numPolsByCounty)
        .projection(d3.geo.mercator().center(config.mapCenter).scale(config.mapScale))
        .on("preRender", function (d) {
            mapScale.domain(d3.extent(d.group().all(), d.valueAccessor()), config.distinctColours);
        })
        .on("preRedraw", function (d) {
            mapScale.domain(d3.extent(d.group().all(), d.valueAccessor()), config.distinctColours);
            legend(cpPolicies);
        })
        .colorCalculator(function (d) {
            return d ? mapScale(d).hex() : '#ccc';
        })
        .overlayGeoJson(samJson.features, config.polJsonKey, function (d) {
            return d.properties[config.geoJsonKey];
        })
        .title(function (d) {
            return d.key + "\nTotal Policies: " + (d.value ? commasFormat(d.value) : 0);
        });

    dc.renderAll();

    legend(cpPolicies);

    loadSpinner.stop();

}

function legend(chart) {

    //Remove if present - recalc and display
    chart.selectAll(".legendLinear").remove();

    var svg = chart.svg();

    svg.append("g")
        .attr("class", "legendLinear")
        .attr("transform", "translate(20,20)");

    var linear = d3.scale.linear()
        .domain(mapScale.domain())
        .range(mapScale.colors());

    var legendLinear = d3.legend.color()
        .shapeWidth(30)
        .cells(config.distinctColours)
        .scale(linear)
        .labelFormat(commasFormat);

    svg.select(".legendLinear")
        .call(legendLinear);

}

function ResetChart(d) {

    //if used without chart resets everything
    if (!arguments.length) d = dc;

    d.filterAll();

    dc.redrawAll();

}

Ladda.bind('button', {
    timeout: config.transition
});
