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

// Tooltip for displaying province information
var tooltip = d3.select("#geomap")
.append("div")
.attr("class", "tooltip")
.style("position", "absolute")
.style("visibility", "hidden")
.style("background", "#fff")
.style("border", "1px solid #ccc")
.style("padding", "10px")
.style("border-radius", "5px")
.style("box-shadow", "0px 0px 10px rgba(0, 0, 0, 0.1)");

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
            .attr("class", "province")
            .style("fill", function(d) {
                var value = d.properties.population;
                if (value) {
                    return color(value);
                } else {
                    return "#ccc";
                }
            })
            .attr("d", path)
            .attr("stroke", "blue")
            .attr("stroke-width", "0.4px")
            .on("click", provinceClicked)
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .classed("highlighted", true) 
                    .style("fill", "yellow");
                tooltip.html(`<strong>${d.properties.Ten}</strong><br>Population: ${d.properties.population}`)
                    .style("visibility", "visible")
                    .style("top", (event.pageY - 10) + "px")
                    .style("left", (event.pageX + 10) + "px");
            })
            .on("mousemove", function(event) {
                tooltip.style("top", (event.pageY - 10) + "px")
                       .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .classed("highlighted", false) 
                    .style("fill", function(d) {
                        var value = d.properties.population;
                        if (value) {
                            return color(value);
                        } else {
                            return "#ccc";
                        }
                    });
                tooltip.style("visibility", "hidden");
            });
            // Add province names
            svg.selectAll("text")
                .data(json.features)
                .enter()
                .append("text")
                .attr("transform", function(d) {
                    return "translate(" + path.centroid(d) + ")";
                })
                .attr("dy", ".35em")
                .attr("class", "province-label")
                .text(function(d) { return d.properties.Ten.replace("Tỉnh ", ""); })
                .style("font-size", "10px")
                .style("fill", "black")
                .style("pointer-events", "none");

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
                .attr("r", 1)
                .style("fill", "red")
                .on("mouseover", function(event, d) {
                    tooltip.html(`<strong>Thành phố ${d.name}</strong>`)
                        .style("visibility", "visible")
                        .style("top", (event.pageY - 10) + "px")
                        .style("left", (event.pageX + 10) + "px");
                })
                .on("mousemove", function(event) {
                    tooltip.style("top", (event.pageY - 10) + "px")
                           .style("left", (event.pageX + 10) + "px");
                })
                .on("mouseout", function() {
                    tooltip.style("visibility", "hidden");
                })
                .on("click", function(event, d) {
                    tooltip.html(`<strong>Thành phố ${d.name}</strong>`)
                        .style("visibility", "visible")
                        .style("top", (event.pageY - 10) + "px")
                        .style("left", (event.pageX + 10) + "px");
                });
        });

    });
});

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

// Function to handle province click
function provinceClicked(event, d) {
    event.stopPropagation();
    const [[x0, y0], [x1, y1]] = path.bounds(d);
    svg.transition().duration(750).call(
        zoomFunction.transform,
        d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(Math.min(9, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
            .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
        d3.pointer(event, svg.node())
    );
}
function handleOutsideClick(event) {
    // Check if the click target is not a province path
    if (!event.target.classList.contains("province")) {
        svg.transition().duration(750).call(
            zoomFunction.transform,
            d3.zoomIdentity
        );
    }
}

// Bind the body click event to the handleOutsideClick function
d3.select("body").on("click", handleOutsideClick);

// Zooming behaviour
const zoomFunction = d3.zoom()
    .scaleExtent([1, 9])
    .on("zoom", function(event) {
        // Update provinces paths
        svg.selectAll(".province")
            .attr("transform", event.transform);
        // Update province names font size
        svg.selectAll("text.province-label")
            .style("font-size", 10 / event.transform.k + "px")
            .attr("transform", function(d) {
                // Calculate the translation based on the current zoom and pan transformations
                const [x, y] = path.centroid(d);
                const tx = event.transform.applyX(x);
                const ty = event.transform.applyY(y);
                return "translate(" + tx + "," + ty + ") scale(" + event.transform.k + ")";
            });

        // Update city dots
        const dotSize = 1 * event.transform.k;
        svg.selectAll("circle")
            .attr("cx", function(d) { return event.transform.applyX(projection([parseFloat(d.lng), parseFloat(d.lat)])[0]); })
            .attr("cy", function(d) { return event.transform.applyY(projection([parseFloat(d.lng), parseFloat(d.lat)])[1]); })
            .attr("r", dotSize);
    });

svg.call(zoomFunction);

