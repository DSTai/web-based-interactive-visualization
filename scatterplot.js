// Add event listeners to the dropdowns
document.getElementById("dataset-select").addEventListener("change", function() {
    updatePlot();
});

document.getElementById("year").addEventListener("change", function() {
    updatePlot();
});

// Function to update the scatter plot
function updatePlot() {
    loadData().then(data => {
        drawScatterPlot(data);
    });
}

// Function to load data
function loadData() {
    // Get the selected dataset and year
    var selectedDataset = document.getElementById("dataset-select").value;
    var selectedYear = document.getElementById("year").value;

    // Update the dataset URL based on the selected year
    var populationURL = "https://dstai.github.io/data/population/population_" + selectedYear + ".csv";
    var datasetURL = "https://dstai.github.io/data/" + selectedDataset + "/" + selectedDataset + "_" + selectedYear + ".csv";

    // Load data from the dataset URL
    return d3.csv(populationURL).then(function(populationData) {
        return d3.csv(datasetURL).then(function(datasetData) {
            var populationMap = {};
            populationData.forEach(function(d) {
                populationMap[d.code] = +d.population;
            });
            
            // Process the loaded data
            return datasetData.map(function(d) {
                let yValue = +populationMap[d.code];
                let xValue;

                // Determine x value based on the selected dataset
                if (selectedDataset === "health") {
                    xValue = +d.Total;
                    return {                
                        x: xValue,
                        y: yValue,
                        name: d.Name,
                        hospital: d.Hospital,
                        local_clinic: d["Local clinic"],
                        rehabilitation: d["Rehabilitation and nursing hospital"],
                        health_station: d["Health station at commune, ward, office, enterprise"]
                    };
                } else if (selectedDataset === "grdp") {
                    xValue = +d.grdp;
                    return {                
                        x: xValue,
                        y: yValue,
                        name: d.Name
                    };
                }
            });
        });
    }).catch(function(error) {
        console.error();
        return []; 
    });
}

// Read the CSV file and draw scatter plot
loadData().then(data => {
    // Initial drawing of the scatter plot
    drawScatterPlot(data);
});

// Function to draw the scatter plot
function drawScatterPlot(data) {
    d3.select('#scatter-plot').selectAll('*').remove();

    // Set up the SVG container dimensions for the scatter plot
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const scatterWidth = 800 - margin.left - margin.right;
    const scatterHeight = 400 - margin.top - margin.bottom;

    // Create the SVG container for the scatter plot
    const svg = d3.select("#scatter-plot")
        .attr("width", scatterWidth + margin.left + margin.right)
        .attr("height", scatterHeight + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Set up scales for the scatter plot
    const xScale = d3.scaleLinear()
        .domain([d3.min(data, d => d.x), d3.max(data, d => d.x)])
        .range([0, scatterWidth]);

    const yScale = d3.scaleLinear()
        .domain([d3.min(data, d => d.y), d3.max(data, d => d.y)])
        .range([scatterHeight, 0]);

    // Add x-axis label
    svg.append("g")
        .attr("transform", "translate(0," + scatterHeight + ")")
        .call(d3.axisBottom(xScale))
        .append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", margin.bottom - 10)
        .attr("dy", "0.71em")
        .attr("fill", "white")
        .text("Population")
        .attr("font-size", "14px");

    // Add y-axis label
    svg.append("g")
        .call(d3.axisLeft(yScale))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left)
        .attr("x", -scatterHeight / 2)
        .attr("dy", "0.71em")
        .attr("fill", "white")
        .text("Density")
        .attr("font-size", "14px");

    // Add circles to represent data points
    svg.selectAll("circle")
        .data(data)
        .enter().append("circle")
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("r", 5) // Radius of the circle
        .style("opacity", "0.6")
        .style("fill", "blue")
        .on("mouseover", handleMouseOver) // Add mouseover event listener
        .on("mouseout", handleMouseOut); // Add mouseout event listener

}
// Function to handle mouseover event
function handleMouseOver(event, d) {
    d3.select(this)
        .style("fill", "red")
        .attr("r", 8); // Increase the radius of the circle

    // Clear the existing content in the tooltip SVG
    const tooltipSvg = d3.select("#tooltip")
        .attr("width", 800)
        .attr("height", 500);
    tooltipSvg.selectAll("*").remove();

    const selectedDataset = document.getElementById("dataset-select").value;

    // Dynamically create tooltip content based on the selected dataset
    if (selectedDataset === "health") {
        tooltipSvg.append("text")
            .attr("x", 10)
            .attr("y", 20)
            .style("fill", "black")
            .text(`Name: ${d.name}`);

        tooltipSvg.append("text")
            .attr("x", 10)
            .attr("y", 40)
            .style("fill", "black")
            .text(`Total: ${d.x}`);

        tooltipSvg.append("text")
            .attr("x", 10)
            .attr("y", 60)
            .style("fill", "black")
            .text(`Number of Hospital: ${d.hospital}`);

        tooltipSvg.append("text")
            .attr("x", 10)
            .attr("y", 80)
            .style("fill", "black")
            .text(`Local Clinic: ${d.local_clinic}`);

        tooltipSvg.append("text")
            .attr("x", 10)
            .attr("y", 100)
            .style("fill", "black")
            .text(`Rehabilitation and Nursing Hospital: ${d.rehabilitation}`);

        tooltipSvg.append("text")
            .attr("x", 10)
            .attr("y", 120)
            .style("fill", "black")
            .text(`Health station at commune, ward, office, enterprise: ${d.health_station}`);
    } else if (selectedDataset === "grdp") {
        tooltipSvg.append("text")
            .attr("x", 10)
            .attr("y", 20)
            .style("fill", "black")
            .text(`Name: ${d.name}`);

        tooltipSvg.append("text")
            .attr("x", 10)
            .attr("y", 40)
            .style("fill", "black")
            .text(`GRDP: ${d.x}`);
    }
}

// Function to handle mouseout event
function handleMouseOut(d) {
    d3.select(this)
        .style("fill", "blue")
        .attr("r", 5); // Reset the radius of the circle

    // Clear tooltip content
    d3.select("#tooltip").selectAll("*").remove();
}