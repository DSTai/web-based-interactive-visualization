// Define map dimensions
var width = 1400;
var height = 800;

// Define map projection
var projection = d3.geoAlbers()
    .center([100, 4.4])
    .rotate([2, 32])
    .parallels([11, 20])
    .translate([width / 40, height / 1.2])
    .scale(2500);

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

// Define color scales for different datasets
var colorSchemes = {
    population: d3.schemeBlues[6],
    health: d3.schemeGreens[6],
    grdp: d3.schemeReds[6]
};
for (var key in colorSchemes) {
    colorSchemes[key].unshift("#eee");
}

var colorScales = {
    population: d3.scaleThreshold().range(colorSchemes.population),
    health: d3.scaleThreshold().range(colorSchemes.health),
    grdp: d3.scaleThreshold().range(colorSchemes.grdp)
};

function createLegend(color, thresholds) {
    const legendWidth = 300;
    const legendHeight = 20;
    const legendMargin = { top: 50, right: 20, bottom: 20, left: 20 };
    legendThresholds = thresholds;
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${legendMargin.left},${legendMargin.top})`);

    const legendScale = d3.scaleLinear()
        .domain([thresholds[0], thresholds[thresholds.length - 1]])
        .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
        .tickValues(thresholds)
        .tickFormat(d3.format(".2s"));

    legend.selectAll("rect")
        .data(thresholds)
        .enter()
        .append("rect")
        .attr("x", (d, i) => legendScale(d))
        .attr("y", 0)
        .attr("width", (d, i) => legendScale(thresholds[i + 1] || thresholds[thresholds.length - 1]) - legendScale(d))
        .attr("height", legendHeight)
        .attr("fill", (d, i) => color(d))
        .on("mouseover", function(event, d) {
            // Highlight selected legend rectangle
            d3.select(this)
                .attr("stroke", "black")
                .attr("stroke-width", 1);    
                        
            var className = ".legend-" + thresholds.indexOf(d); // Get class based on threshold
            svg.selectAll(".province")
                .classed("highlighted", false); // Reset all provinces
            svg.selectAll(".province")
                .filter(function(province) {
                    var value = province.properties.value;
                    var minThreshold = d;
                    var maxThreshold = thresholds[thresholds.indexOf(d) + 1] || thresholds[thresholds.length - 1];
                    return value >= minThreshold && value <= maxThreshold;
                })
                .classed("highlighted", true)
                .style("fill", "yellow"); // Highlight provinces based on class
        })
        .on("mouseout", function() {
            legend.selectAll("rect")
            .attr("stroke", "none");

            svg.selectAll(".province")
                .classed("highlighted", false)
                .style("fill", function(d) {
                    var value = d.properties.value;
                    if (value) {
                        return color(value);
                    } else {
                        return "#ccc";
                    }
                });
        });

    legend.append("g")
        .attr("transform", `translate(0,${legendHeight})`)
        .call(legendAxis);

    legend.append("text")
        .attr("class", "legend-title")
        .attr("x", legendWidth / 2)
        .attr("y", legendMargin.top )
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "black")
        .text("Density");
}

// Function to load data and update the map
function loadData() {
    // Get the selected dataset and year
    var selectedDataset = document.getElementById("dataset-select").value;
    var selectedYear = document.getElementById("year").value;

    // Update the dataset URL based on the selected year
    var datasetURL = "https://dstai.github.io/data/" + selectedDataset + "/" + selectedDataset + "_" + selectedYear + ".csv";
    // Load data from the updated dataset URL
    d3.csv(datasetURL).then(function(data) {
        var color = colorScales[selectedDataset];

        // Set the domain of the color scale
        var values = data.map(function(d) { 
            if (selectedDataset == "health") {
                return +d["Total"]; 
            } 
            else if(selectedDataset == "grdp"){
                return +d["grdp"];
            }
            else {
                return +d[selectedDataset]; 
            }
        });
        var min = d3.min(values);
        var max = d3.max(values);
        var thresholds = d3.range(min, max + (max - min) / (color.range().length), (max - min) / (color.range().length));
        color.domain(thresholds);  
        
        d3.json("https://dstai.github.io/data/vn-provinces.json").then(function(json) {
            // Merge the data with GeoJSON
            data.forEach(function(d) {
                var dataProvince = d.code;
                var value;
                if (selectedDataset == "health") {
                    value = +d["Total"];
                }
                else if(selectedDataset == "grdp"){
                    value = +d["grdp"];
                } else {              
                    value = +d[selectedDataset];
                }
                json.features.forEach(function(j) {
                    if (parseFloat(j.properties.Ma) == parseFloat(dataProvince)) {
                        j.properties.value = value;  
                    }
                });
            });

        // Bind data and create paths for provinces
        var paths = svg.selectAll("path").data(json.features);
            
        paths.enter()
            .append("path")
            .attr("class", "province")
            .attr("d", path)
            .merge(paths)
            .style("fill", function(d) {
                var value = d.properties.value;
                if (value) {
                    return color(value);
                } else {
                    return "#ccc";
                }
            })
            .attr("d", path)
            .attr("stroke", "black")
            .attr("stroke-width", "0.2px")
            .on("click", provinceClicked)
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .classed("highlighted", true) 
                    .style("fill", "yellow");
                tooltip.html(`<strong>${d.properties.Ten}</strong><br>${selectedDataset.charAt(0).toUpperCase() + selectedDataset.slice(1)}: ${d.properties.value}`)
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
                        var value = d.properties.value;
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
                .style("fill", "grey")
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
        // Create legend for the selected dataset
        svg.selectAll(".legend").remove();
        createLegend(color, thresholds);

 
// Load region data and create legend
d3.csv("https://dstai.github.io/data/region.csv").then(function(regionData) {
    // Extract region names from regionData
    var uniqueRegions = Array.from(new Set(regionData.map(region => region.region)));

    // Create legend using region names
    createRegionLegend(uniqueRegions);

    // Merge the region data with GeoJSON
    regionData.forEach(function(region) {
        var regionCode = region.code; // Assuming 'code' is the region code in regionData
        var regionName = region.region; // Assuming 'region' is the region name in regionData

        // Find the corresponding feature in GeoJSON and assign the region information
        json.features.forEach(function(feature) {
            if (parseFloat(feature.properties.Ma) === parseFloat(regionCode)) {
                feature.properties.region = regionName;
            }
        });
    });

    // Proceed with your existing code for map rendering
}).catch(function(error) {
    console.error("Error loading region data:", error);
});
    function createRegionLegend(regions) {
        const legendWidth = 30;
        const legendHeight = 30;
        const legendMargin = { top: 50, right: 20, bottom: 20, left: 20 };
        var regionColors = {
            "Dong bang song Hong": "red",
            "Trung du va mien nui phia Bac": "darkgreen",
            "Bac Trung Bo va Duyen hai mien Trung": "navy",
            "Tay Nguyen": "darkmagenta",
            "Dong Nam Bo": "goldenrod",
            "Dong bang song Cuu Long": "darkcyan"
        };
        
        const regionLegend = svg.append("g")
            .attr("class", "region-legend")
            .attr("transform", `translate(${legendMargin.left},${legendMargin.top + 100})`);
        
        regionLegend.selectAll("rect")
            .data(regions)
            .enter()
            .append("rect")
            .attr("x", 0)
            .attr("y", (d, i) => i * (legendHeight + 5))
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .attr("fill", d => regionColors[d] )
            .attr("stroke", "black")
            .attr("stroke-width", 0.2)
            .on("mouseover", function(event, d) {
                var regionName = d;
            
                // Fill all provinces with grey except for the selected region
                svg.selectAll(".province")
                    .style("fill", function(province) {
                        return province.properties.region === regionName ? color(province.properties.value) : "#ccc";
                    })
                    .classed("highlighted", function(province) {
                        return province.properties.region === regionName;
                    })
                    .style("stroke", function(province) {
                        return province.properties.region === regionName ? regionColors[regionName]: null;
                    })
                    .attr("stroke-width", function(province) {
                        return province.properties.region === regionName ? 0.2 : 0;
                    });
            
                // Optionally, you can zoom to the bounding box of the highlighted region
                zoomToRegion(regionName, json);
            })
            .on("mouseout", function() {
                // Reset province highlighting and color
                svg.selectAll(".province")
                    .classed("highlighted", false)
                    .style("fill", function(d) {
                        var value = d.properties.value;
                        if (value) {
                            return color(value);
                        } else {
                            return "#ccc";
                        }
                    })
                    .style("stroke", null)
                    .attr("stroke-width", 0.2);
            
                svg.transition().duration(800).call(
                    zoomFunction.transform,
                    d3.zoomIdentity
                );
            });
            
                
        regionLegend.selectAll("text")
            .data(regions)
            .enter()
            .append("text")
            .attr("x", 20 +legendWidth / 2)
            .attr("y", (d, i) => i * (legendHeight + 5) + legendHeight / 2)
            .attr("dy", "0.35em")
            .text(d => d)
            .style("font-size", "15px")
            .style("fill", "black")
            .style("pointer-events", "none");
        } 
    });
})
.catch(error => {
    // Handle any other errors that occur during data loading
    console.error();
});
}

loadData();

// Handle dataset selection change
d3.select("#dataset-select").on("change", function() {
    var selectedDataset = d3.select(this).property("value");
    loadData(selectedDataset);
    d3.select(".region-legend").remove();
});
// Handle year selection change
d3.select("#year").on("change", function() {
    // Call the loadData function to update the map with the new year's data
    loadData();
    d3.select(".region-legend").remove();
});
function zoomToRegion(regionName, json) {
    const bbox = getRegionBoundingBox(regionName, json);
    
    // Calculate the width and height of the bounding box
    const bboxWidth = bbox[1][0] - bbox[0][0];
    const bboxHeight = bbox[1][1] - bbox[0][1];
    
    // Calculate the zoom level based on the bounding box size
    const maxBboxSize = Math.max(bboxWidth, bboxHeight);
    const zoomLevel = Math.min(width, height) / maxBboxSize;
    
    // Center of the bounding box
    const center = [(bbox[0][0] + bbox[1][0]) / 2, (bbox[0][1] + bbox[1][1]) / 2];

    // Apply the zoom transformation
    svg.transition().duration(800).call(
        zoomFunction.transform,
        d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(zoomLevel)
            .translate(-center[0], -center[1])
    );
}

// Function to get the bounding box of a region based on its name
function getRegionBoundingBox(regionName, geojsonData) {
    // Initialize variables for bounding box coordinates
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    // Iterate over the features in the GeoJSON data
    geojsonData.features.forEach(function(feature) {
        // Check if the feature belongs to the specified region
        if (feature.properties.region === regionName) {
            // Get the bounding box of the feature
            const bbox = path.bounds(feature);
            // Update the bounding box coordinates if necessary
            minX = Math.min(minX, bbox[0][0]);
            minY = Math.min(minY, bbox[0][1]);
            maxX = Math.max(maxX, bbox[1][0]);
            maxY = Math.max(maxY, bbox[1][1]);
        }
    });

    // Return the bounding box coordinates as a nested array
    return [[minX, minY], [maxX, maxY]];
}


// Function to handle province click
function provinceClicked(event, d) {
    event.stopPropagation();
    const [[x0, y0], [x1, y1]] = path.bounds(d);
    svg.transition().duration(800).call(
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
        svg.transition().duration(800).call(
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
/*
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
}*/