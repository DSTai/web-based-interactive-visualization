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
    var regionURL = "https://dstai.github.io/data/region.csv";
    var flagURL = "https://dstai.github.io/data/province-flag.json";
    // Load data from the dataset URL

    // Load data from the dataset URL
    return Promise.all([
        d3.csv(populationURL),
        d3.csv(datasetURL),
        d3.csv(regionURL),
        d3.json(flagURL)
    ]).then(function(files) {
        var populationData = files[0];
        var datasetData = files[1];
        var regionData = files[2];
        var flagData = files[3];

        var populationMap = {};
        populationData.forEach(function(d) {
            populationMap[d.code] = +d.population;
        });

        var regionMap = {};
        regionData.forEach(function(d) {
            regionMap[d.code] = d.region;
        });

        var regionColors = {
            "Dong bang song Hong": "red",
            "Trung du va mien nui phia Bac": "darkgreen",
            "Bac Trung Bo va Duyen hai mien Trung": "darkblue",
            "Tay Nguyen": "darkviolet",
            "Dong Nam Bo": "gold",
            "Dong bang song Cuu Long": "turquoise"
        };
        
        // Process the loaded data
        return datasetData.map(function(d) {
            let yValue = +populationMap[d.code];
            let xValue;
            let region = regionMap[d.code];
            let color = regionColors[region];

            // Find flag URL based on province code
            let flagInfo = flagData.find(flag => flag.code === +d.code);
            let flagURL = flagInfo ? flagInfo.file_url : "";

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
                    health_station: d["Health station at commune, ward, office, enterprise"],
                    region: region,
                    color: color,
                    flagURL: flagURL
                };
            } else if (selectedDataset === "grdp") {
                xValue = +d.grdp;
                return {                
                    x: xValue,
                    y: yValue,
                    name: d.Name,
                    region: region,
                    color: color,
                    flagURL: flagURL
                };
            }
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
    const margin = { top: 50, right: 20, bottom: 50, left: 60 };
    const scatterWidth = 900 - margin.left - margin.right;
    const scatterHeight = 600 - margin.top - margin.bottom;

    // Create the SVG container for the scatter plot
    const svg = d3.select("#scatter-plot")
        .attr("width", scatterWidth + margin.left + margin.right)
        .attr("height", scatterHeight + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    // Add a rectangle for the background
    svg.append("rect")
        .attr("width", scatterWidth)
        .attr("height", scatterHeight)
        .attr("fill", "#f0f0f0");
    // Set up scales for the scatter plot
    const xScale = d3.scaleLinear()
        .domain([d3.min(data, d => d.x), d3.max(data, d => d.x)])
        .range([0, scatterWidth]);

    const yScale = d3.scaleLinear()
        .domain([d3.min(data, d => d.y), d3.max(data, d => d.y)])
        .range([scatterHeight, 0]);

    // Add title for the scatter plot
    svg.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "20px")
        .style("font-weight", "bold")
        .text(getTitle(document.getElementById("dataset-select").value));
    // Add x-axis label
    svg.append("g")
        .attr("transform", "translate(0," + scatterHeight + ")")
        .call(d3.axisBottom(xScale))
        .append("text")
        .attr("x", scatterWidth / 2)
        .attr("y",  margin.bottom -30)
        .attr("dy", "0.71em")
        .attr("fill", "blue")
        .style("font-weight", "bold")
        .text(getXAxisLabel(document.getElementById("dataset-select").value))
        .attr("font-size", "14px");

    // Add y-axis label
    svg.append("g")
        .call(d3.axisLeft(yScale))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 10-margin.left)
        .attr("x", 50-scatterHeight / 2)
        .attr("dy", "0.71em")
        .attr("fill", "Blue")
        .style("font-weight", "bold")
        .text("Population (Thousands)")
        .attr("font-size", "14px");

    // Add circles to represent data points
    svg.selectAll("circle")
        .data(data)
        .enter().append("circle")
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("r", 6) // Radius of the circle
        .style("opacity", "0.8")
        .style("fill",d => d.color)
        .on("mouseover", handleMouseOver) // Add mouseover event listener
        .on("mouseout", handleMouseOut); // Add mouseout event listener
        
        // Create a legend tooltip in the bottom right corner
        const legend = svg.append("g")
        .attr("transform", `translate(${scatterWidth + margin.right - 200}, ${scatterHeight - 120})`);

    const regions = [
        { region: "Dong bang song Hong", color: "red" },
        { region: "Trung du va mien nui phia Bac", color: "darkgreen" },
        { region: "Bac Trung Bo va DH mien Trung", color: "darkblue" },
        { region: "Tay Nguyen", color: "darkviolet" },
        { region: "Dong Nam Bo", color: "gold" },
        { region: "Dong bang song Cuu Long", color: "turquoise" }
    ];

    regions.forEach((d, i) => {
        legend.append("rect")
            .attr("x",15)
            .attr("y", i * 20)
            .attr("width", 10)
            .attr("height", 10)
            .style("fill", d.color);

        legend.append("text")
            .attr("x", 30)
            .attr("y", 5 + i * 20)
            .attr("dy", "0.3em")
            .style("fill", "black")
            .style("font-size", "10px")
            .text(d.region);
    });
}
// Function to handle mouseover event
function handleMouseOver(event, d) {
    d3.select(this)
        .style("stroke", "black")
        .style("stroke-width", 1)
        .attr("r", 10); 

    // Clear the existing content in the tooltip SVG
    const tooltipSvg = d3.select("#tooltip")
        .attr("width", 600)
        .attr("height", 600);
    tooltipSvg.selectAll("*").remove();

    const selectedDataset = document.getElementById("dataset-select").value;
    // Append flag image to tooltip SVG
    tooltipSvg.append("image")
        .attr("xlink:href", d.flagURL)
        .attr("width", 200)
        .attr("height", 200)
        .attr("x", 100)
        .attr("y", 10);

    // Helper function to handle null or invalid values
    const getValue = (value) => (value === "..") ? 0 : +value;

    // Dynamically create tooltip content based on the selected dataset
    if (selectedDataset === "health") {
        const hospital = getValue(d.hospital);
        const localClinic = getValue(d.local_clinic);
        const rehabilitation = getValue(d.rehabilitation);
        const healthStation = getValue(d.health_station);

        tooltipSvg.append("text")
            .attr("x", 160)
            .attr("y", 230)
            .style("fill", "black")
            .text(`${d.name}`);

        const barHeight = 30;
        const barSpacing = 20;
        const barStartX = 200; 
        const barStartY = 250;
        const maxBarWidth = 200; // Define the maximum bar width
        const maxBarValue = Math.max(hospital, localClinic, rehabilitation, healthStation); // Get the maximum value to scale the bars

        tooltipSvg.append("text")
            .attr("x", 10)
            .attr("y", barStartY)
            .style("fill", "black")
            .text(`Total: ${d.x}`);
        
        tooltipSvg.append("rect")
            .attr("x", barStartX)
            .attr("y", barStartY - barHeight +40)
            .attr("width", (hospital / maxBarValue) * maxBarWidth)
            .attr("height", barHeight)
            .attr("fill", "dodgerblue");

        tooltipSvg.append("text")
            .attr("x", 10)
            .attr("y", barStartY + barSpacing)
            .style("fill", "black")
            .text(`Number of Hospital: ${hospital}`);
        

        
        tooltipSvg.append("rect")
            .attr("x", barStartX)
            .attr("y", barStartY + barSpacing - barHeight +60)
            .attr("width", (localClinic / maxBarValue) * maxBarWidth)
            .attr("height", barHeight)
            .attr("fill", "dodgerblue");

        tooltipSvg.append("text")
            .attr("x", 10)
            .attr("y", barStartY + 3 * barSpacing)
            .style("fill", "black")
            .text(`Local Clinic: ${localClinic}`);
        

        
        tooltipSvg.append("rect")
            .attr("x", barStartX)
            .attr("y", barStartY + 3 * barSpacing - barHeight +60)
            .attr("width", (rehabilitation / maxBarValue) * maxBarWidth)
            .attr("height", barHeight)
            .attr("fill", "dodgerblue");

        tooltipSvg.append("text")
            .attr("x", 10)
            .attr("y", barStartY + 5 * barSpacing)
            .style("fill", "black")
            .text(`Rehabilitation and  `);
        tooltipSvg.append("text")
            .attr("x", 10)
            .attr("y", barStartY + 6 * barSpacing)
            .style("fill", "black")
            .text(`Nursing Hospital: ${rehabilitation}`);        

        
        tooltipSvg.append("rect")
            .attr("x", barStartX)
            .attr("y", barStartY + 7 * barSpacing - barHeight +20)
            .attr("width", (healthStation / maxBarValue) * maxBarWidth)
            .attr("height", barHeight)
            .attr("fill", "dodgerblue");

        tooltipSvg.append("text")
            .attr("x", 10)
            .attr("y", barStartY + 7 * barSpacing)
            .style("fill", "black")
            .text(`Health station at commune,`);
        tooltipSvg.append("text")
            .attr("x", 10)
            .attr("y", barStartY + 8 * barSpacing)
            .style("fill", "black")
            .text(`ward, office, enterprise: ${healthStation}`);   

    } else if (selectedDataset === "grdp") {
        const barHeight = 30;
        const barSpacing = 20;
        const barStartX = 150;
        const barStartY = 250;
        const maxBarWidth = 200;
        const maxBarValue = 360; 

        tooltipSvg.append("text")
            .attr("x", 160)
            .attr("y", 230)
            .style("fill", "black")
            .text(`${d.name}`);

        tooltipSvg.append("text")
            .attr("x", 10)
            .attr("y", barStartY + barSpacing +10)
            .style("fill", "black")
            .text(`GRDP: ${d.x}`);

        // Add a horizontal bar for GRDP
        tooltipSvg.append("rect")
            .attr("x", barStartX)
            .attr("y", barStartY - barHeight +40)
            .attr("width", (d.x / maxBarValue) * maxBarWidth)
            .attr("height", barHeight)
            .attr("fill", "dodgerblue");
    }
}

// Function to get the x-axis label based on the selected dataset
function getXAxisLabel(selectedDataset) {
    if (selectedDataset === "health") {
        return "Healthcare (unit)";
    } else if (selectedDataset === "grdp") {
        return "GRDP (Million VND/person/year)";
    } else {
        return "Density"; // Default label
    }
}
function getTitle(selectedDataset) {
    if (selectedDataset === "health") {
        return "Scatter Plot: Healthcare vs Population";
    } else if (selectedDataset === "grdp") {
        return "Scatter Plot: GRDP vs Population";
    }
}

// Function to handle mouseout event
function handleMouseOut(d) {
    d3.select(this)
        .style("fill",d => d.color)
        .attr("r", 6)
        .style("stroke", "none"); // Remove the stroke

    // Clear tooltip content
    d3.select("#tooltip").selectAll("*").remove();
}