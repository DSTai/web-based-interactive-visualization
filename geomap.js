// Define map dimensions
var width = 1500;
var height = 1000;

// Define map projection
var projection = d3.geoAlbers()
    .center([100, 4.4])
    .rotate([2, 32])
    .parallels([11, 20])
    .translate([width / 40, height / 1.3])
    .scale(3000);

var path = d3.geoPath()
    .projection(projection);

// Create SVG element
var svg = d3.select("#geomap")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

// Load and process data
d3.csv("https://raw.githubusercontent.com/TungTh/tungth.github.io/master/data/vn-provinces-data.csv").then(function(data) {
    // Define color scale
    var colorScheme = d3.schemeBlues[6];
    colorScheme.unshift("#eee");
    var color = d3.scaleThreshold()
        .range(colorScheme);

    color.domain([
        d3.min(data, function(d) { return d.population; }), 
        d3.max(data, function(d) { return d.population; })
    ]);

    // Load GeoJSON data
    d3.json("https://dstai.github.io/data/vn-provinces.json").then(function(json) {
        // Merge the population data with GeoJSON
        for (var i = 0; i < data.length; i++) {
            var dataCountry = data[i].ma;
            var dataPop = parseFloat(data[i].population);
            for (var j = 0; j < json.features.length; j++) {
                var jsonCountry = json.features[j].properties.Ma;
                if (parseFloat(dataCountry) == parseFloat(jsonCountry)) {
                    json.features[j].properties.population = dataPop;
                    break;
                }
            }       
        }

        // Bind data and create paths for provinces
        svg.selectAll("path")
            .data(json.features)
            .enter()
            .append("path")
            .style("fill", function(d) {
                var value = d.properties.population;
                if (value) {
                    return color(value);
                } else {
                    return "#ccc";
                }
            })
            .attr("d", path)
            .attr("stroke", "blue");

        // Load cities data and render them above the provinces
        d3.csv("https://dstai.github.io/data/vn-cities.csv").then(function(citiesData) {
            // Filter cities where alt_type is "city"
            var filteredCities = citiesData.filter(function(d) {
                return d.alt_type === "City";
            });
            // Add circles for cities
            svg.selectAll("circle")
                .data(filteredCities)
                .enter()
                .append("circle")
                .attr("cx", function(d) { return projection([parseFloat(d.lng), parseFloat(d.lat)])[0]; })
                .attr("cy", function(d) { return projection([parseFloat(d.lng), parseFloat(d.lat)])[1]; })
                .attr("r", 1.5)
                .style("fill", "red");

            // Add city names
            svg.selectAll("text")
                .data(filteredCities)
                .enter()
                .append("text")
                .attr("x", function(d) { return projection([parseFloat(d.lng), parseFloat(d.lat)])[0] + 5; })
                .attr("y", function(d) { return projection([parseFloat(d.lng), parseFloat(d.lat)])[1] + 5; })
                .text(function(d) { return d.name; })
                .style("font-size", "8px")
                .style("fill", "black");
        });

    });
});

// Zooming behaviour
const zoomFunction = d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", function(event) {
        svg.selectAll("path")
            .attr("transform", event.transform);   // Update city dots
        const fontSize = 8 * event.transform.k;
        const dotSize = 1.5 * event.transform.k;
        svg.selectAll("circle")
            .attr("cx", function(d) { return event.transform.applyX(projection([parseFloat(d.lng), parseFloat(d.lat)])[0]); })
            .attr("cy", function(d) { return event.transform.applyY(projection([parseFloat(d.lng), parseFloat(d.lat)])[1]); })
            .attr("r", dotSize);
    
            // Update city names
        svg.selectAll("text")
            .attr("x", function(d) { return event.transform.applyX(projection([parseFloat(d.lng), parseFloat(d.lat)])[0]) + 5; })
            .attr("y", function(d) { return event.transform.applyY(projection([parseFloat(d.lng), parseFloat(d.lat)])[1]) + 5; })
            .text(function(d) { return d.name; })
            .style("font-size",fontSize+"px")
            .style("fill", "black");
    });

svg.call(zoomFunction);


// Function to adjust initial zoom and centering
function zoomToBoundingBox(bbox) {
    const [[x0, y0], [x1, y1]] = bbox;
    const bounds = [[x0, y0], [x1, y1]];

    // Compute the center of the bounding box
    const center = [
        (bounds[0][0] + bounds[1][0]) / 2,
        (bounds[0][1] + bounds[1][1]) / 2
    ];

    // Compute the zoom level based on the bounding box width
    const dx = bounds[1][0] - bounds[0][0];
    const dy = bounds[1][1] - bounds[0][1];
    const zoom = Math.min(12, 0.9 / Math.max(dx / width, dy / height));

    // Return the center and zoom level, but don't apply the zoom and pan to the map
    return { center, zoom };
}
